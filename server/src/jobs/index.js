// Directory background jobs (§6.4). Registered jobs land here — S18 adds
// district-digest and maintenance. The scheduler only ticks when
// DIRECTORY_JOBS_ENABLED=true (production slot only); DIRECTORY_JOBS_DRY_RUN
// holds a comma-separated list of job names that must never write.

import prisma from '../db/client.js';
import { createScheduler } from './scheduler.js';

// S18: { name: 'district-digest', schedule: { dailyAt: '06:00' }, run }
//      { name: 'maintenance',     schedule: { dailyAt: '03:30' }, run }
export const JOBS = [];

export const JOBS_ENABLED = process.env.DIRECTORY_JOBS_ENABLED === 'true';
export const JOBS_DRY_RUN = (process.env.DIRECTORY_JOBS_DRY_RUN ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export const scheduler = createScheduler({
  prisma,
  jobs: JOBS,
  enabled: JOBS_ENABLED,
  dryRunJobs: JOBS_DRY_RUN,
});

// Called from index.js once Prisma has connected — a no-op unless the slot
// is flagged for jobs (staging deliberately never schedules).
export function startDirectoryJobs() {
  if (JOBS_ENABLED) scheduler.start();
}
