// sheet-sync-back job (directory-migration.md §6.6) — nightly at 02:00.
// Writes DirectoryMember changes back into the phonelist "saints" tab so
// the sheet stays the same phonelist members see, while rows the sheet
// still owns (never-written columns, sheet-only rows) are untouched.
//
// Safety, in order:
//   - SHEET_SYNC_SPREADSHEET_ID unset → a "not configured" no-op summary;
//   - a dry run plans everything and writes nothing — not even the
//     DirectoryMember.legacyId assignments for new rows;
//   - live runs take the job-wide withJobLock BEFORE reading members so
//     overlapping schedulers/CLI runs can't double-append;
//   - apply order is: DB legacyId assignments → ONE spreadsheets.
//     batchUpdate (appendDimension + named-range growth) → chunked
//     values.batchUpdate (RAW). Persisting cott first means a crash mid-
//     apply can't re-use a cott: the next run sees legacyId > sheet max
//     and appends that member instead of MISSING_ROW-ing them;
//   - header drift or a duplicate cott aborts before any write (the
//     planner throws PlanAbort and the job records 'failed').
//
// Only the job's own apply path may write; values.batchUpdate uses RAW
// one-A1-range-per-cell so Sheets keeps each target cell's existing
// number format (dates render "M/D/YY HH:MM", zips numeric, etc.).

import {
  createGoogleTokenSource, loadGoogleCredentials,
} from '../services/googleAuth.js';
import { createSheetsClient } from '../services/googleSheets.js';
import { planSheetSync } from '../services/sheetSyncPlan.js';
import { withJobLock } from './jobLock.js';

export const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
const VALUES_CHUNK = 200; // cells per values.batchUpdate call
const SAINTS = 'saints';

const asDate = (v) => (v instanceof Date ? v : new Date(v ?? Date.now()));

export const deps = {
  loadGoogleCredentials,
  createGoogleTokenSource,
  createSheetsClient,
};

export const MEMBER_SELECT = {
  id: true, legacyId: true, firstName: true, lastName: true,
  otherName: true, gender: true, maritalStatus: true, role: true,
  status: true, district: true, smallGroup: true, locality: true,
  email: true, phone1: true, phone2: true, address: true, apartment: true,
  city: true, state: true, zip: true, spouseMemberId: true,
  spouseFirstName: true, spouseLastName: true, isHeadOfHousehold: true,
  googleContactId: true, changedAt: true, addedAt: true,
};

// Everything the planner needs, fetched once: metadata (title, saints
// grid, named ranges) plus the saints grid twice — FORMATTED for the
// importer-oracle compare and UNFORMATTED for existing cell types.
export async function loadSheet(client, spreadsheetId) {
  const meta = await client.getSpreadsheet(spreadsheetId);
  const sheet = (meta?.sheets ?? [])
    .map((s) => s.properties)
    .find((p) => p?.title === SAINTS);
  if (!sheet) {
    throw new Error(`sheet-sync-back: '${SAINTS}' tab not found in ` +
      `spreadsheet ${spreadsheetId}`);
  }
  const [formattedRows, unformattedRows] = await Promise.all([
    client.getValues(spreadsheetId, SAINTS, 'FORMATTED_VALUE'),
    client.getValues(spreadsheetId, SAINTS, 'UNFORMATTED_VALUE'),
  ]);
  return {
    title: meta?.properties?.title ?? spreadsheetId,
    sheetId: sheet.sheetId,
    gridRowCount: sheet.gridProperties?.rowCount ?? 0,
    namedRanges: meta?.namedRanges ?? [],
    formattedRows,
    unformattedRows,
  };
}

// Apply a plan. Order is contractual: legacyIds persist first (crash-safe
// cott allocation), the grid grows second (one batchUpdate), values last.
export async function applySheetSync({ prisma, client, spreadsheetId, plan }) {
  let assigned = 0;
  for (const a of plan.appends) {
    if (!a.assignLegacyId) continue;
    await prisma.directoryMember.update({
      where: { id: a.memberId },
      data: { legacyId: a.cott },
    });
    assigned += 1;
  }

  // ONE batchUpdate for everything structural: grid growth (if the appends
  // overflow), then the format copy that makes new rows render like the
  // ones above them (date format on D, numeric zip/apt), then the named
  // ranges that must reach the new grid end.
  const requests = [];
  if (plan.gridOps) {
    requests.push({
      appendDimension: {
        sheetId: plan.gridOps.sheetId,
        dimension: 'ROWS', length: plan.gridOps.appendRows,
      },
    });
  }
  if (plan.formatCopy) {
    const { sheetId, sourceRow, firstRow, lastRow } = plan.formatCopy;
    requests.push({
      copyPaste: {
        source: {
          sheetId,
          startRowIndex: sourceRow - 1, endRowIndex: sourceRow,
          startColumnIndex: 0, endColumnIndex: 33,
        },
        destination: {
          sheetId,
          startRowIndex: firstRow - 1, endRowIndex: lastRow,
          startColumnIndex: 0, endColumnIndex: 33,
        },
        pasteType: 'PASTE_FORMAT',
      },
    });
  }
  for (const nr of plan.gridOps?.namedRanges ?? []) {
    requests.push({
      updateNamedRange: {
        namedRange: {
          namedRangeId: nr.namedRangeId,
          name: nr.name,
          range: { ...nr.range, endRowIndex: plan.gridOps.newRowCount },
        },
        fields: 'range',
      },
    });
  }
  if (requests.length) {
    await client.batchUpdate(spreadsheetId, requests, { idempotent: false });
  }

  const data = [
    ...plan.writes.map((w) => ({
      range: `${SAINTS}!${w.col}${w.row}`, values: [[w.after]],
    })),
    ...plan.appends.map((a) => ({
      range: `${SAINTS}!A${a.row}:AG${a.row}`, values: [a.values],
    })),
  ];
  for (let i = 0; i < data.length; i += VALUES_CHUNK) {
    await client.batchUpdateValues(spreadsheetId,
      data.slice(i, i + VALUES_CHUNK));
  }

  return {
    assigned,
    valueRanges: data.length,
    writes: plan.writes.length,
    appends: plan.appends.length,
    gridGrown: plan.gridOps ? plan.gridOps.appendRows : 0,
  };
}

async function run({ prisma, now, dryRun }) {
  const spreadsheetId = process.env.SHEET_SYNC_SPREADSHEET_ID;
  if (!spreadsheetId) {
    return { skipped: true,
      reason: 'not configured — SHEET_SYNC_SPREADSHEET_ID unset' };
  }
  const creds = deps.loadGoogleCredentials(process.env);
  const tokens = deps.createGoogleTokenSource({
    key: creds.key, subject: creds.subject, scopes: [SHEETS_SCOPE],
  });
  const client = deps.createSheetsClient({ getToken: tokens.getToken });
  const at = asDate(now);

  const body = async () => {
    const [meta, members] = await Promise.all([
      loadSheet(client, spreadsheetId),
      prisma.directoryMember.findMany({ select: MEMBER_SELECT }),
    ]);
    const plan = planSheetSync({ ...meta, members, now: at });
    const summary = {
      title: meta.title,
      stats: plan.stats,
      warnings: plan.warnings,
      writes: plan.writes.length,
      appends: plan.appends.length,
      sample: plan.writes.slice(0, 20),
    };
    if (dryRun) return { dryRun: true, ...summary };
    const applied = await applySheetSync({
      prisma, client, spreadsheetId, plan });
    return { ...summary, applied };
  };

  // Dry runs compute the plan but never write — no lock needed. Live runs
  // lock before loading members so a concurrent run can't plan against a
  // half-applied sheet.
  if (dryRun) return body();
  const locked = await withJobLock(prisma, 'sheet-sync-back', body);
  if (!locked.locked) {
    return { skipped: true, reason: 'sheet-sync-back already running' };
  }
  return locked.result;
}

export const sheetSyncBackJob = {
  name: 'sheet-sync-back',
  description: 'Directory → phonelist saints tab write-back (new saints, ' +
    'edits, household links)',
  schedule: { dailyAt: '02:00' },
  run,
};
