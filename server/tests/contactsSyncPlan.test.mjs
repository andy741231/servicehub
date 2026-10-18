import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DIRECTORY_DISTRICT_SHORTNAMES } from 'shared';
import { DEFAULT_SETTINGS } from '../src/services/directorySms/settings.js';
import {
  normalizeContactId, planContactsSync, planFieldChanges, syncHashFor,
} from '../src/services/contactsSyncPlan.js';

// ── fixtures ────────────────────────────────────────────────────────────────

const DISTRICT_GROUPS = DEFAULT_SETTINGS['districts.contactGroups'];
const SHORTNAMES = DIRECTORY_DISTRICT_SHORTNAMES;

const GRN = (name) => `contactGroups/${name.replace(/\W/g, '_')}`;

const group = (name, memberCount = 0) =>
  ({ resourceName: GRN(name), name, groupType: 'USER_CONTACT_GROUP', memberCount });

const GROUPS = [
  ...Object.values(DISTRICT_GROUPS).map((n) => group(n, 40)),
  group('AllSaints1', 498),   // full
  group('AllSaints2', 243),
  group('SaintsNoEmail', 122),
  // look-alikes that must never be treated as district/AllSaints groups
  group('_C1_SGL', 10),
  group('_West_HOU', 10),
  group('AllSaints1_HOU', 10),
];

const conn = (rn, {
  fn = '', ln = '', emails = [], phones = [], dist = null, groups = [],
} = {}) => ({
  resourceName: rn,
  etag: 'e1',
  names: [{ givenName: fn, familyName: ln }],
  emailAddresses: emails,
  phoneNumbers: phones,
  userDefined: dist ? [{ key: 'dist', value: dist }] : [],
  memberships: groups.map((g) => ({
    contactGroupMembership: { contactGroupResourceName: GRN(g) },
  })),
});

const homeEmail = (v) => ({ value: v, type: 'home' });
const mobile = (v) => ({ value: v, type: 'mobile' });

const M = (over = {}) => ({
  id: 'm1', firstName: 'John', lastName: 'Doe', email: null, phone1: null,
  district: 'Central 1', status: 'active',
  googleContactId: null, googleSyncHash: null, ...over,
});

const plan = ({ members, connections = [], groups = GROUPS }) =>
  planContactsSync({
    members, connections, groups,
    districtGroups: DISTRICT_GROUPS, shortnames: SHORTNAMES,
  });

const opOf = (r, memberId) => r.ops.find((o) => o.memberId === memberId);

// A contact already perfectly matching member fields (normalized-equal).
const matchingConn = (m, rn, over = {}) => conn(rn, {
  fn: m.firstName, ln: m.lastName,
  emails: m.email ? [homeEmail(m.email)] : [],
  phones: m.phone1 ? [mobile(`+1${m.phone1.replace(/\D/g, '')}`)] : [],
  dist: SHORTNAMES[m.district],
  groups: [DISTRICT_GROUPS[m.district], m.email ? 'AllSaints2' : 'SaintsNoEmail'],
  ...over,
});

// ── normalizeContactId ──────────────────────────────────────────────────────

test('normalizeContactId: canonical passthrough, null/blank → null', () => {
  assert.equal(normalizeContactId(null), null);
  assert.equal(normalizeContactId(''), null);
  assert.equal(normalizeContactId('people/c123'), 'people/c123');
  assert.equal(normalizeContactId(' people/c42 '), 'people/c42');
});

test('normalizeContactId: legacy m8-feed URL → decimal canonical', () => {
  // Synthetic high-precision pair (0x1000000000000001 = 2^60 + 1).
  assert.equal(
    normalizeContactId('http://www.google.com/m8/feeds/contacts/'
      + 'example%40example.test/base/1000000000000001'),
    'people/c1152921504606846977');
  assert.equal(
    normalizeContactId('https://www.google.com/m8/feeds/contacts/example%40example.test/base/ff'),
    'people/c255');
});

test('normalizeContactId: anything else → undefined (invalid)', () => {
  assert.equal(normalizeContactId('people/cX'), undefined);
  assert.equal(normalizeContactId('people/c'), undefined);
  assert.equal(normalizeContactId('people/cFF'), undefined); // no plain-hex rns
  assert.equal(normalizeContactId('c255'), undefined);       // bare id, no form
  assert.equal(normalizeContactId('garbage'), undefined);
  assert.equal(normalizeContactId('https://example.com/base/12'), undefined);
});

test('normalizeContactId: leading-zero decimal alias → canonical form', () => {
  // 'people/c0255' is the same contact as 'people/c255' — canonicalize it.
  // Rejecting it would hide the row from shared/reference counting and let
  // a canonical owner delete a contact the alias owner still references.
  assert.equal(normalizeContactId('people/c0255'), 'people/c255');
  assert.equal(normalizeContactId('people/c255'), 'people/c255');
});

test('normalizeContactId: strict legacy URL — host/path/search enforced', () => {
  // host must be exactly google.com / www.google.com
  assert.equal(normalizeContactId(
    'https://evilgoogle.com/m8/feeds/contacts/x%40y/base/ff'), undefined);
  assert.equal(normalizeContactId(
    'https://google.com.evil.test/m8/feeds/contacts/x%40y/base/ff'), undefined);
  // path must be exactly /m8/feeds/contacts/<acct>/base/<hex>
  assert.equal(normalizeContactId(
    'https://google.com/m8/feeds/contacts/x%40y/base/ff/extra'), undefined);
  assert.equal(normalizeContactId(
    'https://google.com/other/m8/feeds/contacts/x%40y/base/ff'), undefined);
  // no query, no fragment
  assert.equal(normalizeContactId(
    'https://google.com/m8/feeds/contacts/x%40y/base/ff?hack=1'), undefined);
  assert.equal(normalizeContactId(
    'https://google.com/m8/feeds/contacts/x%40y/base/ff#frag'), undefined);
  // non-http(s) schemes rejected
  assert.equal(normalizeContactId(
    'ftp://google.com/m8/feeds/contacts/x%40y/base/ff'), undefined);
  // uppercase hex still converts (0xFF = 255)
  assert.equal(normalizeContactId(
    'https://google.com/m8/feeds/contacts/x%40y/base/FF'), 'people/c255');
});

// ── invalid and aliased stored ids ─────────────────────────────────────────

test('invalid stored id → error; never creates, updates, deletes or clears', () => {
  const a = M({ id: 'a', googleContactId: 'people/cX' });
  const b = M({ id: 'b', status: 'inactive', googleContactId: 'not-an-id' });
  const r = plan({ members: [a, b], connections: [] });
  for (const id of ['a', 'b']) {
    const op = opOf(r, id);
    assert.equal(op.type, 'error');
    assert.match(op.error, /invalid stored contact id/);
  }
  assert.equal(r.stats.ops.delete, 0);
  assert.equal(r.stats.ops.clearId, 0);
});

test('legacy-URL id resolves to the same contact as its canonical form', () => {
  // 0xff = 255
  const m = M({
    googleContactId: 'http://www.google.com/m8/feeds/contacts/x%40y/base/ff',
  });
  const c = conn('people/c255', {
    fn: 'John', ln: 'Doe', dist: 'C1', groups: ['_C1', 'SaintsNoEmail'],
  });
  const r = plan({ members: [m], connections: [c] });
  const op = opOf(r, 'm1');
  assert.equal(op.type, 'mark-synced');
  assert.equal(op.contactId, 'people/c255'); // apply persists the canonical id
});

test('canonical + legacy alias for one contact → shared-id errors for both', () => {
  const a = M({ id: 'a', googleContactId: 'people/c255' });
  const b = M({
    id: 'b', status: 'inactive',
    googleContactId: 'http://www.google.com/m8/feeds/contacts/x%40y/base/ff',
  });
  const c = conn('people/c255', { fn: 'John', ln: 'Doe' });
  const r = plan({ members: [a, b], connections: [c] });
  const errs = r.ops.filter((o) => o.type === 'error');
  assert.equal(errs.length, 2);
  assert.match(errs[0].error, /shared by 2 members/);
  assert.equal(r.stats.ops.delete, 0);
});

test('leading-zero alias of one contact → shared-id errors, no deletes', () => {
  const a = M({ id: 'a', googleContactId: 'people/c0255' }); // alias
  const b = M({ id: 'b', status: 'inactive', googleContactId: 'people/c255' });
  const r = plan({ members: [a, b],
    connections: [conn('people/c255', { fn: 'J', ln: 'D' })] });
  const errs = r.ops.filter((o) => o.type === 'error');
  assert.equal(errs.length, 2);
  assert.match(errs[0].error, /shared by 2 members/);
  assert.equal(r.stats.ops.delete, 0);
});

test('shared-id detection precedes the hash skip — both sharers flagged', () => {
  const a = M({ id: 'a', googleContactId: 'people/c255' });
  a.googleSyncHash = syncHashFor(a); // hash matches — would be skipped
  const b = M({
    id: 'b', status: 'inactive',
    googleContactId: 'http://www.google.com/m8/feeds/contacts/x%40y/base/ff',
  });
  const r = plan({ members: [a, b],
    connections: [conn('people/c255', { fn: 'J', ln: 'D' })] });
  // the hash-skipped alias member is flagged too, not silently skipped
  for (const id of ['a', 'b']) {
    const op = opOf(r, id);
    assert.equal(op.type, 'error');
    assert.match(op.error, /shared by 2 members/);
  }
});

// ── hash gating ─────────────────────────────────────────────────────────────

test('members whose syncHash matches googleSyncHash are skipped entirely', () => {
  const m = M({ googleContactId: 'people/c1' });
  m.googleSyncHash = syncHashFor(m); // already in sync marker
  const r = plan({ members: [m], connections: [] });
  assert.equal(r.stats.compared, 0);
  assert.equal(r.stats.unchanged, 1);
  assert.equal(r.ops.length, 0);
});

// ── normalization → mark-synced, no churn ───────────────────────────────────

test('case-only email and format-only phone differences → mark-synced', () => {
  const m = M({ email: 'JOHN@X.TEST', phone1: '281-555-0100', googleContactId: 'people/c1' });
  const c = matchingConn(m, 'people/c1', {
    emails: [homeEmail('john@x.test')],          // case differs only
    phones: [mobile('+1 (281) 555-0100')],       // format differs only
  });
  const r = plan({ members: [m], connections: [c] });
  const op = opOf(r, 'm1');
  assert.equal(op.type, 'mark-synced');
  assert.equal(r.stats.ops.update, 0);
});

test('junk contact phone (. / +1) counts as empty; null member phone → no op', () => {
  const m = M({ googleContactId: 'people/c1' }); // no email, no phone
  const junk = matchingConn(m, 'people/c1', { phones: [mobile('.')] });
  const plus = matchingConn(m, 'people/c2', { phones: [mobile('+1')] });
  const r = plan({
    members: [m, M({ id: 'm2', googleContactId: 'people/c2' })],
    connections: [junk, plus],
  });
  assert.equal(opOf(r, 'm1').type, 'mark-synced');
  assert.equal(opOf(r, 'm2').type, 'mark-synced');
});

test('real phone change writes E.164; member null phone never deletes', () => {
  const m = M({ phone1: '281-555-0100', googleContactId: 'people/c1' });
  const c = matchingConn(m, 'people/c1', { phones: [mobile('+15550100000')] });
  const r = plan({ members: [m], connections: [c] });
  const op = opOf(r, 'm1');
  assert.equal(op.type, 'update');
  assert.deepEqual(op.fields, ['phoneNumbers']);
  const idx = op.person.phoneNumbers.findIndex((p) => (p.type ?? 'mobile') === 'mobile');
  assert.equal(op.person.phoneNumbers[idx].value, '+12815550100');

  // member phone null + contact phone present → still no phone op
  const m2 = M({ id: 'm2', googleContactId: 'people/c2' });
  const c2 = matchingConn(m2, 'people/c2', { phones: [mobile('+15550100000')] });
  const r2 = plan({ members: [m2], connections: [c2] });
  const op2 = opOf(r2, 'm2');
  assert.equal(op2.type, 'mark-synced');
});

// ── email group movement ────────────────────────────────────────────────────

test('email cleared → home email removed, out of AllSaints, into SaintsNoEmail', () => {
  const m = M({ email: null, googleContactId: 'people/c1' });
  const c = conn('people/c1', {
    fn: 'John', ln: 'Doe', dist: 'C1',
    emails: [homeEmail('john@x.test'), { value: 'work@x.test', type: 'work' }],
    groups: ['_C1', 'AllSaints2'],
  });
  const r = plan({ members: [m], connections: [c] });
  const op = opOf(r, 'm1');
  assert.equal(op.type, 'update');
  assert.ok(op.fields.includes('emailAddresses'));
  // only the FIRST home email removed; work email untouched
  assert.deepEqual(op.person.emailAddresses, [{ value: 'work@x.test', type: 'work' }]);
  assert.ok(op.adds.includes('SaintsNoEmail'));
  assert.ok(op.removes.includes('AllSaints2'));
});

test('email added → lowest AllSaints group with capacity; 498-full is skipped', () => {
  const m = M({ email: 'new@x.test', googleContactId: 'people/c1' });
  const c = conn('people/c1', {
    fn: 'John', ln: 'Doe', dist: 'C1', groups: ['_C1', 'SaintsNoEmail'],
  });
  const r = plan({ members: [m], connections: [c] });
  const op = opOf(r, 'm1');
  assert.equal(op.type, 'update');
  assert.ok(op.adds.includes('AllSaints2'));        // AllSaints1 is at 498
  assert.ok(op.removes.includes('SaintsNoEmail'));
  assert.equal(r.stats.groups.added.AllSaints2, 1);
});

test('AllSaints capacity counts adds already planned this run', () => {
  // AllSaints2 at 497 → room for exactly one.
  const groups = GROUPS.map((g) =>
    g.name === 'AllSaints2' ? { ...g, memberCount: 497 } : g);
  const mk = (id, n) => [
    M({ id, email: `${id}@x.test`, googleContactId: `people/c${n}` }),
    conn(`people/c${n}`, { fn: 'A', ln: id, dist: 'C1', groups: ['_C1'] }),
  ];
  const [m1, c1] = mk('a1', 101);
  const [m2, c2] = mk('a2', 102);
  const [m3, c3] = mk('a3', 103);
  const r = plan({ members: [m1, m2, m3], connections: [c1, c2, c3], groups });
  // a1 → AllSaints2 (497→498); a2 fills it → a3 needs a NEW group
  assert.ok(opOf(r, 'a1').adds.includes('AllSaints2'));
  assert.ok(opOf(r, 'a2').adds.includes('AllSaints3'));
  assert.ok(opOf(r, 'a3').adds.includes('AllSaints3'));
  const cg = r.ops.find((o) => o.type === 'create-group');
  assert.equal(cg.name, 'AllSaints3');
  assert.equal(r.stats.ops.createGroup, 1); // emitted once, not per member
});

// ── district group swap ─────────────────────────────────────────────────────

test('district change → dist field + swap district groups; look-alikes ignored', () => {
  const m = M({ district: 'North', googleContactId: 'people/c1' });
  const c = conn('people/c1', {
    fn: 'John', ln: 'Doe', dist: 'C1',
    // in the old district group AND a look-alike that must stay
    groups: ['_C1', '_C1_SGL', 'SaintsNoEmail'],
  });
  const r = plan({ members: [m], connections: [c] });
  const op = opOf(r, 'm1');
  assert.equal(op.type, 'update');
  assert.ok(op.fields.includes('userDefined'));
  const distUd = op.person.userDefined.find((u) => u.key === 'dist');
  assert.equal(distUd.value, 'N');
  assert.ok(op.adds.includes('_North'));
  assert.ok(op.removes.includes('_C1'));
  assert.ok(!op.removes.includes('_C1_SGL')); // look-alike untouched
  assert.ok(!op.removes.includes('SaintsNoEmail')); // member still has no email
});

test('unmapped active district → error before any reconciliation (no remove-all)', () => {
  const m = M({ district: 'Nowhere', googleContactId: 'people/c1' });
  const c = conn('people/c1', {
    fn: 'John', ln: 'Doe', dist: 'C1', groups: ['_C1', 'SaintsNoEmail'],
  });
  const r = plan({ members: [m], connections: [c] });
  const op = opOf(r, 'm1');
  assert.equal(op.type, 'error');
  assert.match(op.error, /no contact-group\/shortname mapping/);
  // no field/group mutation is planned for this member
  assert.ok(!op.removes);
});

// ── stored-id misses, identity matching, creates ────────────────────────────

test('active + stored id not in connections → error, no create', () => {
  const m = M({ googleContactId: 'people/c99999' });
  const r = plan({ members: [m], connections: [] });
  const op = opOf(r, 'm1');
  assert.equal(op.type, 'error');
  assert.match(op.error, /stored contact not found/);
});

test('no id → single unreferenced email match links', () => {
  const m = M({ email: 'find@x.test' });
  const orphan = conn('people/c501', {
    fn: 'X', ln: 'Y', emails: [homeEmail('find@x.test')], groups: [] });
  const r = plan({ members: [m], connections: [orphan] });
  const op = opOf(r, 'm1');
  assert.equal(op.type, 'link');
  assert.equal(op.contactId, 'people/c501');
});

test('two identical emails on one contact are one candidate, not ambiguous', () => {
  const m = M({ email: 'dup@x.test' });
  const orphan = conn('people/c501', {
    fn: 'X', ln: 'Y',
    emails: [homeEmail('dup@x.test'), homeEmail(' DUP@x.test ')],
  });
  const r = plan({ members: [m], connections: [orphan] });
  assert.equal(opOf(r, 'm1').type, 'link');
});

test('a candidate already claimed by an earlier member errors, no duplicate', () => {
  const orphan = conn('people/c501', {
    fn: 'X', ln: 'Y', emails: [homeEmail('same@x.test')] });
  const m1 = M({ id: 'm1', email: 'same@x.test' });
  const m2 = M({ id: 'm2', email: 'same@x.test' });
  const r = plan({ members: [m1, m2], connections: [orphan] });
  assert.equal(opOf(r, 'm1').type, 'link');
  const op = opOf(r, 'm2');
  assert.equal(op.type, 'error');
  assert.match(op.error, /identity match already claimed/);
  assert.equal(r.stats.ops.create, 0);
});

test('blank member names never name-match — create instead of link', () => {
  const orphan = conn('people/c501', { fn: '', ln: '' });
  const m = M({ firstName: '', lastName: '', email: null });
  const r = plan({ members: [m], connections: [orphan] });
  assert.equal(opOf(r, 'm1').type, 'create');
  // and a nameless contact is never a name-match candidate either
  const named = M({ email: null });
  const r2 = plan({ members: [named], connections: [orphan] });
  assert.equal(opOf(r2, 'm1').type, 'create');
});

test('no id → name match links only when exactly one candidate', () => {
  const m = M();
  const one = conn('people/c501', { fn: 'john', ln: 'DOE' }); // normalized match
  const dup = conn('people/c502', { fn: 'John', ln: 'Doe' });
  const r1 = plan({ members: [m], connections: [one] });
  assert.equal(opOf(r1, 'm1').type, 'link');
  const r2 = plan({ members: [m], connections: [one, dup] });
  const op = opOf(r2, 'm1');
  assert.equal(op.type, 'error');
  assert.match(op.error, /ambiguous identity match/);
});

test('no id + no match → create with names/email/phone/dist/memberships', () => {
  const m = M({ email: 'n@x.test', phone1: '281-555-0100', district: 'West' });
  const r = plan({ members: [m], connections: [] });
  const op = opOf(r, 'm1');
  assert.equal(op.type, 'create');
  assert.equal(op.body.names[0].givenName, 'John');
  assert.equal(op.body.emailAddresses[0].value, 'n@x.test');
  assert.equal(op.body.emailAddresses[0].type, 'home');
  assert.equal(op.body.phoneNumbers[0].value, '+12815550100');
  assert.equal(op.body.userDefined[0].value, 'W');
  const mrns = op.body.memberships.map((x) => x.contactGroupMembership.contactGroupResourceName);
  assert.ok(mrns.includes(GRN('_West')));
  assert.ok(mrns.includes(GRN('AllSaints2'))); // AllSaints1 full → 2
});

test('create with no email → SaintsNoEmail, no AllSaints', () => {
  const m = M({ district: 'South' });
  const r = plan({ members: [m] });
  const op = opOf(r, 'm1');
  const mrns = op.body.memberships.map((x) => x.contactGroupMembership.contactGroupResourceName);
  assert.ok(mrns.includes(GRN('_South')));
  assert.ok(mrns.includes(GRN('SaintsNoEmail')));
  assert.ok(!mrns.some((rn) => rn.includes('AllSaints')));
});

// ── non-active members ──────────────────────────────────────────────────────

test('non-active: contact present → delete; absent → clear-id; no id → mark-synced', () => {
  const del = M({ id: 'd1', status: 'moved', googleContactId: 'people/c1' });
  const clr = M({ id: 'd2', status: 'inactive', googleContactId: 'people/c99999' });
  const none = M({ id: 'd3', status: 'pending' });
  const r = plan({
    members: [del, clr, none],
    connections: [conn('people/c1', { fn: 'John', ln: 'Doe' })],
  });
  assert.equal(opOf(r, 'd1').type, 'delete');
  assert.equal(opOf(r, 'd2').type, 'clear-id');
  assert.equal(opOf(r, 'd3').type, 'mark-synced');
  assert.equal(r.stats.ops.delete, 1);
  assert.equal(r.stats.ops.clearId, 1);
});

test('pending member with a stored contact → error for manual review, not delete', () => {
  const m = M({ id: 'p1', status: 'pending', googleContactId: 'people/c1' });
  const r = plan({
    members: [m], connections: [conn('people/c1', { fn: 'J', ln: 'D' })],
  });
  const op = opOf(r, 'p1');
  assert.equal(op.type, 'error');
  assert.match(op.error, /pending member/);
  assert.equal(r.stats.ops.delete, 0);
});

test('unrecognized non-active status with a stored id → error, never delete', () => {
  const m = M({ id: 'w1', status: 'on-hold', googleContactId: 'people/c1' });
  const r = plan({
    members: [m], connections: [conn('people/c1', { fn: 'J', ln: 'D' })],
  });
  const op = opOf(r, 'w1');
  assert.equal(op.type, 'error');
  assert.match(op.error, /status 'on-hold'/);
  assert.equal(r.stats.ops.delete, 0);
  // every removable status still deletes
  for (const s of ['inactive', 'moved', 'deceased', 'negative', 'duplicate', 'delete']) {
    const mm = M({ id: `x-${s}`, status: s, googleContactId: 'people/c1' });
    const rr = plan({ members: [mm],
      connections: [conn('people/c1', { fn: 'J', ln: 'D' })] });
    assert.equal(opOf(rr, `x-${s}`).type, 'delete', s);
  }
});

// ── shared ids and the untouched-orphans guarantee ──────────────────────────

test('shared contact id → error for each member, no contact changes', () => {
  const m1 = M({ id: 's1', googleContactId: 'people/c777' });
  const m2 = M({ id: 's2', googleContactId: 'people/c777' });
  const c = conn('people/c777', { fn: 'John', ln: 'Doe', dist: 'C1', groups: ['_C1'] });
  const r = plan({ members: [m1, m2], connections: [c] });
  const errs = r.ops.filter((o) => o.type === 'error');
  assert.equal(errs.length, 2);
  assert.match(errs[0].error, /shared by 2 members/);
  assert.ok(!r.ops.some((o) => o.type === 'update' || o.type === 'delete'));
});

test('unreferenced connections are never touched', () => {
  const m = M({ email: 'unique@x.test', googleContactId: 'people/c1' });
  const c1 = matchingConn(m, 'people/c1');
  const orphan = conn('people/c9999', {
    fn: 'Some', ln: 'Other', emails: [homeEmail('us-churches@x.test')],
  });
  const r = plan({ members: [m], connections: [c1, orphan] });
  assert.ok(!JSON.stringify(r.ops).includes('people/c9999'));
});

// ── CONTACT-source scoping (ports scratch repro #3) ─────────────────────────

const src = (type) => ({ metadata: { source: { type, id: 'x' } } });

test('planFieldChanges: PROFILE/DOMAIN entries are neither matched nor echoed', () => {
  const member = M({ email: 'new-home@x.test' });
  const contact = {
    resourceName: 'people/c500', etag: 'e9',
    names: [
      // PROFILE name sits at index 0 — it must NOT be treated as n0
      { givenName: 'Prof', familyName: 'Ile', ...src('PROFILE') },
      { givenName: 'John', familyName: 'Doe', ...src('CONTACT') },
    ],
    emailAddresses: [
      // a PROFILE email that coincidentally equals the member's is not a
      // home-email match — the change is still planned against CONTACT data
      { value: 'new-home@x.test', ...src('DOMAIN_PROFILE') },
      { value: 'old-home@x.test', type: 'home' }, // no metadata → CONTACT scope
    ],
    phoneNumbers: [
      { value: '+19990001111', type: 'mobile', ...src('PROFILE') },
      { value: '+12815550100', type: 'mobile', ...src('CONTACT') },
    ],
    userDefined: [
      { key: 'dist', value: 'ZZ', ...src('DOMAIN_PROFILE') },
      { key: 'dist', value: 'C1' },
    ],
  };
  const r = planFieldChanges(member, contact, SHORTNAMES);
  // only CONTACT / metadata-free entries survive into the write body
  assert.equal(r.person.names.length, 1);
  assert.equal(r.person.names[0].metadata.source.type, 'CONTACT');
  assert.equal(r.person.emailAddresses.length, 1);
  assert.equal(r.person.emailAddresses[0].value, 'new-home@x.test');
  assert.equal(r.person.emailAddresses[0].metadata, undefined);
  assert.equal(r.person.phoneNumbers.length, 1);
  assert.equal(r.person.phoneNumbers[0].value, '+12815550100');
  assert.equal(r.person.userDefined.length, 1);
  assert.equal(r.person.userDefined[0].value, 'C1');
  // and the planned diff ran against CONTACT data, not the PROFILE shadow
  assert.ok(r.changes.some((c) => c.field === 'email'
    && c.from === 'old-home@x.test' && c.to === 'new-home@x.test'));
  assert.ok(!r.changes.some((c) => c.field === 'givenName'
    && c.from === 'Prof'));
});

test('planFieldChanges: an all-PROFILE name means no CONTACT name — change planned', () => {
  const member = M();
  const contact = {
    resourceName: 'people/c501', etag: 'e9',
    names: [{ givenName: 'X', familyName: 'Y', ...src('PROFILE') }],
  };
  const r = planFieldChanges(member, contact, SHORTNAMES);
  assert.ok(r.fields.includes('names'));
  assert.equal(r.person.names[0].givenName, 'John');
});
