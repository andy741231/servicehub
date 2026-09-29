import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { maintenanceJob, deps as maintDeps }
  from '../src/jobs/maintenance.js';
import {
  districtDigestJob, deps as digestDeps, yesterdayCtWindow,
} from '../src/jobs/districtDigest.js';
import { JOBS } from '../src/jobs/index.js';
import { invalidateSettings } from '../src/services/directorySms/settings.js';

// ── fake prisma ───────────────────────────────────────────────────────────
// Arrays + spies, following directoryJobs.test.mjs. A tiny where-matcher
// supports the operators these two jobs use: scalar equality, lt/lte/gt/gte,
// not, in, OR, and the nested `member` relation filter.

const isPlain = (v) =>
  v != null && typeof v === 'object' && !(v instanceof Date) && !Array.isArray(v);

function matchCond(value, cond) {
  if (isPlain(cond)) {
    if ('lt' in cond && !(value < cond.lt)) return false;
    if ('lte' in cond && !(value <= cond.lte)) return false;
    if ('gt' in cond && !(value > cond.gt)) return false;
    if ('gte' in cond && !(value >= cond.gte)) return false;
    if ('in' in cond && !cond.in.includes(value)) return false;
    if ('not' in cond) {
      if (cond.not === null) { if (value == null) return false; }
      else if (value === cond.not) return false;
    }
    return true;
  }
  return value === cond;
}

function matches(row, where = {}) {
  for (const [key, cond] of Object.entries(where)) {
    if (key === 'OR') {
      if (!cond.some((w) => matches(row, w))) return false;
    } else if (key === 'AND') {
      if (!cond.every((w) => matches(row, w))) return false;
    } else if (key === 'member') {
      if (!matches(row.member ?? {}, cond)) return false;
    } else if (!matchCond(row[key], cond)) {
      return false;
    }
  }
  return true;
}

function fakeModel(name, rows, calls) {
  return {
    findMany: async (args = {}) => {
      calls.push({ model: name, op: 'findMany', args });
      let out = rows.filter((r) => matches(r, args.where));
      if (args.orderBy) {
        const [k, dir] = Object.entries(args.orderBy)[0];
        const sign = dir === 'desc' ? -1 : 1;
        out = [...out].sort((a, b) => sign * (a[k] > b[k] ? 1 : a[k] < b[k] ? -1 : 0));
      }
      if (args.take) out = out.slice(0, args.take);
      return out;
    },
    count: async (args = {}) => {
      calls.push({ model: name, op: 'count', args });
      return rows.filter((r) => matches(r, args.where)).length;
    },
    deleteMany: async ({ where }) => {
      calls.push({ model: name, op: 'deleteMany', where });
      const hit = rows.filter((r) => matches(r, where));
      for (const h of hit) rows.splice(rows.indexOf(h), 1);
      return { count: hit.length };
    },
    updateMany: async ({ where, data }) => {
      calls.push({ model: name, op: 'updateMany', where, data });
      const hit = rows.filter((r) => matches(r, where));
      for (const h of hit) Object.assign(h, data);
      return { count: hit.length };
    },
  };
}

function makePrisma({
  settingsRows = [], smsLogs = [], tokens = [], phones = [],
  audits = [], members = [],
} = {}) {
  const calls = [];
  return {
    calls,
    rows: { smsLogs, tokens, phones, audits, members },
    directorySetting: { findMany: async () => settingsRows },
    directorySmsLog: fakeModel('directorySmsLog', smsLogs, calls),
    directoryLoginToken: fakeModel('directoryLoginToken', tokens, calls),
    directorySmsPhone: fakeModel('directorySmsPhone', phones, calls),
    directoryAuditLog: fakeModel('directoryAuditLog', audits, calls),
    directoryMember: fakeModel('directoryMember', members, calls),
  };
}

// CT Jan 15 06:00 CST — mid-digest-run for the winter tests.
const NOW = new Date('2026-01-15T12:00:00Z');
const ctx = (prisma, dryRun = false, at = NOW) =>
  ({ prisma, now: () => at, periodKey: 'manual:test', dryRun });

// ── maintenance ───────────────────────────────────────────────────────────

const realGetSettings = maintDeps.getSettings;
beforeEach(() => invalidateSettings()); // real getSettings caches for 30s
afterEach(() => { maintDeps.getSettings = realGetSettings; });

const maintRows = () => ({
  smsLogs: [
    { id: 'l-old', createdAt: new Date('2025-11-01T00:00:00Z') },
    { id: 'l-edge', createdAt: new Date('2025-12-16T11:59:59Z') }, // 1s past a 30d cutoff
    { id: 'l-new', createdAt: new Date('2026-01-01T00:00:00Z') },
  ],
  tokens: [
    { id: 't-used-old', usedAt: new Date('2026-01-02T00:00:00Z'),
      expiresAt: new Date('2026-01-03T00:00:00Z'), createdAt: new Date('2026-01-01T00:00:00Z') },
    { id: 't-expired-old', usedAt: null,
      expiresAt: new Date('2026-01-10T00:00:00Z'), createdAt: new Date('2026-01-02T00:00:00Z') },
    { id: 't-used-fresh', usedAt: new Date('2026-01-14T00:00:00Z'),
      expiresAt: new Date('2026-01-20T00:00:00Z'), createdAt: new Date('2026-01-10T00:00:00Z') },
    { id: 't-live-old', usedAt: null,
      expiresAt: new Date('2026-02-01T00:00:00Z'), createdAt: new Date('2026-01-01T00:00:00Z') },
  ],
  phones: [
    { phone: '+17130000001', pendingCommand: '{"cmd":"pick"}',
      pendingExpiresAt: new Date('2026-01-14T00:00:00Z') },       // expired → cleared
    { phone: '+17130000002', pendingCommand: '{"cmd":"pick"}',
      pendingExpiresAt: new Date('2026-02-01T00:00:00Z') },       // not expired → kept
    { phone: '+17130000003', pendingCommand: null,
      pendingExpiresAt: new Date('2026-01-14T00:00:00Z') },       // no command → kept
  ],
});

test('maintenance: live run purges logs past retention, dead tokens, expired pending state', async () => {
  maintDeps.getSettings = async () => ({ 'sms.logRetentionDays': 30 });
  const prisma = makePrisma(maintRows());
  const summary = await maintenanceJob.run(ctx(prisma));

  assert.equal(summary.smsLogsPurged, 2);          // l-old + l-edge (cutoff 2025-12-16T12:00Z)
  assert.equal(summary.loginTokensPurged, 2);      // used-old + expired-old
  assert.equal(summary.pendingStatesCleared, 1);
  assert.equal(summary.retentionDays, 30);
  assert.equal(summary.cutoffDates.smsLogBefore, '2025-12-16T12:00:00.000Z');
  assert.equal(summary.cutoffDates.tokenCreatedBefore, '2026-01-08T12:00:00.000Z');

  // Exact WHERE clauses sent to prisma.
  const del = prisma.calls.filter((c) => c.op === 'deleteMany');
  assert.equal(del.length, 2);
  const logWhere = del.find((c) => c.model === 'directorySmsLog').where;
  assert.deepEqual(logWhere, { createdAt: { lt: new Date('2025-12-16T12:00:00Z') } });
  const tokWhere = del.find((c) => c.model === 'directoryLoginToken').where;
  assert.deepEqual(tokWhere.createdAt.lt, new Date('2026-01-08T12:00:00Z'));
  assert.deepEqual(tokWhere.OR, [
    { usedAt: { not: null } },
    { expiresAt: { lt: NOW } },
  ]);

  const upd = prisma.calls.find((c) => c.op === 'updateMany');
  assert.deepEqual(upd.where, {
    pendingExpiresAt: { lt: NOW },
    pendingCommand: { not: null },
  });
  assert.deepEqual(upd.data, { pendingCommand: null, pendingExpiresAt: null });

  // The rows themselves.
  assert.deepEqual(prisma.rows.smsLogs.map((r) => r.id), ['l-new']);
  assert.deepEqual(prisma.rows.tokens.map((r) => r.id), ['t-used-fresh', 't-live-old']);
  const cleared = prisma.rows.phones.find((p) => p.phone === '+17130000001');
  assert.equal(cleared.pendingCommand, null);
  assert.equal(cleared.pendingExpiresAt, null);
  const kept = prisma.rows.phones.find((p) => p.phone === '+17130000002');
  assert.ok(kept.pendingCommand != null);
});

test('maintenance: default retention is 180 days when no setting row exists', async () => {
  // No getSettings stub → real getSettings → empty DirectorySetting → defaults.
  const prisma = makePrisma(maintRows());
  const summary = await maintenanceJob.run(ctx(prisma));
  assert.equal(summary.retentionDays, 180);
  assert.equal(
    summary.cutoffDates.smsLogBefore,
    new Date(NOW.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString());
});

test('maintenance: a stored sms.logRetentionDays row wins over the default', async () => {
  const prisma = makePrisma({
    ...maintRows(),
    settingsRows: [{ key: 'sms.logRetentionDays', value: '10' }],
  });
  const summary = await maintenanceJob.run(ctx(prisma));
  assert.equal(summary.retentionDays, 10);
  assert.equal(summary.cutoffDates.smsLogBefore, '2026-01-05T12:00:00.000Z');
});

test('maintenance: dry-run counts the same rows but deletes nothing', async () => {
  maintDeps.getSettings = async () => ({ 'sms.logRetentionDays': 30 });
  const prisma = makePrisma(maintRows());
  const summary = await maintenanceJob.run(ctx(prisma, true));

  assert.equal(summary.smsLogsPurged, 2);
  assert.equal(summary.loginTokensPurged, 2);
  assert.equal(summary.pendingStatesCleared, 1);

  // Read-only: counts happened, no writes did, every row survives.
  assert.ok(prisma.calls.some((c) => c.op === 'count'));
  assert.equal(prisma.calls.filter((c) => c.op === 'deleteMany').length, 0);
  assert.equal(prisma.calls.filter((c) => c.op === 'updateMany').length, 0);
  assert.equal(prisma.rows.smsLogs.length, 3);
  assert.equal(prisma.rows.tokens.length, 4);
  assert.ok(prisma.rows.phones.every((p) => p.pendingExpiresAt != null));
});

// ── district-digest: CT window math ──────────────────────────────────────

test('district-digest window: CST date (UTC-6)', () => {
  const w = yesterdayCtWindow(NOW); // run during CT Jan 15
  assert.equal(w.date, '2026-01-14');
  assert.equal(w.start.toISOString(), '2026-01-14T06:00:00.000Z');
  assert.equal(w.end.toISOString(), '2026-01-15T06:00:00.000Z');
});

test('district-digest window: CDT date (UTC-5)', () => {
  const w = yesterdayCtWindow(new Date('2026-06-15T11:00:00Z')); // CT Jun 15 06:00
  assert.equal(w.date, '2026-06-14');
  assert.equal(w.start.toISOString(), '2026-06-14T05:00:00.000Z');
  assert.equal(w.end.toISOString(), '2026-06-15T05:00:00.000Z');
});

test('district-digest window: late-evening CT run still digests the prior CT day', () => {
  // 23:30 CT Jan 14 (05:30Z Jan 15) — yesterday in CT is Jan 13.
  const w = yesterdayCtWindow(new Date('2026-01-15T05:30:00Z'));
  assert.equal(w.date, '2026-01-13');
  assert.equal(w.start.toISOString(), '2026-01-13T06:00:00.000Z');
  assert.equal(w.end.toISOString(), '2026-01-14T06:00:00.000Z');
});

// ── district-digest: fixtures ─────────────────────────────────────────────

const D = 'Central 1';
const audit = (id, createdAt, member, over = {}) => ({
  id, memberId: `m-${id}`, actorId: 'staff-1', actorName: 'Helper Hannah',
  changeType: 'updated', summary: 'phone1 changed', createdAt,
  member: { firstName: 'Jane', lastName: 'Doe', district: D, ...member },
  ...over,
});
const member = (over = {}) => ({
  id: over.id ?? `mem-${Math.random().toString(36).slice(2, 8)}`,
  firstName: 'Pat', lastName: 'Pending', district: D,
  role: 'saint', status: 'pending', email: null,
  addedAt: new Date('2026-01-01T00:00:00Z'), ...over,
});

function digestFixture() {
  const audits = [
    // In-window for Central 1 (2026-01-14 06:00Z → 2026-01-15 06:00Z).
    audit('c1-a', new Date('2026-01-14T06:00:00Z'), {}),              // start boundary
    audit('c1-b', new Date('2026-01-14T18:00:00Z'), {}),
    audit('c1-c', new Date('2026-01-15T05:59:59Z'), {}),              // end boundary
    // Outside the window.
    audit('c1-early', new Date('2026-01-14T05:59:59Z'), {}),          // 1s before start
    audit('c1-late', new Date('2026-01-15T06:00:00Z'), {}),           // at end
    // Same instant, other districts — exercises the member.district filter.
    audit('north-a', new Date('2026-01-14T12:00:00Z'),
      { firstName: 'Ned', lastName: 'North', district: 'North' }),
    audit('west-a', new Date('2026-01-14T12:00:00Z'),
      { firstName: 'Wes', lastName: 'West', district: 'West' }),
  ];
  const members = [
    // Central 1 recipients: helper + approver with email.
    member({ id: 'h1', firstName: 'Help', lastName: 'Er', role: 'helper',
      status: 'active', email: 'helper@c1.test' }),
    member({ id: 'a1', firstName: 'App', lastName: 'Rover', role: 'approver',
      status: 'active', email: 'approver@c1.test' }),
    // Not recipients: saint with email, helper without email, inactive helper.
    member({ id: 's1', role: 'saint', status: 'active', email: 'saint@c1.test' }),
    member({ id: 'h2', role: 'helper', status: 'active', email: null }),
    member({ id: 'h3', role: 'helper', status: 'inactive', email: 'gone@c1.test' }),
    // Pending in Central 1 — whole-day CT ages vs Jan 15 (addedAt at 20:00Z
    // = 14:00 CT on the listed date).
    member({ id: 'p-age3', firstName: 'Age', lastName: 'Three',
      addedAt: new Date('2026-01-12T20:00:00Z') }), // CT Jan 12 → age 3 ✓
    member({ id: 'p-age4', firstName: 'Age', lastName: 'Four',
      addedAt: new Date('2026-01-11T20:00:00Z') }), // CT Jan 11 → age 4 ✗
    member({ id: 'p-age6', firstName: 'Age', lastName: 'Six',
      addedAt: new Date('2026-01-09T20:00:00Z') }), // CT Jan 9 → age 6 ✓
    member({ id: 'p-age9', firstName: 'Age', lastName: 'Nine',
      addedAt: new Date('2026-01-06T20:00:00Z') }), // CT Jan 6 → age 9 ✓
    member({ id: 'p-age2', firstName: 'Age', lastName: 'Two',
      addedAt: new Date('2026-01-13T20:00:00Z') }), // CT Jan 13 → age 2 ✗
    // North: one recipient + one due pending member.
    member({ id: 'n-help', firstName: 'North', lastName: 'Helper',
      district: 'North', role: 'helper', status: 'active', email: 'north@test' }),
    member({ id: 'n-p3', district: 'North', firstName: 'North', lastName: 'New',
      addedAt: new Date('2026-01-12T20:00:00Z') }), // age 3
  ];
  return { audits, members };
}

const entry = (summary, district) =>
  summary.districts.find((d) => d.district === district);

// The 2026-01-14 CT day in UTC (CST → UTC-6).
const w_START = new Date('2026-01-14T06:00:00Z');
const w_END = new Date('2026-01-15T06:00:00Z');

let sentMail;
let realSend;
beforeEach(() => {
  sentMail = [];
  realSend = digestDeps.sendEmail;
  digestDeps.sendEmail = async (to, subject, html, opts) => {
    sentMail.push({ to, subject, html, opts });
    return { id: `send-${sentMail.length}` };
  };
});
afterEach(() => { digestDeps.sendEmail = realSend; });

test('district-digest: sends per district with yesterday-window changes and 3-day pending', async () => {
  const prisma = makePrisma(digestFixture());
  const summary = await districtDigestJob.run(ctx(prisma));

  assert.equal(summary.date, '2026-01-14');
  assert.equal(summary.districts.length, 12); // every DIRECTORY_DISTRICTS entry reported

  const c1 = entry(summary, D);
  assert.equal(c1.changes, 3);            // window edges included, outside excluded
  assert.equal(c1.pending, 3);            // ages 3, 6, 9 — not 4 or 2
  assert.equal(c1.recipients, 2);
  assert.equal(c1.sent, 2);
  assert.equal(c1.failed, 0);
  assert.equal(c1.skipped, null);
  assert.deepEqual(c1.results.map((r) => r.email),
    ['helper@c1.test', 'approver@c1.test']);
  assert.ok(c1.results.every((r) => r.status === 'sent'));

  const c1Mail = sentMail.find((m) => m.to === 'helper@c1.test');
  assert.equal(c1Mail.subject, 'Directory digest — Central 1 — 2026-01-14');
  assert.match(c1Mail.html, /Changes \(3\)/);
  assert.match(c1Mail.html, /Pending records needing approval \(3\)/);
  assert.match(c1Mail.html, /Jane Doe — updated — Helper Hannah — phone1 changed/);
  assert.match(c1Mail.html, /Age Three — added 2026-01-12/);
  assert.match(c1Mail.html, /Age Nine — added 2026-01-06/);
  assert.doesNotMatch(c1Mail.html, /Age Four/);          // age 4 not a multiple of 3
  assert.match(c1Mail.opts.plainText, /Directory digest — Central 1 — 2026-01-14/);
  assert.match(c1Mail.opts.plainText, /- Jane Doe — updated — Helper Hannah — phone1 changed/);

  const north = entry(summary, 'North');
  assert.equal(north.changes, 1);   // only the North audit, not Central 1's
  assert.equal(north.pending, 1);
  assert.equal(north.sent, 1);

  // West has an audit row but no recipients → recorded, not thrown.
  const west = entry(summary, 'West');
  assert.equal(west.changes, 1);
  assert.equal(west.recipients, 0);
  assert.equal(west.skipped, 'no-recipients');
  assert.equal(west.sent, 0);

  // Quiet districts report 'empty' and send nothing.
  const quiet = entry(summary, 'South');
  assert.equal(quiet.skipped, 'empty');
  assert.equal(quiet.changes, 0);

  // District filter actually reached prisma as a nested member filter.
  const auditCalls = prisma.calls.filter(
    (c) => c.model === 'directoryAuditLog' && c.op === 'findMany');
  assert.ok(auditCalls.every((c) => c.args.where.member.district));
  assert.deepEqual(auditCalls[0].args.where.createdAt,
    { gte: w_START, lt: w_END });
});

test('district-digest: a failing recipient does not stop the rest', async () => {
  digestDeps.sendEmail = async (to, subject, html, opts) => {
    if (to === 'approver@c1.test') throw new Error('mailbox rejected');
    sentMail.push({ to, subject, html, opts });
  };
  const prisma = makePrisma(digestFixture());
  const summary = await districtDigestJob.run(ctx(prisma));

  const c1 = entry(summary, D);
  assert.equal(c1.sent, 1);
  assert.equal(c1.failed, 1);
  const bad = c1.results.find((r) => r.email === 'approver@c1.test');
  assert.equal(bad.status, 'failed');
  assert.match(bad.error, /mailbox rejected/);
  assert.deepEqual(sentMail.map((m) => m.to), ['helper@c1.test', 'north@test']);
  assert.equal(entry(summary, 'North').sent, 1); // other districts unaffected
});

test('district-digest: dry-run sends nothing but reports the would-send content', async () => {
  const prisma = makePrisma(digestFixture());
  const summary = await districtDigestJob.run(ctx(prisma, true));

  assert.equal(sentMail.length, 0);
  const c1 = entry(summary, D);
  assert.equal(c1.skipped, 'dry-run');
  assert.equal(c1.subject, 'Directory digest — Central 1 — 2026-01-14');
  assert.equal(c1.recipients, 2);
  assert.equal(c1.changes, 3);
  assert.equal(c1.pending, 3);
  assert.deepEqual(c1.wouldSend, ['helper@c1.test', 'approver@c1.test']);
  assert.ok(c1.changeLines.some((l) => l.includes('Jane Doe — updated')));
  assert.ok(c1.pendingLines.some((l) => l.includes('Age Six — added 2026-01-09')));
});

test('district-digest: a district with no content and no activity sends nothing', async () => {
  const prisma = makePrisma({ audits: [], members: [
    member({ id: 'only-helper', role: 'helper', status: 'active', email: 'h@c1.test' }),
  ] });
  const summary = await districtDigestJob.run(ctx(prisma));
  assert.equal(sentMail.length, 0);
  const c1 = entry(summary, D);
  assert.equal(c1.skipped, 'empty');
  assert.equal(c1.recipients, 1); // recipient exists — digest was just empty
});

test('district-digest: HTML escapes member-provided text', async () => {
  const prisma = makePrisma({
    audits: [audit('xss', new Date('2026-01-14T12:00:00Z'),
      { firstName: 'A&B <b>', lastName: 'Doe' })],
    members: [member({ id: 'h', role: 'helper', status: 'active', email: 'h@c1.test' })],
  });
  await districtDigestJob.run(ctx(prisma));
  assert.equal(sentMail.length, 1);
  assert.match(sentMail[0].html, /A&amp;B &lt;b&gt; Doe/);
  assert.doesNotMatch(sentMail[0].html, /A&B <b>/);
});

// ── jobs/index.js registration ────────────────────────────────────────────

test('jobs/index registers maintenance + district-digest in run-time order', () => {
  assert.deepEqual(JOBS.map((j) => j.name), ['maintenance', 'district-digest']);
  assert.deepEqual(JOBS[0].schedule, { dailyAt: '03:30' });
  assert.deepEqual(JOBS[1].schedule, { dailyAt: '06:00' });
  assert.ok(JOBS.every((j) => typeof j.run === 'function'));
});
