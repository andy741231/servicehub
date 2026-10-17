// Pure planner for the contacts-sync job (§6.5) — a port of
// performContactsHousekeeping (gas_export/a housekeeping.gs) plus the group
// helpers in 'a contacts and groups.gs'. No I/O: it takes the loaded
// members, the serviceoffice connections and the contact groups, and emits
// the op list the job (or the CLI dry run) applies.
//
// Settled normalizations (without these the first run would churn ~800 rows
// on phone format alone):
//   names  — compare trim + lowercase, write member values as-is
//   email  — compare trim + lowercase, write member value as-is
//   phone  — compare digit-only with a leading 1 stripped; a contact phone
//            with <10 digits counts as empty; writes are E.164 +1XXXXXXXXXX
// "Contact email" = first emailAddresses entry whose type is 'home'
// (missing type = home); "contact mobile" = first phoneNumbers entry whose
// type is 'mobile' (missing type = mobile). Other emails/phones are never
// touched.
//
// Members whose syncHashFor() matches googleSyncHash are skipped entirely —
// that preserves the legacy property that manual edits made directly in
// Google are not reverted unless the Directory record itself changed.

import crypto from 'node:crypto';

const ALL_SAINTS_RE = /^AllSaints\d+$/;
const ALL_SAINTS_CAP = 498;      // legacy: add while group has < 498 members
const NO_EMAIL_GROUP = 'SaintsNoEmail';

const norm = (v) => String(v ?? '').trim().toLowerCase();

// Digit-only with US country code stripped. '<10 digits' callers treat as empty.
export const phoneDigits = (v) => {
  let d = String(v ?? '').replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('1')) d = d.slice(1);
  return d;
};

// The change-detection hash stored on DirectoryMember.googleSyncHash. Covers
// every field the sync pushes plus status and the linked contact id (linking
// must re-plan the row; a status change is what schedules the delete).
export function syncHashFor(m) {
  return crypto.createHash('sha256')
    .update(JSON.stringify([
      m.firstName ?? null,
      m.lastName ?? null,
      m.email ? norm(m.email) : null,
      phoneDigits(m.phone1),
      m.district ?? null,
      m.status ?? null,
      m.googleContactId ?? null,
    ]))
    .digest('hex');
}

// Stored ids can be either the canonical People resourceName
// ('people/c<decimal>') or the legacy m8-feed URL the sheet kept
// ('http://www.google.com/m8/feeds/contacts/<acct>/base/<hex>'). The hex in
// that URL is the same contact id People uses, expressed in decimal.
//   valid canonical → 'people/c<n>'      absent/blank → null
//   legacy URL      → canonical decimal  anything else → undefined (invalid)
// Invalid ids are never followed: the planner flags them as errors and
// nothing is created, updated, deleted or cleared for that member.
export function normalizeContactId(raw) {
  if (raw == null || String(raw).trim() === '') return null;
  const s = String(raw).trim();
  // Canonical form is decimal — 'people/c0255' is a leading-zero alias of
  // the same contact and MUST be canonicalized, not rejected: rejecting it
  // would exclude the alias row from the shared/reference counts and let
  // the canonical owner delete a contact another member still references.
  if (/^people\/c\d+$/.test(s)) {
    return `people/c${BigInt(s.slice(8)).toString(10)}`;
  }
  // Legacy m8-feed URL — parse it properly: host must be exactly
  // google.com / www.google.com, http or https, a strict path shape and no
  // query or fragment.
  let u;
  try { u = new URL(s); } catch { return undefined; }
  const host = u.hostname.toLowerCase();
  if (host !== 'google.com' && host !== 'www.google.com') return undefined;
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return undefined;
  if (u.search || u.hash) return undefined;
  const m = u.pathname.match(/^\/m8\/feeds\/contacts\/[^/]+\/base\/([0-9a-f]+)$/i);
  if (!m) return undefined;
  return `people/c${BigInt(`0x${m[1]}`).toString(10)}`;
}


const homeEmail = (person) =>
  (person.emailAddresses ?? []).find((e) => (e.type ?? 'home') === 'home');
const mobilePhone = (person) =>
  (person.phoneNumbers ?? []).find((p) => (p.type ?? 'mobile') === 'mobile');
const distField = (person) =>
  (person.userDefined ?? []).find((u) => u.key === 'dist');
const memberGroupNames = (person, groupByRn) =>
  (person.memberships ?? [])
    .map((x) => x.contactGroupMembership?.contactGroupResourceName)
    .filter(Boolean)
    .map((rn) => groupByRn.get(rn)?.name)
    .filter(Boolean);

export function planContactsSync({ members, connections, groups, districtGroups, shortnames }) {
  // ── indexes ──────────────────────────────────────────────────────────
  const connByRn = new Map(connections.map((c) => [c.resourceName, c]));
  const groupByName = new Map(groups.map((g) => [g.name, g]));
  const groupByRn = new Map(groups.map((g) => [g.resourceName, g]));
  const districtGroupNames = new Set(Object.values(districtGroups));
  // Counts how many adds each group already has planned this run (capacity).
  const plannedAdds = new Map();
  // Group names with a create-group op already emitted.
  const creatingGroups = new Set();

  const ops = [];
  const stats = {
    compared: 0,
    unchanged: 0,
    ops: { update: 0, link: 0, create: 0, delete: 0, clearId: 0,
           markSynced: 0, error: 0, createGroup: 0 },
    fields: { givenName: 0, familyName: 0, email: 0, phone: 0, dist: 0 },
    groups: { added: {}, removed: {} },
  };
  const bump = (bucket, name) => { bucket[name] = (bucket[name] ?? 0) + 1; };
  const countOp = (type) => {
    const key = { 'clear-id': 'clearId', 'mark-synced': 'markSynced',
                  'create-group': 'createGroup' }[type] ?? type;
    stats.ops[key] += 1;
  };

  // Stored ids normalize to canonical 'people/c<n>' BEFORE any counting or
  // lookup — a canonical id and its legacy URL alias must count as the same
  // contact. Invalid ids keep the member out of every contact path; the
  // __invalidContactId marker is internal and never reaches the DB.
  const normMembers = members.map((m) => {
    if (!m.googleContactId) return m;
    const canon = normalizeContactId(m.googleContactId);
    if (canon === undefined) return { ...m, __invalidContactId: true };
    return canon === m.googleContactId ? m : { ...m, googleContactId: canon };
  });

  // Shared contact ids — the same googleContactId on >1 member would
  // ping-pong the same contact; flag every sharer instead.
  const idCount = new Map();
  for (const m of normMembers) {
    if (m.__invalidContactId) continue;
    if (m.googleContactId) {
      idCount.set(m.googleContactId, (idCount.get(m.googleContactId) ?? 0) + 1);
    }
  }

  // Identity-match indexes over connections no member references — the
  // ~467 non-phonelist contacts are in here, but an exact email/name match
  // is still the legacy dedupe behavior (findByIdentity). Candidates are
  // deduped by resourceName (two identical emails on one contact is one
  // candidate), and nameless contacts are never name-matchable.
  const referenced = new Set(
    normMembers.filter((m) => !m.__invalidContactId)
      .map((m) => m.googleContactId).filter(Boolean));
  const claimed = new Set(); // claimed by a link op this run
  const byEmail = new Map();
  const byName = new Map();
  const addTo = (idx, key, c) => {
    if (!key) return;
    let arr = idx.get(key);
    if (!arr) idx.set(key, (arr = []));
    if (!arr.some((x) => x.resourceName === c.resourceName)) arr.push(c);
  };
  for (const c of connections) {
    if (referenced.has(c.resourceName)) continue;
    for (const e of c.emailAddresses ?? []) addTo(byEmail, norm(e.value), c);
    const n0 = c.names?.[0] ?? {};
    const nk = norm(n0.givenName) && norm(n0.familyName)
      ? `${norm(n0.givenName)}|${norm(n0.familyName)}` : null;
    addTo(byName, nk, c);
  }

  // ── group helpers ────────────────────────────────────────────────────

  // Returns the group object for `name`, planning a create-group op the
  // first time a needed group doesn't exist (legacy did the same).
  function ensureGroup(name) {
    let g = groupByName.get(name);
    if (!g && !creatingGroups.has(name)) {
      creatingGroups.add(name);
      ops.push({ type: 'create-group', name });
      countOp('create-group');
      g = { name, resourceName: null, memberCount: 0 };
      groupByName.set(name, g); // virtual — rn resolved at apply time
    }
    return g ?? null;
  }

  // Lowest-numbered AllSaintsN with capacity left this run, else a
  // create-group op for the next number (legacy getAvailableGroupInAllSaints).
  function pickAllSaintsGroup() {
    const all = [...groupByName.values()]
      .filter((g) => ALL_SAINTS_RE.test(g.name))
      .sort((a, b) => Number(a.name.slice(9)) - Number(b.name.slice(9)));
    for (const g of all) {
      const used = (g.memberCount ?? 0) + (plannedAdds.get(g.name) ?? 0);
      if (used < ALL_SAINTS_CAP) {
        plannedAdds.set(g.name, (plannedAdds.get(g.name) ?? 0) + 1);
        return g.name;
      }
    }
    const next = all.length ? Number(all[all.length - 1].name.slice(9)) + 1 : 1;
    const name = `AllSaints${next}`;
    ensureGroup(name);
    plannedAdds.set(name, 1);
    return name;
  }

  // Membership ops by group NAME so they can reference a group whose
  // resourceName only exists after a create-group op runs.
  function planGroups(m, contact) {
    const adds = [];
    const removes = [];
    const inGroups = memberGroupNames(contact, groupByRn);

    // District group — exactly the mapped group, no look-alikes.
    const target = districtGroups[m.district];
    for (const n of inGroups) {
      if (districtGroupNames.has(n) && n !== target) removes.push(n);
    }
    if (target && !inGroups.includes(target)) { ensureGroup(target); adds.push(target); }

    // Email groups — AllSaintsNN iff the member has an email.
    if (m.email) {
      if (inGroups.includes(NO_EMAIL_GROUP)) removes.push(NO_EMAIL_GROUP);
      if (!inGroups.some((n) => ALL_SAINTS_RE.test(n))) {
        adds.push(pickAllSaintsGroup());
      }
    } else {
      for (const n of inGroups) {
        if (ALL_SAINTS_RE.test(n)) removes.push(n);
      }
      if (!inGroups.includes(NO_EMAIL_GROUP)) {
        ensureGroup(NO_EMAIL_GROUP); adds.push(NO_EMAIL_GROUP);
      }
    }

    for (const n of adds) bump(stats.groups.added, n);
    for (const n of removes) bump(stats.groups.removed, n);
    return { adds, removes };
  }

  // Field reconciliation for an existing contact — shared by 'update'
  // (stored id) and 'link' (identity match).
  function planFields(m, contact) {
    const person = {
      resourceName: contact.resourceName,
      etag: contact.etag,
      names: (contact.names ?? [{}]).map((x) => ({ ...x })),
      emailAddresses: (contact.emailAddresses ?? []).map((x) => ({ ...x })),
      phoneNumbers: (contact.phoneNumbers ?? []).map((x) => ({ ...x })),
      userDefined: (contact.userDefined ?? []).map((x) => ({ ...x })),
    };
    if (person.names.length === 0) person.names.push({});
    const changes = [];
    const fields = new Set();

    const n0 = contact.names?.[0] ?? {};
    if (norm(n0.givenName) !== norm(m.firstName)) {
      person.names[0].givenName = m.firstName ?? '';
      changes.push({ field: 'givenName', from: n0.givenName ?? '', to: m.firstName ?? '' });
      stats.fields.givenName += 1; fields.add('names');
    }
    if (norm(n0.familyName) !== norm(m.lastName)) {
      person.names[0].familyName = m.lastName ?? '';
      changes.push({ field: 'familyName', from: n0.familyName ?? '', to: m.lastName ?? '' });
      stats.fields.familyName += 1; fields.add('names');
    }

    const oldEmail = homeEmail(contact)?.value ?? '';
    if (norm(oldEmail) !== norm(m.email)) {
      if (m.email) {
        const idx = person.emailAddresses
          .findIndex((e) => (e.type ?? 'home') === 'home');
        if (idx >= 0) person.emailAddresses[idx].value = m.email;
        else person.emailAddresses.push({ value: m.email, type: 'home' });
        changes.push({ field: 'email', from: oldEmail, to: m.email });
      } else {
        const idx = person.emailAddresses
          .findIndex((e) => (e.type ?? 'home') === 'home');
        if (idx >= 0) person.emailAddresses.splice(idx, 1); // first home only
        changes.push({ field: 'email', from: oldEmail, to: '' });
      }
      stats.fields.email += 1; fields.add('emailAddresses');
    }

    // Legacy never deleted a contact phone — only writes when the member
    // has a usable number and it differs.
    const oldMobile = mobilePhone(contact)?.value ?? '';
    const oldDigits = phoneDigits(oldMobile);
    const memberDigits = phoneDigits(m.phone1);
    const contactDigits = oldDigits.length >= 10 ? oldDigits : '';
    if (memberDigits.length === 10 && memberDigits !== contactDigits) {
      const e164 = `+1${memberDigits}`;
      const idx = person.phoneNumbers
        .findIndex((p) => (p.type ?? 'mobile') === 'mobile');
      if (idx >= 0) person.phoneNumbers[idx].value = e164;
      else person.phoneNumbers.push({ value: e164, type: 'mobile' });
      changes.push({ field: 'phone', from: oldMobile, to: e164 });
      stats.fields.phone += 1; fields.add('phoneNumbers');
    }

    const short = shortnames[m.district];
    const oldDist = distField(contact)?.value ?? '';
    if (short && oldDist !== short) {
      const idx = person.userDefined.findIndex((u) => u.key === 'dist');
      if (idx >= 0) person.userDefined[idx].value = short;
      else person.userDefined.push({ key: 'dist', value: short });
      changes.push({ field: 'dist', from: oldDist, to: short });
      stats.fields.dist += 1; fields.add('userDefined');
    }

    // A stale free-form name sent alongside new structured parts can win on
    // write, so drop the derived/free-form variants and let Google rebuild them.
    if (fields.has('names')) {
      for (const k of ['unstructuredName', 'displayName', 'displayNameLastFirst']) {
        delete person.names[0][k];
      }
    }

    return { person, changes, fields: [...fields] };
  }

  const reconcile = (m, contact) => {
    const { person, changes, fields } = planFields(m, contact);
    const { adds, removes } = planGroups(m, contact);
    return { person, changes, fields, adds, removes };
  };

  // Contact body for a brand-new person: names, home email, E.164 mobile,
  // dist custom field, and memberships for groups that already exist
  // (a just-planned group goes through deferred adds instead).
  const createBody = (m) => {
    const body = {
      names: [{ givenName: m.firstName ?? '', familyName: m.lastName ?? '' }],
      emailAddresses: m.email ? [{ value: m.email, type: 'home' }] : undefined,
      phoneNumbers: phoneDigits(m.phone1).length === 10
        ? [{ value: `+1${phoneDigits(m.phone1)}`, type: 'mobile' }]
        : undefined,
      userDefined: shortnames[m.district]
        ? [{ key: 'dist', value: shortnames[m.district] }]
        : undefined,
      memberships: [],
    };
    const deferredAdds = [];
    const wanted = [];
    const target = districtGroups[m.district];
    if (target) wanted.push(target);
    wanted.push(m.email ? pickAllSaintsGroup() : NO_EMAIL_GROUP);
    for (const name of wanted) {
      const g = ensureGroup(name);
      if (g?.resourceName) {
        body.memberships.push({
          contactGroupMembership: { contactGroupResourceName: g.resourceName },
        });
        bump(stats.groups.added, name);
      } else {
        deferredAdds.push(name);
        bump(stats.groups.added, name);
      }
    }
    return { body, deferredAdds };
  };

  // Statuses the legacy sync treated as removable. 'pending' members never
  // have contacts provisioned; anything else with a stored id is a data bug
  // for a human — it must never be an unmonitored delete.
  const DELETE_STATUSES = new Set(
    ['inactive', 'moved', 'deceased', 'negative', 'duplicate', 'delete']);

  // ── per-member dispatch ──────────────────────────────────────────────
  for (const m of normMembers) {
    // Invalid and shared ids are flagged BEFORE the hash skip: a member
    // whose hash still matches can still alias a contact another member is
    // about to update or delete, and must surface as an error too.
    const invalid = Boolean(m.__invalidContactId);
    const shared = !invalid && m.googleContactId
      ? (idCount.get(m.googleContactId) ?? 0) : 0;

    const hash = syncHashFor(m);
    if (!invalid && shared <= 1 && hash === m.googleSyncHash) {
      stats.unchanged += 1; continue;
    }
    stats.compared += 1;

    if (invalid) {
      ops.push({ type: 'error', member: m, memberId: m.id,
        error: 'invalid stored contact id' });
      countOp('error');
      continue;
    }
    if (shared > 1) {
      ops.push({ type: 'error', member: m, memberId: m.id,
        error: `contact id shared by ${shared} members` });
      countOp('error');
      continue;
    }

    if (m.status === 'active') {
      // A member whose district has no contact-group mapping or shortname
      // gets flagged before any field/group math — never strip their
      // existing groups just because the district can't be mapped.
      if (!districtGroups[m.district] || !shortnames[m.district]) {
        ops.push({ type: 'error', member: m, memberId: m.id,
          error: `district '${m.district}' has no contact-group/shortname mapping` });
        countOp('error');
        continue;
      }

      if (m.googleContactId) {
        const contact = connByRn.get(m.googleContactId);
        if (!contact) {
          // Conservative: legacy left these flagged instead of recreating.
          ops.push({ type: 'error', member: m, memberId: m.id,
            error: 'stored contact not found' });
          countOp('error');
          continue;
        }
        const r = reconcile(m, contact);
        if (r.changes.length === 0 && r.adds.length === 0 && r.removes.length === 0) {
          // mark-synced still writes the (canonical) id — this is how a
          // stored legacy-URL id migrates when nothing else changed.
          ops.push({ type: 'mark-synced', member: m, memberId: m.id,
            contactId: m.googleContactId });
          countOp('mark-synced');
        } else {
          ops.push({ type: 'update', member: m, memberId: m.id,
            contactId: m.googleContactId, ...r });
          countOp('update');
        }
        continue;
      }

      // No stored id — identity match among unreferenced connections.
      const emailKey = m.email ? norm(m.email) : '';
      let candidates = emailKey ? (byEmail.get(emailKey) ?? []) : [];
      if (candidates.length === 0 && norm(m.firstName) && norm(m.lastName)) {
        candidates = byName.get(`${norm(m.firstName)}|${norm(m.lastName)}`) ?? [];
      }
      if (candidates.length > 1) {
        ops.push({ type: 'error', member: m, memberId: m.id,
          error: 'ambiguous identity match' });
        countOp('error');
      } else if (candidates.length === 1) {
        if (claimed.has(candidates[0].resourceName)) {
          // Another member already claimed this contact — a create here
          // would mint a duplicate of the same person.
          ops.push({ type: 'error', member: m, memberId: m.id,
            error: 'identity match already claimed' });
          countOp('error');
        } else {
          const contact = candidates[0];
          claimed.add(contact.resourceName);
          const r = reconcile(m, contact);
          ops.push({ type: 'link', member: m, memberId: m.id,
            contactId: contact.resourceName, ...r });
          countOp('link');
        }
      } else {
        const { body, deferredAdds } = createBody(m);
        ops.push({ type: 'create', member: m, memberId: m.id,
          body, adds: deferredAdds, removes: [] });
        countOp('create');
      }
      continue;
    }

    // Pending members never get a contact provisioned — but if one somehow
    // has a stored id that's a data bug a human must untangle, not a delete.
    if (m.status === 'pending' && m.googleContactId) {
      ops.push({ type: 'error', member: m, memberId: m.id,
        error: 'pending member has a stored contact — needs manual review' });
      countOp('error');
      continue;
    }

    // Non-active members with a stored id: only the known-removable
    // statuses delete/clear; an unrecognized status is flagged, never
    // deleted.
    if (m.googleContactId) {
      if (!DELETE_STATUSES.has(m.status)) {
        ops.push({ type: 'error', member: m, memberId: m.id,
          error: `status '${m.status}' has a stored contact — needs manual review` });
        countOp('error');
        continue;
      }
      if (connByRn.has(m.googleContactId)) {
        ops.push({ type: 'delete', member: m, memberId: m.id,
          contactId: m.googleContactId });
        countOp('delete');
      } else {
        ops.push({ type: 'clear-id', member: m, memberId: m.id,
          contactId: null });
        countOp('clear-id');
      }
      continue;
    }

    // Nothing to do — still mark synced so the row isn't re-compared.
    ops.push({ type: 'mark-synced', member: m, memberId: m.id,
      contactId: null });
    countOp('mark-synced');
  }

  return { ops, stats };
}
