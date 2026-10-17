import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  acquireJobLock, releaseJobLock, withJobLock, LOCK_PERIOD,
} from '../src/jobs/jobLock.js';
import { createScheduler } from '../src/jobs/scheduler.js';
import { contactsSyncJob, deps } from '../src/jobs/contactsSync.js';
import { DEFAULT_SETTINGS } from '../src/services/directorySms/settings.js';

// ── fake prisma — real (job, periodKey) unique-index semantics ─────────────
// The lock is just a DirectoryJobRun row at periodKey 'lock'; the fake must
// enforce the constraint honestly so takeover/release races are exercised.

function fakePrisma({ members = [] } = {}) {
  const runRows = [];
  const store = new Map(members.map((m) => [m.id, { ...m }]));
  const eq = (row, where) => Object.entries(where)
    .every(([k, v]) => (row[k] ?? null) === (v ?? null));
  return {
    runRows, store,
    directoryJobRun: {
      create: async ({ data }) => {
        if (runRows.some((r) => r.job === data.job
            && r.periodKey === data.periodKey)) {
          const e = new Error('unique violation'); e.code = 'P2002'; throw e;
        }
        const row = { id: `run-${runRows.length + 1}`, ...data };
        runRows.push(row);
        return row;
      },
      update: async ({ where, data }) => {
        const row = runRows.find((r) => r.id === where.id);
        Object.assign(row, data);
        return row;
      },
      updateMany: async ({ where, data }) => {
        let count = 0;
        for (const r of runRows) {
          if (r.job === where.job && r.periodKey === where.periodKey
              && (where.startedAt?.lt === undefined
                  || r.startedAt < where.startedAt.lt)) {
            Object.assign(r, data); count += 1;
          }
        }
        return { count };
      },
      deleteMany: async ({ where }) => {
        let count = 0;
        for (let i = runRows.length - 1; i >= 0; i--) {
          const r = runRows[i];
          if (r.job === where.job && r.periodKey === where.periodKey
              && (where.summary === undefined || r.summary === where.summary)) {
            runRows.splice(i, 1); count += 1;
          }
        }
        return { count };
      },
    },
    directoryMember: {
      findMany: async ({ where } = {}) => {
        if (where?.googleContactId?.not === null && !where?.OR) {
          return [...store.values()]
            .filter((r) => r.googleContactId != null)
            .map((r) => ({ id: r.id, googleContactId: r.googleContactId }));
        }
        return members;
      },
      findUnique: async ({ where: { id } }) => {
        const row = store.get(id);
        return row ? { ...row } : null;
      },
      update: async ({ where: { id }, data }) => {
        const row = store.get(id);
        if (!row) throw new Error('member missing');
        Object.assign(row, data);
        return row;
      },
      updateMany: async ({ where, data }) => {
        let count = 0;
        for (const row of store.values()) {
          if (eq(row, where)) { Object.assign(row, data); count += 1; }
        }
        return { count };
      },
    },
  };
}

// ── acquire / release mechanics ─────────────────────────────────────────────

test('acquireJobLock: free → token; held → null (fresh lock not taken over)', async () => {
  const p = fakePrisma();
  const a = await acquireJobLock(p, 'job-a');
  assert.ok(a.token);
  assert.equal(p.runRows.length, 1);
  assert.equal(p.runRows[0].periodKey, LOCK_PERIOD);
  assert.equal(p.runRows[0].status, 'locked');
  assert.equal(p.runRows[0].summary, a.token);
  // a second acquire hits P2002, then the takeover finds a FRESH lock → null
  assert.equal(await acquireJobLock(p, 'job-a'), null);
  // a different job is unaffected
  assert.ok((await acquireJobLock(p, 'job-b')).token);
});

test('acquireJobLock: a stale lock (older than ttl) is taken over', async () => {
  const p = fakePrisma();
  const dead = new Date(Date.now() - 3 * 60 * 60 * 1000);
  p.runRows.push({
    id: 'r0', job: 'job-a', periodKey: LOCK_PERIOD,
    status: 'locked', summary: 'dead-token', startedAt: dead,
  });
  const a = await acquireJobLock(p, 'job-a');
  assert.ok(a.token);
  assert.equal(p.runRows.length, 1);
  assert.equal(p.runRows[0].summary, a.token); // same row, new token
  assert.ok(p.runRows[0].startedAt > dead);
});

test('acquireJobLock: non-P2002 create errors propagate', async () => {
  const p = fakePrisma();
  p.directoryJobRun.create = async () => {
    const e = new Error('db gone'); e.code = 'P1001'; throw e;
  };
  await assert.rejects(acquireJobLock(p, 'job-a'), /db gone/);
});

test('releaseJobLock: only the owner token releases — non-owner is a no-op', async () => {
  const p = fakePrisma();
  const a = await acquireJobLock(p, 'job-a');
  await releaseJobLock(p, 'job-a', 'not-the-owner');
  assert.equal(p.runRows.length, 1);               // still locked
  await releaseJobLock(p, 'job-a', a.token);
  assert.equal(p.runRows.length, 0);               // released
});

test('withJobLock: not acquired → { locked:false }; release happens on throw', async () => {
  const p = fakePrisma();
  const a = await acquireJobLock(p, 'job-a');
  const out = await withJobLock(p, 'job-a', async () => 'never');
  assert.deepEqual(out, { locked: false });
  await releaseJobLock(p, 'job-a', a.token);

  const ok = await withJobLock(p, 'job-a', async () => 'ran');
  assert.deepEqual(ok, { locked: true, result: 'ran' });
  assert.equal(p.runRows.length, 0);               // released after success

  await assert.rejects(
    withJobLock(p, 'job-a', async () => { throw new Error('boom'); }),
    /boom/);
  assert.equal(p.runRows.length, 0);               // released after throw too
});

// ── two scheduler instances, one prisma — the overlap repro ────────────────

const GRN = (name) => `contactGroups/${name.replace(/\W/g, '_')}`;
const DISTRICT_GROUPS = DEFAULT_SETTINGS['districts.contactGroups'];

const groups = () => [
  ...Object.values(DISTRICT_GROUPS).map((n) => ({
    resourceName: GRN(n), name: n,
    groupType: 'USER_CONTACT_GROUP', memberCount: 10,
  })),
  { resourceName: GRN('AllSaints1'), name: 'AllSaints1',
    groupType: 'USER_CONTACT_GROUP', memberCount: 243 },
  { resourceName: GRN('SaintsNoEmail'), name: 'SaintsNoEmail',
    groupType: 'USER_CONTACT_GROUP', memberCount: 122 },
];

let saved;
beforeEach(() => {
  saved = { ...deps };
  deps.loadGoogleCredentials = () => ({ key: {}, subject: 'x' });
  deps.createGoogleTokenSource = () => ({ getToken: async () => 'tok' });
  deps.getSettings = async () => DEFAULT_SETTINGS;
});
afterEach(() => {
  Object.assign(deps, saved);
});

test('overlapping live runs in two scheduler instances → exactly one contact created', async () => {
  // Ports scratch/s20-sol61-review-repros.mjs overlappingCreates: two
  // scheduler instances share one prisma; each manually fires contacts-sync
  // live. Without the job lock both would create the same contact.
  const member = {
    id: 'm1', firstName: 'New', lastName: 'Person', email: 'n@x.test',
    phone1: '281-555-0100', district: 'Central 1', status: 'active',
    googleContactId: null, googleSyncHash: null,
  };
  const prisma = fakePrisma({ members: [member] });
  const creates = [];
  const client = {
    listConnections: async () => [],
    listGroups: async () => groups(),
    createContact: async (body) => {
      // yield so the overlap is real, not sequential
      await new Promise((r) => setTimeout(r, 5));
      creates.push(body);
      return { resourceName: 'people/c9001' };
    },
    updateContact: async () => ({}),
    deleteContact: async () => ({}),
    modifyGroupMembers: async () => {},
    createGroup: async (name) => ({ resourceName: GRN(name), name }),
  };
  deps.createPeopleClient = () => client;

  const mk = (now) => createScheduler({
    prisma, jobs: [contactsSyncJob], enabled: true,
    now: () => now, log: { error: () => {}, log: () => {} },
  });
  const s1 = mk(new Date('2026-09-27T14:44:00Z'));
  const s2 = mk(new Date('2026-09-27T14:44:01Z')); // different manual lease key

  const [r1, r2] = await Promise.all([
    s1.runJob('contacts-sync', { manual: true }),
    s2.runJob('contacts-sync', { manual: true }),
  ]);
  assert.equal(creates.length, 1); // the whole point: no duplicate contact
  const summaries = [r1, r2].map((r) => JSON.parse(r.summary ?? 'null'));
  assert.ok(summaries.some((s) => s?.skipped === true
    && s.reason === 'contacts-sync already running'));
  // both lease rows exist; the lock row itself is gone
  assert.equal(prisma.runRows.filter((r) => r.periodKey === LOCK_PERIOD).length, 0);
  assert.equal(prisma.runRows.filter((r) => r.periodKey !== LOCK_PERIOD).length, 2);
});
