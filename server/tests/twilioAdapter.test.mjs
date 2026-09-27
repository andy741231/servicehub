import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeSignature, verifySignature, verifyRequest, parseInbound, renderReply, send,
} from '../src/services/sms/twilioAdapter.js';

// Worked example from Twilio's request-validation docs
// (https://www.twilio.com/docs/usage/security#validating-requests — the
// HMAC-SHA1 scheme) using the long-published demo vector: authToken '12345'.
const VECTOR = {
  authToken: '12345',
  url: 'https://mycompany.com/myapp.php?foo=1&bar=2',
  params: {
    CallSid: 'CA1234567890ABCDE',
    Caller: '+14158675309',
    Digits: '1234',
    From: '+14158675309',
    To: '+18005551212',
  },
  signature: 'RSOYDt4T1cUTdK1PDd93/VVr8B8=',
};

test('computeSignature matches the Twilio documented vector', () => {
  assert.equal(
    computeSignature(VECTOR.authToken, VECTOR.url, VECTOR.params),
    VECTOR.signature);
});

test('verifySignature accepts the documented vector', () => {
  assert.equal(verifySignature(VECTOR), true);
});

test('verifySignature rejects tampering', () => {
  assert.equal(verifySignature({
    ...VECTOR, params: { ...VECTOR.params, From: '+19999999999' },
  }), false);
  assert.equal(verifySignature({
    ...VECTOR, url: 'https://evil.example.com/myapp.php?foo=1&bar=2',
  }), false);
  assert.equal(verifySignature({ ...VECTOR, authToken: 'wrong' }), false);
  assert.equal(verifySignature({ ...VECTOR, signature: 'AAAA' }), false);
});

test('verifySignature fails closed on missing inputs', () => {
  for (const missing of ['url', 'params', 'signature', 'authToken']) {
    const v = { ...VECTOR, [missing]: undefined };
    assert.equal(verifySignature(v), false, `${missing} missing`);
  }
});

// ── verifyRequest ───────────────────────────────────────────────────────────

const ENV_KEYS = ['SMS_WEBHOOK_URL', 'TWILIO_AUTH_TOKEN'];
const saved = {};
beforeEach(() => {
  for (const k of ENV_KEYS) { saved[k] = process.env[k]; }
  process.env.SMS_WEBHOOK_URL = VECTOR.url;
  process.env.TWILIO_AUTH_TOKEN = VECTOR.authToken;
});
afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

const reqFor = (params, signature = computeSignature(VECTOR.authToken, VECTOR.url, params)) => ({
  headers: { 'x-twilio-signature': signature },
  body: params,
});

test('verifyRequest validates a properly signed webhook', () => {
  assert.equal(verifyRequest(reqFor(VECTOR.params)), true);
});

test('verifyRequest rejects missing/invalid signatures and missing env', () => {
  assert.equal(verifyRequest({ headers: {}, body: VECTOR.params }), false);
  // same header but a tampered body → signature no longer matches
  assert.equal(verifyRequest({
    headers: { 'x-twilio-signature': VECTOR.signature },
    body: { ...VECTOR.params, Body: 'tampered' },
  }), false);
  delete process.env.SMS_WEBHOOK_URL;
  assert.equal(verifyRequest(reqFor(VECTOR.params)), false);
  process.env.SMS_WEBHOOK_URL = VECTOR.url;
  delete process.env.TWILIO_AUTH_TOKEN;
  assert.equal(verifyRequest(reqFor(VECTOR.params)), false);
});

// ── parseInbound ────────────────────────────────────────────────────────────

test('parseInbound extracts Twilio fields with fallbacks', () => {
  assert.deepEqual(
    parseInbound({ body: { From: '+17135551234', To: '+18325550000', Body: 'me', MessageSid: 'SM1' } }),
    { from: '+17135551234', to: '+18325550000', body: 'me', providerMessageId: 'SM1' });
  // SmsSid fallback + empty body default
  assert.deepEqual(
    parseInbound({ body: { From: '+17135551234', SmsSid: 'SS9' } }),
    { from: '+17135551234', to: undefined, body: '', providerMessageId: 'SS9' });
});

// ── renderReply ─────────────────────────────────────────────────────────────

test('renderReply emits one <Message> per text, XML-escaped', () => {
  assert.equal(
    renderReply(['a & b <ok> "q" \'q\'']),
    '<?xml version="1.0" encoding="UTF-8"?><Response>' +
    '<Message>a &amp; b &lt;ok&gt; &quot;q&quot; &apos;q&apos;</Message></Response>');
});

test('renderReply skips empties; empty list is a bare Response', () => {
  assert.equal(renderReply(['', null, 'hi']),
    '<?xml version="1.0" encoding="UTF-8"?><Response><Message>hi</Message></Response>');
  assert.equal(renderReply([]),
    '<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
});

// ── send (stubbed fetch — never a real Twilio call) ─────────────────────────

test('send posts the form to the Messages endpoint with basic auth', async () => {
  const savedEnv = { ...process.env };
  process.env.TWILIO_ACCOUNT_SID = 'AC123';
  process.env.TWILIO_AUTH_TOKEN = 'tok123';
  process.env.TWILIO_MESSAGING_SERVICE_SID = 'MG999';
  const calls = [];
  const realFetch = global.fetch;
  global.fetch = async (url, opts) => {
    calls.push({ url, opts });
    return { ok: true, json: async () => ({ sid: 'SM_returned' }) };
  };
  try {
    const out = await send({ to: '+17135551234', body: 'hello there' });
    assert.equal(out.sid, 'SM_returned');
    const { url, opts } = calls[0];
    assert.equal(url, 'https://api.twilio.com/2010-04-01/Accounts/AC123/Messages.json');
    assert.equal(opts.method, 'POST');
    assert.equal(opts.headers.Authorization,
      'Basic ' + Buffer.from('AC123:tok123').toString('base64'));
    const form = new URLSearchParams(opts.body);
    assert.equal(form.get('To'), '+17135551234');
    assert.equal(form.get('Body'), 'hello there');
    assert.equal(form.get('MessagingServiceSid'), 'MG999');
  } finally {
    global.fetch = realFetch;
    Object.assign(process.env, savedEnv);
  }
});

test('send throws on HTTP failure and on missing env', async () => {
  const savedEnv = { ...process.env };
  process.env.TWILIO_ACCOUNT_SID = 'AC123';
  process.env.TWILIO_AUTH_TOKEN = 'tok123';
  process.env.TWILIO_MESSAGING_SERVICE_SID = 'MG999';
  const realFetch = global.fetch;
  global.fetch = async () => ({ ok: false, status: 400 });
  try {
    await assert.rejects(() => send({ to: '+1x', body: 'y' }), /HTTP 400/);
    delete process.env.TWILIO_MESSAGING_SERVICE_SID;
    await assert.rejects(() => send({ to: '+1x', body: 'y' }), /not configured/);
  } finally {
    global.fetch = realFetch;
    Object.assign(process.env, savedEnv);
  }
});
