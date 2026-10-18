import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { DIRECTORY_DISTRICT_SHORTNAMES } from 'shared';
import { DEFAULT_SETTINGS } from '../src/services/directorySms/settings.js';
import { contactsSyncJob, deps } from '../src/jobs/contactsSync.js';

// ── fakes ───────────────────────────────────────────────────────────────────

const DISTRICT_GROUPS = DEFAULT_SETTINGS['districts.contactGroups'];
const GRN = (name) => `contactGroups/${name.replace(/\W/g, '_')}`;

const makeGroups = () => [
  ...Object.values(DISTRICT_GROUPS).map((n) => ({
    resourceName: GRN(n), name: n, groupType: 'USER_CONTACT_GROUP', memberCount: 10,
  })),
  { resourceName: GRN('AllSaints1'), name: 'AllSaints1', groupType: 'USER_CONTACT_GROUP', memberCount: 243 },
  { resourceName: GRN('SaintsNoEmail'), name: 'SaintsNoEmail', groupType: 'USER_CONTACT_GROUP', memberCount: 122 },
];

const conn = (rn, { fn, ln, email, phone, dist, groups = [] }) => ({
  resourceName: rn, etag: 'e1',
  names: [{ givenName: fn, familyName: ln }],
  emailAddresses: email ? [{ value: email, type: 'home' }] : [],
  phoneNumbers: phone ? [{ value: phone, type: 'mobile' }] : [],
  userDefined: dist ? [{ key: 'dist', value: dist }] : [],
  memberships: groups.map((g) => ({
    contactGroupMembership: { contactGroupResourceName: GRN(g) },
  })),
});

const M = (over = {}) => ({
  id: 'm1', firstName: 'John', lastName: 'Doe', email: 'j@x.test',
  phone1: '281-555-0100', district: 'Central 1', status: 'active',
  googleContactId: 'people/c1', googleSyncHash: null, ...over,
});

const matching = (m, rn, over = {}) => conn(rn, {
  fn: m.firstName, ln: m.lastName, email: m.email,
  phone: m.phone1 ? `+1${m.phone1.replace(/\D/g, '')}` : undefined,
  dist: DIRECTORY_DISTRICT_SHORTNAMES[m.district],
  groups: [DISTRICT_GROUPS[m.district], m.email ? 'AllSaints1' : 'SaintsNoEmail'],
  ...over,
});

// hooks: { update(rn), delete(rn), create(body), modify(rn) } — called after
// recording, lets a test simulate a concurrent writer mid-flight.
// freshContacts — rn → contact object returned to updateContact's mutate
// instead of the plan-time connection (simulates office edits since planning).
function fakeClient({ connections = [], groups = makeGroups(), fail = {},
  hooks = {}, freshContacts } = {}) {
  const calls = { update: [], create: [], delete: [], modify: [], createGroup: [] };
  return {
    calls,
    listConnections: async () => connections,
    listGroups: async () => groups,
    getPerson: async () => null,
    createGroup: async (name) => {
      calls.createGroup.push(name);
      if (fail.createGroup?.includes(name)) throw new Error('group denied');
      return { resourceName: GRN(name), name };
    },
    createContact: async (body) => {
      calls.create.push(body);
      await hooks.create?.(body);
      if (fail.create && calls.create.length > fail.create) {
        throw new Error('create denied');
      }
      return { resourceName: `people/c${9000 + calls.create.length}` };
    },
    updateContact: async (rn, readMask, mutate) => {
      const fresh = freshContacts?.[rn]
        ?? connections.find((c) => c.resourceName === rn) ?? {};
      const next = mutate(fresh);
      calls.update.push({ rn, readMask, fields: next?.fields ?? [],
        person: next?.person });
      await hooks.update?.(rn);
      if (fail.update?.includes(rn)) throw new Error('write denied');
      return next?.fields?.length ? next : { skipped: true };
    },
    deleteContact: async (rn) => {
      calls.delete.push(rn);
      await hooks.delete?.(rn);
      if (fail.delete?.includes(rn)) throw new Error('delete denied');
    },
    modifyGroupMembers: async (rn, ops) => {
      calls.modify.push({ rn, ...ops });
      await hooks.modify?.(rn);
      if (fail.modify?.includes(rn)) throw new Error('modify denied');
    },
  };
}

// In-memory store — real matching for updateMany (CAS) and real row
// mutation, so tests exercise the concurrency paths honestly.
//   members — the plan-time snapshot (top-level OR query returns these)
//   store   — the live rows (findUnique/updateMany, and the delete guard's
//             googleContactId:{not:null} findMany, see mutations)
// opts: fresh (id → row view for findUnique), extraLinked (extra
//       {id,googleContactId} rows appended to the delete guard's live
//       read — simulates a second reference added after planning),
//       failUpdates (first N writes throw), onFirstUpdateMany (store hook
//       fired before the first CAS match — simulates a mid-flight relink)
function fakePrisma(members, { fresh, extraLinked, failUpdates = 0, onFirstUpdateMany } = {}) {
  const store = new Map(members.map((m) => [m.id, { ...m }]));
  const updates = [];
  let writes = 0;
  let updateManyCalls = 0;
  const eq = (row, where) => Object.entries(where)
    .every(([k, v]) => (row[k] ?? null) === (v ?? null));
  // DirectoryJobRun with the real (job, periodKey) unique constraint — the
  // cross-process job lock lives here.
  const runRows = [];
  return {
    updates, store, runRows,
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
        // The delete guard's sole-reference read — live store view.
        if (where?.googleContactId?.not === null && !where?.OR) {
          return [...store.values()]
            .filter((r) => r.googleContactId != null)
            .map((r) => ({ id: r.id, googleContactId: r.googleContactId }))
            .concat(extraLinked ?? []);
        }
        return members; // plan-time snapshot for the top-level OR query
      },
      // Snapshot semantics like real Prisma: the returned object is a copy,
      // so a later store mutation can't retro-actively change `expected`
      // rows used by the CAS writes.
      findUnique: async ({ where: { id } }) => {
        const row = fresh?.[id] ?? store.get(id);
        return row ? { ...row } : null;
      },
      update: async ({ where: { id }, data }) => {
        writes += 1;
        if (writes <= failUpdates) throw new Error('db write failed');
        const row = store.get(id);
        if (!row) throw new Error('member missing');
        Object.assign(row, data);
        updates.push({ id, ...data });
        return { id, ...data };
      },
      updateMany: async ({ where, data }) => {
        writes += 1;
        if (writes <= failUpdates) throw new Error('db write failed');
        updateManyCalls += 1;
        if (updateManyCalls === 1) onFirstUpdateMany?.(store);
        let count = 0;
        for (const row of store.values()) {
          if (eq(row, where)) {
            Object.assign(row, data);
            updates.push({ id: row.id, ...data });
            count += 1;
          }
        }
        return { count };
      },
    },
  };
}

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

const runJob = (members, connections, opts = {}) => {
  const { dryRun = true, force = false, client, prismaOpts } = opts;
  const prisma = fakePrisma(members, prismaOpts);
  const c = client ?? fakeClient({ connections });
  deps.createPeopleClient = () => c;
  return contactsSyncJob.run({ prisma, now: new Date(), dryRun, force })
    .then((summary) => ({ summary, prisma, client: c }));
};

// ── dry run ─────────────────────────────────────────────────────────────────

test('dry run: plans but writes nothing to Google or the DB', async () => {
  const m = M({ firstName: 'Johnny' }); // name drift → update planned
  const { summary, prisma, client } = await runJob(
    [m], [matching(M(), 'people/c1')], { dryRun: true });
  assert.equal(summary.dryRun, true);
  assert.equal(summary.ops.update, 1);
  assert.equal(client.calls.update.length, 0);
  assert.equal(client.calls.delete.length, 0);
  assert.equal(client.calls.create.length, 0);
  assert.equal(client.calls.modify.length, 0);
  assert.equal(prisma.updates.length, 0);
});

// ── circuit breaker ─────────────────────────────────────────────────────────

const manyDeletes = (n) => ({
  members: Array.from({ length: n }, (_, i) =>
    M({ id: `d${i}`, status: 'moved', googleContactId: `people/c${3000 + i}` })),
  connections: Array.from({ length: n }, (_, i) =>
    conn(`people/c${3000 + i}`, { fn: 'X', ln: `${i}` })),
});

test('breaker: live throws, dry-run reports, force bypasses', async () => {
  const { members, connections } = manyDeletes(26);

  // live without force → throws
  deps.createPeopleClient = () => fakeClient({ connections });
  const prisma = fakePrisma(members);
  await assert.rejects(
    contactsSyncJob.run({ prisma, now: new Date(), dryRun: false, force: false }),
    /Circuit breaker: 26 deletes \/ 0 creates exceeds limit/);

  // dry run → breakerTripped, no throw
  const dry = await runJob(members, connections, { dryRun: true });
  assert.equal(dry.summary.breakerTripped, true);
  assert.equal(dry.summary.ops.delete, 26);

  // force → applies
  const live = await runJob(members, connections, { dryRun: false, force: true });
  assert.equal(live.summary.applied.synced, 26);
  assert.equal(live.client.calls.delete.length, 26);
});

// ── apply behavior ──────────────────────────────────────────────────────────

test('update applies fields, batches group adds, writes hash + clears error', async () => {
  // Two members both need district group moves → one modifyGroupMembers call.
  const m1 = M({ id: 'm1', district: 'North', googleContactId: 'people/c1' });
  const m2 = M({ id: 'm2', district: 'North', googleContactId: 'people/c2' });
  const c1 = matching(m1, 'people/c1', { dist: 'C1', groups: ['_C1', 'AllSaints1'] });
  const c2 = matching(m2, 'people/c2', { dist: 'C1', groups: ['_C1', 'AllSaints1'] });
  const { summary, prisma, client } = await runJob([m1, m2], [c1, c2], { dryRun: false });

  assert.equal(client.calls.update.length, 2); // dist field changed
  // _C1 removal + _North add → 2 modify calls total (batched per group)
  const modRns = client.calls.modify.map((c) => c.rn);
  assert.ok(modRns.includes(GRN('_North')) && modRns.includes(GRN('_C1')));
  const northCall = client.calls.modify.find((c) => c.rn === GRN('_North'));
  assert.deepEqual(new Set(northCall.add), new Set(['people/c1', 'people/c2']));

  const u1 = prisma.updates.find((u) => u.id === 'm1' && u.googleSyncHash);
  assert.ok(u1.googleSyncHash);
  assert.ok(u1.googleSyncedAt instanceof Date);
  assert.equal(u1.googleSyncError, null);
  assert.equal(summary.applied.synced, 2);
});

test('per-member API failure sets googleSyncError and continues', async () => {
  const m1 = M({ id: 'm1', firstName: 'Broke', googleContactId: 'people/c1' });
  const m2 = M({ id: 'm2', firstName: 'Fine', googleContactId: 'people/c2' });
  const connections = [
    matching(M(), 'people/c1'), matching(M(), 'people/c2'),
  ];
  const client = fakeClient({ connections, fail: { update: ['people/c1'] } });
  const { prisma, summary } = await runJob([m1, m2], connections, { dryRun: false, client });

  const failed = prisma.updates.find((u) => u.id === 'm1');
  assert.match(failed.googleSyncError, /write denied/);
  assert.equal(failed.googleSyncHash, undefined); // hash left unset → retries
  const ok = prisma.updates.find((u) => u.id === 'm2');
  assert.ok(ok.googleSyncHash);
  assert.equal(summary.applied.synced, 1);
  assert.equal(summary.applied.syncErrors, 1);
});

test('delete clears id and writes hash; missing contact → clear-id only', async () => {
  const gone = M({ id: 'm1', status: 'inactive', googleContactId: 'people/c1' });
  const stale = M({ id: 'm2', status: 'inactive', googleContactId: 'people/c404' });
  const { prisma, client } = await runJob(
    [gone, stale], [conn('people/c1', { fn: 'John', ln: 'Doe' })],
    { dryRun: false });
  assert.deepEqual(client.calls.delete, ['people/c1']);
  const u1 = prisma.updates.find((u) => u.id === 'm1');
  assert.equal(u1.googleContactId, null);
  assert.ok(u1.googleSyncHash);
  const u2 = prisma.updates.find((u) => u.id === 'm2');
  assert.equal(u2.googleContactId, null);
  assert.equal(client.calls.delete.length, 1); // c404 never hit the API
});

test('create persists the new id via CAS immediately, then resolves deferred groups', async () => {
  const m = M({ googleContactId: null, email: 'n@x.test', district: 'West' });
  const { prisma, client } = await runJob([m], [], { dryRun: false });
  assert.equal(client.calls.create.length, 1);
  // First member write: the bare identity — hash/syncedAt stay null until
  // every deferred group change has landed.
  const first = prisma.updates.find((x) => x.id === 'm1');
  assert.equal(first.googleContactId, 'people/c9001');
  assert.equal(first.googleSyncHash, null);
  assert.equal(first.googleSyncedAt, null);
  // The live row really carries the id now — not just the updates log.
  assert.equal(prisma.store.get('m1').googleContactId, 'people/c9001');
  // Final write: the full success marker.
  const last = prisma.updates.findLast((x) => x.id === 'm1');
  assert.equal(last.googleContactId, 'people/c9001');
  assert.ok(last.googleSyncHash);
  // memberships were embedded in the create body (groups all existed)
  const mrns = client.calls.create[0].memberships
    .map((x) => x.contactGroupMembership.contactGroupResourceName);
  assert.ok(mrns.includes(GRN('_West')) && mrns.includes(GRN('AllSaints1')));
});

test('link persists the id before field and group work', async () => {
  const m = M({ googleContactId: null, email: 'match@x.test', firstName: 'Johnny' });
  const orphan = conn('people/c501', {
    fn: 'John', ln: 'Doe', email: 'match@x.test', dist: 'C1',
    groups: ['_C1', 'AllSaints1'],
  });
  const { prisma, summary } = await runJob([m], [orphan], { dryRun: false });
  assert.equal(summary.ops.link, 1);
  const first = prisma.updates.find((x) => x.id === 'm1');
  assert.equal(first.googleContactId, 'people/c501');
  assert.equal(first.googleSyncHash, null); // identity saved before groups
  const last = prisma.updates.findLast((x) => x.id === 'm1');
  assert.ok(last.googleSyncHash);
});

test('identity link sets googleContactId then reconciles fields', async () => {
  const m = M({ googleContactId: null, email: 'match@x.test' });
  const orphan = conn('people/c501', {
    fn: 'John', ln: 'Doe', email: 'match@x.test', dist: 'C1',
    groups: ['_C1', 'AllSaints1'],
  });
  const { prisma, summary } = await runJob([m], [orphan], { dryRun: false });
  assert.equal(summary.ops.link, 1);
  const u = prisma.updates.findLast((x) => x.id === 'm1');
  assert.equal(u.googleContactId, 'people/c501');
});

test('mark-synced writes hash only — no Google calls', async () => {
  const m = M();
  const { prisma, client } = await runJob([m], [matching(m, 'people/c1')],
    { dryRun: false });
  assert.equal(client.calls.update.length, 0);
  assert.equal(client.calls.modify.length, 0);
  const u = prisma.updates.find((x) => x.id === 'm1');
  assert.ok(u.googleSyncHash);
});

// ── recovery paths ──────────────────────────────────────────────────────────

test('group failure after create leaves the id persisted but hash null', async () => {
  // SaintsNoEmail missing → create-group planned; the group modify then fails.
  const groups = makeGroups().filter((g) => g.name !== 'SaintsNoEmail');
  const m = M({ googleContactId: null, email: null }); // no email → SaintsNoEmail
  const client = fakeClient({
    connections: [], groups,
    fail: { modify: [GRN('SaintsNoEmail')] },
  });
  const { prisma, summary } = await runJob([m], [], { dryRun: false, client });

  assert.equal(client.calls.create.length, 1);
  const persisted = prisma.updates.find((u) => u.id === 'm1'
    && u.googleContactId === 'people/c9001');
  assert.equal(persisted.googleSyncHash, null); // identity saved, hash not
  // the live row keeps the id and still has no hash → retried next run
  const row = prisma.store.get('m1');
  assert.equal(row.googleContactId, 'people/c9001');
  assert.equal(row.googleSyncHash ?? null, null);
  assert.match(row.googleSyncError, /group membership update failed/);
  assert.equal(summary.applied.synced, 0);
  assert.equal(summary.applied.groupsFailed, 1);
});

test('a failed id-persist after create aborts the whole apply', async () => {
  const m1 = M({ id: 'm1', googleContactId: null });
  const m2 = M({ id: 'm2', googleContactId: null, email: 'm2@x.test' });
  const prisma = fakePrisma([m1, m2], { failUpdates: 1 }); // first write throws
  const client = fakeClient({ connections: [] });
  deps.createPeopleClient = () => client;
  await assert.rejects(
    contactsSyncJob.run({ prisma, now: new Date(), dryRun: false }),
    /aborting apply/);
  // the second member's createContact never ran
  assert.equal(client.calls.create.length, 1);
});

test('a CAS-failed id-persist after create aborts without clobbering a relink', async () => {
  // Another writer links the member to a different contact while our
  // createContact is in flight → guardedUpdate matches 0 rows → abort.
  const m = M({ id: 'm1', googleContactId: null });
  const prisma = fakePrisma([m]);
  const client = fakeClient({
    connections: [],
    hooks: { create: () => { prisma.store.get('m1').googleContactId = 'people/c888'; } },
  });
  deps.createPeopleClient = () => client;
  await assert.rejects(
    contactsSyncJob.run({ prisma, now: new Date(), dryRun: false }),
    /aborting apply/);
  assert.equal(client.calls.create.length, 1);
  assert.equal(prisma.store.get('m1').googleContactId, 'people/c888'); // kept
});

test('ops needing a group that failed creation are skipped — no orphan contact', async () => {
  const groups = makeGroups().filter((g) => g.name !== 'SaintsNoEmail');
  const m = M({ googleContactId: null, email: null });
  const client = fakeClient({
    connections: [], groups, fail: { createGroup: ['SaintsNoEmail'] },
  });
  const { prisma } = await runJob([m], [], { dryRun: false, client });
  assert.equal(client.calls.createGroup.length, 1);       // attempted
  assert.equal(client.calls.create.length, 0);            // contact skipped
  const u = prisma.updates.find((x) => x.id === 'm1');
  assert.match(u.googleSyncError, /group could not be created/);
  assert.equal(u.googleContactId, undefined);             // id never written
});

// ── stale-plan and CAS guards ───────────────────────────────────────────────

test('member activated after planning → zero deletes', async () => {
  const m = M({ id: 'm1', status: 'inactive', googleContactId: 'people/c1' });
  const fresh = { m1: { ...m, status: 'active' } }; // flipped since planning
  const { prisma, client } = await runJob(
    [m], [conn('people/c1', { fn: 'John', ln: 'Doe' })],
    { dryRun: false, prismaOpts: { fresh } });
  assert.equal(client.calls.delete.length, 0);
  const u = prisma.updates.find((x) => x.id === 'm1');
  assert.match(u.googleSyncError, /changed since planning/);
});

test('member relinked after planning → zero updates and zero deletes', async () => {
  const m = M({ id: 'm1', firstName: 'Changed', googleContactId: 'people/c1' });
  const fresh = { m1: { ...m, googleContactId: 'people/c888' } };
  const { prisma, client } = await runJob(
    [m], [matching({ ...m, firstName: 'John' }, 'people/c1')],
    { dryRun: false, prismaOpts: { fresh } });
  assert.equal(client.calls.update.length, 0);
  assert.equal(client.calls.delete.length, 0);
  const u = prisma.updates.find((x) => x.id === 'm1');
  assert.match(u.googleSyncError, /changed since planning/);
});

test('a second reference added after planning → delete skipped', async () => {
  const m = M({ id: 'm1', status: 'inactive', googleContactId: 'people/c1' });
  const { prisma, client } = await runJob(
    [m], [conn('people/c1', { fn: 'John', ln: 'Doe' })],
    {
      dryRun: false,
      // someone else references the contact now — canonical form
      prismaOpts: { extraLinked: [{ id: 'z1', googleContactId: 'people/c1' }] },
    });
  assert.equal(client.calls.delete.length, 0);
  const u = prisma.updates.find((x) => x.id === 'm1');
  assert.match(u.googleSyncError, /2 member references/);
});

test('a leading-zero alias reference added after planning → delete skipped', async () => {
  const m = M({ id: 'm1', status: 'inactive', googleContactId: 'people/c1' });
  const { prisma, client } = await runJob(
    [m], [conn('people/c1', { fn: 'John', ln: 'Doe' })],
    {
      dryRun: false,
      // 'people/c0001' normalizes to the same contact — must still block
      prismaOpts: { extraLinked: [{ id: 'z1', googleContactId: 'people/c0001' }] },
    });
  assert.equal(client.calls.delete.length, 0);
  const u = prisma.updates.find((x) => x.id === 'm1');
  assert.match(u.googleSyncError, /2 member references/);
});

test('sole inactive owner of a legacy-URL id → contact deleted, row cleared', async () => {
  const legacy = 'https://google.com/m8/feeds/contacts/example%40example.test/base/ff';
  const m = M({ id: 'm1', status: 'inactive', googleContactId: legacy });
  const { prisma, client } = await runJob(
    [m], [conn('people/c255', { fn: 'John', ln: 'Doe' })], { dryRun: false });
  // planner normalized the legacy URL; the live ref-read did too → refs 1
  assert.deepEqual(client.calls.delete, ['people/c255']);
  const row = prisma.store.get('m1');
  assert.equal(row.googleContactId, null);
  assert.ok(row.googleSyncHash);
});

test('relink between stale-check and mark-synced write → new id preserved', async () => {
  const m = M(); // matches the contact → mark-synced planned
  const { prisma } = await runJob([m], [matching(m, 'people/c1')], {
    dryRun: false,
    prismaOpts: {
      onFirstUpdateMany: (store) => {
        store.get('m1').googleContactId = 'people/c888'; // concurrent relink
      },
    },
  });
  const row = prisma.store.get('m1');
  assert.equal(row.googleContactId, 'people/c888');      // not overwritten
  assert.equal(row.googleSyncHash ?? null, null);        // stale hash not saved
  assert.match(row.googleSyncError, /member changed during sync/);
});

test('relink between stale-check and clear-id write → new id preserved', async () => {
  // inactive member whose stored contact is already gone → clear-id
  const m = M({ id: 'm1', status: 'inactive', googleContactId: 'people/c404' });
  const { prisma } = await runJob([m], [], {
    dryRun: false,
    prismaOpts: {
      onFirstUpdateMany: (store) => {
        store.get('m1').googleContactId = 'people/c888';
      },
    },
  });
  const row = prisma.store.get('m1');
  assert.equal(row.googleContactId, 'people/c888'); // relink survives
  assert.match(row.googleSyncError, /member changed during sync/);
});

test('relink during the Google update → pass-4 CAS preserves the new id', async () => {
  const m = M({ id: 'm1', firstName: 'Changed', googleContactId: 'people/c1' });
  const prisma = fakePrisma([m]);
  const client = fakeClient({
    connections: [matching({ ...m, firstName: 'John' }, 'people/c1')],
    hooks: {
      update: () => { prisma.store.get('m1').googleContactId = 'people/c888'; },
    },
  });
  deps.createPeopleClient = () => client;
  const summary = await contactsSyncJob.run(
    { prisma, now: new Date(), dryRun: false });
  assert.equal(client.calls.update.length, 1); // Google write went out
  const row = prisma.store.get('m1');
  assert.equal(row.googleContactId, 'people/c888');   // pass-4 did NOT restore c1
  assert.equal(row.googleSyncHash ?? null, null);     // no stale success marker
  assert.match(row.googleSyncError, /member changed during sync/);
  assert.equal(summary.applied.synced, 0);
  assert.equal(summary.applied.syncErrors, 1);
});

test('relink during deleteContact → row keeps new id; remote delete stands', async () => {
  const m = M({ id: 'm1', status: 'inactive', googleContactId: 'people/c1' });
  const prisma = fakePrisma([m]);
  const client = fakeClient({
    connections: [conn('people/c1', { fn: 'John', ln: 'Doe' })],
    hooks: {
      delete: () => { prisma.store.get('m1').googleContactId = 'people/c888'; },
    },
  });
  deps.createPeopleClient = () => client;
  await contactsSyncJob.run({ prisma, now: new Date(), dryRun: false });
  assert.equal(client.calls.delete.length, 1);          // remote delete happened
  const row = prisma.store.get('m1');
  assert.equal(row.googleContactId, 'people/c888');     // new id NOT cleared
  assert.match(row.googleSyncError, /member changed during sync/);
});

// ── fresh-data recompute inside the etag window ────────────────────────────

test('office-added work email is preserved — the PATCH is computed fresh', async () => {
  // Plan-time connection has the old home email only. Since planning, the
  // office added a work email on the Google side — the write must keep it
  // and change only the home entry (ports scratch repro #2).
  const m = M({ email: 'new-home@x.test' });
  const planConn = matching({ ...m, email: 'old-home@x.test' }, 'people/c1');
  const freshConn = { ...planConn };
  freshConn.emailAddresses = [
    { value: 'old-home@x.test', type: 'home' },
    { value: 'office-work@x.test', type: 'work' },
  ];
  const client = fakeClient({
    connections: [planConn],
    freshContacts: { 'people/c1': freshConn },
  });
  const { prisma, summary } = await runJob([m], [planConn], { dryRun: false, client });
  assert.equal(summary.ops.update, 1);
  const u = client.calls.update[0];
  const emails = u.person.emailAddresses.map((e) => e.value);
  assert.ok(emails.includes('office-work@x.test'));  // office edit kept
  assert.ok(emails.includes('new-home@x.test'));     // home updated
  assert.ok(!emails.includes('old-home@x.test'));
  assert.ok(prisma.updates.find((x) => x.id === 'm1').googleSyncHash);
});

test('fresh contact already matches → no PATCH fields, member still synced', async () => {
  // Planning saw a stale email; by the time updateContact reads the
  // contact the value is already right → skipped PATCH, but pass-4 still
  // writes the sync marker.
  const m = M({ email: 'new@x.test' });
  const staleConn = matching({ ...m, email: 'old@x.test' }, 'people/c1');
  const client = fakeClient({
    connections: [staleConn],
    freshContacts: { 'people/c1': matching(m, 'people/c1') },
  });
  const { prisma, summary } = await runJob([m], [staleConn], { dryRun: false, client });
  assert.equal(summary.ops.update, 1);             // planned on stale data
  assert.equal(client.calls.update.length, 1);
  assert.deepEqual(client.calls.update[0].fields, []); // nothing PATCHed
  const u = prisma.updates.find((x) => x.id === 'm1');
  assert.ok(u.googleSyncHash);                     // synced via pass 4
  assert.equal(summary.applied.synced, 1);
});

test('updateContact failure → member error, no hash (retried next run)', async () => {
  const m = M({ firstName: 'Broke' });
  const client = fakeClient({
    connections: [matching({ ...m, firstName: 'John' }, 'people/c1')],
    fail: { update: ['people/c1'] },
  });
  const { prisma, summary } = await runJob([m], [], { dryRun: false, client });
  const u = prisma.updates.find((x) => x.id === 'm1');
  assert.match(u.googleSyncError, /write denied/);
  assert.equal(u.googleSyncHash, undefined);
  assert.equal(summary.applied.synced, 0);
});

// ── cross-process job lock ──────────────────────────────────────────────────

test('live run holds the job lock; a concurrent live run skips entirely', async () => {
  const m = M({ googleContactId: null, email: 'n@x.test' });
  const prisma = fakePrisma([m]);
  const client = fakeClient({ connections: [] });
  deps.createPeopleClient = () => client;
  const [a, b] = await Promise.all([
    contactsSyncJob.run({ prisma, now: new Date(), dryRun: false }),
    contactsSyncJob.run({ prisma, now: new Date(), dryRun: false }),
  ]);
  const skipped = [a, b].find((s) => s?.skipped);
  assert.equal(skipped?.reason, 'contacts-sync already running');
  assert.equal(client.calls.create.length, 1); // exactly one create total
  // the lock row was released — nothing left behind
  assert.equal(prisma.runRows.length, 0);
});

test('a held lock skips the run before any member read or Google call', async () => {
  const m = M({ googleContactId: null });
  const prisma = fakePrisma([m]);
  // Pre-hold the lock — the run must not touch members or Google at all.
  prisma.runRows.push({
    id: 'lock-1', job: 'contacts-sync', periodKey: 'lock',
    status: 'locked', summary: 'other-token', startedAt: new Date(),
  });
  const client = fakeClient({ connections: [] });
  deps.createPeopleClient = () => client;
  const summary = await contactsSyncJob.run(
    { prisma, now: new Date(), dryRun: false });
  assert.deepEqual(summary,
    { skipped: true, reason: 'contacts-sync already running' });
  assert.equal(prisma.runRows.length, 1);       // foreign lock untouched
  assert.equal(client.calls.create.length, 0);
});

test('a stale lock is taken over and released; dry runs never lock', async () => {
  const m = M({ googleContactId: null });
  const prisma = fakePrisma([m]);
  const client = fakeClient({ connections: [] });
  deps.createPeopleClient = () => client;
  // Abandoned 3h-old lock → the live run takes it over, applies, releases.
  prisma.runRows.push({
    id: 'lock-old', job: 'contacts-sync', periodKey: 'lock',
    status: 'locked', summary: 'dead-token',
    startedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
  });
  const summary = await contactsSyncJob.run(
    { prisma, now: new Date(), dryRun: false });
  assert.equal(client.calls.create.length, 1); // ran to completion
  assert.equal(prisma.runRows.length, 0);      // lock released
  assert.ok(summary.applied.synced >= 0);

  // A dry run performs the whole plan without touching the lock table.
  const dry = await contactsSyncJob.run(
    { prisma, now: new Date(), dryRun: true });
  assert.equal(dry.dryRun, true);
  assert.equal(prisma.runRows.length, 0);      // still no lock rows
});
