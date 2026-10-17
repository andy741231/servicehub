// Hub-admin visibility for directory background jobs (§6.4): list the
// registered jobs plus recent run rows, and trigger a manual run.

import defaultPrisma from '../db/client.js';
import { scheduler } from '../jobs/index.js';
import { LOCK_PERIOD } from '../jobs/jobLock.js';

// Test seam — same pattern as directoryAuth.js's deps.
export const deps = { scheduler, prisma: defaultPrisma };

export const listJobs = async (req, res) => {
  try {
    const jobs = deps.scheduler.describeJobs();
    // periodKey 'lock' rows are cross-process mutex state, not job history.
    const runs = await deps.prisma.directoryJobRun.findMany({
      where: { periodKey: { not: LOCK_PERIOD } },
      orderBy: { startedAt: 'desc' },
      take: 20,
    });
    res.json({ jobs, runs });
  } catch (error) {
    console.error('Error listing directory jobs:', error);
    res.status(500).json({ error: 'Failed to list jobs' });
  }
};

export const runJob = async (req, res) => {
  try {
    const dryRun = req.body?.dryRun === true;
    const force = req.body?.force === true;
    const run = await deps.scheduler.runJob(
      req.params.name, { manual: true, dryRun, force });
    if (!run) return res.status(404).json({ error: 'Unknown job' });
    res.json({ run });
  } catch (error) {
    console.error('Error running directory job:', error);
    res.status(500).json({ error: 'Failed to run job' });
  }
};
