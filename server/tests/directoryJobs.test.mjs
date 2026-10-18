import { test } from 'node:test';
import assert from 'node:assert/strict';
import { periodKeyFor, createScheduler } from '../src/jobs/scheduler.js';
import { listJobs, runJob, deps } from '../src/controllers/directoryJobs.js';

// ── periodKeyFor (America/Chicago) ──────────────────────────────────────────
// 2026-09 is CDT (UTC-5); 2026-01 is CST (UTC-6).

test('periodKeyFor: everyMinutes floors to the CT bucket', () => {
  // 14:44Z → 09:44 CT → 09:30 bucket
  assert.equal(
    periodKeyFor({ everyMinutes: 30 }, new Date('2026-09-27T14:44:00Z')),
    '2026-09-27T09:30');
  // exact boundary lands in its own bucket
  assert.equal(
    periodKeyFor({ everyMinutes: 30 }, new Date('2026-09-27T15:00:00Z')),
    '2026-09-27T10:00');
});

test('periodKeyFor: UTC→CT date rollover', () => {
  // 03:00Z Sep 28 is still Sep 27 22:00 in Chicago
  assert.equal(
    periodKeyFor({ everyMinutes: 30 }, new Date('2026-09-28T03:00:00Z')),
    '2026-09-27T22:00');
  assert.equal(
    periodKeyFor({ dailyAt: '02:00' }, new Date('2026-09-28T03:00:00Z')),
    '2026-09-27');
});

test('periodKeyFor: CST vs CDT dates', () => {
  // CST: 06:00Z Jan 15 → 00:00 CT Jan 15
  assert.equal(
    periodKeyFor({ everyMinutes: 30 }, new Date('2026-01-15T06:00:00Z')),
    '2026-01-15T00:00');
  // CDT: 06:00Z Sep 15 → 01:00 CT Sep 15
  assert.equal(
    periodKeyFor({ everyMinutes: 30 }, new Date('2026-09-15T06:00:00Z')),
    '2026-09-15T01:00');
});

test('periodKeyFor: dailyAt null before the local time, date after', () => {
  // CT 01:30 < 02:00 → not due
  assert.equal(
    periodKeyFor({ dailyAt: '02:00' }, new Date('2026-09-28T06:30:00Z')),
    null);
  // CT 02:30 ≥ 02:00 → due, keyed by CT date
  assert.equal(
    periodKeyFor({ dailyAt: '02:00' }, new Date('2026-09-28T07:30:00Z')),
    '2026-09-28');
});

// ── scheduler ───────────────────────────────────────────────────────────────

function fakePrisma(rows = [], { failOnCreate = null } = {}) {
  return {
    rows,
    directoryJobRun: {
      create: async ({ data }) => {
        if (failOnCreate) { const e = new Error('x'); e.code = failOnCreate; throw e; }
        if (rows.some((r) => r.job === data.job && r.periodKey === data.periodKey)) {
          const e = new Error('unique'); e.code = 'P2002'; throw e;
        }
        const row = { id: `run-${rows.length + 1}`, startedAt: new Date(), ...data };
        rows.push(row);
        return row;
      },
      update: async ({ where, data }) => {
        const row = rows.find((r) => r.id === where.id);
        Object.assign(row, data);
        return row;
      },
      findMany: async ({ where } = {}) => rows
        .filter((r) => where?.periodKey?.not === undefined
          || r.periodKey !== where.periodKey.not)
        .slice(-20).reverse(),
    },
  };
}

const NOW = new Date('2026-09-27T14:44:00Z'); // CT 09:44 → 09:30 bucket

function harness({ jobs, prisma, enabled = true, dryRunJobs = [], log } = {}) {
  const calls = [];
  const p = prisma ?? fakePrisma();
  const j = jobs ?? [{
    name: 'contacts-sync',
    schedule: { everyMinutes: 30 },
    run: async (ctx) => { calls.push(ctx); return { n: 1 }; },
  }];
  return {
    calls,
    prisma: p,
    scheduler: createScheduler({
      prisma: p,
      jobs: j,
      enabled,
      dryRunJobs,
      now: () => NOW,
      log: log ?? { error: () => {}, log: () => {} },
    }),
  };
}

test('lease: once per period — second tick in the same bucket skips', async () => {
  const { calls, prisma, scheduler } = harness();
  await scheduler.tick();
  await scheduler.tick(); // same periodKey
  assert.equal(calls.length, 1);
  const row = prisma.rows[0];
  assert.equal(row.job, 'contacts-sync');
  assert.equal(row.periodKey, '2026-09-27T09:30');
  assert.equal(row.status, 'ok');
  assert.equal(JSON.parse(row.summary).n, 1);
});

test('lease: P2002 from the DB skips silently', async () => {
  const { calls, scheduler } = harness({ prisma: fakePrisma([], { failOnCreate: 'P2002' }) });
  await scheduler.tick();
  assert.equal(calls.length, 0);
});

test('failure: row marked failed, tick survives, error text only', async () => {
  const bad = [{
    name: 'boom',
    schedule: { everyMinutes: 30 },
    run: async () => { throw new Error('kapow'); },
  }, {
    name: 'fine',
    schedule: { everyMinutes: 30 },
    run: async () => ({ ok: 1 }),
  }];
  const prisma = fakePrisma();
  const scheduler = createScheduler({
    prisma, jobs: bad, enabled: true, now: () => NOW,
    log: { error: () => {}, log: () => {} },
  });
  await scheduler.tick();
  assert.equal(prisma.rows.find((r) => r.job === 'boom').status, 'failed');
  assert.match(prisma.rows.find((r) => r.job === 'boom').summary, /kapow/);
  assert.equal(prisma.rows.find((r) => r.job === 'fine').status, 'ok');
});

test('manual runs: dry-run rules (disabled / listed / body flag / live)', async () => {
  // enabled=false → manual is always dry-run
  let h = harness({ enabled: false });
  await h.scheduler.runJob('contacts-sync', { manual: true });
  assert.equal(h.prisma.rows[0].status, 'dry-run');
  assert.equal(h.calls[0].dryRun, true);

  // enabled but job listed in DIRECTORY_JOBS_DRY_RUN → dry-run
  h = harness({ enabled: true, dryRunJobs: ['contacts-sync'] });
  await h.scheduler.runJob('contacts-sync', { manual: true });
  assert.equal(h.calls[0].dryRun, true);

  // enabled, not listed, caller dryRun:true → dry-run
  h = harness({ enabled: true });
  await h.scheduler.runJob('contacts-sync', { manual: true, dryRun: true });
  assert.equal(h.calls[0].dryRun, true);

  // enabled, not listed, no flag → live
  h = harness({ enabled: true });
  const run = await h.scheduler.runJob('contacts-sync', { manual: true });
  assert.equal(h.calls[0].dryRun, false);
  assert.equal(run.status, 'ok');
  assert.match(run.periodKey, /^manual:/);
});

test('force is honoured on manual runs only', async () => {
  // manual + force → ctx.force true
  let h = harness({ enabled: true });
  await h.scheduler.runJob('contacts-sync', { manual: true, force: true });
  assert.equal(h.calls[0].force, true);

  // non-manual (scheduled-path) runJob can never force
  h = harness({ enabled: true });
  await h.scheduler.runJob('contacts-sync', { manual: false, force: true });
  assert.equal(h.calls[0].force, false);
});

test('in-flight overlap is skipped', async () => {
  let release;
  const slow = [{
    name: 'slow',
    schedule: { everyMinutes: 30 },
    run: () => new Promise((r) => { release = () => r({ done: 1 }); }),
  }];
  const prisma = fakePrisma();
  const scheduler = createScheduler({
    prisma, jobs: slow, enabled: true, now: () => NOW,
    log: { error: () => {}, log: () => {} },
  });
  const p1 = scheduler.runJob('slow', { manual: true });
  // give the first run a beat to hold the in-flight mark
  await new Promise((r) => setTimeout(r, 5));
  const second = await scheduler.runJob('slow', { manual: true });
  assert.equal(second.skipped, true);
  release();
  await p1;
});

test('in-flight claim is atomic — overlap during the lease create skips', async () => {
  // Regression: the inFlight check used to sit before the lease create's
  // await but the add landed after it — a second runJob inside that gap
  // would run the job twice (ports the scratch overlap repro).
  let releaseCreate;
  const prisma = fakePrisma();
  const origCreate = prisma.directoryJobRun.create;
  prisma.directoryJobRun.create = async (args) => {
    await new Promise((r) => { releaseCreate = r; });
    return origCreate(args);
  };
  let runs = 0;
  const jobs = [{
    name: 'dup', schedule: { everyMinutes: 30 },
    run: async () => { runs += 1; return {}; },
  }];
  const scheduler = createScheduler({
    prisma, jobs, enabled: true, now: () => NOW,
    log: { error: () => {}, log: () => {} },
  });
  const p1 = scheduler.runJob('dup', { manual: true });  // parks inside create
  const p2 = scheduler.runJob('dup');                    // scheduled periodKey
  const second = await p2;                               // must skip, not lease
  assert.equal(second.skipped, true);
  releaseCreate();
  const first = await p1;
  assert.equal(first.status, 'ok');
  assert.equal(runs, 1);              // job ran exactly once
  assert.equal(prisma.rows.length, 1); // and wrote exactly one run row
});

test('listJobs filters out cross-process lock rows', async () => {
  const prisma = fakePrisma([
    { id: 'l1', job: 'contacts-sync', periodKey: 'lock',
      status: 'locked', summary: 'tok', startedAt: NOW },
    { id: 'r1', job: 'contacts-sync', periodKey: '2026-09-27T09:30',
      status: 'ok', summary: '{}', startedAt: NOW },
  ]);
  const scheduler = createScheduler({
    prisma, jobs: [{ name: 'contacts-sync', schedule: { everyMinutes: 30 }, run: async () => ({}) }],
    enabled: false, now: () => NOW,
    log: { error: () => {}, log: () => {} },
  });
  const saved = { ...deps };
  try {
    deps.scheduler = scheduler;
    deps.prisma = prisma;
    const res = { statusCode: 200, body: undefined,
      status(c) { this.statusCode = c; return this; },
      json(b) { this.body = b; return this; } };
    await listJobs({}, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.runs.length, 1);
    assert.equal(res.body.runs[0].periodKey, '2026-09-27T09:30');
  } finally {
    deps.scheduler = saved.scheduler;
    deps.prisma = saved.prisma;
  }
});

test('unknown job → controller 404; listJobs returns jobs + runs', async () => {
  const prisma = fakePrisma();
  const scheduler = createScheduler({
    prisma,
    jobs: [{ name: 'maintenance', schedule: { dailyAt: '03:30' }, run: async () => ({}) }],
    enabled: false,
    now: () => NOW,
    log: { error: () => {}, log: () => {} },
  });
  const saved = { ...deps };
  try {
    deps.scheduler = scheduler;
    deps.prisma = prisma;
    const res = { statusCode: 200, body: undefined,
      status(c) { this.statusCode = c; return this; },
      json(b) { this.body = b; return this; } };

    await runJob({ params: { name: 'nope' }, body: {} }, res);
    assert.equal(res.statusCode, 404);

    res.statusCode = 200; res.body = undefined;
    await runJob({ params: { name: 'maintenance' }, body: {} }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.run.status, 'dry-run'); // disabled → manual dry-run

    res.statusCode = 200; res.body = undefined;
    await listJobs({}, res);
    assert.deepEqual(res.body.jobs,
      [{ name: 'maintenance', schedule: { dailyAt: '03:30' }, dryRun: true }]);
    assert.equal(res.body.runs.length, 1);

    // body.force is forwarded through the manual runJob call
    const seen = [];
    deps.scheduler = {
      describeJobs: () => [],
      runJob: async (name, opts) => { seen.push(opts); return { id: 'r1' }; },
    };
    res.statusCode = 200; res.body = undefined;
    await runJob({ params: { name: 'x' }, body: { force: true } }, res);
    assert.equal(seen[0].force, true);
    assert.equal(seen[0].manual, true);
  } finally {
    deps.scheduler = saved.scheduler;
    deps.prisma = saved.prisma;
  }
});
