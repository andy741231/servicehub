// Cross-process job mutex (§6.5 safety) — a DirectoryJobRun row at
// (job, 'lock') doubles as the lock: the @@unique([job, periodKey]) index
// makes the create atomic across scheduler instances, slot overlaps and
// the operator CLI. `summary` carries the owner token; only the owner
// releases. A lock row older than ttlMs is stale — abandoned by a crashed
// run — and is taken over with a single guarded updateMany (count 1 wins).

import crypto from 'node:crypto';

export const LOCK_PERIOD = 'lock';

export async function acquireJobLock(
  prisma, job, { ttlMs = 2 * 60 * 60 * 1000, now = () => new Date() } = {},
) {
  const token = crypto.randomUUID();
  try {
    await prisma.directoryJobRun.create({
      data: {
        job, periodKey: LOCK_PERIOD, status: 'locked',
        summary: token, startedAt: now(),
      },
    });
    return { token };
  } catch (err) {
    if (err?.code !== 'P2002') throw err;
    // Already held — take it over only if the holder is stale.
    const result = await prisma.directoryJobRun.updateMany({
      where: {
        job, periodKey: LOCK_PERIOD,
        startedAt: { lt: new Date(now() - ttlMs) },
      },
      data: { summary: token, startedAt: now(), status: 'locked' },
    });
    return result.count === 1 ? { token } : null;
  }
}

export async function releaseJobLock(prisma, job, token) {
  await prisma.directoryJobRun.deleteMany({
    where: { job, periodKey: LOCK_PERIOD, summary: token },
  });
}

export async function withJobLock(prisma, job, fn, opts) {
  const acquired = await acquireJobLock(prisma, job, opts);
  if (!acquired) return { locked: false };
  try {
    return { locked: true, result: await fn() };
  } finally {
    await releaseJobLock(prisma, job, acquired.token);
  }
}
