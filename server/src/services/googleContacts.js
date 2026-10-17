// People API client for the contacts-sync job (§6.5) — a port of the legacy
// Contacts2 shim (gas_export/a people api contacts.gs) to REST. Reads retry
// transient 429/5xx; idempotent writes do too. createContact/createGroup are
// NOT idempotent — a lost response could mean the write already applied —
// so they only retry an explicit 429 (rejected before any write) and report
// every other failure as outcome-uncertain rather than retrying.
// Every write waits `writeDelayMs` first (per-user write quota). Error
// messages carry the HTTP status and Google's error text only — never
// contact data.

const API = 'https://people.googleapis.com/v1';
const PERSON_FIELDS =
  'names,emailAddresses,phoneNumbers,userDefined,memberships';
const RETRYABLE = (status) => status === 429 || status >= 500;
const MAX_ATTEMPTS = 3;
const MODIFY_CHUNK = 500;

const qs = (obj) => new URLSearchParams(obj).toString();
const defaultSleep = (ms) => new Promise((r) => setTimeout(r, ms));

// members:modify returns HTTP 200 with failure arrays for partially rejected
// resource names — a 200 alone does NOT mean every member moved.
const modifyFailures = (body) =>
  (body?.notFoundResourceNames?.length ?? 0)
  + (body?.emptyResourceNames?.length ?? 0)
  + (body?.canNotRemoveLastContactGroupResourceNames?.length ?? 0)
  + (body?.canNotRemoveLastContactGroupResourceName
    ? (Array.isArray(body.canNotRemoveLastContactGroupResourceName)
      ? body.canNotRemoveLastContactGroupResourceName.length : 1)
    : 0);

export function createPeopleClient({
  getToken,
  fetch = globalThis.fetch,
  writeDelayMs = 750,
  sleep = defaultSleep,
}) {
  async function request(op, method, path, body, { idempotent = true } = {}) {
    const isWrite = method !== 'GET';
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      if (isWrite) await sleep(writeDelayMs); // per-user write quota
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
            `People API ${op} failed; outcome uncertain — ` +
            `the request may have been applied: ${err.message}`);
        }
        if (attempt < MAX_ATTEMPTS) { await sleep(700 * attempt); continue; }
        throw new Error(`People API ${op} failed: ${err.message}`);
      }
      if (res.status === 404 && op === 'getPerson') return null;
      if (res.status === 404 && op === 'deleteContact') return null; // already gone
      if (RETRYABLE(res.status)) {
        if (!idempotent && res.status !== 429) {
          // 5xx on a create — it may have been applied. Never retry.
          const j = await res.json().catch(() => ({}));
          throw new Error(
            `People API ${op} failed (HTTP ${res.status}); outcome uncertain` +
            (j?.error?.message ? `: ${j.error.message}` : ''));
        }
        if (attempt < MAX_ATTEMPTS) { await sleep(700 * attempt); continue; }
        // last attempt on a retryable status falls through to !res.ok
      }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        const msg = j?.error?.message ? `: ${j.error.message}` : '';
        throw new Error(`People API ${op} failed (HTTP ${res.status})${msg}`);
      }
      // DELETE responses are empty — json() would throw.
      const text = await res.text();
      return text ? JSON.parse(text) : null;
    }
    return null; // unreachable — every path returns or throws
  }

  async function* paged(op, path, key) {
    let pageToken = '';
    do {
      const sep = path.includes('?') ? '&' : '?';
      const body = await request(
        op, 'GET', `${path}${pageToken ? `${sep}pageToken=${pageToken}` : ''}`);
      for (const item of body?.[key] ?? []) yield item;
      pageToken = body?.nextPageToken ?? '';
    } while (pageToken);
  }

  return {
    // All serviceoffice connections (phml contacts plus unrelated lists —
    // callers must only act on contacts referenced by a member). A wider
    // personFields set can be passed for fuller exports (--backup).
    listConnections(personFields = PERSON_FIELDS) {
      return (async () => {
        const out = [];
        for await (const p of paged('listConnections',
          `people/me/connections?${qs({ pageSize: 1000, personFields })}`,
          'connections')) out.push(p);
        return out;
      })();
    },

    // User-managed contact groups only (system groups like myContacts are
    // filtered out), with memberCount for the AllSaints capacity check.
    async listGroups() {
      const out = [];
      for await (const g of paged('listGroups',
        `contactGroups?${qs({ pageSize: 1000, groupFields: 'name,groupType,memberCount' })}`,
        'contactGroups')) {
        if (g.groupType === 'USER_CONTACT_GROUP') out.push(g);
      }
      return out;
    },

    getPerson(resourceName, fields = PERSON_FIELDS) {
      return request('getPerson', 'GET',
        `${resourceName}?${qs({ personFields: fields })}`);
    },

    createContact(body) {
      return request('createContact', 'POST', 'people:createContact', body,
        { idempotent: false });
    },

    // Connections-list etags go stale and every update rotates them —
    // always GET fresh metadata first, and PATCH only the masked fields
    // plus the CONTACT source entry Google requires for the write.
    async updateContact(resourceName, person, updatePersonFields) {
      const fresh = await request('getPerson', 'GET',
        `${resourceName}?${qs({ personFields: 'metadata' })}`);
      if (!fresh) {
        // The contact vanished between list and write — don't PATCH a
        // stale etag into a 4xx; fail as a not-found instead.
        throw new Error('People API updateContact aborted: contact not found');
      }
      const sources = (fresh.metadata?.sources ?? [])
        .filter((s) => s.type === 'CONTACT');
      const body = { resourceName, etag: fresh.etag };
      if (sources.length) body.metadata = { sources };
      for (const f of String(updatePersonFields).split(',')) {
        const key = f.trim();
        if (person[key] !== undefined) body[key] = person[key];
      }
      return request('updateContact', 'PATCH',
        `${resourceName}:updateContact?${qs({ updatePersonFields })}`, body);
    },

    deleteContact(resourceName) {
      return request('deleteContact', 'DELETE',
        `${resourceName}:deleteContact`);
    },

    // contactGroups.members:modify accepts up to 500 rns per call. Its 200
    // body can still report rejected resource names — any such rejection
    // throws so the job marks the group failed instead of drifting silently.
    async modifyGroupMembers(groupRn, { add = [], remove = [] } = {}) {
      const modify = async (payload) => {
        const res = await request('modifyGroupMembers', 'POST',
          `${groupRn}/members:modify`, payload);
        const failed = modifyFailures(res);
        if (failed > 0) {
          throw new Error(
            `People API modifyGroupMembers partially failed ` +
            `(${failed} resource name(s) rejected)`);
        }
      };
      for (let i = 0; i < add.length; i += MODIFY_CHUNK) {
        await modify({ resourceNamesToAdd: add.slice(i, i + MODIFY_CHUNK) });
      }
      for (let i = 0; i < remove.length; i += MODIFY_CHUNK) {
        await modify({ resourceNamesToRemove: remove.slice(i, i + MODIFY_CHUNK) });
      }
    },

    createGroup(name) {
      return request('createGroup', 'POST', 'contactGroups',
        { contactGroup: { name } }, { idempotent: false });
    },
  };
}
