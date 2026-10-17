// contacts-sync job (directory-migration.md §6.5) — every 30 min.
// Keeps the serviceoffice@ Google Contacts in step with DirectoryMember:
//   active+id     → reconcile fields/groups (update)
//   active+noid   → identity-match an existing contact (link) or create
//   non-active+id → delete the contact (or clear-id if already gone)
//   pending+id    → flagged for manual review, never deleted
// Members whose googleSyncHash still matches are skipped — manual edits in
// Google are never reverted unless the Directory record itself changes.
//
// Safety, in order:
//   - a dry run computes everything and writes nothing;
//   - live runs stop at the circuit breaker (>25 deletes or >50 creates)
//     unless runJob was invoked manually with force;
//   - before any Google write the member is re-read and re-hashed — a row
//     that changed since planning (status flips, relinks) is skipped;
//   - a link/create persists the contact id immediately (hash null) so a
//     later group failure can't orphan the identity; if that persist fails
//     after a create the whole apply aborts — a maybe-orphaned contact
//     can't be healed safely within the same run;
//   - per-member failures land on googleSyncError and never abort the run.
// Write calls are throttled and retried by the People client; nothing is
// logged that contains a body.

import { DIRECTORY_DISTRICT_SHORTNAMES } from 'shared';
import {
  createGoogleTokenSource, loadGoogleCredentials,
} from '../services/googleAuth.js';
import { createPeopleClient } from '../services/googleContacts.js';
import {
  normalizeContactId, planContactsSync, syncHashFor,
} from '../services/contactsSyncPlan.js';
import { getSettings } from '../services/directorySms/settings.js';

const CONTACTS_SCOPE = 'https://www.googleapis.com/auth/contacts';

// Test seam — same pattern as controllers/deps.
export const deps = {
  loadGoogleCredentials, createGoogleTokenSource, createPeopleClient,
  getSettings,
};

export const BREAKER_LIMITS = { delete: 25, create: 50 };

export function breakerMessage(stats) {
  const d = stats.ops.delete;
  const c = stats.ops.create;
  return d > BREAKER_LIMITS.delete || c > BREAKER_LIMITS.create
    ? `Circuit breaker: ${d} deletes / ${c} creates exceeds limit`
    : null;
}

// The scheduler passes `now` as a function; accept a Date too.
const asDate = (now) => (typeof now === 'function' ? now() : now);

const hashFor = (m, contactId) =>
  syncHashFor({ ...m, googleContactId: contactId ?? null });

// Member fields the stale-check reads and hashes — the exact columns the
// planner consumed, nothing wider.
const MEMBER_SELECT = {
  id: true, firstName: true, lastName: true, email: true, phone1: true,
  district: true, status: true, googleContactId: true, googleSyncHash: true,
};

// Canonicalize a freshly-read row the same way the planner did, so hashes
// compare like for like. Invalid ids stay raw — they can't equal a planned
// canonical id, which is exactly the mismatch we want to catch.
const canonMember = (m) => {
  if (!m?.googleContactId) return m;
  const canon = normalizeContactId(m.googleContactId);
  return canon === undefined ? m : { ...m, googleContactId: canon };
};

// Thrown when a freshly-created contact's id can't be persisted — the
// apply must abort, not continue: every subsequent create could orphan
// another unrecorded contact. Per-op catch rethrows it.
class AbortApply extends Error {}

// Applies a plan live. Sequential per-member ops with try/catch; group
// membership changes are batched per group afterwards. Returns counts —
// failures land on the member's googleSyncError. The one exception is the
// post-create identity persist: a failure there throws and aborts the run.
export async function applyContactsSync({ prisma, client, plan, groups, now }) {
  const counts = { synced: 0, syncErrors: 0, groupsModified: 0, groupsFailed: 0 };
  const groupByName = new Map(groups.map((g) => [g.name, g]));
  const memberUpdate = (id, data) =>
    prisma.directoryMember.update({ where: { id }, data });
  const failMember = async (memberId, message) => {
    counts.syncErrors += 1;
    try {
      // Error records only ever write the error string — never an id/hash,
      // so a concurrent relink is never clobbered by a failure path either.
      await memberUpdate(memberId,
        { googleSyncError: String(message).slice(0, 1000) });
    } catch { /* a broken member row shouldn't mask the run */ }
  };

  // Compare-and-set for every sync-metadata write: the where clause must
  // still match the row state the write was derived from (with the raw
  // stored id, not the normalized one). A concurrent relink/status flip
  // yields count 0 and the write is refused rather than overwriting the
  // newer values.
  async function guardedUpdate(expected, data) {
    const result = await prisma.directoryMember.updateMany({
      where: {
        id: expected.id,
        firstName: expected.firstName,
        lastName: expected.lastName,
        email: expected.email ?? null,
        phone1: expected.phone1 ?? null,
        district: expected.district,
        status: expected.status,
        googleContactId: expected.googleContactId ?? null,
      },
      data,
    });
    if (result.count !== 1) {
      throw new Error('member changed during sync; metadata not saved');
    }
  }

  // Pass 1 — create any groups the plan asked for so their resourceNames
  // exist before membership batching. Member ops that would add to a group
  // that failed to create are skipped entirely (pass 2) — a contact must
  // never be created without the memberships the plan promised.
  const failedGroupCreates = new Set();
  for (const op of plan.ops) {
    if (op.type !== 'create-group') continue;
    try {
      const g = await client.createGroup(op.name);
      if (g?.resourceName) {
        groupByName.set(op.name, g);
        counts.groupsModified += 1;
      } else {
        failedGroupCreates.add(op.name);
        counts.groupsFailed += 1;
      }
    } catch (err) {
      failedGroupCreates.add(op.name);
      counts.groupsFailed += 1;
    }
  }

  // Pass 2 — contact-level ops. Group adds/removes are deferred to pass 3;
  // pendingOk defers the member-row write until group results are known so
  // a failed membership move leaves the hash unset (→ retried next run).
  const groupOps = new Map(); // name → { add:Set, remove:Set }
  const groupBy = (name) => {
    if (!groupOps.has(name)) groupOps.set(name, { add: new Set(), remove: new Set() });
    return groupOps.get(name);
  };
  const pendingOk = new Map();   // memberId → member update data
  const touchedGroups = new Map(); // memberId → Set(groupName)
  const touch = (memberId, names) => {
    for (const n of names) {
      if (!touchedGroups.has(memberId)) touchedGroups.set(memberId, new Set());
      touchedGroups.get(memberId).add(n);
    }
  };

  // Stale-plan guard: the member row is re-read and re-hashed right before
  // its writes. Anything that changed since planning (status flip, relink,
  // staff edit) → flagged and skipped. On success it returns the fresh row
  // so every later write can compare-and-set against it.
  const staleCheck = async (op) => {
    const fresh = await prisma.directoryMember.findUnique({
      where: { id: op.member.id }, select: MEMBER_SELECT,
    });
    if (!fresh) return { error: 'member no longer exists' };
    if (syncHashFor(canonMember(fresh)) !== syncHashFor(op.member)) {
      return { error: 'member changed since planning — skipped', fresh };
    }
    return { fresh };
  };

  for (const op of plan.ops) {
    const m = op.member;
    if (!m || op.type === 'create-group') continue;
    try {
      switch (op.type) {
        case 'update':
        case 'link': {
          const groupMissing = (op.adds ?? [])
            .find((n) => failedGroupCreates.has(n));
          if (groupMissing) {
            await failMember(m.id,
              `required contact group could not be created — skipped`);
            break;
          }
          const chk = await staleCheck(op);
          if (chk.error) { await failMember(m.id, chk.error); break; }
          if (op.type === 'link') {
            // Persist the identity first — a later group failure must leave
            // the member linked (hash null → retried), not anonymous. A
            // CAS failure here skips the Google writes entirely.
            await guardedUpdate(chk.fresh, {
              googleContactId: op.contactId,
              googleSyncHash: null,
              googleSyncedAt: null,
            });
          }
          if (op.fields?.length) {
            await client.updateContact(op.contactId, op.person, op.fields.join(','));
          }
          touch(m.id, [...(op.adds ?? []), ...(op.removes ?? [])]);
          for (const n of op.adds ?? []) groupBy(n).add.add(op.contactId);
          for (const n of op.removes ?? []) groupBy(n).remove.add(op.contactId);
          pendingOk.set(m.id, {
            expected: op.type === 'link'
              ? { ...chk.fresh, googleContactId: op.contactId }
              : chk.fresh,
            data: {
              googleContactId: op.contactId,
              googleSyncHash: hashFor(m, op.contactId),
              googleSyncedAt: now,
              googleSyncError: null,
            },
          });
          break;
        }
        case 'create': {
          const groupMissing = (op.adds ?? [])
            .find((n) => failedGroupCreates.has(n));
          if (groupMissing) {
            await failMember(m.id,
              `required contact group could not be created — skipped`);
            break;
          }
          const chk = await staleCheck(op);
          if (chk.error) { await failMember(m.id, chk.error); break; }
          const created = await client.createContact(op.body);
          if (!created?.resourceName) {
            throw new Error('createContact returned no resourceName');
          }
          // Persist the new identity immediately — if THIS write fails the
          // run aborts: a contact we can't record is a possible orphan.
          try {
            await guardedUpdate(chk.fresh, {
              googleContactId: created.resourceName,
              googleSyncHash: null,
              googleSyncedAt: null,
            });
          } catch (persistErr) {
            await failMember(
              m.id, persistErr?.message ?? persistErr).catch(() => {});
            throw new AbortApply(
              'aborting apply: new contact id could not be persisted');
          }
          touch(m.id, op.adds ?? []);
          for (const n of op.adds ?? []) {
            groupBy(n).add.add(created.resourceName);
          }
          pendingOk.set(m.id, {
            expected: { ...chk.fresh, googleContactId: created.resourceName },
            data: {
              googleContactId: created.resourceName,
              googleSyncHash: hashFor(m, created.resourceName),
              googleSyncedAt: now,
              googleSyncError: null,
            },
          });
          break;
        }
        case 'delete': {
          const chk = await staleCheck(op);
          if (chk.error) { await failMember(m.id, chk.error); break; }
          // Only delete when this member is still the contact's sole
          // reference. Live-read every linked id and compare normalized —
          // a canonical rn, a leading-zero decimal alias and an m8 URL all
          // count as the same contact, including rows relinked since the
          // plan was computed.
          const linkedMembers = await prisma.directoryMember.findMany({
            where: { googleContactId: { not: null } },
            select: { id: true, googleContactId: true },
          });
          const refs = linkedMembers.filter(
            (row) => normalizeContactId(row.googleContactId)
              === op.contactId).length;
          if (refs !== 1) {
            await failMember(m.id,
              `contact has ${refs} member references — not deleted`);
            break;
          }
          await client.deleteContact(op.contactId); // 404 = already gone
          // The remote delete can't be undone if the row raced — but the
          // CAS keeps a concurrent relink from being cleared afterwards.
          await guardedUpdate(chk.fresh, {
            googleContactId: null,
            googleSyncHash: hashFor(m, null),
            googleSyncedAt: now,
            googleSyncError: null,
          });
          counts.synced += 1;
          break;
        }
        case 'clear-id': {
          const chk = await staleCheck(op);
          if (chk.error) { await failMember(m.id, chk.error); break; }
          await guardedUpdate(chk.fresh, {
            googleContactId: null,
            googleSyncHash: hashFor(m, null),
            googleSyncedAt: now,
            googleSyncError: null,
          });
          counts.synced += 1;
          break;
        }
        case 'mark-synced': {
          const chk = await staleCheck(op);
          if (chk.error) { await failMember(m.id, chk.error); break; }
          await guardedUpdate(chk.fresh, {
            googleContactId: op.contactId ?? null, // migrates legacy-URL ids
            googleSyncHash: hashFor(m, op.contactId ?? null),
            googleSyncedAt: now,
            googleSyncError: null,
          });
          counts.synced += 1;
          break;
        }
        case 'error': {
          await failMember(m.id, op.error);
          break;
        }
        default: break;
      }
    } catch (err) {
      if (err instanceof AbortApply) throw err;
      await failMember(m.id, err?.message ?? err);
    }
  }

  // Pass 3 — batched membership changes per group. The client throws on
  // HTTP-200 partial failures, so a rejected member marks the whole group.
  const failedGroups = new Set();
  for (const [name, { add, remove }] of groupOps) {
    const g = groupByName.get(name);
    if (!g?.resourceName) { failedGroups.add(name); counts.groupsFailed += 1; continue; }
    try {
      await client.modifyGroupMembers(g.resourceName,
        { add: [...add], remove: [...remove] });
      counts.groupsModified += 1;
    } catch (err) {
      failedGroups.add(name);
      counts.groupsFailed += 1;
    }
  }

  // Pass 4 — member-row writes for pass-2 successes; a member whose group
  // move failed keeps its old hash so the op retries next run. The write
  // is compare-and-set: a row that raced us (e.g. a relink during the
  // group calls) keeps its newer id and gets the error instead of a
  // stale hash or an overwritten link.
  for (const [memberId, { data, expected }] of pendingOk) {
    const touched = touchedGroups.get(memberId);
    if (touched && [...touched].some((n) => failedGroups.has(n))) {
      await failMember(memberId, 'group membership update failed');
      continue;
    }
    try {
      await guardedUpdate(expected, data);
      counts.synced += 1;
    } catch (err) {
      await failMember(memberId, err?.message ?? err);
    }
  }

  return counts;
}

async function run({ prisma, now, dryRun, force }) {
  const at = asDate(now);
  const settings = await deps.getSettings(prisma);
  const creds = deps.loadGoogleCredentials(process.env);
  const tokens = deps.createGoogleTokenSource({
    key: creds.key,
    subject: creds.subject,
    scopes: [CONTACTS_SCOPE],
  });
  const client = deps.createPeopleClient({ getToken: tokens.getToken });

  const members = await prisma.directoryMember.findMany({
    where: {
      OR: [{ status: 'active' }, { googleContactId: { not: null } }],
    },
    select: MEMBER_SELECT,
  });
  const [connections, groups] = await Promise.all([
    client.listConnections(),
    client.listGroups(),
  ]);
  const plan = planContactsSync({
    members,
    connections,
    groups,
    districtGroups: settings['districts.contactGroups'] ?? {},
    shortnames: DIRECTORY_DISTRICT_SHORTNAMES,
  });

  const breaker = breakerMessage(plan.stats);
  if (breaker && !dryRun && !force) throw new Error(breaker);

  const summary = {
    compared: plan.stats.compared,
    unchanged: plan.stats.unchanged,
    ops: plan.stats.ops,
    fields: plan.stats.fields,
    groups: plan.stats.groups,
    breakerTripped: Boolean(breaker),
    dryRun: Boolean(dryRun),
    sample: plan.ops.slice(0, 20).map((o) => ({
      op: o.type,
      memberId: o.memberId ?? null,
      fields: (o.changes ?? []).map((c) => c.field),
    })),
  };
  if (dryRun) return summary;

  const applied = await applyContactsSync({
    prisma, client, plan, groups, now: at,
  });
  return { ...summary, applied };
}

export const contactsSyncJob = {
  name: 'contacts-sync',
  schedule: { everyMinutes: 30 },
  run,
};
