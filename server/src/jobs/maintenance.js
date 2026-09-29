// maintenance job (directory-migration.md §6.4) — nightly at 03:30 CT:
//   1. Purge DirectorySmsLog rows older than sms.logRetentionDays
//      (default 180) — the log holds private SMS activity.
//   2. Delete DirectoryLoginToken rows that are used OR expired AND were
//      created more than 7 days ago (a week of token history is kept for
//      sign-in troubleshooting).
//   3. Clear expired pending SMS state on DirectorySmsPhone (multi-step
//      commands like disambiguation picks time out).
// In dry-run the identical WHERE clauses are only counted — nothing is
// deleted or updated, so the dry-run path is obviously read-only.

import { getSettings } from '../services/directorySms/settings.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const TOKEN_KEEP_DAYS = 7;
const DEFAULT_LOG_RETENTION_DAYS = 180;

// Test seam — tests stub deps.getSettings (same pattern as controllers).
export const deps = { getSettings };

// The scheduler passes `now` as a function (its clock); accept a Date too.
const asDate = (now) => (typeof now === 'function' ? now() : now);

async function run({ prisma, now, dryRun }) {
  const at = asDate(now);
  const settings = await deps.getSettings(prisma);
  const retentionDays =
    settings['sms.logRetentionDays'] ?? DEFAULT_LOG_RETENTION_DAYS;

  const smsLogBefore = new Date(at.getTime() - retentionDays * DAY_MS);
  const tokenCreatedBefore = new Date(at.getTime() - TOKEN_KEEP_DAYS * DAY_MS);

  // The three WHERE clauses — shared verbatim by the live and dry-run paths.
  const smsLogWhere = { createdAt: { lt: smsLogBefore } };
  const tokenWhere = {
    createdAt: { lt: tokenCreatedBefore },
    OR: [{ usedAt: { not: null } }, { expiresAt: { lt: at } }],
  };
  const pendingWhere = {
    pendingExpiresAt: { lt: at },
    pendingCommand: { not: null },
  };
  const pendingClear = { pendingCommand: null, pendingExpiresAt: null };

  let smsLogsPurged;
  let loginTokensPurged;
  let pendingStatesCleared;

  if (dryRun) {
    // Read-only: count the exact rows the live path would touch.
    [smsLogsPurged, loginTokensPurged, pendingStatesCleared] = await Promise.all([
      prisma.directorySmsLog.count({ where: smsLogWhere }),
      prisma.directoryLoginToken.count({ where: tokenWhere }),
      prisma.directorySmsPhone.count({ where: pendingWhere }),
    ]);
  } else {
    const sms = await prisma.directorySmsLog.deleteMany({ where: smsLogWhere });
    const tokens = await prisma.directoryLoginToken.deleteMany({ where: tokenWhere });
    const pending = await prisma.directorySmsPhone.updateMany({
      where: pendingWhere,
      data: pendingClear,
    });
    smsLogsPurged = sms.count;
    loginTokensPurged = tokens.count;
    pendingStatesCleared = pending.count;
  }

  return {
    smsLogsPurged,
    loginTokensPurged,
    pendingStatesCleared,
    retentionDays,
    cutoffDates: {
      smsLogBefore: smsLogBefore.toISOString(),
      tokenCreatedBefore: tokenCreatedBefore.toISOString(),
      pendingExpiresBefore: at.toISOString(),
    },
  };
}

export const maintenanceJob = {
  name: 'maintenance',
  schedule: { dailyAt: '03:30' },
  run,
};
