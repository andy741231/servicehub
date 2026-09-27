import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEngine } from '../src/services/directorySms/engine.js';
import { DEFAULT_SETTINGS } from '../src/services/directorySms/settings.js';

// ── stub plumbing ───────────────────────────────────────────────────────────

const matchWhere = (m, where = {}) =>
  Object.entries(where).every(([k, v]) =>
    v && typeof v === 'object' && 'in' in v ? v.in.includes(m[k]) : m[k] === v);

function makePrisma({ members = [], phoneRows = new Map(), loginTokens = [] } = {}) {
  return {
    _phoneRows: phoneRows,
    _loginTokens: loginTokens,
    directorySmsPhone: {
      findUnique: async ({ where }) => phoneRows.get(where.phone) ?? null,
      upsert: async ({ where, create, update }) => {
        const cur = phoneRows.get(where.phone);
        const next = { ...(cur ?? create), ...update };
        phoneRows.set(where.phone, next);
        return next;
      },
    },
    directoryMember: {
      findMany: async ({ where, select } = {}) =>
        members.filter((m) => matchWhere(m, where))
          .map((m) => (select ? pick(m, select) : m)),
      findFirst: async ({ where }) =>
        members.find((m) => matchWhere(m, where)) ?? null,
    },
  };
}

const pick = (obj, select) =>
  Object.fromEntries(Object.keys(select).filter((k) => select[k]).map((k) => [k, obj[k]]));

const saint = (over = {}) => ({
  id: 'm1', legacyId: '1', firstName: 'John', lastName: 'Doe',
  gender: 'brother', isHeadOfHousehold: true, district: 'Central 1',
  phone1: '281-555-0100', phone2: null, phonePrivacy: true,
  spouseMemberId: null, optedIn: true, status: 'active', role: 'saint', ...over,
});

const FROM = '+12815550100';
const NOW = new Date('2026-09-27T12:00:00Z');

function engine({ members = [], phones, settings = {}, issueLoginLink } = {}) {
  const phoneRows = phones ?? new Map();
  const prisma = makePrisma({ members, phoneRows });
  const merged = { ...DEFAULT_SETTINGS, ...settings };
  const eng = createEngine({
    prisma,
    getSettings: async () => merged,
    issueLoginLink: issueLoginLink
      ?? (async (m) => ({ link: `https://t.test/verify?tok-for-${m.id}`, tokenId: `t-${m.id}` })),
    clientUrl: 'https://hub.test',
  });
  return { eng, prisma, phoneRows };
}

const call = (eng, body, extra = {}) =>
  eng.handleInbound({ from: FROM, body, now: NOW, ...extra });

// ── STOP / START / opted-out ────────────────────────────────────────────────

test('STOP family sets optedOutAt and replies nothing', async () => {
  for (const word of ['STOP', 'stopall', 'Unsubscribe', 'CANCEL', 'end', 'QUIT']) {
    const { eng, phoneRows } = engine({ members: [saint()] });
    const r = await call(eng, word);
    assert.deepEqual(r.replies, []);
    assert.equal(r.command, 'stop');
    assert.equal(phoneRows.get(FROM).optedOutAt.toISOString(), NOW.toISOString());
  }
});

test('START family clears optedOutAt; opted-out numbers get silence', async () => {
  for (const word of ['START', 'unstop', 'Yes']) {
    const { eng, phoneRows } = engine({
      members: [saint()],
      phones: new Map([[FROM, { phone: FROM, optedOutAt: NOW }]]),
    });
    const r = await call(eng, word);
    assert.deepEqual(r.replies, []);
    assert.equal(r.command, 'start');
    assert.equal(phoneRows.get(FROM).optedOutAt, null);
  }
  // still opted out → silence
  const { eng, phoneRows } = engine({
    members: [saint()],
    phones: new Map([[FROM, { phone: FROM, optedOutAt: NOW }]]),
  });
  const r = await call(eng, 'me');
  assert.deepEqual(r.replies, []);
  assert.equal(r.command, 'opted-out');
  assert.equal(phoneRows.get(FROM).optedOutAt.toISOString(), NOW.toISOString());
});

// ── kill switches ───────────────────────────────────────────────────────────

test('acceptInbound=false → temp unavailable + trailer; testMode → temp only', async () => {
  const off = engine({
    members: [saint()],
    settings: { 'sms.acceptInbound': false },
  });
  const r1 = await call(off.eng, 'john');
  assert.equal(r1.command, 'unavailable');
  assert.equal(r1.replies.length, 1);
  assert.match(r1.replies[0], /^System is in test/);
  assert.match(r1.replies[0], /Text GET HELP for info/); // trailer appended

  const tm = engine({
    members: [saint()],
    settings: { 'sms.testMode': true, 'sms.devPhones': [] },
  });
  const r2 = await call(tm.eng, 'john');
  assert.equal(r2.command, 'test-mode');
  assert.deepEqual(r2.replies, ['System is in test for a few minutes.']);

  const dev = engine({
    members: [saint()],
    settings: { 'sms.testMode': true, 'sms.devPhones': [FROM] },
  });
  const r3 = await call(dev.eng, 'john');
  assert.notEqual(r3.command, 'test-mode');
});

// ── auth ────────────────────────────────────────────────────────────────────

test('unrecognized: unknown number, malformed from, inactive-only', async () => {
  const { eng } = engine({ members: [saint()] });
  const r1 = await eng.handleInbound({ from: '+19999999999', body: 'hi', now: NOW });
  assert.equal(r1.command, 'unrecognized');
  assert.deepEqual(r1.replies, [DEFAULT_SETTINGS['sms.messages.notRecognized']]);

  const r2 = await eng.handleInbound({ from: 'notaphone', body: 'hi', now: NOW });
  assert.equal(r2.command, 'unrecognized');

  const inact = engine({ members: [saint({ status: 'inactive' })] });
  const r3 = await call(inact.eng, 'hi');
  assert.equal(r3.command, 'unrecognized');
});

test('memberId is the single match; null when the phone is shared', async () => {
  const one = engine({ members: [saint()] });
  const r1 = await call(one.eng, 'me');
  assert.equal(r1.memberId, 'm1');

  const two = engine({
    members: [saint(), saint({ id: 'm2', firstName: 'Jane', isHeadOfHousehold: false })],
  });
  const r2 = await call(two.eng, 'me');
  assert.equal(r2.memberId, null);
  assert.deepEqual(r2.memberIds, ['m1', 'm2']); // head of household first
});

// ── empty / bare-number replies ─────────────────────────────────────────────

test('empty text and bare number with no pending command', async () => {
  const { eng } = engine({ members: [saint()] });
  const r1 = await call(eng, '');
  assert.equal(r1.command, 'no-command');
  assert.match(r1.replies[0], /No command found/);

  const r2 = await call(eng, '5');
  assert.equal(r2.command, 'reply');
  assert.match(r2.replies[0], /5 is not valid -- you don't have a command active/);
});

// ── me ──────────────────────────────────────────────────────────────────────

test('me: single member gets the link reply with nickname shout', async () => {
  const { eng } = engine({
    members: [saint({ firstName: 'Christopher (Chris)' })],
  });
  const r = await call(eng, 'me');
  assert.equal(r.command, 'me');
  assert.match(r.replies[0],
    /HI CHRIS, use this link to REVIEW or UPDATE your information:\n\nhttps:\/\/t\.test\/verify\?tok-for-m1/);
});

test('me: issueLoginLink cooldown reply', async () => {
  const { eng } = engine({
    members: [saint()],
    issueLoginLink: async () => ({ cooldown: true }),
  });
  const r = await call(eng, 'me');
  assert.match(r.replies[0], /A sign-in link was just sent/);
});

test("me: 'my info' spelling is redirected, 'myinfo' works as me", async () => {
  const { eng } = engine({ members: [saint()] });
  const r1 = await call(eng, 'my info');
  assert.equal(r1.replies[0].includes(`Use 'Me' instead`), true);
  const r2 = await call(eng, 'myinfo');
  assert.match(r2.replies[0], /HI JOHN, use this link/);
});

test('me: shared phone → choice menu, then pick/cancel/invalid/expired', async () => {
  const members = [
    saint({ id: 'm1', firstName: 'John', lastName: 'Doe', isHeadOfHousehold: true }),
    saint({ id: 'm2', firstName: 'Alice', lastName: 'Doe', isHeadOfHousehold: false, gender: 'sister' }),
  ];
  const { eng, phoneRows } = engine({ members });

  const menu = await call(eng, 'me');
  assert.equal(menu.command, 'me');
  assert.match(menu.replies[0],
    /Which record\? Reply with a number:\n1 - John Doe\n2 - Alice Doe/);
  // pending stored
  const pending = JSON.parse(phoneRows.get(FROM).pendingCommand);
  assert.equal(pending.cmd, 'me');
  assert.deepEqual(pending.choices, ['m1', 'm2']);

  // invalid choice keeps pending
  const bad = await call(eng, '7');
  assert.match(bad.replies[0], /Expecting 1-2\.\.\. try again/);
  assert.ok(phoneRows.get(FROM).pendingCommand);

  // valid pick → link, pending cleared
  const pick2 = await call(eng, '2');
  assert.match(pick2.replies[0], /HI ALICE, use this link[\s\S]*tok-for-m2/);
  assert.equal(phoneRows.get(FROM).pendingCommand, null);
  assert.equal(phoneRows.get(FROM).pendingExpiresAt, null);
});

test('me: 0 cancels; expired pending is not valid; stale pick re-checks', async () => {
  const members = [
    saint({ id: 'm1' }),
    saint({ id: 'm2', firstName: 'Alice', isHeadOfHousehold: false }),
  ];
  const { eng, phoneRows } = engine({ members });
  await call(eng, 'me');
  const r0 = await call(eng, '0');
  assert.match(r0.replies[0], /'me' cancelled/);
  assert.equal(phoneRows.get(FROM).pendingCommand, null);

  // expired pending
  const stalePhones = new Map([[FROM, {
    phone: FROM,
    pendingCommand: JSON.stringify({ cmd: 'me', choices: ['m1', 'm2'] }),
    pendingExpiresAt: new Date(NOW.getTime() - 1000),
  }]]);
  const stale = engine({ members, phones: stalePhones });
  const rExp = await call(stale.eng, '1');
  assert.match(rExp.replies[0], /1 is not valid -- you don't have a command active/);
  assert.equal(stalePhones.get(FROM).pendingCommand, null);

  // pick whose member went inactive since the menu → Expecting
  const live = new Map([[FROM, {
    phone: FROM,
    pendingCommand: JSON.stringify({ cmd: 'me', choices: ['gone', 'm1'] }),
    pendingExpiresAt: new Date(NOW.getTime() + 60000),
  }]]);
  const e2 = engine({ members, phones: live });
  const rStale = await call(e2.eng, '1');
  assert.match(rStale.replies[0], /Expecting 1-2\.\.\. try again/);
});

// ── get help ────────────────────────────────────────────────────────────────

test('gethelp: intro sets pending; topic expands ###srv_offc###; pending stays', async () => {
  const helpers = [
    saint({ id: 'h1', firstName: 'Hank', lastName: 'Hill', role: 'helper', phone1: '281-555-0101' }),
    saint({ id: 'h2', firstName: 'April', lastName: 'Chen', role: 'approver', phone1: '281-555-0102' }),
  ];
  const { eng, phoneRows } = engine({ members: [saint(), ...helpers] });

  const intro = await call(eng, 'get help');
  assert.equal(intro.command, 'gethelp');
  assert.match(intro.replies[0], /GET HELP — reply with a number:/);
  assert.ok(phoneRows.get(FROM).pendingCommand);

  const topic = await call(eng, '1');
  assert.equal(topic.command, 'gethelp');
  assert.match(topic.replies[0],
    /Helpers for C1:\nHank Hill, 281-555-0101\nApril Chen\*, 281-555-0102/);
  // pending still open for browsing
  assert.ok(phoneRows.get(FROM).pendingCommand);

  const bad = await call(eng, '9');
  assert.match(bad.replies[0], /Expecting 1-1, try again/);

  const cancel = await call(eng, '0');
  assert.match(cancel.replies[0], /'gethelp' cancelled/);
  assert.equal(phoneRows.get(FROM).pendingCommand, null);
});

test('gethelp: no helpers → the no-helpers text; admin uses approver topics', async () => {
  const { eng } = engine({ members: [saint()] });
  await call(eng, 'gethelp');
  const r = await call(eng, '1');
  assert.match(r.replies[0], /<No phonelist helpers yet for your district>/);

  const admin = engine({ members: [saint({ role: 'admin' })] });
  const r2 = await call(admin.eng, 'get help');
  assert.equal(r2.command, 'gethelp');
  const pending = JSON.parse(admin.phoneRows.get(FROM).pendingCommand);
  assert.equal(pending.role, 'approver');
});

// ── retired commands / keywords ─────────────────────────────────────────────

test('retired commands: staff get the web pointer, saints fall to lookup', async () => {
  const staff = engine({ members: [saint({ role: 'helper' })] });
  const r1 = await call(staff.eng, 'add jane');
  assert.equal(r1.command, 'retired');
  assert.match(r1.replies[0], /This moved to the web: https:\/\/hub\.test\/directory/);

  const lay = engine({ members: [saint()] });
  const r2 = await call(lay.eng, 'add jane');
  assert.equal(r2.command, 'lookup'); // saint falls through
});

test('keyword: role column URL, admin→approver, empty column', async () => {
  const kw = [{
    word: 'lockup',
    saint: 'https://x.test/saint.pdf',
    helper: 'https://x.test/helper.pdf',
    approver: 'https://x.test/approver.pdf',
  }];
  const e1 = engine({ members: [saint()], settings: { 'sms.keywords': kw } });
  const r1 = await call(e1.eng, 'lockup');
  assert.equal(r1.command, 'keyword');
  assert.match(r1.replies[0], /LOCKUP --- https:\/\/x\.test\/saint\.pdf/);

  const e2 = engine({ members: [saint({ role: 'admin' })], settings: { 'sms.keywords': kw } });
  const r2 = await call(e2.eng, 'LOCKUP');
  assert.match(r2.replies[0], /approver\.pdf/); // admin reads approver column

  const e3 = engine({
    members: [saint()],
    settings: { 'sms.keywords': [{ word: 'staff', saint: '', helper: 'u', approver: 'u' }] },
  });
  const r3 = await call(e3.eng, 'staff');
  assert.match(r3.replies[0], /This command is for service office saints only/);
});

// ── lookup path / welcome / trailer / hint / split ──────────────────────────

test('lookup dispatch + welcome prefix once + trailer + searchHintAt once', async () => {
  const { eng, phoneRows } = engine({ members: [saint()] });

  const hit = await call(eng, 'john');
  assert.equal(hit.command, 'lookup');
  assert.deepEqual(hit.memberIds, ['m1']);
  const body = hit.replies[0];
  assert.match(body, /^Welcome to the secure, online phone list!/);
  assert.match(body, /John Doe, 281-555-0100, C1/);
  assert.equal(body.split('Text GET HELP for info').length - 1, 1); // trailer once

  // second request — welcomed already, no welcome prefix
  const hit2 = await call(eng, 'john');
  assert.doesNotMatch(hit2.replies[0], /^Welcome/);
  assert.equal(phoneRows.get(FROM).welcomedAt.toISOString(), NOW.toISOString());

  // miss → search hint appended once
  const miss1 = await call(eng, 'zzzzq');
  assert.match(miss1.replies[0], /How to search/);
  assert.equal(phoneRows.get(FROM).searchHintAt.toISOString(), NOW.toISOString());
  const miss2 = await call(eng, 'qqqqz');
  assert.doesNotMatch(miss2.replies[0], /How to search/);
});

test('trailer is not duplicated when the reply already contains it', async () => {
  const trailer = DEFAULT_SETTINGS['sms.messages.helpStopTrailer'];
  const { eng } = engine({
    members: [saint()],
    settings: { 'sms.keywords': [{ word: 'kw', saint: trailer, helper: trailer, approver: trailer }] },
  });
  const r = await call(eng, 'kw');
  const joined = r.replies.join('\n');
  assert.equal(joined.split(trailer).length - 1, 1);
});

test('replies longer than 1600 chars split on block boundaries', async () => {
  const big = [saint(), ...Array.from({ length: 12 }, (_, i) => saint({
    id: `b${i}`, firstName: 'Zachary', lastName: 'L'.repeat(130),
    phone1: `281-555-01${String(10 + i)}`,
  }))];
  const { eng } = engine({ members: big });
  const r = await eng.handleInbound({ from: FROM, body: 'zachary', now: NOW });
  assert.equal(r.command, 'lookup');
  assert.ok(r.replies.length >= 2, `expected split, got ${r.replies.length}`);
  for (const chunk of r.replies) assert.ok(chunk.length <= 1600, chunk.length);
  // welcome lands on the first chunk only
  assert.match(r.replies[0], /^Welcome/);
  assert.doesNotMatch(r.replies[1], /^Welcome/);
});

test('over-1600 single block is hard-cut', async () => {
  const long = 'x'.repeat(3400);
  const { eng } = engine({
    members: [saint()],
    phones: new Map([[FROM, { phone: FROM, welcomedAt: NOW }]]), // skip welcome noise
    settings: {
      'sms.helpTopics': {
        saint: { intro: 'intro', topics: [{ n: '1', text: long }] },
        helper: { intro: 'i', topics: [] },
        approver: { intro: 'i', topics: [] },
      },
    },
  });
  await call(eng, 'gethelp');
  const r = await call(eng, '1');
  assert.ok(r.replies.length >= 3);
  for (const chunk of r.replies) assert.ok(chunk.length <= 1600, chunk.length);
});
