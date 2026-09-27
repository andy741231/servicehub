import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  tokenize, parseLookupArgs, formatPhone, lookup, loadLookupMembers,
  LOOKUP_MSG, LOOKUP_ALONE_MSG, LAST_NEEDS_MSG, SEARCH_HINT,
} from '../src/services/directorySms/lookup.js';
import { analyzeSheet } from '../scripts/lib/phonelistTransform.mjs';
import { buildLookupMembers } from '../scripts/gen-lookup-golden.mjs';

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const fixture = JSON.parse(
  fs.readFileSync(path.join(FIXTURES, 'smsLookupPhonelist.json'), 'utf8'));
const golden = JSON.parse(
  fs.readFileSync(path.join(FIXTURES, 'smsLookupGolden.json'), 'utf8'));

const members = buildLookupMembers(
  analyzeSheet(
    { headers: fixture.headers, records: fixture.records },
    { asOf: new Date('2026-09-25T21:10:00.000Z'), tz: 'America/Chicago', batchId: 'phonelist-synthetic' }),
  fixture.records);

const member = (over = {}) => ({
  id: 'm1', legacyId: '1', firstName: 'Test', lastName: 'Person',
  gender: 'brother', isHeadOfHousehold: false, district: 'Central 1',
  phone1: '281-555-0100', phone2: null, phonePrivacy: true,
  spouseMemberId: null, optedIn: true, status: 'active', ...over,
});

// ── tokenize / parseLookupArgs ──────────────────────────────────────────────

test('tokenize: trim, first-# removed, lowercase, quotes stripped, empties dropped', () => {
  assert.deepEqual(tokenize('  John  Smith '), ['john', 'smith']);
  assert.deepEqual(tokenize('lookup# tom'), ['lookup', 'tom']);
  assert.deepEqual(tokenize('a#b#c'), ['ab#c']);       // only the FIRST '#' goes
  assert.deepEqual(tokenize('"MARY" ann'), ['mary', 'ann']);
  assert.deepEqual(tokenize('x  y   z'), ['x', 'y', 'z']);
  assert.deepEqual(tokenize(''), []);
});

test('parseLookupArgs: bare text is prefixed with lookup', () => {
  assert.deepEqual(parseLookupArgs('Marcus'),
    { names: ['marcus'], last: false, explicitLookup: false, hadLast: false, keywordsOnly: false });
});

test('parseLookupArgs: lookup/find kept as command; look up is explicitLookup', () => {
  assert.deepEqual(parseLookupArgs('lookup marcus'),
    { names: ['marcus'], last: false, explicitLookup: true, hadLast: false, keywordsOnly: false });
  assert.deepEqual(parseLookupArgs('find elaine'),
    { names: ['elaine'], last: false, explicitLookup: false, hadLast: false, keywordsOnly: false });
  // 'look up' sets the explicitLookup flag but 'look'/'up' stay in the names,
  // exactly as the sheet did.
  assert.deepEqual(parseLookupArgs('look up marcus'),
    { names: ['look', 'up', 'marcus'], last: false, explicitLookup: true, hadLast: false, keywordsOnly: false });
});

test('parseLookupArgs: " last " needs spaces on both sides', () => {
  assert.deepEqual(parseLookupArgs('last smith'),
    { names: ['smith'], last: true, explicitLookup: false, hadLast: true, keywordsOnly: false });
  // trailing 'last' has no following space -> stays a name
  assert.deepEqual(parseLookupArgs('sam last').last, false);
  assert.deepEqual(parseLookupArgs('sam last').names, ['sam', 'last']);
  // ...but it is still a standalone 'last' token for the keywordsOnly check
  assert.deepEqual(parseLookupArgs('sam last').hadLast, true);
  assert.deepEqual(parseLookupArgs('sam last').keywordsOnly, false);
});

test('parseLookupArgs: "john last kim" quirk — names after the keyword count', () => {
  // 'lookup' + 'last' = 2 keywords, so names start at the 3rd token.
  assert.deepEqual(parseLookupArgs('john last kim').names, ['last', 'kim']);
  assert.equal(parseLookupArgs('john last kim').last, true);
  assert.equal(parseLookupArgs('john last kim').hadLast, true);
  assert.equal(parseLookupArgs('john last kim').keywordsOnly, false);
});

test('parseLookupArgs: keywords-only inputs (nothing to search)', () => {
  assert.deepEqual(parseLookupArgs('lookup'),
    { names: [], last: false, explicitLookup: true, hadLast: false, keywordsOnly: true });
  assert.deepEqual(parseLookupArgs('find'),
    { names: [], last: false, explicitLookup: false, hadLast: false, keywordsOnly: true });
  assert.deepEqual(parseLookupArgs('look up'),
    { names: ['look', 'up'], last: false, explicitLookup: true, hadLast: false, keywordsOnly: true });
  assert.deepEqual(parseLookupArgs('last'),
    { names: ['last'], last: false, explicitLookup: false, hadLast: true, keywordsOnly: true });
  assert.deepEqual(parseLookupArgs('lookup last'),
    { names: ['last'], last: false, explicitLookup: true, hadLast: true, keywordsOnly: true });
  assert.deepEqual(parseLookupArgs('find last'),
    { names: ['last'], last: false, explicitLookup: false, hadLast: true, keywordsOnly: true });
  assert.deepEqual(parseLookupArgs('look up last'),
    { names: ['look', 'up', 'last'], last: false, explicitLookup: true, hadLast: true, keywordsOnly: true });
  // a name after 'last' is a real search, not keywords-only
  assert.equal(parseLookupArgs('last chen').keywordsOnly, false);
  assert.equal(parseLookupArgs('look up john').keywordsOnly, false);
});

// ── formatPhone (GAS formatPhoneNo) ─────────────────────────────────────────

test('formatPhone: GAS formatPhoneNo semantics', () => {
  assert.equal(formatPhone('281-555-1234'), '281-555-1234');
  assert.equal(formatPhone('2815551234'), '281-555-1234');
  assert.equal(formatPhone('(281)555-1234'), '281-555-1234');
  assert.equal(formatPhone('(281) 555-1234'), '81 -555-1234'); // spaces kept — GAS quirk
  assert.equal(formatPhone('1-281-555-1234'), '281-555-1234'); // rightmost 10
  assert.equal(formatPhone(''), '--');                          // GAS garbage preserved
  assert.equal(formatPhone('555-1234'), '555-123-4');           // <10 chars, still sliced
});

// ── formatting ──────────────────────────────────────────────────────────────

test('single hit formatting: name, phone, district shortname', () => {
  const r = lookup([member()], { names: ['test'], last: false, explicitLookup: false });
  assert.equal(r.text, 'Test Person, 281-555-0100, C1');
  assert.equal(r.hits, 1);
  assert.deepEqual(r.memberIds, ['m1']);
  assert.equal(r.searchHintShown, false);
});

test('couple formatting: shared surname collapses, two phone lines', () => {
  const bro = member({ id: 'b1', firstName: 'Marcus', lastName: 'Vega', spouseMemberId: 's1' });
  const sis = member({ id: 's1', firstName: 'Elaine', lastName: 'Vega', gender: 'sister', spouseMemberId: 'b1' });
  const r = lookup([bro, sis], { names: ['elaine'], last: false, explicitLookup: false });
  assert.equal(r.text,
    'Marcus & Elaine Vega, C1\n   Marcus,  281-555-0100\n   Elaine,  281-555-0100');
  assert.equal(r.hits, 2);
  assert.deepEqual(r.memberIds, ['b1', 's1']);
});

test('couple formatting: differing surnames keep both names', () => {
  const bro = member({ id: 'b1', firstName: 'Hugh', lastName: 'Marlowe', spouseMemberId: 's1' });
  const sis = member({ id: 's1', firstName: 'Vera', lastName: 'Okafor', gender: 'sister', spouseMemberId: 'b1' });
  const r = lookup([bro, sis], { names: ['vera'], last: false, explicitLookup: false });
  assert.match(r.text, /^Hugh Marlowe & Vera Okafor/);
});

test('result limit line after maxResults people', () => {
  const many = Array.from({ length: 14 }, (_, i) =>
    member({ id: `s${i}`, firstName: 'Sam', lastName: `Name${i}` }));
  const r = lookup(many, { names: ['sam'], last: false, explicitLookup: false });
  assert.ok(r.text.endsWith('--- results limited to 12'));
  assert.equal(r.hits, 12);
  assert.equal(r.memberIds.length, 12);
});

test('home phone fallback is marked (h); no phone omits the segment', () => {
  const home = member({ phone1: null, phone2: '713-555-0188' });
  assert.match(
    lookup([home], { names: ['test'] }).text,
    /^Test Person, 713-555-0188 \(h\), C1$/);
  const none = member({ phone1: null, phone2: null });
  assert.equal(
    lookup([none], { names: ['test'] }).text,
    'Test Person, C1');
});

test('phonePrivacy=false hides the phone', () => {
  const m = member({ phonePrivacy: false });
  const r = lookup([m], { names: ['test'] });
  assert.equal(r.text, 'Test Person, C1');
});

// ── visibility ──────────────────────────────────────────────────────────────

test('opted-out and non-active members never appear in text or memberIds', () => {
  const list = [
    member({ id: 'ok', firstName: 'Gordon', lastName: 'Kingsley' }),
    member({ id: 'out', firstName: 'Gordon', lastName: 'Quimby', optedIn: false }),
    member({ id: 'na', firstName: 'Gordon', lastName: 'Harris', status: 'inactive' }),
    member({ id: 'pend', firstName: 'Gordon', lastName: 'Aldous', status: 'pending' }),
  ];
  const r = lookup(list, { names: ['gordon'] });
  assert.equal(r.hits, 1);
  assert.deepEqual(r.memberIds, ['ok']);
  assert.ok(!r.text.includes('Quimby'));
  assert.ok(!r.text.includes('Harris'));
  assert.ok(!r.text.includes('Aldous'));
});

test('lookup does not mutate the members array or member objects', () => {
  const bro = member({ id: 'b1', firstName: 'Marcus', lastName: 'Vega', spouseMemberId: 's1' });
  const sis = member({ id: 's1', firstName: 'Elaine', lastName: 'Vega', gender: 'sister', spouseMemberId: 'b1' });
  const list = [bro, sis];
  const before = JSON.stringify(list);
  lookup(list, { names: ['elaine'] });
  assert.equal(JSON.stringify(list), before);
});

// ── loadLookupMembers ───────────────────────────────────────────────────────

test('loadLookupMembers issues the exact where/select and sorts to base order', async () => {
  let captured;
  const rows = [
    { id: 'x9', legacyId: '900' },
    { id: 'x1', legacyId: '27' },
    { id: 'x2', legacyId: null },
    { id: 'x3', legacyId: '27.1' },
    { id: 'x0', legacyId: '27' },
  ];
  const prisma = {
    directoryMember: {
      findMany: async (q) => { captured = q; return rows; },
    },
  };
  const out = await loadLookupMembers(prisma);
  assert.deepEqual(captured, {
    where: { status: 'active', optedIn: true },
    select: {
      id: true, legacyId: true, firstName: true, lastName: true,
      gender: true, isHeadOfHousehold: true, district: true,
      phone1: true, phone2: true, phonePrivacy: true,
      spouseMemberId: true, optedIn: true, status: true,
    },
  });
  // parseFloat ascending, nulls last, ties by id
  assert.deepEqual(out.map((m) => m.id), ['x0', 'x1', 'x3', 'x9', 'x2']);
});

// ── explicitLookup trailer / search hint ────────────────────────────────────

test('keywords-only inputs return the parse cmds.gs early errors, no hint', () => {
  for (const q of ['lookup', 'find', 'look up']) {
    const r = lookup(members, parseLookupArgs(q));
    assert.equal(r.text, LOOKUP_ALONE_MSG, q);
    assert.equal(r.hits, 0);
    assert.deepEqual(r.memberIds, []);
    assert.equal(r.searchHintShown, false);
    assert.ok(!r.text.includes('Not found'));
    assert.ok(!r.text.includes(SEARCH_HINT));
  }
  for (const q of ['last', 'lookup last', 'find last', 'look up last']) {
    const r = lookup(members, parseLookupArgs(q));
    assert.equal(r.text, LAST_NEEDS_MSG, q);
    assert.equal(r.hits, 0);
    assert.deepEqual(r.memberIds, []);
    assert.equal(r.searchHintShown, false);
  }
  // 'look up <name>' still searches literally — 'look up' stays in names
  const literal = lookup(members, parseLookupArgs('look up john'));
  assert.match(literal.text, /^'look up john' was not found/);
  assert.ok(literal.text.includes(LOOKUP_MSG));
});

test('explicit lookup appends LOOKUP_MSG; bare name does not', () => {
  const args = parseLookupArgs('lookup test');
  const hit = lookup([member()], args);
  assert.ok(hit.text.endsWith(LOOKUP_MSG));
  assert.ok(hit.text.startsWith('Test Person'));
  const bare = lookup([member()], parseLookupArgs('test'));
  assert.ok(!bare.text.includes('LOOKUP'));
  assert.ok(!bare.text.includes("'Lookup' no longer needed"));
});

test('searchHintShown tracks hint text; suppressed by showSearchHint:false and by last', () => {
  const miss = lookup([], { names: ['zztop'], last: false, explicitLookup: false },
    { showSearchHint: true });
  assert.equal(miss.searchHintShown, true);
  assert.ok(miss.text.includes(SEARCH_HINT));
  const off = lookup([], { names: ['zztop'], last: false, explicitLookup: false },
    { showSearchHint: false });
  assert.equal(off.searchHintShown, false);
  assert.ok(!off.text.includes('How to search'));
  const lastMiss = lookup([], { names: ['zztop'], last: true, explicitLookup: false },
    { showSearchHint: true });
  assert.equal(lastMiss.searchHintShown, false);
});

// ── golden suite ────────────────────────────────────────────────────────────

test('fixture drives both sides with enough coverage', () => {
  assert.ok(fixture.records.length >= 40, 'expected ~40 synthetic records');
  assert.ok(golden.length >= 50, 'expected ~50 golden cases');
});

test('golden: lookup() matches the expected output for every case', () => {
  assert.ok(members.length > 0);
  const failures = [];
  for (const c of golden) {
    const parsed = parseLookupArgs(c.query);
    const out = lookup(members, parsed, { showSearchHint: c.showSearchHint });
    if (out.text !== c.expected) {
      failures.push(JSON.stringify(c.query));
    }
    if (c.expected !== c.gas && (c.note ?? '') === '') {
      failures.push(`${JSON.stringify(c.query)}: diff without note`);
    }
  }
  assert.deepEqual(failures, []);
});
