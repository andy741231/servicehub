#!/usr/bin/env node
// sheet-sync-back operator CLI (§6.6).
//
//   node server/scripts/sheet-sync-back.mjs [--spreadsheet ID] [--apply]
//
// Target is --spreadsheet or SHEET_SYNC_SPREADSHEET_ID — there is NO
// default spreadsheet. Default is a dry run: every planned cell write is
// printed (cott, cell, field, before→after) plus each appended row, and the
// full plan lands in scratch/sheet-sync-plan-<stamp>.csv.
//
// --apply writes to the sheet and the DB (legacyId assignments first, then
// grid growth, then values). It requires typing the target spreadsheet's
// TITLE at the prompt — there is no bypass flag — and runs under the same
// job lock as the scheduled run. Applying to the LIVE phonelist
// (1KaU6JFCTJb282AxHR-9HOIY7tXfzIO0msNcyd5uJ4zI) additionally requires the
// production gate: NODE_ENV=production, DATABASE_URL naming
// production-servicehub, DIRECTORY_JOBS_ENABLED=true, and sheet-sync-back
// absent from DIRECTORY_JOBS_DRY_RUN.
//
// Env: DATABASE_URL is required (a SQL Server URL like
// sqlserver://host;database=name;...). GOOGLE_DIRECTORY_SA_KEY (full JSON)
// or GOOGLE_DIRECTORY_SA_KEY_FILE (defaults to scratch/google-sa.json for
// local runs), GOOGLE_DELEGATED_USER (default serviceoffice@churchinhouston.org).

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import {
  createGoogleTokenSource, loadGoogleCredentials,
} from '../src/services/googleAuth.js';
import { createSheetsClient } from '../src/services/googleSheets.js';
import { planSheetSync } from '../src/services/sheetSyncPlan.js';
import {
  applySheetSync, loadSheet, MEMBER_SELECT, SHEETS_SCOPE,
} from '../src/jobs/sheetSyncBack.js';
import { withJobLock } from '../src/jobs/jobLock.js';
import { dbName } from './contacts-sync.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const STAMP = new Date().toISOString().replace(/[:.]/g, '-');

// The live phonelist — writing it requires the full production gate.
export const LIVE_SHEET_ID =
  '1KaU6JFCTJb282AxHR-9HOIY7tXfzIO0msNcyd5uJ4zI';

const csvCell = (v) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export class UsageError extends Error {}

export function parseArgs(argv) {
  const args = { spreadsheet: null, apply: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--apply') args.apply = true;
    else if (a === '--spreadsheet') {
      const v = argv[++i];
      if (!v || v.startsWith('--')) {
        throw new UsageError('--spreadsheet requires a value');
      }
      args.spreadsheet = v;
    } else if (a.startsWith('--spreadsheet=')) {
      args.spreadsheet = a.slice('--spreadsheet='.length) || null;
      if (!args.spreadsheet) throw new UsageError('--spreadsheet requires a value');
    } else if (a === '--yes') {
      // Deliberately absent: live applies must be confirmed by typing the
      // spreadsheet title every single time.
      throw new UsageError('unknown flag: --yes');
    } else throw new UsageError(`unknown flag: ${a}`);
  }
  return args;
}

// Guards for writing the LIVE phonelist — environment-level, checked
// before any credential load, network call or DB read. The database must
// be the production database, by name.
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
  if (dryList.includes('sheet-sync-back')) {
    throw new UsageError(
      '--apply refused: sheet-sync-back is listed in DIRECTORY_JOBS_DRY_RUN');
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

const fmtAfter = (v) => (typeof v === 'number' ? `num:${v}` : `"${v ?? ''}"`);

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
    const spreadsheetId = args.spreadsheet
      ?? process.env.SHEET_SYNC_SPREADSHEET_ID;
    if (!spreadsheetId) {
      console.error('no target: pass --spreadsheet ID or set ' +
        'SHEET_SYNC_SPREADSHEET_ID');
      process.exitCode = 2;
      return;
    }

    // The live-phonelist gate runs before any credential load, network
    // call or DB read — a refused apply is a pure argument error.
    const targetDb = dbName();
    if (args.apply && spreadsheetId === LIVE_SHEET_ID) {
      try {
        assertApplyAllowed({ env: process.env, database: targetDb });
      } catch (err) {
        if (err instanceof UsageError) {
          console.error(err.message);
          process.exitCode = 2;
          return;
        }
        throw err;
      }
    }
    console.log(`spreadsheet: ${spreadsheetId}`);
    console.log(`database:    ${targetDb}`);

    prisma = (await import('../src/db/client.js')).default;

    const creds = loadGoogleCredentials(process.env);
    const tokens = createGoogleTokenSource({
      key: creds.key, subject: creds.subject, scopes: [SHEETS_SCOPE],
    });
    const client = createSheetsClient({ getToken: tokens.getToken });

    // The whole load→plan→confirm→apply pipeline. For --apply it runs
    // under the cross-process job lock — a concurrent scheduled run can't
    // plan against a half-applied sheet. Dry runs don't lock.
    const planAndApply = async () => {
      const [meta, members] = await Promise.all([
        loadSheet(client, spreadsheetId),
        prisma.directoryMember.findMany({ select: MEMBER_SELECT }),
      ]);
      const plan = planSheetSync({ ...meta, members, now: new Date() });

      const csvPath = path.join(
        ROOT, 'scratch', `sheet-sync-plan-${STAMP}.csv`);
      fs.mkdirSync(path.dirname(csvPath), { recursive: true });
      const csvLines = ['type,cott,row,cell,field,before,after'];
      for (const w of plan.writes) {
        csvLines.push(['write', w.cott, w.row, w.col, w.field,
          w.before, w.after].map(csvCell).join(','));
      }
      for (const a of plan.appends) {
        csvLines.push(['append', a.cott, a.row, 'A:AG', '',
          '', `assignLegacyId=${a.assignLegacyId}`]
          .map(csvCell).join(','));
      }
      fs.writeFileSync(csvPath, csvLines.join('\n') + '\n');
      console.log(`plan written: ${path.relative(ROOT, csvPath)}\n`);

      console.log(`spreadsheet title: ${meta.title}`);
      for (const w of plan.writes) {
        console.log(
          `write  cott ${w.cott.padEnd(6)} ${w.col}${w.row} ` +
          `${(w.field ?? '').padEnd(16)} ` +
          `"${w.before}" → ${fmtAfter(w.after)}`);
      }
      for (const a of plan.appends) {
        console.log(
          `append cott ${String(a.cott).padEnd(6)} row ${a.row}` +
          (a.assignLegacyId ? ' (assigns DirectoryMember.legacyId)' : ''));
      }
      for (const w of plan.warnings) {
        console.warn(`warn   ${w.code}: ${w.detail ?? ''}`);
      }
      console.log('\nsummary:', JSON.stringify(plan.stats));

      if (!args.apply) {
        console.log('\ndry run — nothing written. Re-run with --apply to ' +
          'execute (the live phonelist also requires the production gate).');
        return;
      }

      const typed = await promptLine(
        `Type the spreadsheet title '${meta.title}' to apply: `);
      if (typed.trim() !== meta.title) {
        console.error('confirmation mismatch — aborting');
        process.exitCode = 3;
        return;
      }

      const applied = await applySheetSync({
        prisma, client, spreadsheetId, plan });
      console.log('\napplied:', JSON.stringify(applied));
    };

    if (!args.apply) {
      await planAndApply();
      return;
    }
    const locked = await withJobLock(prisma, 'sheet-sync-back', planAndApply);
    if (!locked.locked) {
      console.error('sheet-sync-back already running — apply skipped');
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
