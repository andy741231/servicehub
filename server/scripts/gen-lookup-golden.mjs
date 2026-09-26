// Differential golden generator for the SMS lookup port.
//
//   node server/scripts/gen-lookup-golden.mjs --gas <gas_v151 dir>
//       → synthetic mode: runs the committed fixture against BOTH the real
//         Apps Script code (in a node:vm sandbox) and the port, then rewrites
//         server/tests/fixtures/smsLookupGolden.json.
//   node server/scripts/gen-lookup-golden.mjs --gas <dir> --csv <saints.csv>
//       → real-data mode: auto-generates queries from a seeded sample of
//         ~300 active members, diffs GAS vs port, writes per-query detail to
//         <repo>/scratch/lookup-diff-<yyyymmdd>.csv (gitignored; may contain
//         PII) and prints ONLY aggregate counts.
//
// The GAS oracle loads lookup.gs / access phone list data.gs /
// sort assist.gs / some functions.gs into a vm context with stubbed sheet
// globals. PHONE_LIST_DATA + ARRAY_COUPLE_IDS are rebuilt (deep-copied) for
// every query because the real code mutates rows in-request.

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { analyzeSheet } from './lib/phonelistTransform.mjs';
import { parsePhonelistCsv } from './import-phonelist.mjs';
import {
  lookup, parseLookupArgs, LOOKUP_MSG,
} from '../src/services/directorySms/lookup.js';
import { DIRECTORY_DISTRICT_SHORTNAMES } from 'shared';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..', '..');
const FIXTURE = path.join(REPO_ROOT, 'server/tests/fixtures/smsLookupPhonelist.json');
const GOLDEN = path.join(REPO_ROOT, 'server/tests/fixtures/smsLookupGolden.json');
const SCRATCH_DIR = path.join(REPO_ROOT, 'scratch');

const GAS_FILES = [
  'lookup.gs', 'access phone list data.gs', 'sort assist.gs', 'some functions.gs',
];

// ── Sheet records → GAS rows + OBJ_RW layout ────────────────────────────────

// OBJ_RW mirrors wk_ColumnOffsetsObj: column offsets into a phone-list row.
// Requirements exercised by the real code: id at col 0 (cognitoID compare),
// 'hm' immediately before 'ph' (getTheFormattedPhoneNo), row length ≥ 15.
export function buildObjRw(headers) {
  const idx = (name) => headers.indexOf(name);
  const rw = {
    id: idx('cott'), chgFlg: idx('Changed'), fn: idx('First'), ln: idx('Last'),
    ph: idx('Cell'), hm: idx('Home'), sg: idx('Small Group'), em: idx('Email'),
    di: idx('District'), headHH: idx('Head of HHold'), actvFlg: idx('Active'),
    cmdStatus: idx('Request by USER'), userSettings: idx('User Settings'),
    adminField: idx('Is Admin USER'), coupleId: idx('Couple ID'), bs: idx('B/S'),
    ad: idx('Address'), ap: idx('Apt'), cy: idx('City'), st: idx('ST'),
    zp: idx('Zip'), pictureId: idx('Picture ID'), ly: idx('Locality'),
    hi: idx('History'), contactId: idx('Contact ID'),
    phProvider: idx('Phone Provider'),
  };
  if (rw.id !== 0) throw new Error('sheet layout: "cott" must be column 0');
  if (rw.hm !== rw.ph - 1) {
    throw new Error('sheet layout: "Home" must be the column before "Cell"');
  }
  if (headers.length < 15) throw new Error('sheet layout: need ≥15 columns');
  for (const [k, v] of Object.entries(rw)) {
    if (v < 0 && k !== 'phProvider') throw new Error(`sheet layout: no column for "${k}"`);
  }
  return rw;
}

// One GAS row per record: raw cell values, with id/coupleId as Numbers
// (that's what Sheets hands the code — the compares are strict/numeric).
export function buildGasRows(headers, records, rw) {
  return records.map((rec) => {
    const row = headers.map((h) => (h === null ? '' : (rec[h] ?? '')));
    row[rw.id] = row[rw.id] === '' ? '' : Number(row[rw.id]);
    row[rw.coupleId] = row[rw.coupleId] === '' ? '' : Number(row[rw.coupleId]);
    return row;
  });
}

// ── Sheet records → DirectoryMember-shaped rows (for the port) ──────────────
// Same path the importer uses: analyzeSheet + partnerLegacyId → spouseMemberId.
// Synthesized member ids = legacyId. `_optedIn` / `_phonePrivacy` keys on a
// fixture record override the create-only defaults.

export function buildLookupMembers(analysis, records) {
  const recByCott = new Map(
    records.map((r) => [String(r.cott ?? '').trim(), r]));
  return analysis.rows.map((row) => {
    const rec = recByCott.get(row.legacyId) ?? {};
    return {
      id: row.legacyId,
      legacyId: row.legacyId,
      firstName: row.data.firstName,
      lastName: row.data.lastName,
      gender: row.data.gender,
      isHeadOfHousehold: row.data.isHeadOfHousehold,
      district: row.data.district,
      phone1: row.data.phone1,
      phone2: row.data.phone2,
      phonePrivacy: rec._phonePrivacy ?? true,
      spouseMemberId: row.partnerLegacyId ?? null,
      optedIn: rec._optedIn ?? true,
      status: row.data.status,
    };
  });
}

// ── GAS oracle ──────────────────────────────────────────────────────────────

function createGasOracle(gasDir, rw) {
  const state = { pristine: [], userSettings: {} };
  const ctx = vm.createContext({
    console,
    Logger: { log() {} },
    sendMsgToSlack() {},
    setUserSettings() {},
    getUserSettings: () => state.userSettings,
    __state: state,
    OBJ_RW: rw,
    PHONE_LIST_DATA: [],
    ARRAY_COUPLE_IDS: [],
    ARRAY_REQUESTORS_DATA: [[0], []],
    ARRAY_CHURCH_CLUSTERS: [{ code: 'HOU', cluster: 1, locality: 'Houston' }],
    ARRAY_DISTRICT_INFO: Object.entries(DIRECTORY_DISTRICT_SHORTNAMES)
      .map(([name, short]) => [name, short, '', '']),
    // s = the sheet. getRowOfDataByCognitoId re-reads pristine cells, so the
    // oracle returns unmutated rows exactly like the real sheet read does.
    s: {
      getRange: (row) => ({
        getValues: () => [structuredClone(state.pristine[row - 3])],
      }),
    },
  });
  for (const f of GAS_FILES) {
    vm.runInContext(
      fs.readFileSync(path.join(gasDir, f), 'utf8'), ctx, { filename: f });
  }
  return { ctx, state };
}

// Runs one query through the real process_LOOKUP_command and applies the
// reply assembly: display + yYy + appendAfterResults, then strip leading \n.
function runGasQuery({ ctx, state }, pristineRows, { names, last, explicitLookup, showSearchHint }) {
  state.pristine = pristineRows;
  state.userSettings = showSearchHint ? {} : { srchSuggest: '' };
  ctx.PHONE_LIST_DATA = structuredClone(pristineRows);
  ctx.ARRAY_COUPLE_IDS = ctx.fillArrayOfCoupleIDs();

  const obCMD = {
    keywrdsUserTyped: last ? { lookup: '', last: '' } : { lookup: '' },
    arrParametersTypedByUser: [...names],
    isTrainedUser: false,
    clusterNumber: 1,
    maxResults: '12',
    objSettings: { bnDisplaySmallGroup: false },
    appendAfterResults: '',
  };
  const res = ctx.process_LOOKUP_command(obCMD);

  // commands1.gs: yYy is computed from the *parse-time* appendAfterResults
  // ('\n' + LOOKUP_MSG only when the user typed lookup/look up), then the
  // field is reset and the command may set it to the search suggestion.
  const yYy = explicitLookup ? `\n${`\n${LOOKUP_MSG}`}` : '';
  const text = String(res.displayResults ?? '') + yYy + String(obCMD.appendAfterResults ?? '');
  return text.replace(/^\n+/, '');
}

// ── Compound/nickname keys (for real-mode query generation) ─────────────────

function compoundKeys(firstName) {
  let fn = String(firstName ?? '').trim();
  const split = fn.split('(');
  if (split.length > 1) fn = `${split[0]} (${split[1]}`;
  const keys = [];
  let lookingFor = ' ';
  let ndx = fn.indexOf(lookingFor, 0);
  while (ndx > -1) {
    if (lookingFor === ' ') {
      keys.push(fn.split('(')[0].replace(/ /g, '').toLowerCase());
      lookingFor = '(';
    } else {
      keys.push(fn.split('(')[1].replace(/[ )]/g, '').toLowerCase());
      lookingFor = '$';
    }
    ndx = fn.indexOf(lookingFor, ndx + 1);
  }
  return keys;
}

// ── Diff classification (real mode) ─────────────────────────────────────────

// Every phone-like token reduces to its digits: outputs equal under this are
// "phone-only" diffs (same people, different phone rendering).
const PHONE_RE = /\d[\d\-()./ ]*\d/g;
const maskPhones = (t) => t.replace(PHONE_RE, (m) => m.replace(/\D/g, ''));

const blocksOf = (t) => t.split('\n\n').map((b) => b.trim()).filter((b) => b !== '');
const linesOf = (t) => t.split('\n').map((l) => l.trim()).filter((l) => l !== '');

function classify(gas, port) {
  if (gas === port) return { cls: 'exact', sub: '' };
  if (maskPhones(gas) === maskPhones(port)) return { cls: 'phone-only', sub: '' };
  const gb = blocksOf(gas);
  const pb = blocksOf(port);
  if (gb.length === pb.length
      && JSON.stringify([...gb].sort()) === JSON.stringify([...pb].sort())) {
    return { cls: 'order-only', sub: '' };
  }
  return { cls: 'other', sub: subreason(gb, pb, gas, port) };
}

function subreason(gb, pb, gas, port) {
  const couples = (arr) => arr.filter((b) => b.includes(' & ')).length;
  if (gas.includes('undefined') || port.includes('undefined')) return 'row-mutation artifact';
  if (couples(gb) !== couples(pb)) return 'household-link difference';
  if (gas.includes('--') || gas.includes('(h)') !== port.includes('(h)')) return 'no-phone rendering';
  if (JSON.stringify([...linesOf(gas)].sort()) === JSON.stringify([...linesOf(port)].sort())) {
    return 'tie ordering';
  }
  return 'unknown';
}

// ── CSV output (scratch — PII allowed here only) ────────────────────────────

const csvCell = (v) => {
  const s = String(v ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// ── Modes ───────────────────────────────────────────────────────────────────

function runSynthetic(oracle, fixture) {
  const { headers, records, queries } = fixture;
  const rw = buildObjRw(headers);
  const gasRows = buildGasRows(headers, records, rw);
  const analysis = analyzeSheet(
    { headers, records },
    { asOf: new Date('2026-09-25T21:10:00.000Z'), tz: 'America/Chicago', batchId: 'phonelist-synthetic' });
  if (analysis.stats.fatalCount > 0) {
    throw new Error(`fixture has ${analysis.stats.fatalCount} fatal row problem(s)`);
  }
  const members = buildLookupMembers(analysis, records);

  const golden = [];
  let exact = 0;
  const diffs = [];
  for (const q of queries) {
    const showSearchHint = q.showSearchHint !== false;
    const parsed = parseLookupArgs(q.query);
    const gas = runGasQuery(oracle, gasRows, { ...parsed, showSearchHint });
    const out = lookup(members, parsed, { showSearchHint });
    const expected = out.text;
    const note = q.note ?? '';
    golden.push({ query: q.query, showSearchHint, gas, expected, note });
    if (gas === expected) exact += 1;
    else diffs.push({ query: q.query, note });
  }
  fs.writeFileSync(GOLDEN, `${JSON.stringify(golden, null, 2)}\n`);

  console.log(`synthetic: ${golden.length} cases — ${exact} exact, ${golden.length - exact} diffs`);
  for (const d of diffs) {
    console.log(`  diff  ${JSON.stringify(d.query)}  ${d.note === '' ? '(NO NOTE — add one in the fixture)' : `note: ${d.note}`}`);
  }
}

function mulberry32(a) {
  return function rand() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── CLI ─────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = { gas: null, csv: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--gas') args.gas = argv[++i];
    else if (argv[i] === '--csv') args.csv = argv[++i];
    else throw new Error(`unknown flag: ${argv[i]}`);
  }
  if (!args.gas) throw new Error('--gas <gas_v151 dir> is required');
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.csv) {
    const { headers, records } = await parsePhonelistCsv(fs.createReadStream(args.csv));
    const rw = buildObjRw(headers);
    const oracle = createGasOracle(args.gas, rw);
    const gasRows = buildGasRows(headers, records, rw);
    const analysis = analyzeSheet(
      { headers, records },
      { asOf: new Date('2026-09-25T21:10:00.000Z'), tz: 'America/Chicago', batchId: 'phonelist-20260925' });
    const members = buildLookupMembers(analysis, records);
    // re-use the parsed inputs via a small adapter
    await runRealWithInputs(oracle, { headers, records, gasRows, members });
    return;
  }

  const fixture = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  const rw = buildObjRw(fixture.headers);
  const oracle = createGasOracle(args.gas, rw);
  runSynthetic(oracle, fixture);
}

// real-mode body split out so the parsed CSV isn't read twice
async function runRealWithInputs(oracle, { headers, records, gasRows, members }) {
  const active = members.filter((m) => m.status === 'active');
  const rand = mulberry32(20260925);
  const idxs = active.map((_, i) => i);
  for (let i = idxs.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [idxs[i], idxs[j]] = [idxs[j], idxs[i]];
  }
  const sample = idxs.slice(0, 300).map((i) => active[i]);

  const queries = new Set();
  for (const m of sample) {
    const fn = String(m.firstName).toLowerCase();
    const ln = String(m.lastName).toLowerCase();
    queries.add(fn);
    queries.add(`last ${ln}`);
    queries.add(`${fn} ${ln}`);
    queries.add(fn.substring(0, 3));
  }
  for (const m of active) {
    for (const k of compoundKeys(m.firstName)) queries.add(k);
  }

  const classCounts = { exact: 0, 'phone-only': 0, 'order-only': 0, other: 0 };
  const subCounts = {};
  const detail = [];
  for (const query of [...queries].sort()) {
    const parsed = parseLookupArgs(query);
    const gas = runGasQuery(oracle, gasRows, { ...parsed, showSearchHint: true });
    const out = lookup(members, parsed, { showSearchHint: true });
    const { cls, sub } = classify(gas, out.text);
    classCounts[cls] += 1;
    if (cls === 'other') subCounts[sub] = (subCounts[sub] ?? 0) + 1;
    detail.push({
      query, class: cls, subreason: sub,
      memberIds: out.memberIds.join(' '), gas, port: out.text,
    });
  }

  fs.mkdirSync(SCRATCH_DIR, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const outPath = path.join(SCRATCH_DIR, `lookup-diff-${stamp}.csv`);
  const header = 'query,class,subreason,memberIds,gas,port';
  fs.writeFileSync(outPath,
    `${header}\n${detail.map((d) => [d.query, d.class, d.subreason, d.memberIds, d.gas, d.port]
      .map(csvCell).join(',')).join('\n')}\n`);

  console.log(`real: ${detail.length} queries`);
  console.log(`  exact: ${classCounts.exact}   phone-only: ${classCounts['phone-only']}   order-only: ${classCounts['order-only']}   other: ${classCounts.other}`);
  const subs = Object.entries(subCounts);
  if (subs.length) {
    console.log(`  other subreasons: ${subs.map(([k, n]) => `${k} ${n}`).join(', ')}`);
  }
  console.log(`  detail CSV: ${outPath}`);
}

const isMain = (() => {
  const a = path.resolve(process.argv[1] ?? '');
  const b = fileURLToPath(import.meta.url);
  return process.platform === 'win32'
    ? a.toLowerCase() === b.toLowerCase()
    : a === b;
})();
if (isMain) {
  main().catch((e) => { console.error(e); process.exitCode = 1; });
}
