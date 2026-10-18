import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  createGoogleTokenSource, loadGoogleCredentials,
} from '../src/services/googleAuth.js';

// A real RSA pair — the test verifies the JWT actually verifies.
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
});
const KEY = {
  client_email: 'svc@test.iam.gserviceaccount.com',
  private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }),
};

// Fake token endpoint that captures the grant and verifies the JWT.
const fakeTokenFetch = (calls, { expiresIn = 3600 } = {}) => async (url, opts) => {
  calls.push({ url, opts });
  const assertion = new URLSearchParams(opts.body).get('assertion');
  const [h, c, s] = assertion.split('.');
  const claims = JSON.parse(Buffer.from(c, 'base64url').toString());
  const ok = crypto.createVerify('RSA-SHA256')
    .update(`${h}.${c}`)
    .verify(publicKey, Buffer.from(s, 'base64url'));
  calls[calls.length - 1].jwt = { claims, signatureValid: ok };
  return {
    ok: true,
    json: async () => ({ access_token: `tok-${calls.length}`, expires_in: expiresIn }),
  };
};

test('getToken: RS256 JWT-bearer grant with correct claims', async () => {
  const calls = [];
  const src = createGoogleTokenSource({
    key: KEY, subject: 'serviceoffice@churchinhouston.org',
    scopes: ['https://www.googleapis.com/auth/contacts'],
    fetch: fakeTokenFetch(calls),
  });
  const token = await src.getToken();
  assert.equal(token, 'tok-1');
  assert.equal(calls.length, 1);
  const { claims, signatureValid } = calls[0].jwt;
  assert.ok(signatureValid, 'RS256 signature must verify against the key pair');
  assert.equal(claims.iss, KEY.client_email);
  assert.equal(claims.sub, 'serviceoffice@churchinhouston.org');
  assert.equal(claims.scope, 'https://www.googleapis.com/auth/contacts');
  assert.equal(claims.aud, 'https://oauth2.googleapis.com/token');
  assert.equal(claims.exp - claims.iat, 3600);
});

test('getToken caches until ~60s before expiry', async () => {
  const calls = [];
  const src = createGoogleTokenSource({
    key: KEY, subject: 'x', scopes: 'scope', fetch: fakeTokenFetch(calls),
  });
  assert.equal(await src.getToken(), 'tok-1');
  assert.equal(await src.getToken(), 'tok-1'); // cached
  assert.equal(calls.length, 1);
});

test('getToken refetches when the returned token is already near expiry', async () => {
  const calls = [];
  const src = createGoogleTokenSource({
    key: KEY, subject: 'x', scopes: 'scope',
    fetch: fakeTokenFetch(calls, { expiresIn: 30 }), // < 60s margin → no cache
  });
  await src.getToken();
  await src.getToken();
  assert.equal(calls.length, 2);
});

test('getToken throws with status + error code on failure', async () => {
  const src = createGoogleTokenSource({
    key: KEY, subject: 'x', scopes: 'scope',
    fetch: async () => ({ ok: false, status: 400, json: async () => ({ error: 'invalid_grant' }) }),
  });
  await assert.rejects(src.getToken(), /HTTP 400.*invalid_grant/);
});

test('loadGoogleCredentials: JSON env, file env, missing → throws', () => {
  const fromJson = loadGoogleCredentials({
    GOOGLE_DIRECTORY_SA_KEY: JSON.stringify(KEY),
    GOOGLE_DELEGATED_USER: 'me@x.test',
  });
  assert.equal(fromJson.key.client_email, KEY.client_email);
  assert.equal(fromJson.subject, 'me@x.test');

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sa-'));
  const file = path.join(dir, 'key.json');
  fs.writeFileSync(file, JSON.stringify(KEY));
  const fromFile = loadGoogleCredentials({ GOOGLE_DIRECTORY_SA_KEY_FILE: file });
  assert.equal(fromFile.key.client_email, KEY.client_email);
  assert.equal(fromFile.subject, 'serviceoffice@churchinhouston.org'); // default

  assert.throws(() => loadGoogleCredentials({}),
    /Google credentials not configured/);
});
