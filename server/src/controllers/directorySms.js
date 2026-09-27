// Twilio SMS webhook + simulate endpoint for the directory SMS subsystem
// (directory-migration.md §6.2). Transport details — signature check,
// form-body parsing, TwiML rendering — live in services/sms/twilioAdapter.js;
// command handling lives in services/directorySms/engine.js, built once and
// lazily so importing this module wires nothing.
//
// Response contract: any request that passes signature verification gets a
// 200 — even rate-limited or engine-error requests — so Twilio never
// retry-storms. An unverifiable signature gets a bare 403.
//
// Privacy (§6.2 Security/Logging): DirectorySmsLog stores the full body for
// verified senders only. A rejected request logs '' — its body could be
// spoofed junk — and message bodies never go to the console.

import defaultPrisma from '../db/client.js';
import * as twilioAdapter from '../services/sms/twilioAdapter.js';
import { createEngine } from '../services/directorySms/engine.js';
import { getSettings } from '../services/directorySms/settings.js';
import { issueLoginLink } from '../services/directoryLoginLinks.js';
import { canonicalPhone } from '../utils/phone.js';

// Per-phone inbound rate limit (§6.2 Security): in-memory is sufficient for
// this single-instance app.
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 30;

// The engine's per-number key: E.164 '+1NNNNNNNNNN' for a real NANP number;
// the raw sender (truncated to a safe length) for anything malformed.
const phoneKey = (from) => {
  const canonical = canonicalPhone(from);
  return canonical
    ? '+1' + canonical.replace(/\D/g, '')
    : String(from ?? 'unknown').slice(0, 32);
};

// For sig-fail rows we can't trust the sender enough to normalize it into
// the engine's key space — store the dashed canonical form, else raw.
const rejectedPhone = (from) =>
  canonicalPhone(from) ?? String(from ?? 'unknown').slice(0, 32);

export function createSmsController(deps = {}) {
  const {
    prisma = defaultPrisma,
    adapter = twilioAdapter,
    engineFactory = createEngine,
    engine: providedEngine = null,
    getSettings: getSettingsFn = getSettings,
    issueLoginLink: issueLink = issueLoginLink,
    clientUrl = null, // resolved lazily — env may not be loaded at import time
    now = () => new Date(),
    rateLimit = { windowMs: RATE_WINDOW_MS, max: RATE_MAX },
  } = deps;

  let engine = providedEngine;
  const getEngine = () => (engine ??= engineFactory({
    prisma,
    getSettings: getSettingsFn,
    // directoryLoginLinks.issueLoginLink takes (member, prisma); the engine's
    // seam takes just (member).
    issueLoginLink: (member) => issueLink(member, prisma),
    clientUrl: clientUrl ?? process.env.CLIENT_URL,
  }));

  const inboundHits = new Map(); // phoneKey → [timestamps within the window]
  const rateLimited = (key) => {
    const t = now().getTime();
    const fresh = (inboundHits.get(key) ?? []).filter((x) => t - x < rateLimit.windowMs);
    if (fresh.length >= rateLimit.max) {
      inboundHits.set(key, fresh);
      return true;
    }
    fresh.push(t);
    inboundHits.set(key, fresh);
    return false;
  };
  const resetRateLimits = () => inboundHits.clear();

  // Periodic eviction so inactive phone entries do not accumulate indefinitely.
  const sweepInterval = setInterval(() => {
    const cutoff = Date.now() - rateLimit.windowMs;
    for (const [k, timestamps] of inboundHits) {
      const active = timestamps.filter((ts) => ts > cutoff);
      if (active.length === 0) inboundHits.delete(k);
      else inboundHits.set(k, active);
    }
  }, rateLimit.windowMs);
  sweepInterval.unref?.();

  // A failed log write must never break the webhook or skip the TwiML reply.
  const logSms = async (row) => {
    try {
      await prisma.directorySmsLog.create({ data: row });
    } catch (err) {
      console.error('[directorySms] log write failed:', err.message);
    }
  };

  // ── POST /sms — public Twilio webhook ────────────────────────────────────
  const receiveTwilioSms = async (req, res) => {
    if (!adapter.verifyRequest(req)) {
      // Never store the body — an unverified request could be from anyone.
      await logSms({
        direction: 'in',
        phone: rejectedPhone(req.body?.From),
        command: 'sig-fail',
        body: '',
        status: 'rejected',
      });
      return res.status(403).end();
    }

    const phone = phoneKey(req.body?.From);
    if (rateLimited(phone)) {
      // Verified sender, so the body is safe to keep. 200 + empty TwiML so
      // Twilio doesn't retry-storm while we shed load.
      await logSms({
        direction: 'in',
        phone,
        body: String(req.body?.Body ?? ''),
        providerMessageId: req.body?.MessageSid ?? req.body?.SmsSid ?? null,
        status: 'rate-limited',
      });
      return res.type('text/xml').send(adapter.renderReply([]));
    }

    const inbound = adapter.parseInbound(req);
    let result;
    try {
      result = await getEngine().handleInbound({ from: inbound.from, body: inbound.body, now: now() });
    } catch (err) {
      // No body in the console — just the failure. 200 + empty TwiML.
      console.error('[directorySms] engine error:', err.message);
      await logSms({
        direction: 'in',
        phone,
        body: String(inbound.body ?? ''),
        providerMessageId: inbound.providerMessageId ?? null,
        status: 'error',
      });
      return res.type('text/xml').send(adapter.renderReply([]));
    }

    await logSms({
      direction: 'in',
      phone,
      body: String(inbound.body ?? ''),
      providerMessageId: inbound.providerMessageId ?? null,
      command: result.command ?? null,
      memberId: result.memberId ?? null,
    });
    for (const chunk of result.replies ?? []) {
      await logSms({
        direction: 'out',
        phone,
        body: chunk,
        command: result.command ?? null,
        memberId: result.memberId ?? null,
      });
    }
    return res.type('text/xml').send(adapter.renderReply(result.replies));
  };

  // ── POST /sms/simulate — Hub admin only (see routes) ─────────────────────
  // Runs the exact same engine and returns replies as JSON instead of TwiML,
  // so the §9 golden suite can replay captured conversations end-to-end.
  // Nothing is sent; rows are logged with direction 'simulated'.
  const simulateSms = async (req, res) => {
    const { from, body } = req.body ?? {};
    if (typeof from !== 'string' || from.trim() === '' || typeof body !== 'string') {
      return res.status(400).json({ error: 'Expected string fields: from, body' });
    }

    const phone = phoneKey(from);
    let result;
    try {
      result = await getEngine().handleInbound({ from, body, now: now() });
    } catch (err) {
      console.error('[directorySms] simulate error:', err.message);
      await logSms({ direction: 'simulated', phone, body, status: 'error' });
      return res.status(500).json({ error: 'Simulation failed' });
    }

    await logSms({
      direction: 'simulated',
      phone,
      body,
      command: result.command ?? null,
      memberId: result.memberId ?? null,
      status: 'in',
    });
    for (const chunk of result.replies ?? []) {
      await logSms({
        direction: 'simulated',
        phone,
        body: chunk,
        command: result.command ?? null,
        memberId: result.memberId ?? null,
        status: 'out',
      });
    }
    return res.json({
      replies: result.replies ?? [],
      command: result.command ?? null,
      memberId: result.memberId ?? null,
      memberIds: result.memberIds ?? [],
    });
  };

  return { receiveTwilioSms, simulateSms, resetRateLimits };
}

// The instance the routes use, wired to the real prisma + Twilio adapter.
// The engine inside is still lazy — the first inbound text builds it.
const wired = createSmsController();
export const receiveTwilioSms = wired.receiveTwilioSms;
export const simulateSms = wired.simulateSms;
export const resetSmsRateLimits = wired.resetRateLimits;
