// Directory background jobs (§6.4). The scheduler only ticks when
// DIRECTORY_JOBS_ENABLED=true (production slot only); DIRECTORY_JOBS_DRY_RUN
// holds a comma-separated list of job names that must never write.

import prisma from '../db/client.js';
import { createScheduler } from './scheduler.js';
import { maintenanceJob } from './maintenance.js';
import { districtDigestJob } from './districtDigest.js';

// Registered in run-time order: maintenance 03:30 CT, district-digest 06:00 CT.
// New jobs start in dry run (§6.4): production should list BOTH in
// DIRECTORY_JOBS_DRY_RUN ('maintenance,district-digest') until their dry-run
// summaries have been reviewed via GET /api/directory/jobs, then remove each
// name to take it live. Staging never schedules — manual runs there are
// always dry-run, so no extra code is needed here.
export const JOBS = [maintenanceJob, districtDigestJob];

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
