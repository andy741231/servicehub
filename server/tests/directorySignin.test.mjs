import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  pickLoginMember, findOrCreateAccountForMember, requestMagicLink, deps,
} from '../src/controllers/directoryAuth.js';
import { decideAccountEmail } from '../src/controllers/directory.js';

// ── pickLoginMember ─────────────────────────────────────────────────────────

const member = (over = {}) => ({
  id: 'm1', email: 'shared@x.test', status: 'active',
  isHeadOfHousehold: false, addedAt: new Date('2020-01-01'), account: null, ...over,
});

test('pickLoginMember: account owner > head of household > earliest addedAt > id', () => {
  // owner wins over head of household and seniority
  const owner = member({ id: 'b', account: { email: 'shared@x.test' }, addedAt: new Date('2024-01-01') });
  const hoh = member({ id: 'a', isHeadOfHousehold: true, addedAt: new Date('2019-01-01') });
  assert.equal(pickLoginMember([owner, hoh], 'shared@x.test'), owner);

  // no owner → head of household
  const notHoh = member({ id: 'c', addedAt: new Date('2018-01-01') });
  assert.equal(pickLoginMember([notHoh, hoh], 'shared@x.test'), hoh);

  // no owner/hoh → earliest addedAt
  const newer = member({ id: 'd', addedAt: new Date('2021-01-01') });
  assert.equal(pickLoginMember([newer, notHoh], 'shared@x.test'), notHoh);

  // exact tie → id tie-break
  const sameDate = new Date('2020-06-01');
  const m1 = member({ id: 'z', addedAt: sameDate });
  const m2 = member({ id: 'y', addedAt: sameDate });
  assert.equal(pickLoginMember([m1, m2], 'shared@x.test'), m2);
});

test('pickLoginMember: inactive excluded; all-inactive → null', () => {
  const inactive = member({ id: 'gone', status: 'inactive', account: { email: 'shared@x.test' } });
  const active = member({ id: 'ok' });
  assert.equal(pickLoginMember([inactive, active], 'shared@x.test'), active);
  assert.equal(pickLoginMember([inactive], 'shared@x.test'), null);
});

// ── decideAccountEmail ──────────────────────────────────────────────────────

const m = (over = {}) => ({ id: 'm1', spouseMemberId: null, ...over });

test('decideAccountEmail: empty → clear (stale account email is removed)', () => {
  assert.deepEqual(decideAccountEmail({ member: m(), newEmail: '', clashAccount: null }),
    { action: 'clear' });
  assert.deepEqual(decideAccountEmail({ member: m(), newEmail: null, clashAccount: null }),
    { action: 'clear' });
});

test('decideAccountEmail: no clash → set normalized', () => {
  assert.deepEqual(
    decideAccountEmail({ member: m(), newEmail: '  J@X.TEST ', clashAccount: null }),
    { action: 'set', email: 'j@x.test' });
  // clash on own account is not a clash
  assert.deepEqual(
    decideAccountEmail({ member: m(), newEmail: 'j@x.test', clashAccount: { memberId: 'm1' } }),
    { action: 'set', email: 'j@x.test' });
});

test('decideAccountEmail: linked-spouse account clash → clear', () => {
  const spouse = m({ id: 'm1', spouseMemberId: 'm2' });
  assert.deepEqual(
    decideAccountEmail({ member: spouse, newEmail: 'shared@x.test', clashAccount: { memberId: 'm2' } }),
    { action: 'clear' });
});

test('decideAccountEmail: other member clash → conflict', () => {
  assert.deepEqual(
    decideAccountEmail({ member: m(), newEmail: 'taken@x.test', clashAccount: { memberId: 'm9' } }),
    { action: 'conflict' });
});

// ── findOrCreateAccountForMember ────────────────────────────────────────────

function accountStub({ existing = null, clash = null, createError = null } = {}) {
  const calls = { create: [] };
  return {
    calls,
    directoryAccount: {
      findUnique: async () => existing,
      findFirst: async () => clash,
      create: async ({ data }) => {
        calls.create.push(data);
        if (createError && calls.create.length === 1) {
          const e = new Error('unique'); e.code = 'P2002'; throw e;
        }
        return { id: 'acct-1', ...data };
      },
    },
  };
}

let saved;
beforeEach(() => { saved = { ...deps }; });
afterEach(() => { deps.prisma = saved.prisma; deps.sendEmail = saved.sendEmail; });

test('findOrCreateAccountForMember: email clash → created with null email', async () => {
  deps.prisma = accountStub({ clash: { id: 'acct-9', email: 'shared@x.test' } });
  const acct = await findOrCreateAccountForMember({ id: 'm2', email: 'Shared@X.test' });
  assert.equal(acct.email, null);
  assert.equal(deps.prisma.calls.create.length, 1);
  assert.equal(deps.prisma.calls.create[0].email, null);
});

test('findOrCreateAccountForMember: P2002 race re-reads by memberId or retries null', async () => {
  // memberId race — the other writer's row now exists
  const p = accountStub({ createError: true });
  p.directoryAccount.findUnique = async () => ({ id: 'acct-race', memberId: 'm3' });
  deps.prisma = p;
  const acct = await findOrCreateAccountForMember({ id: 'm3', email: 'e@x.test' });
  assert.equal(acct.id, 'acct-race');

  // email race — findUnique still nothing → retry with null email
  deps.prisma = accountStub({ createError: true });
  const acct2 = await findOrCreateAccountForMember({ id: 'm4', email: 'e@x.test' });
  assert.equal(acct2.email, null);
  assert.equal(deps.prisma.calls.create.length, 2);
  assert.equal(deps.prisma.calls.create[1].email, null);
});

// ── requestMagicLink (shared email) ─────────────────────────────────────────

function stubDeps({ candidates = [], tokens = [], sendEmail } = {}) {
  let seq = 0;
  deps.prisma = {
    directoryMember: {
      findMany: async ({ where }) =>
        candidates.filter((c) => c.email === where.email),
    },
    directoryLoginToken: {
      findFirst: async ({ where }) =>
        tokens.find((t) => t.memberId === where.memberId && t.createdAt > where.createdAt.gt) ?? null,
      create: async ({ data }) => {
        const row = { id: `tok-${++seq}`, createdAt: new Date(), usedAt: null, ...data };
        tokens.push(row);
        return row;
      },
      updateMany: async () => ({ count: 0 }),
      delete: async ({ where }) => {
        const i = tokens.findIndex((t) => t.id === where.id);
        if (i >= 0) tokens.splice(i, 1);
        return {};
      },
    },
  };
  deps.sendEmail = sendEmail ?? (async () => ({}));
  return tokens;
}

const resStub = () => {
  const r = { statusCode: 200, body: undefined };
  r.status = (c) => { r.statusCode = c; return r; };
  r.json = (b) => { r.body = b; return r; };
  return r;
};

test('requestMagicLink: shared email picks the account owner', async () => {
  const members = [
    member({ id: 'm-older', email: 'shared@x.test', addedAt: new Date('2018-01-01') }),
    member({ id: 'm-owner', email: 'shared@x.test', account: { email: 'shared@x.test' } }),
  ];
  const tokens = stubDeps({ candidates: members });
  const sent = [];
  deps.sendEmail = async (to) => sent.push(to);
  const res = resStub();
  await requestMagicLink({ body: { email: 'SHARED@x.test' } }, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(sent, ['shared@x.test']);
  assert.equal(tokens[0].memberId, 'm-owner'); // link minted for the owner
});

test('requestMagicLink: all inactive → 403; none at all → 404', async () => {
  stubDeps({ candidates: [member({ id: 'x', email: 'a@x.test', status: 'inactive' })] });
  let res = resStub();
  await requestMagicLink({ body: { email: 'a@x.test' } }, res);
  assert.equal(res.statusCode, 403);

  stubDeps({ candidates: [] });
  res = resStub();
  await requestMagicLink({ body: { email: 'nobody@x.test' } }, res);
  assert.equal(res.statusCode, 404);
});
