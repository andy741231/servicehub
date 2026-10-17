import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPeopleClient } from '../src/services/googleContacts.js';

// ── fake fetch ──────────────────────────────────────────────────────────────

const res = (status, body) => ({
  status,
  ok: status >= 200 && status < 300,
  json: async () => (body === undefined ? {} : body),
  text: async () => (body === undefined ? '' : JSON.stringify(body)),
});

// handler(url, init) → res() | throws | {status, body} shorthand supported.
function fakeFetch(handler) {
  const calls = [];
  const fetch = async (url, init = {}) => {
    calls.push({ url, method: init.method ?? 'GET',
      body: init.body ? JSON.parse(init.body) : undefined });
    const out = await handler(url, init, calls.length);
    if (typeof out?.status === 'number' && !out.ok) return res(out.status, out.body);
    return out; // already a res()-shaped object, or a thrown error propagates
  };
  fetch.calls = calls;
  return fetch;
}

const clientFor = (fetch) => createPeopleClient({
  getToken: async () => 'tok',
  fetch,
  writeDelayMs: 0,
  sleep: async () => {},
});

// ── updateContact ───────────────────────────────────────────────────────────

test('updateContact refreshes the etag and PATCHes only masked fields + CONTACT sources', async () => {
  const fetch = fakeFetch((url, init) => {
    if (init.method === 'GET' && url.includes('peopleFields') === false
        && url.includes('personFields=metadata')) {
      return res(200, {
        etag: 'fresh-etag-2',
        metadata: {
          sources: [
            { type: 'CONTACT', id: 'src-contact', etag: 'src-etag' },
            { type: 'DOMAIN_PROFILE', id: 'src-domain' },
          ],
        },
      });
    }
    if (init.method === 'PATCH') return res(200, { etag: 'rotated' });
    return res(500, {});
  });
  const c = clientFor(fetch);
  const person = {
    resourceName: 'people/c1',
    names: [{ givenName: 'A' }],
    emailAddresses: [{ value: 'a@x.test' }],
    phoneNumbers: [{ value: '+12815550100' }],
  };
  const out = await c.updateContact('people/c1', person, 'phoneNumbers');
  assert.equal(out.etag, 'rotated');

  const patch = fetch.calls.find((x) => x.method === 'PATCH');
  assert.ok(patch.url.includes('people/c1:updateContact'));
  assert.ok(patch.url.includes('updatePersonFields=phoneNumbers'));
  assert.equal(patch.body.etag, 'fresh-etag-2');          // fresh, not stale
  assert.equal(patch.body.resourceName, 'people/c1');
  // only the CONTACT source survives — DOMAIN_PROFILE must not be echoed
  assert.deepEqual(patch.body.metadata.sources,
    [{ type: 'CONTACT', id: 'src-contact', etag: 'src-etag' }]);
  // masked field present, unmasked fields absent
  assert.ok(patch.body.phoneNumbers);
  assert.equal(patch.body.emailAddresses, undefined);
  assert.equal(patch.body.names, undefined);
});

test('updateContact on a missing contact throws before any PATCH', async () => {
  const fetch = fakeFetch((url, init) => {
    if (init.method === 'GET') return res(404, { error: { message: 'gone' } });
    return res(200, {});
  });
  const c = clientFor(fetch);
  await assert.rejects(c.updateContact('people/c1', { names: [] }, 'names'),
    /contact not found/);
  assert.ok(!fetch.calls.some((x) => x.method === 'PATCH'));
});

// ── modifyGroupMembers partial failures ─────────────────────────────────────

test('modifyGroupMembers: 200 with notFoundResourceNames → throws, no IDs leaked', async () => {
  const fetch = fakeFetch(() => res(200, {
    notFoundResourceNames: ['people/c1', 'people/c2'],
  }));
  const c = clientFor(fetch);
  const err = await c
    .modifyGroupMembers('contactGroups/g1', { add: ['people/c1', 'people/c2'] })
    .then(() => null, (e) => e);
  assert.ok(err);
  assert.match(err.message, /partially failed \(2 resource name/);
  assert.ok(!err.message.includes('people/c')); // counts only, no PII
});

test('modifyGroupMembers: emptyResourceNames and canNotRemove lists each fail', async () => {
  for (const body of [
    { emptyResourceNames: ['people/c1'] },
    { canNotRemoveLastContactGroupResourceNames: ['people/c1'] },
    { canNotRemoveLastContactGroupResourceName: 'people/c1' }, // singular, defensive
  ]) {
    const fetch = fakeFetch(() => res(200, body));
    const c = clientFor(fetch);
    await assert.rejects(
      c.modifyGroupMembers('contactGroups/g1', { remove: ['people/c1'] }),
      /partially failed \(1 resource name/);
  }
});

test('modifyGroupMembers: a failure in a later chunk still throws', async () => {
  let n = 0;
  const fetch = fakeFetch(() => {
    n += 1;
    // 501 adds → two chunks; the SECOND chunk reports a rejection
    return n === 2 ? res(200, { notFoundResourceNames: ['people/c9'] })
                   : res(200, {});
  });
  const c = clientFor(fetch);
  const adds = Array.from({ length: 501 }, (_, i) => `people/c${i}`);
  await assert.rejects(
    c.modifyGroupMembers('contactGroups/g1', { add: adds }),
    /partially failed/);
  assert.equal(fetch.calls.length, 2);
});

test('modifyGroupMembers: clean 200 passes silently', async () => {
  const fetch = fakeFetch(() => res(200, {}));
  const c = clientFor(fetch);
  await c.modifyGroupMembers('contactGroups/g1',
    { add: ['people/c1'], remove: ['people/c2'] });
  assert.equal(fetch.calls.length, 2); // one add chunk + one remove chunk
});

// ── non-idempotent creates: never retry a possibly-applied write ────────────

test('createContact on network error → exactly one POST, outcome-uncertain error', async () => {
  const fetch = fakeFetch(() => { throw new Error('socket reset'); });
  const c = clientFor(fetch);
  await assert.rejects(c.createContact({ names: [] }),
    /outcome uncertain/);
  assert.equal(fetch.calls.length, 1);
});

test('createContact on 503 → exactly one POST, outcome-uncertain error', async () => {
  const fetch = fakeFetch(() => res(503, { error: { message: 'unavailable' } }));
  const c = clientFor(fetch);
  await assert.rejects(c.createContact({ names: [] }),
    /outcome uncertain/);
  assert.equal(fetch.calls.length, 1);
});

test('createContact on 429 retries — a rejected request can never duplicate', async () => {
  let n = 0;
  const fetch = fakeFetch(() => {
    n += 1;
    return n === 1 ? res(429, { error: { message: 'quota' } })
                   : res(200, { resourceName: 'people/c42' });
  });
  const c = clientFor(fetch);
  const out = await c.createContact({ names: [] });
  assert.equal(out.resourceName, 'people/c42');
  assert.equal(fetch.calls.length, 2);
});

test('createGroup is non-idempotent too: 500 → one POST, no retry', async () => {
  const fetch = fakeFetch(() => res(500, { error: { message: 'boom' } }));
  const c = clientFor(fetch);
  await assert.rejects(c.createGroup('AllSaints9'), /outcome uncertain/);
  assert.equal(fetch.calls.length, 1);
});

// ── idempotent ops still retry ──────────────────────────────────────────────

test('getPerson retries 5xx up to success', async () => {
  let n = 0;
  const fetch = fakeFetch(() => {
    n += 1;
    return n < 3 ? res(503, {}) : res(200, { etag: 'e' });
  });
  const c = clientFor(fetch);
  const out = await c.getPerson('people/c1');
  assert.equal(out.etag, 'e');
  assert.equal(fetch.calls.length, 3);
});

test('deleteContact 404 → null (already gone is not an error)', async () => {
  const fetch = fakeFetch(() => res(404, {}));
  const c = clientFor(fetch);
  assert.equal(await c.deleteContact('people/c1'), null);
});
