// sheetSyncPlan tests — the planner is pure: saints is a 2-D formatted
// grid, DirectoryMembers are plain objects. The oracle is the importer's
// own analyzeSheet/mapRow, so a fresh-import sheet must plan zero writes.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeSheet, mapRow,
} from '../scripts/lib/phonelistTransform.mjs';
import {
  EXPECTED_HEADERS, PlanAbort, planSheetSync, sheetsSerial,
} from '../src/services/sheetSyncPlan.js';
import { normalizeContactId } from '../src/services/contactsSyncPlan.js';

const TZ = 'America/Chicago';
const NOW = new Date('2026-09-27T12:00:00Z');
const M8 =
  'https://www.google.com/m8/feeds/contacts/' +
  'serviceoffice%40churchinhouston.org/base/1a2b3c4d5e6f7890';

// column indexes
const C = {
  cott: 0, changedAt: 3, role: 6, head: 7, active: 8, district: 9,
  first: 10, last: 11, couple: 12, spouseF: 13, spouseL: 14, gender: 15,
  otherName: 16, smallGroup: 17, home: 18, cell: 19, email: 20,
  address: 21, apt: 22, city: 23, st: 24, zip: 25, locality: 26,
  ab: 27, history: 28, pic: 29, contactId: 30, provider: 31, edge: 32,
};

const blank = () => new Array(33).fill('');

const dataRow = (cott, over = {}) => {
  const r = blank();
  r[C.cott] = cott;
  r[C.active] = 'A';
  r[C.district] = 'West';
  r[C.couple] = cott;
  r[C.gender] = 'B';
  r[C.changedAt] = '4/15/24 10:30';
  r[C.locality] = 'HOU';
  for (const [k, v] of Object.entries(over)) r[C[k]] = v;
  return r;
};

const fixtureRows = () => [
  [...EXPECTED_HEADERS],
  // row 2 — the TST sample row every copy carries
  (() => { const r = blank(); r[C.cott] = 'TST'; r[C.active] = 'TST';
    r[C.first] = 'Test'; r[C.last] = 'Row'; return r; })(),
  // row 3 — cott 101 John Smith, half of a linked couple
  dataRow('101', {
    first: 'John', last: 'Smith', cell: '832-555-0101',
    email: 'john@example.com', address: '100 Main St', city: 'Houston',
    st: 'TX', zip: '77001', otherName: '.', smallGroup: '.', home: '.',
    apt: '.', spouseF: '.', spouseL: '.', contactId: '.',
    history: '{"began":"1/2/24"}',
  }),
  // row 4 — cott 102 Jane Smith, the other half (same Couple ID, S)
  dataRow('102', {
    couple: '101',
    first: 'Jane', last: 'Smith', gender: 'S', cell: '832-555-0102',
    email: '.', address: '100 Main St', city: 'Houston', st: 'TX',
    zip: '77001', spouseF: '.', spouseL: '.', contactId: '.',
    history: '{"began":"1/2/24"}',
  }),
  // row 5 — cott 103: unlinked row full of '.' placeholders
  dataRow('103', {
    district: 'Southwest', first: 'Bob', last: 'Jones', cell: '.',
    email: '.', address: '.', apt: '.', city: 'Houston', st: '.',
    zip: '.', otherName: '.', smallGroup: '.', home: '.',
    spouseF: '.', spouseL: '.', contactId: '.',
  }),
  // row 6 — cott 104: unlinked, spouse TEXT in N/O, m8 Contact-ID URL,
  // numeric-looking Apt/Zip
  dataRow('104', {
    district: 'South', first: 'Carol', last: 'Lee', gender: 'S',
    spouseF: 'Dan', spouseL: 'Lee', cell: '713-555-0104', email: '.',
    address: '200 Oak Ave', apt: '5', city: 'Houston', st: 'TX',
    zip: '77004', contactId: M8,
  }),
  // row 7 — cott 105: MOV row (importer skips it; mapRow fallback view)
  dataRow('105', {
    active: 'MOV', first: 'Eve', last: 'Moved', gender: 'S', cell: '.',
    email: '.', contactId: '.', spouseF: '.', spouseL: '.',
  }),
  // row 8 — cott 106: plain active row (mutation target)
  dataRow('106', {
    district: 'North', first: 'Frank', last: 'Miller',
    cell: '281-555-0106', email: 'frank@example.com',
    address: '300 Pine Rd', apt: '7', city: 'Houston', st: 'TX',
    zip: '77005', contactId: '.',
  }),
  // row 9 — cott 107: pending (NR)
  dataRow('107', {
    active: 'NR', first: 'Grace', last: 'Hall', gender: 'S', cell: '.',
    email: '.', contactId: '.', spouseF: '.', spouseL: '.',
  }),
];

// Members shaped exactly like the DirectoryMember rows the importer
// produced — run the sheet through analyzeSheet, then map the MOV row
// (analyzeSheet skips it) through mapRow for its fallback-view member.
const membersFor = (rows) => {
  const records = rows.slice(1).map((r) => Object.fromEntries(
    EXPECTED_HEADERS.map((h, i) => [h, String(r[i] ?? '')])));
  const analysis = analyzeSheet(
    { headers: EXPECTED_HEADERS, records }, { asOf: NOW, tz: TZ, batchId: 't' });
  const members = analysis.rows.map((r) => ({
    ...r.data,
    id: `m-${r.legacyId}`,
    addedAt: new Date('2024-01-02T00:00:00Z'),
    spouseMemberId: r.partnerLegacyId ? `m-${r.partnerLegacyId}` : null,
  }));
  for (const r of records) {
    const cott = String(r.cott ?? '').trim();
    if (!cott || cott === 'TST') continue;
    if (members.some((m) => m.legacyId === cott)) continue;
    const ctx = { sheetRow: 0, legacyId: cott, warn: () => {} };
    const { data } = mapRow(r, ctx, { asOf: NOW, tz: TZ, batchId: 't' });
    members.push({ ...data, id: `m-${cott}`,
      addedAt: new Date('2024-01-02T00:00:00Z'), spouseMemberId: null });
  }
  return members;
};

const plan = (over = {}) => planSheetSync({
  formattedRows: fixtureRows(),
  unformattedRows: [],
  members: membersFor(fixtureRows()),
  namedRanges: [], gridRowCount: 15, sheetId: 7, now: NOW,
  ...over,
});

const writesFor = (p, row) => p.writes.filter((w) => w.row === row);
const writeAt = (p, row, col) =>
  p.writes.find((w) => w.row === row && w.col === col);

// ── 1. round-trip: importer-equivalent members → zero writes ────────────────

test('round-trip: members equal to the sheet plan zero writes/appends', () => {
  const p = plan();
  assert.equal(p.writes.length, 0,
    `unexpected writes: ${JSON.stringify(p.writes)}`);
  assert.equal(p.appends.length, 0);
  assert.equal(p.gridOps, null);
  assert.equal(p.warnings.length, 0);
});

// ── 2. owned columns: one changed field → one write + D rewrite ─────────────

const ownedCases = [
  ['firstName', 'Franklin', 'K', 'Franklin'],
  ['lastName', 'Millhouse', 'L', 'Millhouse'],
  ['role', 'admin', 'G', 'ADM'],
  ['role', 'helper', 'G', 'HLP'],
  ['role', 'approver', 'G', 'APP'],
  ['status', 'deceased', 'I', 'NA'],
  ['status', 'pending', 'I', 'NR'],
  ['status', 'moved', 'I', 'MOV'],
  ['district', 'Southwest', 'J', 'Southwest'],
  ['gender', 'sister', 'P', 'S'],
  ['otherName', 'Frankie', 'Q', 'Frankie'],
  ['smallGroup', 'Tues AM', 'R', 'Tues AM'],
  ['phone2', '713-555-9999', 'S', '713-555-9999'],
  ['phone1', '281-555-7777', 'T', '+12815557777'],
  ['email', 'frank2@example.com', 'U', 'frank2@example.com'],
  ['address', '9 New Rd', 'V', '9 New Rd'],
  ['apartment', '12', 'W', 12],
  ['apartment', '12B', 'W', '12B'],
  ['city', 'Katy', 'X', 'Katy'],
  ['state', 'LA', 'Y', 'LA'],
  ['zip', '77006', 'Z', 77006],
  ['zip', '77006-1234', 'Z', '77006-1234'],
  ['locality', 'Beaumont', 'AA', 'BEA'],
  ['googleContactId', 'people/c999', 'AE', 'people/c999'],
];

test('each owned column writes the spec native format plus a D rewrite', () => {
  for (const [field, value, col, after] of ownedCases) {
    const members = membersFor(fixtureRows());
    const m = members.find((x) => x.legacyId === '106');
    m[field] = value;
    const p = plan({ members });
    const ws = writesFor(p, 8);
    assert.equal(ws.length, 2,
      `${field}=${value}: expected exactly the field write + D, got ` +
      JSON.stringify(ws));
    const w = writeAt(p, 8, col);
    assert.ok(w, `${field}: missing ${col} write`);
    assert.equal(w.after, after, `${field}: after`);
    const d = writeAt(p, 8, 'D');
    assert.ok(d, `${field}: missing D rewrite`);
    assert.equal(typeof d.after, 'number'); // Sheets serial
  }
});

test('role saint / null writes an empty G cell; locality Houston writes HOU', () => {
  const members = membersFor(fixtureRows());
  const m = members.find((x) => x.legacyId === '106');
  m.role = 'approver';
  let p = plan({ members });
  assert.equal(writeAt(p, 8, 'G').after, 'APP');
  // and a member edited back to 'saint' clears the cell
  const rows2 = fixtureRows();
  rows2[7][C.role] = 'APP';
  const members2 = membersFor(rows2);
  const m2 = members2.find((x) => x.legacyId === '106');
  m2.role = 'saint';
  p = plan({ formattedRows: rows2, members: members2 });
  assert.equal(writeAt(p, 8, 'G').after, '');
});

test('m8 Contact-ID URL stays untouched (canonical comparison)', () => {
  const members = membersFor(fixtureRows());
  const m = members.find((x) => x.legacyId === '104');
  assert.equal(m.googleContactId, normalizeContactId(M8));
  const p = plan({ members });
  assert.equal(writesFor(p, 6).length, 0);
});

test('changedAt >60 s drift rewrites D alone', () => {
  const members = membersFor(fixtureRows());
  const m = members.find((x) => x.legacyId === '106');
  m.changedAt = new Date(m.changedAt.getTime() + 61_000);
  const p = plan({ members });
  assert.equal(writesFor(p, 8).length, 1);
  assert.equal(writesFor(p, 8)[0].col, 'D');
  assert.equal(typeof writesFor(p, 8)[0].after, 'number');
});

// ── 3. never-written columns ────────────────────────────────────────────────

test('never-written columns stay untouched even when everything changes', () => {
  const members = membersFor(fixtureRows());
  const m = members.find((x) => x.legacyId === '106');
  Object.assign(m, {
    firstName: 'X', lastName: 'Y', role: 'admin', status: 'moved',
    district: 'Southwest', gender: 'sister', otherName: 'O', smallGroup: 'G',
    phone1: '111-222-3333', phone2: '444-555-6666', email: 'x@y.z',
    address: 'A', apartment: '9', city: 'C', state: 'ST', zip: '12345',
    googleContactId: 'people/c42',
  });
  const p = plan({ members });
  const forbidden = new Set(['A', 'B', 'C', 'E', 'F', 'AB', 'AC', 'AD', 'AF', 'AG']);
  for (const w of p.writes) {
    assert.ok(!forbidden.has(w.col), `forbidden column written: ${w.col}`);
  }
});

// ── 4. household ─────────────────────────────────────────────────────────────

test('relink two unlinked members writes both M=min cott + N/O names + D', () => {
  const members = membersFor(fixtureRows());
  const bob = members.find((m) => m.legacyId === '103');
  const carol = members.find((m) => m.legacyId === '104');
  bob.spouseMemberId = carol.id;
  carol.spouseMemberId = bob.id;
  const p = plan({ members });

  // Bob's row (5): M = min(103,104) = 103, N/O = Carol Lee
  assert.equal(writeAt(p, 5, 'M').after, 103);
  assert.equal(writeAt(p, 5, 'N').after, 'Carol');
  assert.equal(writeAt(p, 5, 'O').after, 'Lee');
  // Carol's row (6): M = 103, N/O = Bob Jones
  assert.equal(writeAt(p, 6, 'M').after, 103);
  assert.equal(writeAt(p, 6, 'N').after, 'Bob');
  assert.equal(writeAt(p, 6, 'O').after, 'Jones');
  assert.ok(writeAt(p, 5, 'D') && writeAt(p, 6, 'D'));
});

test('unlink restores the row\'s own cott number in M; N/O compare unlinked', () => {
  const members = membersFor(fixtureRows());
  const john = members.find((m) => m.legacyId === '101');
  john.spouseMemberId = null;
  john.spouseFirstName = null;
  john.spouseLastName = null;
  const p = plan({ members });
  const m = writeAt(p, 3, 'M');
  assert.ok(m, 'missing M write');
  assert.equal(m.after, 101); // own cott, as a number
  // sheet N/O cells are '.' → view spouse fields null; a member storing
  // spouse text still writes it through the unlinked compare.
  assert.equal(writeAt(p, 3, 'N'), undefined);
  const members2 = membersFor(fixtureRows());
  const jane = members2.find((x) => x.legacyId === '102');
  jane.spouseMemberId = null;
  jane.spouseFirstName = 'Jane';
  jane.spouseLastName = 'Smith';
  const p2 = plan({ members: members2 });
  assert.equal(writeAt(p2, 4, 'M').after, 102);
  assert.equal(writeAt(p2, 4, 'N').after, 'Jane');
  assert.equal(writeAt(p2, 4, 'O').after, 'Smith');
});

// ── 5. new members / appends / grid growth ───────────────────────────────────

test('new active member gets cott = max(sheet,DB)+1 and a full A..AG row', () => {
  const members = membersFor(fixtureRows());
  members.push({
    id: 'm-new', legacyId: null, status: 'active', role: 'saint',
    firstName: 'New', lastName: 'Saint', gender: 'brother',
    district: 'North', locality: 'Houston', isHeadOfHousehold: false,
    phone1: '281-555-0000', addedAt: new Date('2026-09-20T10:00:00Z'),
    changedAt: new Date('2026-09-20T10:00:00Z'),
  });
  const p = plan({ members });
  assert.equal(p.appends.length, 1);
  const a = p.appends[0];
  assert.equal(a.cott, '108'); // sheet max 107, db max 107
  assert.equal(a.row, 10); // after last used row 9
  assert.equal(a.assignLegacyId, true);
  assert.equal(a.memberId, 'm-new');
  const v = a.values;
  assert.equal(v.length, 33);
  assert.equal(v[0], 108); // A numeric cott
  assert.equal(v[1], ''); assert.equal(v[2], ''); // B/C
  assert.equal(v[3], sheetsSerial(new Date('2026-09-20T10:00:00Z'))); // D
  assert.equal(v[4], ''); assert.equal(v[5], ''); // E/F
  assert.equal(v[6], ''); // G saint
  assert.equal(v[8], 'A'); // I
  assert.equal(v[9], 'North'); // J
  assert.equal(v[10], 'New'); assert.equal(v[11], 'Saint'); // K/L
  assert.equal(v[12], 108); // M = own cott
  assert.equal(v[15], 'B'); // P
  assert.equal(v[19], '+12815550000'); // T
  assert.equal(v[26], 'HOU'); // AA
  assert.equal(v[27], ''); // AB
  assert.match(v[28], /^\{"began":"9\/2?0\/26"\}$/); // AC
  assert.equal(v[29], ''); // AD
  assert.equal(v[30], ''); assert.equal(v[31], ''); assert.equal(v[32], '');
});

test('pre-assigned legacyId above sheet max appends instead of MISSING_ROW', () => {
  const members = membersFor(fixtureRows());
  members.push({ id: 'm-old', legacyId: '150', status: 'active',
    firstName: 'Crash', lastName: 'Recover', gender: 'brother',
    district: 'North', locality: 'Houston', role: 'saint',
    isHeadOfHousehold: false, addedAt: new Date('2026-09-19T00:00:00Z') });
  members.push({ id: 'm-new', legacyId: null, status: 'active',
    firstName: 'Next', lastName: 'One', gender: 'sister',
    district: 'North', locality: 'Houston', role: 'saint',
    isHeadOfHousehold: false, addedAt: new Date('2026-09-20T00:00:00Z') });
  const p = plan({ members });
  assert.equal(p.appends.length, 2);
  assert.equal(p.appends[0].cott, '150');
  assert.equal(p.appends[0].assignLegacyId, false);
  assert.equal(p.appends[1].cott, '151'); // max(107, 150) + 1
  assert.equal(p.warnings.filter((w) => w.code === 'MISSING_ROW').length, 0);
});

test('legacyId absent from sheet and <= max warns MISSING_ROW', () => {
  const members = membersFor(fixtureRows());
  members.push({ id: 'm-gone', legacyId: '50', status: 'active',
    firstName: 'Gone', lastName: 'Row', gender: 'brother',
    district: 'North', locality: 'Houston', role: 'saint',
    isHeadOfHousehold: false });
  const p = plan({ members });
  const w = p.warnings.find((x) => x.code === 'MISSING_ROW');
  assert.ok(w); assert.equal(w.cott, '50');
  assert.equal(p.appends.length, 0);
});

test('null legacyId with non-active/pending status is ignored', () => {
  const members = membersFor(fixtureRows());
  members.push({ id: 'm-del', legacyId: null, status: 'delete',
    firstName: 'No', lastName: 'Row', gender: 'brother',
    district: 'North', locality: 'Houston', role: 'saint',
    isHeadOfHousehold: false });
  const p = plan({ members });
  assert.equal(p.appends.length, 0);
  assert.equal(p.writes.length, 0);
});

test('grid overflow plans one appendDimension + row-scoped named ranges only', () => {
  // Ranges pinned to the OLD grid end (rowCount 9 → endRowIndex 9) extend;
  // header-scoped, other-sheet, and non-row-scoped ranges don't.
  const namedRanges = [
    { namedRangeId: 'nr1', name: 'sa_EntirePhonelist', range: {
      sheetId: 7, startRowIndex: 2, endRowIndex: 9,
      startColumnIndex: 0, endColumnIndex: 27 } },
    { namedRangeId: 'nr2', name: 'sa_StatusColumn', range: {
      sheetId: 7, startRowIndex: 2, endRowIndex: 9,
      startColumnIndex: 8, endColumnIndex: 9 } },
    // header-scoped — must NOT be extended
    { namedRangeId: 'nr3', name: 'sa_First', range: {
      sheetId: 7, startRowIndex: 0, endRowIndex: 1,
      startColumnIndex: 10, endColumnIndex: 11 } },
    // ends at grid end but starts at row 0 — must NOT be extended
    { namedRangeId: 'nr4', name: 'odd', range: {
      sheetId: 7, startRowIndex: 0, endRowIndex: 9,
      startColumnIndex: 0, endColumnIndex: 1 } },
    // other sheet — must NOT be extended
    { namedRangeId: 'nr5', name: 'other', range: {
      sheetId: 99, startRowIndex: 2, endRowIndex: 9,
      startColumnIndex: 0, endColumnIndex: 5 } },
  ];
  const members = membersFor(fixtureRows());
  members.push({ id: 'm-new', legacyId: null, status: 'active',
    firstName: 'New', lastName: 'Row', gender: 'brother',
    district: 'North', locality: 'Houston', role: 'saint',
    isHeadOfHousehold: false, addedAt: new Date('2026-09-20T00:00:00Z') });
  const p = plan({ members, namedRanges, gridRowCount: 10 });
  // last used 9, append at row 10 > grid 9? gridRowCount 10 fits row 10…
  // use gridRowCount 9 to force overflow:
  const p2 = plan({ members, namedRanges, gridRowCount: 9 });
  assert.ok(p2.gridOps);
  assert.equal(p2.gridOps.appendRows, 1); // row 10 needed, grid had 9
  assert.equal(p2.gridOps.newRowCount, 10);
  assert.deepEqual(
    p2.gridOps.namedRanges.map((n) => n.namedRangeId).sort(),
    ['nr1', 'nr2']);
  // in-grid append plans no gridOps
  assert.equal(p.gridOps, null);
});

test('formatCopy covers appended rows; null when there is nothing to copy', () => {
  const members = membersFor(fixtureRows());
  members.push({ id: 'm-new', legacyId: null, status: 'active',
    firstName: 'New', lastName: 'Row', gender: 'brother',
    district: 'North', locality: 'Houston', role: 'saint',
    isHeadOfHousehold: false, addedAt: new Date('2026-09-20T00:00:00Z') });
  const p = plan({ members });
  assert.deepEqual(p.formatCopy,
    { sheetId: 7, sourceRow: 9, firstRow: 10, lastRow: 10 });
  // no appends → null
  assert.equal(plan({ members: membersFor(fixtureRows()) }).formatCopy, null);
  // empty data region (lastUsedRow 2) → no row to copy format from
  const tst = new Array(33).fill('');
  tst[0] = 'TST'; tst[8] = 'TST';
  const emptyRows = [[...EXPECTED_HEADERS], tst];
  const p2 = plan({ formattedRows: emptyRows,
    members: [members.find((m) => m.id === 'm-new')] });
  assert.equal(p2.appends.length, 1);
  assert.equal(p2.formatCopy, null);
});

test('named-range match treats a missing range.sheetId as sheet 0', () => {
  // The Sheets API omits range.sheetId when it is 0.
  const namedRanges = [
    { namedRangeId: 'nr0', name: 'sa_EntirePhonelist', range: {
      startRowIndex: 2, endRowIndex: 9,
      startColumnIndex: 0, endColumnIndex: 27 } },
  ];
  const members = membersFor(fixtureRows());
  members.push({ id: 'm-new', legacyId: null, status: 'active',
    firstName: 'New', lastName: 'Row', gender: 'brother',
    district: 'North', locality: 'Houston', role: 'saint',
    isHeadOfHousehold: false, addedAt: new Date('2026-09-20T00:00:00Z') });
  const p = plan({ members, namedRanges, gridRowCount: 9, sheetId: 0 });
  assert.ok(p.gridOps);
  assert.deepEqual(
    p.gridOps.namedRanges.map((n) => n.namedRangeId), ['nr0']);
});

// ── 6. aborts ────────────────────────────────────────────────────────────────

test('header drift aborts the whole plan', () => {
  const rows = fixtureRows();
  rows[0][10] = 'Given Name'; // K header changed
  assert.throws(() => plan({ formattedRows: rows }), PlanAbort);
});

test('duplicate cott aborts the whole plan', () => {
  const rows = fixtureRows();
  rows.push(dataRow('101', { first: 'Dup', last: 'Row' }));
  assert.throws(() => plan({ formattedRows: rows }), PlanAbort);
});

// ── 7. idempotency: apply the plan to the fixture and re-plan ────────────────

const fmtSerial = (s) => {
  const wall = new Date(s * 86400000 + Date.UTC(1899, 11, 30));
  const p = (n) => String(n).padStart(2, '0');
  return `${wall.getUTCMonth() + 1}/${wall.getUTCDate()}/` +
    `${String(wall.getUTCFullYear()).slice(-2)} ` +
    `${p(wall.getUTCHours())}:${p(wall.getUTCMinutes())}`;
};
const renderCell = (colIdx, after) => {
  if (after === '' || after == null) return '';
  if (typeof after === 'number') {
    return colIdx === C.changedAt ? fmtSerial(after) : String(after);
  }
  return String(after);
};

test('applying the plan to the sheet and re-planning yields zero', () => {
  const rows = fixtureRows();
  const members = membersFor(rows);
  // change several fields + add a member + relink a couple
  const frank = members.find((m) => m.legacyId === '106');
  frank.firstName = 'Franklin';
  frank.zip = '77007';
  const bob = members.find((m) => m.legacyId === '103');
  const carol = members.find((m) => m.legacyId === '104');
  bob.spouseMemberId = carol.id;
  carol.spouseMemberId = bob.id;
  const newbie = { id: 'm-new', legacyId: null, status: 'active',
    firstName: 'New', lastName: 'Saint', gender: 'brother',
    district: 'North', locality: 'Houston', role: 'saint',
    isHeadOfHousehold: false, phone1: '281-555-0000',
    addedAt: new Date('2026-09-20T10:00:00Z'),
    changedAt: new Date('2026-09-20T10:00:00Z') };
  members.push(newbie);

  const p1 = plan({ formattedRows: rows, members });
  assert.ok(p1.writes.length > 0 || p1.appends.length > 0);

  // simulate the apply on the formatted grid
  const applied = rows.map((r) => [...r]);
  for (const w of p1.writes) applied[w.row - 1][w.colIdx] = renderCell(w.colIdx, w.after);
  for (const a of p1.appends) {
    applied[a.row - 1] = a.values.map((v, i) => renderCell(i, v));
    if (a.assignLegacyId) newbie.legacyId = a.cott; // DB assignment applied
  }

  const p2 = plan({ formattedRows: applied, members });
  assert.equal(p2.appends.length, 0,
    `re-append: ${JSON.stringify(p2.appends.map((x) => x.cott))}`);
  assert.equal(p2.writes.length, 0,
    `re-writes: ${JSON.stringify(p2.writes)}`);
});
