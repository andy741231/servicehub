#!/usr/bin/env node
// contacts-sync operator CLI (§6.5, C2).
//
//   node server/scripts/contacts-sync.mjs [--backup] [--apply] [--force]
//
// Default is a dry run: every planned operation is printed (member, contact
// resourceName, op, field-level before→after) and the full list is written
// to scratch/contacts-sync-plan-<stamp>.csv.
//
// --backup  additionally dumps every serviceoffice connection to
//           scratch/contacts-backup-<stamp>.json plus a companion
//           contacts-groups-backup-<stamp>.json (group name ↔ resourceName
//           pairs). These files are a restore aid, not a turnkey restore:
//           photo fields are URL references rather than image binaries, and
//           rebuilding memberships requires the groups file.
// --apply   writes to Google and the DB. Requires --backup in the same
//           invocation, NODE_ENV=production, DIRECTORY_JOBS_ENABLED=true
//           with contacts-sync absent from DIRECTORY_JOBS_DRY_RUN, the
//           production database name, AND typing that database name at the
//           prompt — there is no bypass flag.
// --force   bypasses the circuit breaker (and only the breaker).
//
// Env: DATABASE_URL is required (a SQL Server URL like
// sqlserver://host;database=name;...). GOOGLE_DIRECTORY_SA_KEY (full JSON)
// or GOOGLE_DIRECTORY_SA_KEY_FILE (defaults to scratch/google-sa.json for
// local runs), GOOGLE_DELEGATED_USER (default serviceoffice@churchinhouston.org).

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { DIRECTORY_DISTRICT_SHORTNAMES } from 'shared';
import { getSettings } from '../src/services/directorySms/settings.js';
import {
  createGoogleTokenSource, loadGoogleCredentials,
} from '../src/services/googleAuth.js';
import { createPeopleClient } from '../src/services/googleContacts.js';
import { planContactsSync } from '../src/services/contactsSyncPlan.js';
import {
  applyContactsSync, breakerMessage,
} from '../src/jobs/contactsSync.js';
import { withJobLock } from '../src/jobs/jobLock.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const STAMP = new Date().toISOString().replace(/[:.]/g, '-');

// Wider field set for --backup exports — a restore aid, not turnkey: photos
// come back as URL references (not binaries) and memberships carry group
// resourceNames that the companion contacts-groups-backup file maps back
// to names.
export const BACKUP_FIELDS = [
  'addresses', 'ageRanges', 'biographies', 'birthdays', 'calendarUrls',
  'clientData', 'coverPhotos', 'emailAddresses', 'events', 'externalIds',
  'fileAses', 'genders', 'imClients', 'interests', 'locales', 'locations',
  'memberships', 'metadata', 'miscKeywords', 'names', 'nicknames',
  'occupations', 'organizations', 'phoneNumbers', 'photos', 'relations',
  'residences', 'sipAddresses', 'skills', 'urls', 'userDefined',
].join(',');

const csvCell = (v) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export class UsageError extends Error {}

export function parseArgs(argv) {
  const args = { backup: false, apply: false, force: false };
  for (const a of argv) {
    if (a === '--backup') args.backup = true;
    else if (a === '--apply') args.apply = true;
    else if (a === '--force') args.force = true;
    else if (a === '--yes') {
      // Deliberately removed: live applies must be confirmed by typing the
      // database name every single time.
      throw new UsageError('unknown flag: --yes');
    } else throw new UsageError(`unknown flag: ${a}`);
  }
  if (args.apply && !args.backup) {
    throw new UsageError('--apply requires --backup in the same invocation');
  }
  return args;
}

// DATABASE_URL here is a SQL Server URL — semicolon-delimited parts, so
// `database=` lives in a `;`-separated segment, not the URL path or query.
export function dbName(env = process.env) {
  const m = String(env.DATABASE_URL ?? '')
    .match(/(?:^|;)database=([^;"']+)/i);
  return m ? m[1].trim() : 'unknown';
}

// Guards for a live apply — environment-level, checked before any
// credential load, network call or DB read; --force does NOT bypass them.
// The database must be the production database, by name.
export function assertApplyAllowed({ env, database }) {
  if (String(database).toLowerCase() !== 'production-servicehub') {
    throw new UsageError(
      `--apply refused: database '${database}' is not 'production-servicehub'`);
  }
  if (env.NODE_ENV !== 'production') {
    throw new UsageError('--apply requires NODE_ENV=production');
  }
  if (env.DIRECTORY_JOBS_ENABLED !== 'true') {
    throw new UsageError('--apply requires DIRECTORY_JOBS_ENABLED=true');
  }
  const dryList = (env.DIRECTORY_JOBS_DRY_RUN ?? '')
    .split(',').map((s) => s.trim()).filter(Boolean);
  if (dryList.includes('contacts-sync')) {
    throw new UsageError(
      '--apply refused: contacts-sync is listed in DIRECTORY_JOBS_DRY_RUN');
  }
}

const FIELDS = (op) =>
  (op.changes ?? [])
    .map((c) => `${c.field}: ${c.from ?? '∅'} → ${c.to ?? '∅'}`)
    .join('; ');

const memberLabel = (m) =>
  m ? `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim() : '';

function describe(op) {
  const base = `${op.type.padEnd(11)} ${memberLabel(op.member).padEnd(24)}`;
  switch (op.type) {
    case 'update':
    case 'link':
      return `${base} ${op.contactId} ${FIELDS(op)}` +
        (op.adds.length ? ` +grp:${op.adds.join(',')}` : '') +
        (op.removes.length ? ` -grp:${op.removes.join(',')}` : '');
    case 'create':
      return `${base} (new) ` + FIELDS({ changes: [
        { field: 'email', from: null, to: op.member.email },
        { field: 'phone', from: null, to: op.member.phone1 },
        { field: 'dist', from: null, to: op.member.district },
      ]}) + (op.adds.length ? ` +grp:${op.adds.join(',')}` : '');
    case 'delete':
      return `${base} ${op.contactId}`;
    case 'error':
      return `${base} ERROR: ${op.error}`;
    case 'create-group':
      return `${base} new group '${op.name}'`;
    default:
      return base;
  }
}

const promptLine = async (q) => {
  const rl = readline.createInterface(
    { input: process.stdin, output: process.stdout });
  try { return await rl.question(q); } finally { rl.close(); }
};

const loadEnvIfNeeded = () => {
  if (!process.env.DATABASE_URL || !process.env.GOOGLE_DIRECTORY_SA_KEY) {
    try { process.loadEnvFile(path.join(ROOT, '.env')); } catch { /* no .env */ }
  }
  if (!process.env.GOOGLE_DIRECTORY_SA_KEY
      && !process.env.GOOGLE_DIRECTORY_SA_KEY_FILE) {
    process.env.GOOGLE_DIRECTORY_SA_KEY_FILE =
      path.join(ROOT, 'scratch', 'google-sa.json');
  }
};

async function main() {
  let prisma;
  try {
    let args;
    try { args = parseArgs(process.argv.slice(2)); }
    catch (err) {
      if (err instanceof UsageError) {
        console.error(err.message);
        process.exitCode = 2;
        return;
      }
      throw err;
    }
    loadEnvIfNeeded();
    if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL is not configured');
      process.exitCode = 2;
      return;
    }

    // Environment guards run before any credential load, network call or
    // DB read — a refused apply is a pure argument error, and --force only
    // bypasses the breaker.
    const target = dbName();
    if (args.apply) {
      try {
        assertApplyAllowed({ env: process.env, database: target });
      } catch (err) {
        if (err instanceof UsageError) {
          console.error(err.message);
          process.exitCode = 2;
          return;
        }
        throw err;
      }
    }
    console.log(`database: ${target}`);

    prisma = (await import('../src/db/client.js')).default;

    const creds = loadGoogleCredentials(process.env);
    const tokens = createGoogleTokenSource({
      key: creds.key, subject: creds.subject,
      scopes: ['https://www.googleapis.com/auth/contacts'],
    });
    const client = createPeopleClient({ getToken: tokens.getToken });

    // The whole load→plan→(backup)→confirm→apply pipeline. For --apply it
    // runs under the cross-process job lock — a concurrent scheduled run or
    // second CLI can't plan against a half-applied state (the classic
    // duplicate-contact window). Dry runs don't lock (they write nothing).
    const planAndApply = async () => {
      const settings = await getSettings(prisma);
      const members = await prisma.directoryMember.findMany({
        where: {
          OR: [{ status: 'active' }, { googleContactId: { not: null } }],
        },
        select: {
          id: true, firstName: true, lastName: true, email: true,
          phone1: true, district: true, status: true,
          googleContactId: true, googleSyncHash: true,
        },
      });

      let backupPath = null;
      let connections;
      if (args.backup) {
        // Export BEFORE any apply — if the apply ever misbehaves this is the
        // restore source, so it must not share the trimmed sync field list.
        console.log('writing connection backup…');
        connections = await client.listConnections(BACKUP_FIELDS);
        backupPath = path.join(ROOT, 'scratch', `contacts-backup-${STAMP}.json`);
        fs.mkdirSync(path.dirname(backupPath), { recursive: true });
        fs.writeFileSync(backupPath, JSON.stringify(connections, null, 2));
        console.log(`backup: ${path.relative(ROOT, backupPath)} ` +
          `(${connections.length} connections)`);
        const groupsPath = path.join(ROOT, 'scratch',
          `contacts-groups-backup-${STAMP}.json`);
        fs.writeFileSync(groupsPath, JSON.stringify(
          await client.listGroups(), null, 2));
        console.log(`backup: ${path.relative(ROOT, groupsPath)} (groups)`);
      } else {
        connections = await client.listConnections();
      }
      const groups = await client.listGroups();

      const plan = planContactsSync({
        members,
        connections,
        groups,
        districtGroups: settings['districts.contactGroups'] ?? {},
        shortnames: DIRECTORY_DISTRICT_SHORTNAMES,
      });

      const csvPath = path.join(
        ROOT, 'scratch', `contacts-sync-plan-${STAMP}.csv`);
      fs.mkdirSync(path.dirname(csvPath), { recursive: true });
      fs.writeFileSync(csvPath,
        'op,memberId,member,contactId,details\n'
        + plan.ops.map((o) => [
          o.type, o.memberId ?? '', memberLabel(o.member), o.contactId ?? '',
          o.type === 'error' ? o.error
            : o.type === 'create-group' ? o.name : describe(o),
        ].map(csvCell).join(',')).join('\n') + '\n');
      console.log(`plan written: ${path.relative(ROOT, csvPath)}\n`);

      for (const op of plan.ops) console.log(describe(op));
      console.log('\nsummary:', JSON.stringify(plan.stats));

      const breaker = breakerMessage(plan.stats);
      if (breaker) {
        const msg = `${breaker} — use --force only after reviewing the plan`;
        if (args.apply && !args.force) {
          console.error(msg);
          process.exitCode = 3;
          return;
        }
        console.warn(
          `${msg} (bypassed${args.apply ? ' by --force' : ' — dry run'})`);
      }

      if (!args.apply) {
        console.log('\ndry run — nothing written. Re-run with --backup --apply' +
          ' (and --force if the breaker tripped) on production to execute.');
        return;
      }

      const typed = await promptLine(`Type the database name '${target}' to apply: `);
      if (typed.trim() !== target) {
        console.error('confirmation mismatch — aborting');
        process.exitCode = 3;
        return;
      }

      const applied = await applyContactsSync({
        prisma, client, plan, groups, now: new Date(),
      });
      console.log('\napplied:', JSON.stringify(applied));
    };

    if (!args.apply) {
      await planAndApply();
      return;
    }
    const locked = await withJobLock(prisma, 'contacts-sync', planAndApply);
    if (!locked.locked) {
      console.error('contacts-sync already running — apply skipped');
      process.exitCode = 4;
      return;
    }
  } finally {
    if (prisma) await prisma.$disconnect().catch(() => {});
  }
}

// Windows paths may differ in drive-letter case — compare lowercased.
const invoked = process.argv[1]
  ? path.resolve(process.argv[1]).toLowerCase() : '';
const here = fileURLToPath(import.meta.url).toLowerCase();
if (invoked && invoked === here) {
  main().catch((err) => { console.error(err); process.exitCode = 1; });
}
