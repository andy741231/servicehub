import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { computeSignature, renderReply } from '../src/services/sms/twilioAdapter.js';
import { createSmsController } from '../src/controllers/directorySms.js';
import { hubAdminOnly } from '../src/routes/directory.js';

// ── env + fakes ─────────────────────────────────────────────────────────────

const WEBHOOK_URL = 'https://hub.test/api/directory/sms';
const AUTH_TOKEN = 'twilio-test-token';
const FROM = '+17135550100';
const NOW = new Date('2026-09-27T12:00:00Z');

const ENV_KEYS = ['SMS_WEBHOOK_URL', 'TWILIO_AUTH_TOKEN'];
const saved = {};
beforeEach(() => {
  for (const k of ENV_KEYS) saved[k] = process.env[k];
  process.env.SMS_WEBHOOK_URL = WEBHOOK_URL;
  process.env.TWILIO_AUTH_TOKEN = AUTH_TOKEN;
});
afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

const resStub = () => {
  const r = { statusCode: 200, body: undefined, headers: {}, ended: false };
  r.status = (c) => { r.statusCode = c; return r; };
  r.type = (t) => { r.headers['content-type'] = t; return r; };
  r.send = (b) => { r.body = b; return r; };
  r.json = (j) => { r.body = j; return r; };
  r.end = () => { r.ended = true; return r; };
  return r;
};

const params = (over = {}) => ({
  From: FROM, To: '+18325550000', Body: 'john', MessageSid: 'SM_TEST', ...over,
});
const signedReq = (p = params(), sig = computeSignature(AUTH_TOKEN, WEBHOOK_URL, p)) => ({
  headers: { 'x-twilio-signature': sig },
  body: p,
  ip: '10.0.0.1',
});

// In-memory prisma — only the log table is exercised by the controller.
const makePrisma = () => {
  const logs = [];
  return {
    logs,
    directorySmsLog: { create: async ({ data }) => (logs.push(data), data) },
  };
};

// Controller with a stubbed engine; default reply is a single lookup result.
const makeController = ({ handleInbound, ...deps } = {}) => {
  const prisma = makePrisma();
  const engineCalls = [];
  const engine = {
    handleInbound: async (input) => {
      engineCalls.push(input);
      if (handleInbound) return handleInbound(input);
      return {
        replies: ['John Doe, 713-555-0100, C1'],
        command: 'lookup',
        memberId: 'm1',
        memberIds: ['m1'],
      };
    },
  };
  const ctl = createSmsController({ prisma, engine, now: () => NOW, ...deps });
  return { ctl, prisma, engineCalls };
};

// ── receiveTwilioSms ────────────────────────────────────────────────────────

test('valid signature → engine runs, 200 TwiML, in+out rows logged', async () => {
  const { ctl, prisma, engineCalls } = makeController();
  const res = resStub();
  await ctl.receiveTwilioSms(signedReq(), res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['content-type'], 'text/xml');
  assert.equal(res.body, renderReply(['John Doe, 713-555-0100, C1']));
  assert.match(res.body, /<Response><Message>John Doe, 713-555-0100, C1<\/Message><\/Response>/);

  assert.equal(engineCalls.length, 1);
  assert.equal(engineCalls[0].from, FROM);
  assert.equal(engineCalls[0].body, 'john');
  assert.equal(engineCalls[0].now.getTime(), NOW.getTime());

  assert.equal(prisma.logs.length, 2);
  const [inRow, outRow] = prisma.logs;
  assert.equal(inRow.direction, 'in');
  assert.equal(inRow.phone, FROM); // canonical '+1'+digits
  assert.equal(inRow.body, 'john');
  assert.equal(inRow.providerMessageId, 'SM_TEST');
  assert.equal(inRow.command, 'lookup');
  assert.equal(inRow.memberId, 'm1');
  assert.equal(outRow.direction, 'out');
  assert.equal(outRow.phone, FROM);
  assert.equal(outRow.body, 'John Doe, 713-555-0100, C1');
  assert.equal(outRow.command, 'lookup');
  assert.equal(outRow.memberId, 'm1');
});

test('invalid signature → 403 + sig-fail row WITHOUT the body', async () => {
  const { ctl, prisma, engineCalls } = makeController();
  const res = resStub();
  await ctl.receiveTwilioSms(signedReq(params(), 'AAAAAAAAAAAAAAAAAAAAAAAAAAA='), res);

  assert.equal(res.statusCode, 403);
  assert.equal(res.ended, true);
  assert.equal(engineCalls.length, 0);
  assert.equal(prisma.logs.length, 1);
  const row = prisma.logs[0];
  assert.equal(row.direction, 'in');
  assert.equal(row.command, 'sig-fail');
  assert.equal(row.status, 'rejected');
  assert.equal(row.body, ''); // unverified body is never stored
  assert.equal(row.phone, '713-555-0100'); // dashed canonical form
});

test('missing signature header → 403; malformed/absent From → truncated raw/unknown', async () => {
  const { ctl, prisma, engineCalls } = makeController();
  const res = resStub();
  await ctl.receiveTwilioSms({ headers: {}, body: params(), ip: 'x' }, res);
  assert.equal(res.statusCode, 403);
  assert.equal(engineCalls.length, 0);
  assert.equal(prisma.logs[0].command, 'sig-fail');

  await ctl.receiveTwilioSms({ headers: {}, body: { Body: 'x' } }, resStub());
  assert.equal(prisma.logs[1].phone, 'unknown');

  const junk = '9'.repeat(64) + '!';
  await ctl.receiveTwilioSms({ headers: {}, body: { From: junk, Body: 'x' } }, resStub());
  assert.equal(prisma.logs[2].phone, junk.slice(0, 32));
});

test('engine throw → 200 empty TwiML, error row, console never sees the body', async () => {
  const errors = [];
  const orig = console.error;
  console.error = (...a) => errors.push(a.join(' '));
  try {
    const { ctl, prisma } = makeController({
      handleInbound: async () => { throw new Error('db down'); },
    });
    const res = resStub();
    await ctl.receiveTwilioSms(signedReq(), res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body, '<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    assert.equal(prisma.logs.length, 1);
    assert.equal(prisma.logs[0].direction, 'in');
    assert.equal(prisma.logs[0].status, 'error');
    assert.equal(prisma.logs[0].body, 'john'); // verified sender — body kept
    assert.ok(errors.length >= 1, 'expected a console.error');
    assert.ok(!errors.join('\n').includes('john'), 'body leaked to console');
  } finally {
    console.error = orig;
  }
});

test('rate limit: 31st inbound in the window → 200 empty TwiML + rate-limited row', async () => {
  const { ctl, prisma, engineCalls } = makeController({
    handleInbound: async () => ({ replies: [], command: 'stop', memberId: 'm1', memberIds: [] }),
  });
  for (let i = 0; i < 30; i++) await ctl.receiveTwilioSms(signedReq(), resStub());
  assert.equal(engineCalls.length, 30);

  const res = resStub();
  await ctl.receiveTwilioSms(signedReq(), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body, renderReply([]));
  assert.equal(engineCalls.length, 30); // never reached the engine

  assert.equal(prisma.logs.length, 31); // 30 in-rows + 1 rate-limited
  const last = prisma.logs.at(-1);
  assert.equal(last.direction, 'in');
  assert.equal(last.status, 'rate-limited');
  assert.equal(last.body, 'john'); // real verified sender — body allowed
  assert.equal(last.providerMessageId, 'SM_TEST');
  assert.equal(last.phone, FROM);

  // Exposed reset restores service (same window, same injected clock).
  ctl.resetRateLimits();
  await ctl.receiveTwilioSms(signedReq(), resStub());
  assert.equal(engineCalls.length, 31);
});

test('rate limit is per phone number', async () => {
  const { ctl, engineCalls } = makeController({
    handleInbound: async () => ({ replies: [], command: 'stop' }),
  });
  for (let i = 0; i < 30; i++) await ctl.receiveTwilioSms(signedReq(), resStub());
  // A different number is unaffected by the first number's full bucket.
  await ctl.receiveTwilioSms(signedReq(params({ From: '+19998887777' })), resStub());
  assert.equal(engineCalls.length, 31);
});

test('empty replies (e.g. STOP) → bare <Response></Response>, no out rows', async () => {
  const { ctl, prisma } = makeController({
    handleInbound: async () => ({ replies: [], command: 'stop', memberId: 'm1', memberIds: [] }),
  });
  const res = resStub();
  await ctl.receiveTwilioSms(signedReq(params({ Body: 'STOP' })), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body, '<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  assert.equal(prisma.logs.length, 1);
  assert.equal(prisma.logs[0].direction, 'in');
  assert.equal(prisma.logs[0].command, 'stop');
});

// ── engine wiring ───────────────────────────────────────────────────────────

test('engine is built lazily, once, with issueLoginLink wrapped with prisma', async () => {
  const prisma = makePrisma();
  let factoryCalls = 0;
  let captured;
  const issueCalls = [];
  const ctl = createSmsController({
    prisma,
    clientUrl: 'https://hub.test',
    now: () => NOW,
    issueLoginLink: async (member, p) => { issueCalls.push([member, p]); return { link: 'L', tokenId: 't' }; },
    engineFactory: (args) => {
      factoryCalls++;
      captured = args;
      return { handleInbound: async () => ({ replies: [], command: 'stop' }) };
    },
  });
  assert.equal(factoryCalls, 0); // nothing built at construction

  await ctl.receiveTwilioSms(signedReq(), resStub());
  await ctl.receiveTwilioSms(signedReq(params({ MessageSid: 'SM2', Body: 'x' })), resStub());
  assert.equal(factoryCalls, 1); // cached across requests

  assert.equal(captured.prisma, prisma);
  assert.equal(captured.clientUrl, 'https://hub.test');
  assert.equal(typeof captured.getSettings, 'function');
  // The engine calls issueLoginLink(member); our injected fn gets (member, prisma).
  await captured.issueLoginLink({ id: 'm1' });
  assert.deepEqual(issueCalls, [[{ id: 'm1' }, prisma]]);
});

// ── simulateSms ─────────────────────────────────────────────────────────────

test('simulate runs the engine and returns replies JSON; rows logged as simulated', async () => {
  const { ctl, prisma, engineCalls } = makeController();
  const res = resStub();
  await ctl.simulateSms({ body: { from: FROM, body: 'me' } }, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, {
    replies: ['John Doe, 713-555-0100, C1'],
    command: 'lookup',
    memberId: 'm1',
    memberIds: ['m1'],
  });
  assert.equal(engineCalls.length, 1);
  assert.equal(engineCalls[0].from, FROM);
  assert.equal(engineCalls[0].body, 'me');

  assert.equal(prisma.logs.length, 2);
  assert.ok(prisma.logs.every((l) => l.direction === 'simulated'));
  assert.equal(prisma.logs[0].status, 'in');
  assert.equal(prisma.logs[0].body, 'me');
  assert.equal(prisma.logs[0].phone, FROM);
  assert.equal(prisma.logs[0].command, 'lookup');
  assert.equal(prisma.logs[1].status, 'out');
  assert.equal(prisma.logs[1].body, 'John Doe, 713-555-0100, C1');
  assert.equal(prisma.logs[1].memberId, 'm1');
});

test('simulate: missing or non-string fields → 400, engine untouched', async () => {
  const { ctl, prisma, engineCalls } = makeController();
  for (const body of [{}, { from: FROM }, { body: 'x' }, { from: 7, body: 'x' }, { from: '  ', body: 'x' }]) {
    const res = resStub();
    await ctl.simulateSms({ body }, res);
    assert.equal(res.statusCode, 400, JSON.stringify(body));
  }
  assert.equal(engineCalls.length, 0);
  assert.equal(prisma.logs.length, 0);
});

test('simulate: engine throw → 500 + simulated error row', async () => {
  const { ctl, prisma } = makeController({
    handleInbound: async () => { throw new Error('db down'); },
  });
  const res = resStub();
  await ctl.simulateSms({ body: { from: FROM, body: 'hi' } }, res);
  assert.equal(res.statusCode, 500);
  assert.equal(prisma.logs.length, 1);
  assert.equal(prisma.logs[0].direction, 'simulated');
  assert.equal(prisma.logs[0].status, 'error');
});

// ── hubAdminOnly (route middleware, tested directly) ────────────────────────

test('hubAdminOnly: directory/absent authKind → 403 Requires a Hub admin session', async () => {
  for (const authKind of ['directory', undefined]) {
    const res = resStub();
    let called = false;
    hubAdminOnly({ authKind }, res, () => { called = true; });
    assert.equal(res.statusCode, 403);
    assert.deepEqual(res.body, { error: 'Requires a Hub admin session' });
    assert.equal(called, false);
  }
});
