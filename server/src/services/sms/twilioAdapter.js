// Twilio transport seam for the directory SMS engine (directory-migration.md
// §6.2). Everything here knows about Twilio and nothing else — the engine is
// transport-agnostic so ACS can plug in behind it later. No Twilio SDK
// dependency: signature validation and the REST send are a few lines each.

import crypto from 'crypto';

// HMAC-SHA1 of the request URL with every POST param name+value concatenated
// in alphabetical order, per
// https://www.twilio.com/docs/usage/security#validating-requests
export function computeSignature(authToken, url, params) {
  const data =
    url +
    Object.keys(params ?? {})
      .sort()
      .map((k) => k + params[k])
      .join('');
  return crypto.createHmac('sha1', authToken).update(data).digest('base64');
}

export function verifySignature({ url, params, signature, authToken }) {
  if (!url || !params || !signature || !authToken) return false;
  const expected = Buffer.from(computeSignature(authToken, url, params));
  const given = Buffer.from(String(signature));
  if (expected.length !== given.length) return false;
  return crypto.timingSafeEqual(expected, given);
}

// Validates an inbound webhook request. SMS_WEBHOOK_URL is the exact public
// URL configured in the Twilio console (slot-sticky) — never rebuilt from
// proxy headers, which an attacker could poison. Fails closed on missing env.
export function verifyRequest(req) {
  const url = process.env.SMS_WEBHOOK_URL;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const signature = req?.headers?.['x-twilio-signature'];
  return verifySignature({ url, params: req?.body, signature, authToken });
}

// Twilio POSTs application/x-www-form-urlencoded; express.urlencoded puts the
// fields on req.body.
export function parseInbound(req) {
  const b = req?.body ?? {};
  return {
    from: b.From,
    to: b.To,
    body: b.Body ?? '',
    providerMessageId: b.MessageSid ?? b.SmsSid,
  };
}

const XML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' };
// Strips invalid XML 1.0 control characters [\x00-\x08\x0B\x0C\x0E-\x1F] to prevent
// Twilio 12200 schema validation errors, then escapes XML markup delimiters.
const xmlEscape = (s) =>
  String(s)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .replace(/[&<>"']/g, (c) => XML_ESCAPES[c]);

// TwiML reply: one <Message> per non-empty text; an empty list is a valid
// <Response/> meaning "send nothing" (used for STOP replies — Twilio itself
// sends the compliance acknowledgement).
export function renderReply(texts) {
  const messages = (texts ?? [])
    .filter((t) => t && t.length > 0)
    .map((t) => `<Message>${xmlEscape(t)}</Message>`)
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?><Response>${messages}</Response>`;
}

// Outbound send — not used on day one (replies ride the webhook's TwiML), but
// needed for anything asynchronous later. Never call in tests without a
// stubbed fetch.
export async function send({ to, body }) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const serviceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  if (!sid || !authToken || !serviceSid) {
    throw new Error('Twilio env not configured (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_MESSAGING_SERVICE_SID)');
  }
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${sid}:${authToken}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: to, Body: body, MessagingServiceSid: serviceSid }).toString(),
    },
  );
  if (!res.ok) {
    throw new Error(`Twilio send failed: HTTP ${res.status}`);
  }
  return res.json();
}
