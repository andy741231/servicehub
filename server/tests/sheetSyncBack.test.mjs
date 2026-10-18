// sheet-sync-back job + CLI guards — fakes only, no network. The job runs
// against a stubbed Sheets client and an in-memory prisma whose
// directoryJobRun model honours the (job, periodKey) unique index the
// withJobLock mutex is built on.

import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  sheetSyncBackJob, deps as jobDeps, applySheetSync,
} from '../src/jobs/sheetSyncBack.js';
import {
  parseArgs, assertApplyAllowed, UsageError, LIVE_SHEET_ID,
} from '../scripts/sheet-sync-back.mjs';
import {
  EXPECTED_HEADERS,
} from '../src/services/sheetSyncPlan.js';

const ENV_KEY = 'SHEET_SYNC_SPREADSHEET_ID';
const savedEnv = {};
const origDeps = { ...jobDeps };

beforeEach(() => {
  savedEnv[ENV_KEY] = process.env[ENV_KEY];
});
afterEach(() => {
  if (savedEnv[ENV_KEY] === undefined) delete process.env[ENV_KEY];
  else process.env[ENV_KEY] = savedEnv[ENV_KEY];
  Object.assign(jobDeps, origDeps);
});

// ── fakes ────────────────────────────────────────────────────────────────────

const p2002 = () => {
  const e = new Error('unique constraint failed');
  e.code = 'P2002';
  return e;
};

const fakePrisma = (members = []) => {
  const jobRuns = new Map(); // 'job|periodKey' → row
  const calls = [];
  const key = (j, p) => `${j}|${p}`;
  return {
    calls, jobRuns,
    directoryMember: {
      findMany: async () => { calls.push('member.findMany'); return members; },
      update: async ({ where, data }) => {
        calls.push(`member.update:${where.id}`);
        const m = members.find((x) => x.id === where.id);
        if (m) Object.assign(m, data);
        return {};
      },
    },
    directoryJobRun: {
      create: async ({ data }) => {
        const k = key(data.job, data.periodKey);
        if (jobRuns.has(k)) throw p2002();
        jobRuns.set(k, { ...data });
        calls.push('jobRun.create');
        return { ...data };
      },
      updateMany: async ({ where, data }) => {
        const row = jobRuns.get(key(where.job, where.periodKey));
        if (row && new Date(row.startedAt) < new Date(where.startedAt.lt)) {
          Object.assign(row, data);
          return { count: 1 };
        }
        return { count: 0 };
      },
      deleteMany: async ({ where }) => {
        const k = key(where.job, where.periodKey);
        const row = jobRuns.get(k);
        if (row && row.summary === where.summary) {
          jobRuns.delete(k);
          return { count: 1 };
        }
        return { count: 0 };
      },
    },
  };
};

const header = () => [...EXPECTED_HEADERS];
const row2 = () => { // the TST sample row every copy carries
  const r = new Array(33).fill('');
  r[0] = 'TST'; r[8] = 'TST'; r[10] = 'Test'; r[11] = 'Row';
  return r;
};
const row3 = () => {
  const r = new Array(33).fill('');
  r[0] = '101'; r[3] = '4/15/24 10:30'; r[8] = 'A'; r[9] = 'North';
  r[10] = 'Solo'; r[11] = 'Saint'; r[12] = '101'; r[15] = 'B';
  r[26] = 'HOU';
  return r;
};
const sheetRows = () => [header(), row2(), row3()];

const SHEET_META = {
  properties: { title: 'Test Phonelist' },
  sheets: [{ properties: {
    title: 'saints', sheetId: 7, gridProperties: { rowCount: 10 },
  } }],
  namedRanges: [],
};

const fakeClient = (formattedRows) => {
  const client = {
    calls: [],
    valueUpdates: [],
    getSpreadsheet: async () => { client.calls.push('spreadsheets.get'); return SHEET_META; },
    getValues: async (id, range, opt) => {
      client.calls.push(`values.get:${opt}`);
      return formattedRows;
    },
    batchUpdate: async (id, requests) => {
      client.calls.push('spreadsheets.batchUpdate');
      client.lastBatchUpdate = requests;
      return {};
    },
    batchUpdateValues: async (id, data) => {
      client.calls.push('values.batchUpdate');
      client.valueUpdates.push(data);
      return {};
    },
  };
  return client;
};

const stubDeps = (client) => {
  jobDeps.loadGoogleCredentials = () => ({ key: {}, subject: 'svc@x' });
  jobDeps.createGoogleTokenSource = () => ({ getToken: async () => 'tok' });
  jobDeps.createSheetsClient = () => client;
};

const member = (over = {}) => ({
  id: 'm-101', legacyId: '101', firstName: 'Solo', lastName: 'Saint',
  status: 'active', role: 'saint', district: 'North', locality: 'Houston',
  gender: 'brother', isHeadOfHousehold: false, spouseMemberId: null,
  spouseFirstName: null, spouseLastName: null,
  changedAt: new Date('2024-04-15T15:30:00Z'),
  addedAt: new Date('2024-01-02T00:00:00Z'), ...over,
});

// ── job: unconfigured / dry-run / lock ───────────────────────────────────────

test('unconfigured: no SHEET_SYNC_SPREADSHEET_ID → skipped no-op', async () => {
  delete process.env[ENV_KEY];
  const prisma = fakePrisma([member()]);
  const res = await sheetSyncBackJob.run({ prisma, now: new Date(), dryRun: false });
  assert.equal(res.skipped, true);
  assert.match(res.reason, /not configured/);
  assert.equal(prisma.calls.length, 0);
});

test('dry run plans but writes nothing — GETs only, no lock, no DB writes', async () => {
  process.env[ENV_KEY] = 'ssid-test';
  const formatted = sheetRows();
  const client = fakeClient(formatted);
  stubDeps(client);
  const prisma = fakePrisma([member({ firstName: 'Changed' })]); // would write
  const res = await sheetSyncBackJob.run({ prisma, now: new Date(), dryRun: true });
  assert.equal(res.dryRun, true);
  assert.equal(res.writes, 2); // K + D
  assert.equal(client.calls.filter((c) => c.includes('batchUpdate')).length, 0);
  assert.equal(prisma.calls.filter((c) => c.startsWith('member.update')).length, 0);
  assert.equal(prisma.jobRuns.size, 0); // dry runs never take the lock
});

test('lock contention → skipped, nothing read or written', async () => {
  process.env[ENV_KEY] = 'ssid-test';
  const client = fakeClient(sheetRows());
  stubDeps(client);
  const prisma = fakePrisma([member()]);
  // a fresh lock held by someone else
  prisma.jobRuns.set('sheet-sync-back|lock', {
    job: 'sheet-sync-back', periodKey: 'lock', status: 'locked',
    summary: 'other-owner', startedAt: new Date(),
  });
  const res = await sheetSyncBackJob.run({ prisma, now: new Date(), dryRun: false });
  assert.equal(res.skipped, true);
  assert.match(res.reason, /already running/);
  assert.equal(prisma.calls.filter((c) => c === 'member.findMany').length, 0);
  assert.equal(client.calls.length, 0);
});

test('live run applies in order: DB assigns → grid batch → values chunks', async () => {
  process.env[ENV_KEY] = 'ssid-test';
  const formatted = sheetRows();
  const client = fakeClient(formatted);
  stubDeps(client);
  const members = [
    member(), // matches — no writes
    member({ id: 'm-new', legacyId: null, status: 'active',
      firstName: 'New', lastName: 'Row' }),
  ];
  const prisma = fakePrisma(members);
  const res = await sheetSyncBackJob.run({ prisma, now: new Date(), dryRun: false });
  assert.equal(res.appends, 1);
  // DB legacyId assignment happened and precedes sheet writes
  assert.equal(members[1].legacyId, '102');
  const dbIdx = prisma.calls.findIndex((c) => c === 'member.update:m-new');
  const sheetWriteIdx = client.calls.findIndex((c) => c.includes('batchUpdate'));
  assert.ok(dbIdx >= 0 && sheetWriteIdx >= 0);
  // grid batch (appendDimension) ran before values.batchUpdate
  assert.ok(
    client.calls.indexOf('spreadsheets.batchUpdate')
    < client.calls.indexOf('values.batchUpdate'));
  // lock released afterwards
  assert.equal(prisma.jobRuns.has('sheet-sync-back|lock'), false);
  // append wrote the whole A:AG row once
  const data = client.valueUpdates.flat();
  assert.ok(data.some((d) => /^saints!A4:AG4$/.test(d.range)));
});

// ── applySheetSync order ──────────────────────────────────────────────────────

test('applySheetSync: legacyIds → ONE batchUpdate → chunked values', async () => {
  const order = [];
  const prisma = {
    directoryMember: { update: async () => { order.push('db'); return {}; } },
  };
  const client = {
    batchUpdate: async (id, requests) => {
      order.push('grid');
      client.reqs = requests;
      return {};
    },
    batchUpdateValues: async () => { order.push('values'); return {}; },
  };
  const plan = {
    appends: [
      { cott: '102', memberId: 'm1', row: 4, assignLegacyId: true,
        values: new Array(33).fill('') },
      { cott: '103', memberId: 'm2', row: 5, assignLegacyId: true,
        values: new Array(33).fill('') },
    ],
    gridOps: { sheetId: 7, appendRows: 2, newRowCount: 12, namedRanges: [
      { namedRangeId: 'nr1', name: 'sa_EntirePhonelist', range: {
        sheetId: 7, startRowIndex: 2, endRowIndex: 10,
        startColumnIndex: 0, endColumnIndex: 27 } },
    ] },
    formatCopy: { sheetId: 7, sourceRow: 3, firstRow: 4, lastRow: 5 },
    writes: [{ row: 3, col: 'K', cott: '101', field: 'firstName',
      before: 'x', after: 'y' }],
  };
  await applySheetSync({ prisma, client, spreadsheetId: 'ssid', plan });
  assert.deepEqual(order, ['db', 'db', 'grid', 'values']);
  // one batchUpdate: appendDimension → copyPaste → updateNamedRange
  assert.equal(client.reqs.length, 3);
  assert.ok(client.reqs[0].appendDimension);
  assert.ok(client.reqs[1].copyPaste);
  assert.ok(client.reqs[2].updateNamedRange);
  const cp = client.reqs[1].copyPaste;
  assert.equal(cp.pasteType, 'PASTE_FORMAT');
  assert.deepEqual(cp.source, { sheetId: 7, startRowIndex: 2, endRowIndex: 3,
    startColumnIndex: 0, endColumnIndex: 33 });
  assert.deepEqual(cp.destination, { sheetId: 7, startRowIndex: 3,
    endRowIndex: 5, startColumnIndex: 0, endColumnIndex: 33 });
});

test('applySheetSync: appends within the grid still send copyPaste', async () => {
  const batches = [];
  const client = {
    batchUpdate: async (id, requests) => { batches.push(requests); return {}; },
    batchUpdateValues: async () => ({}),
  };
  const plan = {
    appends: [{ cott: '102', memberId: 'm1', row: 4, assignLegacyId: false,
      values: new Array(33).fill('') }],
    gridOps: null, // fits — no appendDimension, no named-range growth
    formatCopy: { sheetId: 7, sourceRow: 3, firstRow: 4, lastRow: 4 },
    writes: [],
  };
  const prisma = { directoryMember: { update: async () => ({}) } };
  await applySheetSync({ prisma, client, spreadsheetId: 'ssid', plan });
  assert.equal(batches.length, 1);
  assert.equal(batches[0].length, 1);
  assert.deepEqual(batches[0][0].copyPaste, {
    source: { sheetId: 7, startRowIndex: 2, endRowIndex: 3,
      startColumnIndex: 0, endColumnIndex: 33 },
    destination: { sheetId: 7, startRowIndex: 3, endRowIndex: 4,
      startColumnIndex: 0, endColumnIndex: 33 },
    pasteType: 'PASTE_FORMAT',
  });
});

// ── CLI guards ────────────────────────────────────────────────────────────────

test('CLI parseArgs: --spreadsheet, --apply, and refusal of unknown/--yes', () => {
  assert.deepEqual(parseArgs([]), { spreadsheet: null, apply: false });
  assert.deepEqual(parseArgs(['--spreadsheet', 'abc', '--apply']),
    { spreadsheet: 'abc', apply: true });
  assert.deepEqual(parseArgs(['--spreadsheet=xyz']),
    { spreadsheet: 'xyz', apply: false });
  assert.throws(() => parseArgs(['--yes']), UsageError);
  assert.throws(() => parseArgs(['--nope']), UsageError);
  assert.throws(() => parseArgs(['--spreadsheet']), UsageError);
});

test('CLI live-apply gate: only full production env passes', () => {
  const good = {
    NODE_ENV: 'production',
    DIRECTORY_JOBS_ENABLED: 'true',
    DIRECTORY_JOBS_DRY_RUN: 'maintenance,contacts-sync',
  };
  assert.doesNotThrow(() =>
    assertApplyAllowed({ env: good, database: 'production-servicehub' }));
  for (const [env, db] of [
    [{ ...good, NODE_ENV: 'development' }, 'production-servicehub'],
    [{ ...good, DIRECTORY_JOBS_ENABLED: 'false' }, 'production-servicehub'],
    [{ ...good, DIRECTORY_JOBS_DRY_RUN: 'sheet-sync-back' },
      'production-servicehub'],
    [good, 'test-servicehub'],
    [good, 'unknown'],
  ]) {
    assert.throws(() => assertApplyAllowed({ env, database: db }),
      UsageError);
  }
});

test('CLI targets only --spreadsheet or env — no built-in default', () => {
  // The live id constant is pinned for the production gate.
  assert.equal(LIVE_SHEET_ID, '1KaU6JFCTJb282AxHR-9HOIY7tXfzIO0msNcyd5uJ4zI');
  assert.equal(parseArgs(['--apply']).spreadsheet, null); // env fallback only
});
