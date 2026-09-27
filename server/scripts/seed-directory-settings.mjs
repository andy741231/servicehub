// Seeds the DirectorySetting rows the SMS engine reads, from the same
// defaults the engine ships with (settings.js → lib/helpTopics.json).
//
//   node server/scripts/seed-directory-settings.mjs [--dry-run]
//
// Idempotent: each key is upserted and the script prints whether it was
// created, updated, or already current. --dry-run prints without writing.
// DATABASE_URL comes from the environment, or the repo-root .env when run
// without `node --env-file=.env` (same convention as
// verify-phonelist-import.mjs).

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_SETTINGS } from '../src/services/directorySms/settings.js';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..', '..');

if (!process.env.DATABASE_URL) {
  try { process.loadEnvFile(path.join(REPO_ROOT, '.env')); } catch { /* older Node */ }
}

const dryRun = process.argv.slice(2).includes('--dry-run');
const ACTOR = 'seed-directory-settings';

// The keys this seed owns — JSON values stored as serialized text.
const SEED_KEYS = ['sms.helpTopics', 'sms.keywords'];

const { default: prisma } = await import('../src/db/client.js');

try {
  for (const key of SEED_KEYS) {
    const value = JSON.stringify(DEFAULT_SETTINGS[key]);
    const existing = await prisma.directorySetting.findUnique({ where: { key } });

    let action;
    if (!existing) action = 'create';
    else if (existing.value === value) action = 'unchanged';
    else action = 'update';

    console.log(`${dryRun ? '[dry-run] ' : ''}${action.padEnd(9)} ${key} (${value.length} chars)`);
    if (existing && action === 'update') {
      console.log(`           was: ${existing.value.slice(0, 120)}${existing.value.length > 120 ? '…' : ''}`);
    }

    if (!dryRun && action !== 'unchanged') {
      await prisma.directorySetting.upsert({
        where: { key },
        create: { key, value, updatedByName: ACTOR },
        update: { value, updatedByName: ACTOR },
      });
    }
  }
  console.log(dryRun ? 'dry run — nothing written' : 'done');
} finally {
  await prisma.$disconnect();
}
