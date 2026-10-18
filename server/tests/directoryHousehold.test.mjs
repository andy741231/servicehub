import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  getHouseholdSpouse, HOUSEHOLD_EDITABLE, fullView, updateHouseholdMember, deps,
} from '../src/controllers/directory.js';

// ── getHouseholdSpouse: mutual + active only ────────────────────────────────

const pair = (over = {}) => {
  const self = {
    id: 'm1', firstName: 'John', lastName: 'Doe',
    spouseMemberId: 'm2', status: 'active', role: 'saint', ...over.self,
  };
  self.spouse = {
    id: 'm2', firstName: 'Jane', lastName: 'Doe',
    spouseMemberId: 'm1', status: 'active', ...over.spouse,
  };
  return self;
};

test('getHouseholdSpouse: only a mutual, active link counts', () => {
  assert.equal(getHouseholdSpouse(pair())?.id, 'm2');
  // one-sided link → none
  assert.equal(getHouseholdSpouse(pair({ spouse: { spouseMemberId: 'other' } })), null);
  // inactive spouse → none
  assert.equal(getHouseholdSpouse(pair({ spouse: { status: 'moved' } })), null);
  // no spouse loaded → none
  assert.equal(getHouseholdSpouse({ id: 'm1', spouse: null }), null);
});

test('HOUSEHOLD_EDITABLE is SELF_EDITABLE minus email and optedIn', () => {
  assert.ok(!HOUSEHOLD_EDITABLE.includes('email'));
  assert.ok(!HOUSEHOLD_EDITABLE.includes('optedIn'));
  for (const f of ['phone1', 'phone2', 'address', 'maritalStatus', 'otherName']) {
    assert.ok(HOUSEHOLD_EDITABLE.includes(f), f);
  }
});

test('fullView strips internal fields and sets hasAccount', () => {
  const m = {
    id: 'm2', firstName: 'Jane', lastName: 'Doe', status: 'active',
    userId: 'u9', coupleId: 'c1',
    account: { id: 'a1' }, auditLogs: [], loginTokens: [{ id: 't' }],
  };
  const v = fullView(m, { id: 'm1', firstName: 'John', lastName: 'Doe', status: 'active' });
  assert.equal(v.userId, undefined);
  assert.equal(v.coupleId, undefined);
  assert.equal(v.account, undefined);
  assert.equal(v.auditLogs, undefined);
  assert.equal(v.loginTokens, undefined);
  assert.equal(v.hasAccount, true);
  assert.equal(v.spouse.id, 'm1');
});

// ── updateHouseholdMember via deps seam ─────────────────────────────────────

let saved;
beforeEach(() => { saved = deps.prisma; });
afterEach(() => { deps.prisma = saved; });

const resStub = () => {
  const r = { statusCode: 200, body: undefined };
  r.status = (c) => { r.statusCode = c; return r; };
  r.json = (b) => { r.body = b; return r; };
  return r;
};

const reqFor = (memberId, body = {}) => ({
  authKind: 'directory',
  directoryMember: pair(),
  directoryAccount: { id: 'a1' },
  params: { memberId },
  body,
});

function stubPrisma({ self, audit = [] } = {}) {
  const calls = { update: [], audit };
  deps.prisma = {
    directoryMember: {
      findUnique: async ({ where }) => (where.id === self.id ? self : null),
      update: async ({ where, data, include } = {}) => {
        calls.update.push({ where, data });
        return { id: where.id, firstName: 'Jane', lastName: 'Doe', ...data, account: null };
      },
    },
    directoryAuditLog: {
      create: async ({ data }) => { calls.audit.push(data); return data; },
    },
  };
  return calls;
}

test('household PUT: 403 for a non-spouse id or a one-sided link', async () => {
  stubPrisma({ self: pair() });
  let res = resStub();
  await updateHouseholdMember(reqFor('stranger'), res);
  assert.equal(res.statusCode, 403);
  assert.match(res.body.error, /only edit your own household/);

  // the spouse doesn't link back → not a household
  stubPrisma({ self: pair({ spouse: { spouseMemberId: 'other' } }) });
  res = resStub();
  await updateHouseholdMember(reqFor('m2'), res);
  assert.equal(res.statusCode, 403);
});

test('household PUT: strips email/optedIn, stamps + audits on the spouse', async () => {
  const calls = stubPrisma({ self: pair() });
  const res = resStub();
  await updateHouseholdMember(
    reqFor('m2', { phone1: '281-555-0100', email: 'take@over.test', optedIn: false, phone2: '713-555-0188' }),
    res);
  assert.equal(res.statusCode, 200);

  const { data } = calls.update[0];
  assert.equal(data.phone1, '281-555-0100');
  assert.equal(data.phone2, '713-555-0188');
  assert.equal(data.email, undefined);      // email is not household-editable
  assert.equal(data.optedIn, undefined);    // nor is optedIn
  assert.equal(data.changeType, 'updated');
  assert.equal(data.changedByName, 'John Doe'); // the signed-in member, not the spouse

  assert.equal(calls.audit.length, 1);
  assert.equal(calls.audit[0].memberId, 'm2'); // audited on the spouse's row
  assert.equal(calls.audit[0].actorId, 'a1');
  assert.match(calls.audit[0].summary, /Household edit by .*: phone1, phone2/);
});
