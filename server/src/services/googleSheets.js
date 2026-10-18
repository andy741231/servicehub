// Sheets API client for the sheet-sync-back job (§6.6) — thin REST wrapper
// in the same style as googleContacts.js: reads retry transient 429/5xx;
// idempotent writes (values.batchUpdate, updateNamedRange) do too.
// appendDimension is NOT idempotent — a lost response could mean the rows
// were already appended — so a spreadsheets.batchUpdate that appends only
// retries an explicit 429 and reports every other failure as
// outcome-uncertain rather than retrying. Every write waits `writeDelayMs`
// first. Error messages carry the HTTP status and Google's error text only.

const API = 'https://sheets.googleapis.com/v4/spreadsheets';
const RETRYABLE = (status) => status === 429 || status >= 500;
const MAX_ATTEMPTS = 3;

const qs = (obj) => new URLSearchParams(obj).toString();
const defaultSleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function createSheetsClient({
  getToken,
  fetch = globalThis.fetch,
  writeDelayMs = 250,
  sleep = defaultSleep,
}) {
  async function request(op, method, path, body, { idempotent = true } = {}) {
    const isWrite = method !== 'GET';
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      if (isWrite) await sleep(writeDelayMs);
      let res;
      try {
        res = await fetch(`${API}/${path}`, {
          method,
          headers: {
            authorization: `Bearer ${await getToken()}`,
            ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
          },
          ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        });
      } catch (err) {
        if (!idempotent) {
          // The write may have been applied — retrying would duplicate it.
          throw new Error(
            `Sheets API ${op} failed; outcome uncertain — ` +
            `the request may have been applied: ${err.message}`);
        }
        if (attempt < MAX_ATTEMPTS) { await sleep(700 * attempt); continue; }
        throw new Error(`Sheets API ${op} failed: ${err.message}`);
      }
      if (RETRYABLE(res.status)) {
        if (!idempotent && res.status !== 429) {
          // 5xx on an append — it may have been applied. Never retry.
          const j = await res.json().catch(() => ({}));
          throw new Error(
            `Sheets API ${op} failed (HTTP ${res.status}); outcome uncertain` +
            (j?.error?.message ? `: ${j.error.message}` : ''));
        }
        if (attempt < MAX_ATTEMPTS) { await sleep(700 * attempt); continue; }
      }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        const msg = j?.error?.message ? `: ${j.error.message}` : '';
        throw new Error(`Sheets API ${op} failed (HTTP ${res.status})${msg}`);
      }
      const text = await res.text();
      return text ? JSON.parse(text) : null;
    }
    return null; // unreachable
  }

  const enc = (v) => encodeURIComponent(v);

  return {
    // values.get — returns the 2-D `values` array (formatted or
    // unformatted per valueRenderOption).
    async getValues(spreadsheetId, range, valueRenderOption = 'FORMATTED_VALUE') {
      const body = await request('values.get', 'GET',
        `${enc(spreadsheetId)}/values/${enc(range)}?` +
        qs({ majorDimension: 'ROWS', valueRenderOption }));
      return body?.values ?? [];
    },

    // spreadsheets.get — metadata: title, sheet grid props, named ranges.
    getSpreadsheet(spreadsheetId, fields =
      'properties.title,sheets.properties,namedRanges') {
      return request('spreadsheets.get', 'GET',
        `${enc(spreadsheetId)}?${qs({ fields })}`);
    },

    // spreadsheets.batchUpdate — grid ops (appendDimension is not
    // idempotent, so non-idempotent retry behaviour applies to the whole
    // request batch).
    batchUpdate(spreadsheetId, requests, { idempotent = false } = {}) {
      return request('batchUpdate', 'POST',
        `${enc(spreadsheetId)}:batchUpdate`, { requests }, { idempotent });
    },

    // values.batchUpdate — RAW input; idempotent (same data re-written).
    batchUpdateValues(spreadsheetId, data) {
      return request('values.batchUpdate', 'POST',
        `${enc(spreadsheetId)}/values:batchUpdate`,
        { valueInputOption: 'RAW', data });
    },
  };
}
