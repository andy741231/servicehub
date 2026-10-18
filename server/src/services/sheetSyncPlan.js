// Pure planner for sheet-sync-back (directory-migration.md §6.6) — the
// Directory → phonelist "saints" tab nightly write-back. No I/O: the job
// (or CLI) supplies the sheet as two value grids plus the DirectoryMember
// rows; this emits writes / appends / gridOps / warnings / stats.
//
// THE KEY RULE — semantic oracle: cells are never compared to Directory
// values directly. The FORMATTED grid is run through the importer's
// analyzeSheet()/mapRow() (server/scripts/lib/phonelistTransform.mjs), the
// exact code path the phonelist import used, and each owned column is
// written only when the member's field differs from THAT view. Right after
// a fresh import the plan is ≈0 writes — '.' placeholders, numeric zips,
// m8 Contact-ID URLs etc. all stay untouched.
//
// Rows analyzeSheet skips (TST/MOV/DEL) or fatals get a per-row mapRow
// view with household treated as unlinked; a mapRow Fatal means every
// owned field counts as "different".

import {
  analyzeSheet, mapRow, normalizeHeader,
} from '../../scripts/lib/phonelistTransform.mjs';
import { normalizeContactId } from './contactsSyncPlan.js';

const TZ = 'America/Chicago';
const BATCH = 'sheet-sync-back';

// A..AG — the exact expected header order (normalized); any drift aborts.
export const EXPECTED_HEADERS = [
  'cott', 'Changed', 'Link', 'Last change', 'Request by USER',
  'User Settings', 'Is Admin USER', 'Head of HHold', 'Active', 'District',
  'First', 'Last', 'Couple ID', 'Spouse (First name)', 'Spouse (Last name)',
  'B/S', 'Other Name', 'Small Group', 'Home', 'Cell', 'Email', 'Address',
  'Apt', 'City', 'ST', 'Zip', 'Locality', 'Add new cols before this Col',
  'History', 'Picture ID', 'Contact ID', 'Phone Provider',
  "Insert 'formulas' before this Col",
];

export class PlanAbort extends Error {}

const IDX = {
  cott: 0, lastChange: 3, role: 6, head: 7, active: 8, district: 9,
  first: 10, last: 11, couple: 12, spouseF: 13, spouseL: 14, gender: 15,
  otherName: 16, smallGroup: 17, home: 18, cell: 19, email: 20,
  address: 21, apt: 22, city: 23, st: 24, zip: 25, locality: 26,
  history: 28, contactId: 30,
};

const colLetter = (i) => {
  let s = '';
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    s = String.fromCharCode(64 + (n % 26 || 26)) + s;
  }
  return s;
};

// ── write-format helpers ────────────────────────────────────────────────────

const ROLE_OUT = { admin: 'ADM', approver: 'APP', helper: 'HLP', saint: '' };
const STATUS_OUT = {
  active: 'A', pending: 'NR', inactive: 'NA', deceased: 'NA',
  negative: 'NA', moved: 'MOV', duplicate: 'DUP', delete: 'DEL',
};
const GENDER_OUT = { brother: 'B', sister: 'S' };
const LOCALITY_OUT = { Houston: 'HOU', Beaumont: 'BEA' };

const str = (v) => (v ?? '');
const numOrStr = (re) => (v) =>
  (v == null || v === '' ? '' : (re.test(String(v)) ? Number(v) : String(v)));

// The instant rendered as Chicago wall-clock, re-read as a UTC timestamp —
// then a Sheets serial day number (epoch 1899-12-30).
const wallMs = (d) => {
  const parts = {};
  for (const p of new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(d))) {
    if (p.type !== 'literal') parts[p.type] = Number(p.value);
  }
  return Date.UTC(parts.year, parts.month - 1, parts.day,
    parts.hour % 24, parts.minute, parts.second);
};
export const sheetsSerial = (d) =>
  (wallMs(d) - Date.UTC(1899, 11, 30)) / 86400000;

// AC History seed: {"began":"M/D/YY"} — Chicago, no leading zeros, 2-digit year.
const beganJson = (d) => {
  const parts = {};
  for (const p of new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(d))) {
    if (p.type !== 'literal') parts[p.type] = Number(p.value);
  }
  return `{"began":"${parts.month}/${parts.day}/${String(parts.year).slice(-2)}"}`;
};

const cellSerial = (v) => (v ? sheetsSerial(v) : '');
const cellPhone = (v) => (v ? `+1${String(v).replace(/\D/g, '')}` : '');
const cellContactId = (m) =>
  (normalizeContactId(m.googleContactId) ?? m.googleContactId ?? '');

const same = (a, b) => (a ?? null) === (b ?? null);

// Owned, non-household columns: compare the member field to the importer
// view field; write the spec's native format. `dir` returns the value to
// compare AND write (pre-normalized — e.g. canonical contact ids).
const OWNED = [
  { idx: IDX.role, field: 'role',
    dir: (m) => m.role ?? 'saint', view: (v) => v.role,
    write: (m) => ROLE_OUT[m.role ?? 'saint'] ?? str(m.role) },
  { idx: IDX.head, field: 'isHeadOfHousehold',
    dir: (m) => m.isHeadOfHousehold === true,
    view: (v) => v.isHeadOfHousehold === true,
    write: (m) => (m.isHeadOfHousehold ? 'H' : '') },
  { idx: IDX.active, field: 'status',
    dir: (m) => m.status ?? null, view: (v) => v.status ?? null,
    write: (m) => STATUS_OUT[m.status] ?? str(m.status) },
  { idx: IDX.district, field: 'district',
    dir: (m) => m.district ?? null, view: (v) => v.district ?? null,
    write: (m) => str(m.district) },
  { idx: IDX.first, field: 'firstName',
    dir: (m) => m.firstName ?? null, view: (v) => v.firstName ?? null,
    write: (m) => str(m.firstName) },
  { idx: IDX.last, field: 'lastName',
    dir: (m) => m.lastName ?? null, view: (v) => v.lastName ?? null,
    write: (m) => str(m.lastName) },
  { idx: IDX.gender, field: 'gender',
    dir: (m) => m.gender ?? null, view: (v) => v.gender ?? null,
    write: (m) => GENDER_OUT[m.gender] ?? '' },
  { idx: IDX.otherName, field: 'otherName',
    dir: (m) => m.otherName ?? null, view: (v) => v.otherName ?? null,
    write: (m) => str(m.otherName) },
  { idx: IDX.smallGroup, field: 'smallGroup',
    dir: (m) => m.smallGroup ?? null, view: (v) => v.smallGroup ?? null,
    write: (m) => str(m.smallGroup) },
  { idx: IDX.home, field: 'phone2',
    dir: (m) => m.phone2 ?? null, view: (v) => v.phone2 ?? null,
    write: (m) => str(m.phone2) },
  { idx: IDX.cell, field: 'phone1',
    dir: (m) => m.phone1 ?? null, view: (v) => v.phone1 ?? null,
    write: (m) => cellPhone(m.phone1) },
  { idx: IDX.email, field: 'email',
    dir: (m) => (m.email ? String(m.email).toLowerCase() : null),
    view: (v) => v.email ?? null, // mapEmail already lowercases
    write: (m) => str(m.email) },
  { idx: IDX.address, field: 'address',
    dir: (m) => m.address ?? null, view: (v) => v.address ?? null,
    write: (m) => str(m.address) },
  { idx: IDX.apt, field: 'apartment',
    dir: (m) => m.apartment ?? null, view: (v) => v.apartment ?? null,
    write: (m) => numOrStr(/^\d+$/)(m.apartment) },
  { idx: IDX.city, field: 'city',
    dir: (m) => m.city ?? null, view: (v) => v.city ?? null,
    write: (m) => str(m.city) },
  { idx: IDX.st, field: 'state',
    dir: (m) => m.state ?? null, view: (v) => v.state ?? null,
    write: (m) => str(m.state) },
  { idx: IDX.zip, field: 'zip',
    dir: (m) => m.zip ?? null, view: (v) => v.zip ?? null,
    write: (m) => numOrStr(/^\d{5}$/)(m.zip) },
  { idx: IDX.locality, field: 'locality',
    dir: (m) => m.locality ?? null, view: (v) => v.locality ?? null,
    write: (m) => LOCALITY_OUT[m.locality] ?? str(m.locality) },
  { idx: IDX.contactId, field: 'googleContactId',
    // Canonical on both sides — a stored m8 URL compares equal to the same
    // m8 cell instead of rewriting it every run. An id that can't be
    // normalized falls back to comparing the raw stored string to the raw
    // cell so an unrecognized value stays stable rather than churning.
    dir: (m) => normalizeContactId(m.googleContactId)
      ?? m.googleContactId ?? null,
    view: (v) => v.googleContactId ?? null,
    write: cellContactId,
    same: (m, viewVal, before) =>
      normalizeContactId(m.googleContactId) === undefined
        ? String(m.googleContactId ?? '') === String(before ?? '').trim()
        : same(normalizeContactId(m.googleContactId), viewVal) },
];

// "Last change" — >60 s apart (or exactly one null) counts as different.
const lastChangeDiffers = (m, view) => {
  const a = m.changedAt ? new Date(m.changedAt).getTime() : null;
  const b = view?.changedAt ? new Date(view.changedAt).getTime() : null;
  if (a === null || b === null) return a !== b;
  return Math.abs(a - b) > 60_000;
};

const numCott = (cott) => (/^\d+$/.test(String(cott)) ? Number(cott) : null);
const minNum = (a, b) => {
  const [x, y] = [Number(a), Number(b)];
  return Number.isFinite(x) && Number.isFinite(y) ? Math.min(x, y) : null;
};

// ── the plan ────────────────────────────────────────────────────────────────

// input: { formattedRows, unformattedRows, members, namedRanges,
//          gridRowCount, sheetId, now }
//   formattedRows   — saints tab, FORMATTED_VALUE, row 1 = header (A..AG)
//   unformattedRows — same grid, UNFORMATTED_VALUE (existing cell types;
//                     kept for parity with the read the job does)
//   members         — DirectoryMember rows (spouseMemberId resolvable
//                     within the set)
//   namedRanges     — spreadsheet named ranges (all sheets)
//   gridRowCount    — saints grid row count
//   sheetId         — saints sheetId (for appendDimension)
export function planSheetSync({
  formattedRows, unformattedRows = [], members = [],
  namedRanges = [], gridRowCount = 0, sheetId, now = new Date(),
} = {}) {
  // ── guard 1: header drift → abort, write nothing ──
  const headers = (formattedRows?.[0] ?? []).map(normalizeHeader);
  while (headers.length && headers[headers.length - 1] == null) headers.pop();
  if (headers.length !== EXPECTED_HEADERS.length
      || !EXPECTED_HEADERS.every((h, i) => headers[i] === h)) {
    throw new PlanAbort(
      'sheet-sync-back abort: saints row 1 does not match the expected ' +
      'column layout — refusing to write anything');
  }

  // ── rows → {headers, records} for the importer oracle ──
  // records[0] is sheet row 2 (analyzeSheet counts its sheetRow as i+2).
  const records = formattedRows.slice(1).map((r) => {
    const rec = {};
    EXPECTED_HEADERS.forEach((h, i) => { rec[h] = String(r?.[i] ?? ''); });
    return rec;
  });
  const analysis = analyzeSheet(
    { headers, records }, { asOf: now, tz: TZ, batchId: BATCH });

  // ── guard 2: index rows ≥3 by trimmed cott — duplicates abort ──
  const cottRow = new Map();
  let lastUsedRow = 2; // data starts row 3
  for (let r = 2; r < formattedRows.length; r++) {
    const cott = String(formattedRows[r]?.[IDX.cott] ?? '').trim();
    if (cott === '') continue;
    const rowNum = r + 1;
    if (cottRow.has(cott)) {
      throw new PlanAbort(
        `sheet-sync-back abort: duplicate cott '${cott}' at sheet rows ` +
        `${cottRow.get(cott)} and ${rowNum}`);
    }
    cottRow.set(cott, rowNum);
    lastUsedRow = rowNum;
  }

  // ── importer view per cott; mapRow fallback for skipped/fatal rows ──
  const viewByCott = new Map();
  for (const row of analysis.rows) {
    viewByCott.set(row.legacyId, {
      data: row.data, linked: row.linked,
      partnerLegacyId: row.partnerLegacyId, fatal: false,
    });
  }
  for (const [cott, rowNum] of cottRow) {
    if (viewByCott.has(cott)) continue;
    const rec = records[rowNum - 2];
    try {
      const ctx = { sheetRow: rowNum, legacyId: cott, warn: () => {} };
      const { data } = mapRow(rec, ctx, { asOf: now, tz: TZ, batchId: BATCH });
      viewByCott.set(cott, {
        data, linked: false, partnerLegacyId: null, fatal: false });
    } catch (e) {
      if (e?.name !== 'Fatal') throw e;
      viewByCott.set(cott, {
        data: null, linked: false, partnerLegacyId: null, fatal: true });
    }
  }

  // ── members → update / append / warn / ignore ──
  const warnings = [];
  const maxSheetCott = Math.max(0,
    ...[...cottRow.keys()].map(numCott).filter((n) => n !== null));
  const maxDbCott = Math.max(0, ...members
    .map((m) => numCott(m.legacyId)).filter((n) => n !== null));
  let nextCott = Math.max(maxSheetCott, maxDbCott) + 1;

  const memberById = new Map(members.map((m) => [m.id, m]));
  const updates = [];   // { member, cott, row, view }
  const toAppend = [];  // { member, cott|null, assign }
  let missingRows = 0;
  for (const m of members) {
    const cott = String(m.legacyId ?? '').trim();
    if (cott !== '') {
      if (cottRow.has(cott)) {
        updates.push({ member: m, cott, row: cottRow.get(cott),
          view: viewByCott.get(cott) });
      } else if (numCott(cott) !== null && Number(cott) > maxSheetCott) {
        // legacyId persisted by an earlier run that crashed before the
        // sheet write — append rather than warn.
        toAppend.push({ member: m, cott, assign: false });
      } else {
        missingRows += 1;
        warnings.push({ code: 'MISSING_ROW', memberId: m.id, cott,
          detail: 'member legacyId has no saints row' });
      }
    } else if (m.status === 'active' || m.status === 'pending') {
      toAppend.push({ member: m, cott: null, assign: true });
    }
    // every other status without a legacyId is ignored
  }

  // Stable append order: addedAt asc, id asc. New cotts are sequential
  // from max(sheet, DB)+1 so a crashed earlier run can't re-use one.
  toAppend.sort((a, b) =>
    (new Date(a.member.addedAt ?? 0) - new Date(b.member.addedAt ?? 0))
    || String(a.member.id).localeCompare(String(b.member.id)));
  const startRow = lastUsedRow + 1;
  const appends = toAppend.map((a, i) => {
    const cott = a.cott ?? String(nextCott++);
    return { cott, memberId: a.member.id, row: startRow + i,
      assignLegacyId: a.assign, member: a.member };
  });

  // cott a member will have after this run — lets desiredPartner resolve
  // spouses whose legacyId is being assigned right now.
  const cottOf = new Map();
  for (const u of updates) cottOf.set(u.member.id, u.cott);
  for (const a of appends) cottOf.set(a.memberId, a.cott);
  const desiredPartner = (m) => {
    if (!m.spouseMemberId) return null;
    const spouse = memberById.get(m.spouseMemberId);
    if (!spouse) return null;
    const assigned = cottOf.get(spouse.id);
    if (assigned) return assigned;
    const cott = String(spouse.legacyId ?? '').trim();
    return cott === '' ? null : cott;
  };

  // ── writes ──
  const writes = [];
  const writeKeys = new Set();
  const rowMember = new Map(); // row → member (for the D rewrite)
  const cell = (row, idx) => String(formattedRows[row - 1]?.[idx] ?? '');
  const pushWrite = (row, idx, cott, field, after, member) => {
    const key = `${row}:${idx}`;
    if (writeKeys.has(key)) return;
    writeKeys.add(key);
    if (member) rowMember.set(row, member);
    writes.push({
      row, col: colLetter(idx), colIdx: idx, cott, field,
      before: cell(row, idx), after,
    });
  };

  for (const { member: m, cott, row, view } of updates) {
    for (const def of OWNED) {
      const differs = view.fatal
        ? true
        : def.same
          ? !def.same(m, def.view(view.data), cell(row, def.idx))
          : !same(def.dir(m), def.view(view.data));
      if (differs) {
        pushWrite(row, def.idx, cott, def.field, def.write(m), m);
      }
    }
    if (view.fatal || lastChangeDiffers(m, view.data)) {
      pushWrite(row, IDX.lastChange, cott, 'changedAt',
        cellSerial(m.changedAt), m);
    }
  }

  // ── household (Couple ID + spouse names) — existing rows and appends ──
  for (const { member: m, cott, row, view } of updates) {
    const desired = desiredPartner(m);
    const sheetPartner = view?.linked ? view.partnerLegacyId : null;
    if (desired !== null && desired === sheetPartner) continue; // in sync
    if (desired !== null) {
      // (re)link: BOTH rows get M = min(cott, partner cott) and each
      // other's names in N/O.
      const partner = memberById.get(m.spouseMemberId);
      const pair = minNum(cott, desired) ?? numCott(cott) ?? cott;
      pushWrite(row, IDX.couple, cott, 'coupleId', pair, m);
      pushWrite(row, IDX.spouseF, cott, 'spouseFirstName',
        str(partner?.firstName), m);
      pushWrite(row, IDX.spouseL, cott, 'spouseLastName',
        str(partner?.lastName), m);
      const pRow = cottRow.get(desired);
      if (pRow) {
        pushWrite(pRow, IDX.couple, desired, 'coupleId',
          pair ?? numCott(desired) ?? desired, partner);
        pushWrite(pRow, IDX.spouseF, desired, 'spouseFirstName',
          str(m.firstName), partner);
        pushWrite(pRow, IDX.spouseL, desired, 'spouseLastName',
          str(m.lastName), partner);
      }
      continue;
    }
    // Unlinked in the Directory: a stale sheet link collapses to the
    // row's own cott; N/O fall through to the unlinked compare.
    if (sheetPartner !== null) {
      pushWrite(row, IDX.couple, cott, 'coupleId', Number(cott), m);
    }
    const spouseDiffers = (own, viewVal) =>
      view.fatal || !same(own ?? null, viewVal ?? null);
    if (spouseDiffers(m.spouseFirstName, view.data?.spouseFirstName)) {
      pushWrite(row, IDX.spouseF, cott, 'spouseFirstName',
        str(m.spouseFirstName), m);
    }
    if (spouseDiffers(m.spouseLastName, view.data?.spouseLastName)) {
      pushWrite(row, IDX.spouseL, cott, 'spouseLastName',
        str(m.spouseLastName), m);
    }
  }
  // Appended members linked to an existing row: partner side gets M/N/O.
  for (const a of appends) {
    const desired = desiredPartner(a.member);
    if (desired === null) continue;
    const partner = memberById.get(a.member.spouseMemberId);
    const pair = minNum(a.cott, desired) ?? numCott(desired) ?? desired;
    const pRow = cottRow.get(desired);
    if (pRow) {
      pushWrite(pRow, IDX.couple, desired, 'coupleId', pair, partner);
      pushWrite(pRow, IDX.spouseF, desired, 'spouseFirstName',
        str(a.member.firstName), partner);
      pushWrite(pRow, IDX.spouseL, desired, 'spouseLastName',
        str(a.member.lastName), partner);
    }
  }

  // "Last change" rides along on every row that got any other owned write.
  for (const [row, m] of rowMember) {
    pushWrite(row, IDX.lastChange, m.legacyId ?? '', 'changedAt',
      cellSerial(m.changedAt), null);
  }

  writes.sort((a, b) => a.row - b.row || a.colIdx - b.colIdx);

  // ── append row values ──
  for (const a of appends) {
    const m = a.member;
    const desired = desiredPartner(m);
    const partner = desired !== null
      ? memberById.get(m.spouseMemberId) : null;
    const values = new Array(33).fill('');
    values[IDX.cott] = Number(a.cott);
    values[IDX.lastChange] = cellSerial(m.changedAt ?? m.addedAt);
    for (const def of OWNED) values[def.idx] = def.write(m);
    values[IDX.couple] = desired !== null
      ? (minNum(a.cott, desired) ?? Number(a.cott)) : Number(a.cott);
    values[IDX.spouseF] = partner ? str(partner.firstName)
      : str(m.spouseFirstName);
    values[IDX.spouseL] = partner ? str(partner.lastName)
      : str(m.spouseLastName);
    values[IDX.history] = beganJson(m.addedAt);
    a.values = values;
  }

  // ── grid ops: only when appends overflow the saints grid ──
  const lastNeededRow = appends.length ? startRow + appends.length - 1 : 0;
  let gridOps = null;
  if (appends.length && lastNeededRow > gridRowCount) {
    const add = lastNeededRow - gridRowCount;
    const newRowCount = gridRowCount + add;
    gridOps = {
      sheetId,
      appendRows: add,
      newRowCount,
      // Row-scoped named ranges pinned to the old grid end must grow with
      // it — the satellites IMPORTRANGE/FILTER them as equal-height arrays.
      namedRanges: namedRanges
        // The Sheets API omits range.sheetId when it is 0 — compare with
        // both sides defaulted, not strict equality.
        .filter((nr) => (nr.range?.sheetId ?? 0) === (sheetId ?? 0)
          && nr.range?.endRowIndex === gridRowCount
          && (nr.range?.startRowIndex ?? 0) >= 1)
        .map((nr) => ({
          namedRangeId: nr.namedRangeId, name: nr.name, range: nr.range,
        })),
    };
  }

  // Appended rows inherit the last used row's formatting (RAW writes
  // alone would leave D as a bare serial and drop the zip/apt formats).
  // The job sends ONE copyPaste PASTE_FORMAT across the new rows inside
  // the same batchUpdate as any grid growth. Rows are 1-based sheet rows;
  // there is nothing to copy from when the data region is empty (row 2).
  const formatCopy = appends.length && lastUsedRow >= 3
    ? { sheetId, sourceRow: lastUsedRow, firstRow: startRow,
        lastRow: lastNeededRow }
    : null;

  if (lastNeededRow > 1150) {
    warnings.push({ code: 'ANNUAL_LIST_CAP', detail:
      `last used row ${lastNeededRow} exceeds 1150 — ` +
      "'Create annual phone list' hard-codes saints!A3:AC1200" });
  }

  return {
    writes,
    formatCopy,
    appends: appends.map(({ member, ...a }) => a),
    gridOps,
    warnings,
    stats: {
      compared: updates.length,
      writes: writes.length,
      appends: appends.length,
      missingRows,
      lastUsedRow,
      maxSheetCott,
      newCottBase: Math.max(maxSheetCott, maxDbCott) + 1,
      sheetFatalRows: viewByCott.size
        ? [...viewByCott.values()].filter((v) => v.fatal).length : 0,
    },
  };
}
