// In-process job scheduler (directory-migration.md §6.4). A tick every
// `tickMs` evaluates each job's schedule in America/Chicago — App Service
// runs in UTC — and claims the period by inserting a DirectoryJobRun row.
// The unique (job, periodKey) index makes "once per period" hold across
// restarts and slot swaps; a manual run uses a `manual:<iso>` key.

// CT local fields via Intl — no timezone math by hand.
const chicago = (date) => {
  const parts = {};
  for (const p of new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date)) {
    parts[p.type] = p.value;
  }
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
};

// The lease key for a schedule at `date`:
//   { everyMinutes: N } → 'YYYY-MM-DDTHH:MM' floored to the N-minute bucket
//   { dailyAt: 'HH:MM' } → 'YYYY-MM-DD', or null before that local time
// DST note: when clocks fall back, the repeated hour reuses keys — the lease
// skips the second pass (a documented, acceptable consequence).
export function periodKeyFor(schedule, date) {
  const { date: day, hour, minute } = chicago(date);
  if (schedule?.everyMinutes) {
    const bucket = Math.floor((hour * 60 + minute) / schedule.everyMinutes) * schedule.everyMinutes;
    const hh = String(Math.floor(bucket / 60)).padStart(2, '0');
    const mm = String(bucket % 60).padStart(2, '0');
    return `${day}T${hh}:${mm}`;
  }
  if (schedule?.dailyAt) {
    const [hh, mm] = schedule.dailyAt.split(':').map(Number);
    if (hour * 60 + minute < hh * 60 + mm) return null; // not due yet today
    return day;
  }
  return null;
}

export function createScheduler({
  prisma, jobs, now = () => new Date(),
  dryRunJobs = [], enabled, tickMs = 60_000, log = console,
}) {
  const inFlight = new Set(); // job names with a run in progress (this process)
  let timer = null;

  // Manual runs are dry-run unless the scheduler is enabled, the job isn't
  // listed in DIRECTORY_JOBS_DRY_RUN, and the caller didn't pass dryRun —
  // i.e. on staging (DIRECTORY_JOBS_ENABLED unset) manual runs can never
  // write, which is the point of the staging-safety rule.
  const effectiveDryRun = (name, callerDryRun) =>
    callerDryRun === true || !enabled || dryRunJobs.includes(name);

  const describeJobs = () =>
    jobs.map((j) => ({
      name: j.name,
      schedule: j.schedule,
      dryRun: effectiveDryRun(j.name, false),
    }));

  async function runJob(name, { manual = false, dryRun } = {}) {
    const job = jobs.find((j) => j.name === name);
    if (!job) return null; // controller maps this to 404
    const periodKey = manual
      ? `manual:${now().toISOString()}`
      : periodKeyFor(job.schedule, now());
    if (periodKey == null) return null; // not due this period
    if (inFlight.has(name)) return { skipped: true, job: name, periodKey };

    let run;
    try {
      run = await prisma.directoryJobRun.create({
        data: { job: name, periodKey, status: 'running' },
      });
    } catch (err) {
      // P2002: another tick/instance already claimed this period — skip.
      if (err?.code === 'P2002') return { skipped: true, job: name, periodKey };
      throw err;
    }

    inFlight.add(name);
    try {
      const isDry = effectiveDryRun(name, manual ? dryRun : false);
      try {
        const result = await job.run({ prisma, now, periodKey, dryRun: isDry });
        run = await prisma.directoryJobRun.update({
          where: { id: run.id },
          data: {
            status: isDry ? 'dry-run' : 'ok',
            summary: JSON.stringify(result ?? null).slice(0, 4000),
            finishedAt: now(),
          },
        });
      } catch (err) {
        // Error text only — never a stack trace (could carry row data).
        run = await prisma.directoryJobRun.update({
          where: { id: run.id },
          data: {
            status: 'failed',
            summary: String(err?.message ?? err).slice(0, 4000),
            finishedAt: now(),
          },
        });
        log.error(`[jobs] ${name} (${periodKey}) failed:`, err);
      }
      return run;
    } finally {
      inFlight.delete(name);
    }
  }

  async function tick() {
    for (const job of jobs) {
      // Never let one job's infra failure abort the rest of the tick.
      await runJob(job.name).catch((err) =>
        log.error(`[jobs] ${job.name} tick error:`, err));
    }
  }

  function start() {
    if (timer) return;
    timer = setInterval(() => {
      tick().catch((err) => log.error('[jobs] tick failed:', err));
    }, tickMs);
    timer.unref?.();
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  return { tick, start, stop, runJob, describeJobs };
}
