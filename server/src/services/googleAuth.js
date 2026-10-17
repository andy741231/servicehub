// Google auth for the directory jobs (directory-migration.md §6.7) — a
// service account with domain-wide delegation impersonating
// serviceoffice@churchinhouston.org. Zero dependencies: the token is a
// self-signed RS256 JWT exchanged at oauth2.googleapis.com/token.
// S20 uses the contacts scope; S21 reuses this with spreadsheets.

import crypto from 'node:crypto';
import fs from 'node:fs';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const DEFAULT_SUBJECT = 'serviceoffice@churchinhouston.org';

const b64u = (b) => Buffer.from(b).toString('base64url');

// Credentials resolution order: GOOGLE_DIRECTORY_SA_KEY (the whole key JSON,
// how App Service settings carry it) then GOOGLE_DIRECTORY_SA_KEY_FILE (a
// path, convenient for local dev — scratch/google-sa.json). Throws rather
// than returning null so a job's run row shows 'failed' with a clear reason.
export function loadGoogleCredentials(env = process.env) {
  let raw = env.GOOGLE_DIRECTORY_SA_KEY;
  if (!raw && env.GOOGLE_DIRECTORY_SA_KEY_FILE) {
    raw = fs.readFileSync(env.GOOGLE_DIRECTORY_SA_KEY_FILE, 'utf8');
  }
  if (!raw) throw new Error('Google credentials not configured');
  const key = typeof raw === 'string' ? JSON.parse(raw) : raw;
  return {
    key,
    subject: env.GOOGLE_DELEGATED_USER || DEFAULT_SUBJECT,
  };
}

export function createGoogleTokenSource({ key, subject, scopes, fetch }) {
  const fetchImpl = fetch ?? globalThis.fetch;
  const scope = Array.isArray(scopes) ? scopes.join(' ') : scopes;
  let cached = null; // { token, expiresAt }

  async function getToken() {
    // Reuse the token until ~60s before Google says it dies.
    if (cached && Date.now() < cached.expiresAt - 60_000) return cached.token;

    const now = Math.floor(Date.now() / 1000);
    const head = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const claim = b64u(JSON.stringify({
      iss: key.client_email,
      sub: subject,
      scope,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    }));
    const sig = crypto.createSign('RSA-SHA256')
      .update(`${head}.${claim}`)
      .sign(key.private_key);

    const res = await fetchImpl(TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: `${head}.${claim}.${b64u(sig)}`,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.access_token) {
      throw new Error(
        `Google token request failed (HTTP ${res.status})` +
        (body.error ? `: ${body.error}` : ''));
    }
    cached = {
      token: body.access_token,
      expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000,
    };
    return cached.token;
  }

  return { getToken };
}
