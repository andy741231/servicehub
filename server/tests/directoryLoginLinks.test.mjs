import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { issueLoginLink, revokeLoginToken }
  from '../src/services/directoryLoginLinks.js';
import { requestMagicLink, deps } from '../src/controllers/directoryAuth.js';

// ── in-memory prisma stub for the login-token table ─────────────────────────

function tokenStore(rows = []) {
  let seq = 0;
  return {
    rows,
    findFirst: async ({ where }) =>
      rows.find((t) =>
        (where.memberId === undefined || t.memberId === where.memberId) &&
        (where.createdAt === undefined || t.createdAt > where.createdAt.gt)) ?? null,
    create: async ({ data }) => {
      const row = { id: `tok-${++seq}`, createdAt: new Date(), usedAt: null, ...data };
      rows.push(row);
      return row;
    },
    updateMany: async ({ where, data }) => {
      let count = 0;
      for (const t of rows) {
        if (t.memberId === where.memberId && t.usedAt == null &&
            t.id !== where.id.not) { t.usedAt = data.usedAt; count += 1; }
      }
      return { count };
    },
    delete: async ({ where }) => {
      const i = rows.findIndex((t) => t.id === where.id);
      if (i === -1) throw new Error('not found');
      rows.splice(i, 1);
      return {};
    },
  };
}

const MEMBER = { id: 'm1', email: 'j@x.test', firstName: 'John', lastName: 'Doe', status: 'active' };

test('issueLoginLink mints a hashed 30-min token and supersedes older ones', async () => {
  const now = Date.now();
  const store = tokenStore([
    { id: 'old', memberId: 'm1', tokenHash: 'x', usedAt: null,
      createdAt: new Date(now - 120_000), expiresAt: new Date(now + 600_000) },
  ]);
  const out = await issueLoginLink(MEMBER, { directoryLoginToken: store });
  assert.ok(out.link.includes('/directory/verify?token='));
  const raw = out.link.split('token=')[1];
  assert.equal(raw.length, 64); // 32 bytes hex
  assert.equal(out.tokenId, 'tok-1');

  const created = store.rows.find((t) => t.id === 'tok-1');
  assert.equal(created.memberId, 'm1');
  assert.equal(created.tokenHash.length, 64);
  assert.notEqual(created.tokenHash, raw); // hash stored, raw travels in the link
  assert.ok(created.expiresAt.getTime() - now >= 30 * 60 * 1000);
  assert.ok(created.expiresAt.getTime() - now < 30 * 60 * 1000 + 5000);
  assert.ok(store.rows.find((t) => t.id === 'old').usedAt); // superseded
});

test('issueLoginLink cooldown: a token minted <60s ago short-circuits', async () => {
  const store = tokenStore([
    { id: 'fresh', memberId: 'm1', tokenHash: 'x', usedAt: null, createdAt: new Date() },
  ]);
  const out = await issueLoginLink(MEMBER, { directoryLoginToken: store });
  assert.deepEqual(out, { cooldown: true });
  assert.equal(store.rows.length, 1); // nothing new created
});

test('revokeLoginToken deletes the token and swallows failures', async () => {
  const store = tokenStore([{ id: 'tok-1', memberId: 'm1' }]);
  await revokeLoginToken('tok-1', { directoryLoginToken: store });
  assert.equal(store.rows.length, 0);
  await revokeLoginToken('nope', { directoryLoginToken: store }); // no throw
});

// ── requestMagicLink regression (stubbed via the deps seam) ─────────────────

const resStub = () => {
  const r = { statusCode: 200, body: undefined };
  r.status = (c) => { r.statusCode = c; return r; };
  r.json = (b) => { r.body = b; return r; };
  return r;
};

let saved;
beforeEach(() => { saved = { ...deps }; });
afterEach(() => { deps.prisma = saved.prisma; deps.sendEmail = saved.sendEmail; });

function stubDeps({ member, tokens = [], sendEmail } = {}) {
  const store = tokenStore(tokens);
  deps.prisma = {
    directoryMember: {
      findMany: async ({ where }) =>
        member && member.email === where.email ? [member] : [],
    },
    directoryLoginToken: store,
  };
  deps.sendEmail = sendEmail ?? (async () => ({}));
  return store;
}

const reqWith = (email) => ({ body: { email } });

test('requestMagicLink: 400/404/403 guards unchanged', async () => {
  stubDeps({ member: null });
  let res = resStub();
  await requestMagicLink(reqWith(''), res);
  assert.equal(res.statusCode, 400);

  res = resStub();
  await requestMagicLink(reqWith('nobody@x.test'), res);
  assert.equal(res.statusCode, 404);
  assert.match(res.body.error, /couldn't find a directory record/);

  stubDeps({ member: { ...MEMBER, email: 'j@x.test', status: 'inactive' } });
  res = resStub();
  await requestMagicLink(reqWith('j@x.test'), res);
  assert.equal(res.statusCode, 403);

  stubDeps({ member: { ...MEMBER, email: 'j@x.test', account: { disabledAt: new Date() } } });
  res = resStub();
  await requestMagicLink(reqWith('j@x.test'), res);
  assert.equal(res.statusCode, 403);
});

test('requestMagicLink: cooldown message unchanged', async () => {
  stubDeps({
    member: { ...MEMBER, email: 'j@x.test' },
    tokens: [{ id: 'fresh', memberId: 'm1', usedAt: null, createdAt: new Date() }],
  });
  const res = resStub();
  await requestMagicLink(reqWith('j@x.test'), res);
  assert.equal(res.statusCode, 200);
  assert.match(res.body.message, /A link was just sent/);
});

test('requestMagicLink: success sends mail, mints + supersedes, same message', async () => {
  const sent = [];
  const store = stubDeps({
    member: { ...MEMBER, email: 'j@x.test' },
    tokens: [{ id: 'old', memberId: 'm1', usedAt: null,
               createdAt: new Date(Date.now() - 120_000) }],
    sendEmail: async (to, subj, html) => { sent.push(to); },
  });
  const res = resStub();
  await requestMagicLink(reqWith('j@x.test'), res);
  assert.equal(res.statusCode, 200);
  assert.match(res.body.message, /We sent a sign-in link to j@x\.test/);
  assert.deepEqual(sent, ['j@x.test']);
  assert.equal(store.rows.length, 2);
  assert.ok(store.rows.find((t) => t.id === 'old').usedAt); // superseded at issue time
});

test('requestMagicLink: email failure revokes the token and returns 502', async () => {
  const store = stubDeps({
    member: { ...MEMBER, email: 'j@x.test' },
    sendEmail: async () => { throw new Error('acs down'); },
  });
  const res = resStub();
  await requestMagicLink(reqWith('j@x.test'), res);
  assert.equal(res.statusCode, 502);
  assert.match(res.body.error, /couldn't send the email/);
  assert.equal(store.rows.length, 0); // unusable token removed
});
