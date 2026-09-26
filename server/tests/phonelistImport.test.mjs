import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import {
  normalizeHeader, cleanText, spouseText, mapStatus, mapRole, mapDistrict,
  mapLocality, mapGender, mapHead, mapEmail, mapContactId, parseLastChange,
  parseSmsState, analyzeSheet, batchIdForAsOf, purgeRefusal, formatWarningsCsv,
  Fatal, REQUIRED_COLUMNS,
} from '../scripts/lib/phonelistTransform.mjs';
import { DIRECTORY_DISTRICTS } from 'shared';
import { parsePhonelistCsv, parseArgs, UsageError } from '../scripts/import-phonelist.mjs';

// ── Fixtures (synthetic only) ───────────────────────────────────────────────

const AS_OF = new Date('2026-09-25T21:10:00-05:00');
const OPTS = { asOf: AS_OF, tz: 'America/Mexico_City', batchId: 'phonelist-20260925' };

function mkRec(overrides = {}) {
  return {
    cott: '1001', Changed: '', 'Last change': '9/25/26 12:00',
    'Request by USER': '', 'User Settings': '', 'Is Admin USER': '',
    'Head of HHold': 'H', Active: 'A', District: 'Central 1',
    First: 'Test', Last: 'Person', 'Couple ID': '1001',
    'Spouse (First name)': '', 'Spouse (Last name)': '',
    'B/S': 'B', 'Other Name': '', 'Small Group': '',
    Home: '', Cell: '713-555-0100', Email: '',
    Address: '', Apt: '', City: '', ST: '', Zip: '',
    Locality: 'HOU', History: '{}', 'Contact ID': '',
    ...overrides,
  };
}

const analyze = (records, opts = OPTS) =>
  analyzeSheet({ headers: [...REQUIRED_COLUMNS], records }, opts);

const warns = (a, code) => a.warnings.filter((w) => w.code === code);
const rowFor = (a, legacyId) => a.rows.find((r) => r.legacyId === legacyId);

// ── normalizeHeader ─────────────────────────────────────────────────────────

test('normalizeHeader collapses whitespace incl. newlines and strips a BOM', () => {
  assert.equal(normalizeHeader('Request\nby USER'), 'Request by USER');
  assert.equal(normalizeHeader('  Cell'), 'Cell');
  assert.equal(normalizeHeader('\uFEFFcott'), 'cott');
  assert.equal(normalizeHeader('Head\nof\nHHold'), 'Head of HHold');
  assert.equal(normalizeHeader(''), null);
  assert.equal(normalizeHeader('   '), null);
});

// ── cleanText / spouseText ──────────────────────────────────────────────────

test('cleanText nulls placeholders and keeps real text', () => {
  for (const v of ['.', '--', '   ', '------', '', null, undefined]) {
    assert.equal(cleanText(v), null, `input=${JSON.stringify(v)}`);
  }
  assert.equal(cleanText('  a   b '), 'a b');
  assert.equal(cleanText('E'), 'E');
  assert.equal(cleanText('王'), '王');
});

test('spouseText keeps real names, drops one-char placeholders', () => {
  assert.equal(spouseText('Li'), 'Li');
  assert.equal(spouseText('J'), null);
  assert.equal(spouseText('.'), null);
  assert.equal(spouseText('王小'), '王小');
  assert.equal(spouseText('ab'), 'ab'); // letters, length 2
  assert.equal(spouseText('12'), null); // digits but no letter
});

// ── Code-column mappers ─────────────────────────────────────────────────────

test('status mapper accepts lowercase and maps DUP', () => {
  assert.equal(mapStatus('a'), 'active');
  assert.equal(mapStatus('nr'), 'pending');
  assert.equal(mapStatus('NA'), 'inactive');
  assert.equal(mapStatus('mov'), 'moved');
  assert.equal(mapStatus('DEL'), 'delete');
  assert.equal(mapStatus('DUP'), 'duplicate');
  assert.throws(() => mapStatus('X'), (e) => e instanceof Fatal && e.code === 'UNMAPPED_STATUS');
});

test('role mapper: blank is saint, codes are case-insensitive', () => {
  assert.equal(mapRole(''), 'saint');
  assert.equal(mapRole('  '), 'saint');
  assert.equal(mapRole('app'), 'approver');
  assert.equal(mapRole('HLP'), 'helper');
  assert.equal(mapRole('Adm'), 'admin');
  assert.throws(() => mapRole('X'), (e) => e.code === 'UNMAPPED_ROLE');
});

test('district mapper covers every sheet name and lands in DIRECTORY_DISTRICTS', () => {
  const pairs = {
    'Central 1': 'Central 1', 'Central 2': 'Central 2', 'Central 3': 'Central 3',
    'C - Sugar Land': 'Chinese 1', 'C - Diho': 'Chinese 2', 'C - Medical Ctr': 'Chinese 3',
    'S - Spanish Lang': 'Spanish', 'Southwest': 'Southwest', 'South': 'South',
    'Southeast': 'Southeast', 'North': 'North', 'West': 'Katy',
  };
  for (const [sheet, dir] of Object.entries(pairs)) {
    assert.equal(mapDistrict(sheet), dir);
    assert.ok(DIRECTORY_DISTRICTS.includes(dir), `${dir} not in DIRECTORY_DISTRICTS`);
  }
  assert.equal(mapDistrict('  central\n1  '), 'Central 1'); // whitespace + case
  assert.throws(() => mapDistrict(''), (e) => e.code === 'UNMAPPED_DISTRICT');
  assert.throws(() => mapDistrict('C99'), (e) => e.code === 'UNMAPPED_DISTRICT');
});

test('locality mapper', () => {
  assert.equal(mapLocality('hou'), 'Houston');
  assert.equal(mapLocality('BEA'), 'Beaumont');
  assert.throws(() => mapLocality(''), (e) => e.code === 'UNMAPPED_LOCALITY');
});

test('gender mapper: blank is null (warn elsewhere), lowercase ok', () => {
  assert.equal(mapGender('b'), 'brother');
  assert.equal(mapGender('S'), 'sister');
  assert.equal(mapGender(''), null);
  assert.throws(() => mapGender('x'), (e) => e.code === 'UNMAPPED_GENDER');
});

test('head mapper: H true, blank/dot false', () => {
  assert.equal(mapHead('h'), true);
  assert.equal(mapHead(''), false);
  assert.equal(mapHead('.'), false);
  assert.throws(() => mapHead('x'), (e) => e.code === 'UNMAPPED_HEAD');
});

// ── Email / contact id ──────────────────────────────────────────────────────

test('email: trim+lowercase kept; placeholder null; bad shape invalid', () => {
  assert.deepEqual(mapEmail(' Foo@Bar.COM '), { value: 'foo@bar.com', disp: 'kept' });
  assert.deepEqual(mapEmail('.'), { value: null, disp: 'placeholder' });
  assert.deepEqual(mapEmail(''), { value: null, disp: 'blank' });
  assert.deepEqual(mapEmail('foo@bar'), { value: null, disp: 'invalid' });
});

test('contact id: m8 hex → decimal, people kept, blank/garbage handled', () => {
  assert.deepEqual(
    mapContactId('http://www.google.com/m8/feeds/contacts/x%40y.org/base/100'),
    { id: 'people/c256', kind: 'm8' });
  assert.deepEqual(
    mapContactId('http://www.google.com/m8/feeds/contacts/x%40y.org/base/7fffffffffffffff'),
    { id: 'people/c9223372036854775807', kind: 'm8' });
  assert.deepEqual(mapContactId('people/c123'), { id: 'people/c123', kind: 'people' });
  assert.deepEqual(mapContactId(''), { id: null, kind: 'blank' });
  assert.deepEqual(mapContactId('garbage'), { id: null, kind: 'unrecognized' });
});

// ── Last change wall-clock → UTC ────────────────────────────────────────────

test('parseLastChange converts wall clock in the given zone', () => {
  assert.equal(
    parseLastChange('7/1/26 12:00', 'America/Mexico_City').toISOString(),
    '2026-07-01T18:00:00.000Z');
  // Mexico still observed DST in 2021 → UTC-5, not -6.
  assert.equal(
    parseLastChange('7/1/21 12:00', 'America/Mexico_City').toISOString(),
    '2021-07-01T17:00:00.000Z');
  assert.equal(
    parseLastChange('1/15/26 08:30', 'America/Chicago').toISOString(),
    '2026-01-15T14:30:00.000Z');
  assert.equal(parseLastChange('garbage', 'America/Mexico_City'), null);
  assert.equal(parseLastChange('', 'America/Mexico_City'), null);
});

// ── SMS state ───────────────────────────────────────────────────────────────

test('STOPPED state uses the parsed time, not the as-of fallback', () => {
  const s = parseSmsState(
    JSON.stringify({ command: 'stop', status: 'STOPPED', time: 'May 12, 2024, 9:15:00\u202FAM CST' }),
    AS_OF);
  assert.equal(s.stopped, true);
  assert.equal(s.stoppedAt instanceof Date, true);
  assert.notEqual(s.stoppedAt.getTime(), AS_OF.getTime());
});

test('non-stop and pending states are dropped; bad JSON warns', () => {
  assert.equal(parseSmsState(
    JSON.stringify({ status: 'STARTED', command: 'start' }), AS_OF).stopped, false);
  assert.equal(parseSmsState(
    JSON.stringify({ status: 'pending', command: 'me' }), AS_OF).stopped, false);
  assert.equal(parseSmsState('{bad json', AS_OF).parseError, true);
  assert.equal(parseSmsState('', AS_OF).stopped, false);
});

test('non-empty User Settings marks the phone welcomed at as-of', () => {
  const a = analyze([mkRec({ 'User Settings': '{"welcomeMsg":""}', Cell: '713-555-0100' })]);
  const seed = a.smsPhones.get('+17135550100');
  assert.ok(seed);
  assert.equal(seed.welcomedAt.getTime(), AS_OF.getTime());
  const a2 = analyze([mkRec({ 'User Settings': '  ' })]);
  assert.equal(a2.smsPhones.size, 0);
});

// ── Households ──────────────────────────────────────────────────────────────

test('active B+S pair links: coupleId, partner, no spouse text, married', () => {
  const a = analyze([
    mkRec({ cott: '500', 'Couple ID': '500', 'B/S': 'B', 'Spouse (First name)': 'Cy' }),
    mkRec({ cott: '501', 'Couple ID': '500', 'B/S': 'S', First: 'Cy', 'Spouse (First name)': 'Te' }),
  ]);
  const [m, f] = [rowFor(a, '500'), rowFor(a, '501')];
  assert.equal(m.linked, true);
  assert.equal(m.partnerLegacyId, '501');
  assert.equal(f.partnerLegacyId, '500');
  assert.equal(m.data.coupleId, 'pl-500');
  assert.equal(f.data.coupleId, 'pl-500');
  assert.equal(m.data.spouseFirstName, null);
  assert.equal(m.data.maritalStatus, 'married');
  assert.equal(warns(a, 'MIXED_STATUS_PAIR').length, 0);
});

test('same-gender pair stays unlinked and keeps spouse text', () => {
  const a = analyze([
    mkRec({ cott: '600', 'Couple ID': '600', 'B/S': 'B', 'Spouse (First name)': 'Li' }),
    mkRec({ cott: '601', 'Couple ID': '600', 'B/S': 'B', First: 'Dan' }),
  ]);
  assert.equal(warns(a, 'SAME_GENDER_HOUSEHOLD').length, 2);
  const m = rowFor(a, '600');
  assert.equal(m.linked, false);
  assert.equal(m.data.spouseFirstName, 'Li');
  assert.equal(m.data.maritalStatus, 'married');
});

test('exactly-one-active B+S pair is not linked; active keeps typed spouse name', () => {
  const a = analyze([
    mkRec({ cott: '700', 'Couple ID': '700', 'B/S': 'B', Active: 'A', 'Spouse (First name)': 'El' }),
    mkRec({ cott: '701', 'Couple ID': '700', 'B/S': 'S', Active: 'NA' }),
  ]);
  assert.equal(warns(a, 'MIXED_STATUS_PAIR').length, 2);
  const m = rowFor(a, '700');
  assert.equal(m.linked, false);
  assert.equal(m.data.coupleId, null);
  assert.equal(m.data.spouseFirstName, 'El');
  assert.equal(m.data.maritalStatus, 'married');
});

test('non-active B+S pairs (inactive+moved) still link', () => {
  const a = analyze([
    mkRec({ cott: '800', 'Couple ID': '800', 'B/S': 'B', Active: 'NA' }),
    mkRec({ cott: '801', 'Couple ID': '800', 'B/S': 'S', Active: 'MOV' }),
  ]);
  assert.equal(rowFor(a, '800').linked, true);
  assert.equal(rowFor(a, '800').data.coupleId, 'pl-800');
  assert.equal(warns(a, 'MIXED_STATUS_PAIR').length, 0);
});

test('single row whose Couple ID is not its own cott is an orphan ref', () => {
  const a = analyze([mkRec({ cott: '100', 'Couple ID': '999' })]);
  assert.equal(warns(a, 'ORPHAN_COUPLE_REF').length, 1);
  const self = analyze([mkRec({ cott: '100', 'Couple ID': '100' })]);
  assert.equal(warns(self, 'ORPHAN_COUPLE_REF').length, 0);
});

test('groups of 3 warn LARGE_HOUSEHOLD and link nothing', () => {
  const a = analyze([
    mkRec({ cott: '900', 'Couple ID': '900', 'B/S': 'B' }),
    mkRec({ cott: '901', 'Couple ID': '900', 'B/S': 'S' }),
    mkRec({ cott: '902', 'Couple ID': '900', 'B/S': 'B' }),
  ]);
  assert.equal(warns(a, 'LARGE_HOUSEHOLD').length, 3);
  assert.equal(rowFor(a, '900').linked, false);
});

test('linked pair with two head flags warns TWO_HEADS', () => {
  const a = analyze([
    mkRec({ cott: '950', 'Couple ID': '950', 'B/S': 'B', 'Head of HHold': 'H' }),
    mkRec({ cott: '951', 'Couple ID': '950', 'B/S': 'S', 'Head of HHold': 'H' }),
  ]);
  assert.equal(rowFor(a, '950').linked, true);
  assert.equal(warns(a, 'TWO_HEADS').length, 2);
});

// ── Full-row mapping ────────────────────────────────────────────────────────

test('a fully-mapped row deep-equals the expected member data', () => {
  const a = analyze([mkRec()]);
  const lastChange = parseLastChange('9/25/26 12:00', 'America/Mexico_City');
  assert.deepEqual(rowFor(a, '1001').data, {
    legacyId: '1001',
    status: 'active',
    role: 'saint',
    district: 'Central 1',
    locality: 'Houston',
    gender: 'brother',
    isHeadOfHousehold: true,
    firstName: 'Test',
    lastName: 'Person',
    otherName: null,
    smallGroup: null,
    address: null,
    apartment: null,
    city: null,
    state: null,
    zip: null,
    phone1: '713-555-0100',
    phone2: null,
    email: null,
    googleContactId: null,
    changedAt: lastChange,
    lastVerifiedAt: lastChange,
    changeType: 'updated',
    changedByName: 'Phonelist sheet',
    source: 'phonelist-sheet',
    importBatchId: 'phonelist-20260925',
    sourceAsOf: AS_OF,
    optedIn: true,
    phonePrivacy: true,
    addressPrivacy: false,
    spouseFirstName: null,
    spouseLastName: null,
    coupleId: null,
    maritalStatus: null,
  });
});

// ── Sheet-level analysis ────────────────────────────────────────────────────

test('TST rows are skipped before validation; blank rows counted', () => {
  const a = analyze([
    mkRec({ cott: '1', Active: 'TST', District: 'C99', Locality: '' }), // would be fatal if validated
    mkRec({ cott: '2' }),
  ]);
  assert.equal(a.stats.imported, 1);
  assert.deepEqual(a.stats.tstSkipped, [{ sheetRow: 2, legacyId: '1' }]);
  assert.equal(warns(a, 'TST_SKIPPED').length, 1);
  assert.equal(a.stats.fatalCount, 0);
});

test('duplicate legacyId among imported rows is fatal', () => {
  const a = analyze([mkRec({ cott: '5' }), mkRec({ cott: '5' })]);
  assert.equal(warns(a, 'DUPLICATE_LEGACY_ID').length, 2);
  assert.equal(a.stats.fatalCount, 2);
  assert.equal(a.stats.imported, 0);
});

test('missing required column is a fatal header problem', () => {
  const headers = REQUIRED_COLUMNS.filter((h) => h !== 'Cell');
  const a = analyzeSheet({ headers, records: [mkRec()] }, OPTS);
  assert.equal(warns(a, 'MISSING_COLUMN').length, 1);
  assert.equal(a.stats.fatalCount, 1);
});

test('batchIdForAsOf uses the America/Chicago calendar date', () => {
  assert.equal(batchIdForAsOf(new Date('2026-09-25T21:10:00-05:00')), 'phonelist-20260925');
});

// ── End to end through the CLI's CSV parse path ─────────────────────────────

test('end to end: multi-line header, TST row, blank row, trailing empty col', async () => {
  // Raw header names as they appear in a real export — several quoted and
  // multi-line, plus one empty trailing column that must be dropped.
  const rawHeaders = [
    'cott', 'Changed', 'Link', 'Last change', 'Request\nby USER', 'User Settings',
    'Is Admin USER', 'Head\nof\nHHold', 'Active', 'District', 'First', 'Last',
    'Couple\nID', 'Spouse\n(First name)', 'Spouse\n(Last name)', 'B/S',
    'Other Name', 'Small\nGroup', '  Home', '  Cell', 'Email', 'Address', 'Apt',
    'City', 'ST', 'Zip', 'Locality', 'Add new cols before this Col', 'History',
    'Picture\nID', 'Contact\nID', 'Phone\nProvider', "Insert \n'formulas'\nbefore\nthis Col",
    '', // trailing empty column
  ];
  const csvQuote = (s) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const headerLine = rawHeaders.map(csvQuote).join(',');
  const lineFor = (vals) => rawHeaders
    .map((h) => csvQuote(vals[normalizeHeader(h) ?? h] ?? ''))
    .join(',');

  const csvText = [
    headerLine,
    lineFor({ cott: '1', Active: 'TST', District: 'C99' }),
    lineFor({}), // blank row
    lineFor({
      cott: '10', Active: 'A', District: 'Central 1', Locality: 'HOU',
      First: 'Al', Last: 'Bo', 'Couple ID': '10', 'B/S': 'B', 'Head of HHold': 'H',
      'Last change': '9/25/26 12:00', History: '{}',
    }),
    lineFor({
      cott: '11', Active: 'A', District: 'Central 1', Locality: 'HOU',
      First: 'Cy', Last: 'Di', 'Couple ID': '10', 'B/S': 'S', 'Head of HHold': '.',
      'Last change': '9/25/26 12:00', History: '{}',
    }),
  ].join('\n');

  const { headers, records } = await parsePhonelistCsv(Readable.from([csvText]));
  assert.equal(records.length, 4);
  assert.ok(headers.includes(null)); // the empty trailing column was dropped

  const a = analyzeSheet({ headers, records }, OPTS);
  assert.equal(a.stats.dataLines, 4);
  assert.equal(a.stats.blankCount, 1);
  assert.equal(a.stats.cottCount, 3);
  assert.deepEqual(a.stats.tstSkipped, [{ sheetRow: 2, legacyId: '1' }]);
  assert.equal(a.stats.imported, 2);
  assert.equal(a.stats.fatalCount, 0);
  assert.equal(a.ignoredColumns.length, 0);

  const [m, f] = [rowFor(a, '10'), rowFor(a, '11')];
  assert.equal(m.sheetRow, 4); // header=1, TST=2, blank=3
  assert.equal(f.sheetRow, 5);
  assert.equal(m.linked, true);
  assert.equal(f.linked, true);
  assert.equal(m.data.coupleId, 'pl-10');
  assert.equal(f.partnerLegacyId, '10');
});

// ── CLI args / purge guard ──────────────────────────────────────────────────

test('parseArgs rejects --apply --offline and --purge-batch with --apply', () => {
  assert.throws(() => parseArgs(['s.csv', '--apply', '--offline']), UsageError);
  assert.throws(() => parseArgs(['--purge-batch', 'phonelist-20260925', '--apply']), UsageError);
  const a = parseArgs(['s.csv']);
  assert.equal(a.csvPath, 's.csv');
  assert.equal(a.apply, false);
  assert.equal(a.tz, 'America/Mexico_City');
});

test('purgeRefusal refuses prod-looking and unknown database names', () => {
  assert.equal(purgeRefusal('stage'), null);
  assert.equal(purgeRefusal('test-servicehub'), null);
  assert.ok(purgeRefusal('production-servicehub'));
  assert.ok(purgeRefusal('unknown'));
  assert.ok(purgeRefusal(''));
});

// ── Warnings CSV is Excel-safe ──────────────────────────────────────────────

test('formatWarningsCsv: BOM, formula neutralization, quoting', () => {
  const csv = formatWarningsCsv([
    { severity: 'warn', code: 'SHARED_CELL', sheetRow: 5, legacyId: '1', status: 'active', district: 'North', firstName: 'Al', lastName: 'Bo', field: 'Cell', value: '+1', detail: '' },
    { severity: 'warn', code: 'X', sheetRow: 6, legacyId: '2', status: '', district: '', firstName: '', lastName: '', field: 'f', value: 'a,b', detail: '' },
    { severity: 'warn', code: 'X', sheetRow: 7, legacyId: '3', status: '', district: '', firstName: '', lastName: '', field: 'f', value: 'line1\nline2', detail: '' },
    { severity: 'warn', code: 'X', sheetRow: 8, legacyId: '4', status: '', district: '', firstName: '', lastName: '', field: 'f', value: '=SUM(1)', detail: '' },
  ]);
  assert.equal(csv.charCodeAt(0), 0xFEFF, 'missing UTF-8 BOM');
  const body = csv.slice(1);
  assert.ok(body.startsWith('severity,code,sheetRow,legacyId,status,district,firstName,lastName,field,value,detail\n'));
  assert.ok(body.includes("'+1"), 'plus value not neutralized');
  assert.ok(body.includes('"a,b"'), 'comma value not quoted');
  // The quoted newline cell legitimately spans two physical lines.
  assert.ok(body.includes('"line1\nline2"'), 'newline value not quoted');
  assert.ok(body.includes("'=SUM(1)"), 'formula value not neutralized');
});
