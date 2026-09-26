import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  canSeeMember,
  canSeeFullRecord,
  canManageMember,
  serializeMember,
  STATUS_PERMISSIONS,
  REMOVED_STATUSES,
} from '../src/controllers/directory.js';
import { canonicalPhone } from '../src/utils/phone.js';

// ── Fixtures ────────────────────────────────────────────────────────────────
const saintCtx = { role: 'saint', district: 'Central 1', member: { id: 'saint-1' } };
const helperCtx = { role: 'helper', district: 'Central 1', member: { id: 'helper-1' } };
const approverCtx = { role: 'approver', district: 'Central 1', member: { id: 'appr-1' } };
const adminCtx = { role: 'admin', district: null, member: { id: 'admin-1' } };

const base = {
  id: 'm-1',
  firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com',
  phone1: '713-555-0100', phone2: null,
  address: '1 Main St', city: 'Houston', state: 'TX', zip: '77001',
  district: 'Central 1', status: 'active', optedIn: true,
  phonePrivacy: true, addressPrivacy: false,
  userId: 'user-x', coupleId: 'couple-x', spouseMemberId: null,
  dateOfBirth: new Date('1990-01-01'),
  changeType: 'imported', changedByName: 'Importer',
  spouse: null, account: null, auditLogs: [],
};

// ── Visibility ──────────────────────────────────────────────────────────────

test('saint sees only active+opted-in members', () => {
  assert.equal(canSeeMember(saintCtx, base), true);
  assert.equal(canSeeMember(saintCtx, { ...base, optedIn: false }), false);
  for (const s of REMOVED_STATUSES) {
    assert.equal(canSeeMember(saintCtx, { ...base, status: s }), false, `status=${s}`);
  }
});

test('helper sees own-district non-removed records, never removed', () => {
  assert.equal(canSeeMember(helperCtx, { ...base, status: 'inactive' }), true);
  assert.equal(canSeeMember(helperCtx, { ...base, status: 'pending' }), true);
  assert.equal(canSeeMember(helperCtx, { ...base, status: 'moved' }), false);
  // Other districts: public rows only
  assert.equal(canSeeMember(helperCtx, { ...base, district: 'Katy', status: 'inactive' }), false);
  assert.equal(canSeeMember(helperCtx, { ...base, district: 'Katy' }), true);
});

test('approver sees all records in own district incl. removed', () => {
  assert.equal(canSeeMember(approverCtx, { ...base, status: 'moved' }), true);
  assert.equal(canSeeMember(approverCtx, { ...base, status: 'deceased' }), true);
  // Other districts: still bounded to public rows
  assert.equal(canSeeMember(approverCtx, { ...base, district: 'Katy', status: 'moved' }), false);
});

test('helper cannot manage removed records; approver can', () => {
  assert.equal(canManageMember(helperCtx, { ...base, status: 'moved' }), false);
  assert.equal(canManageMember(approverCtx, { ...base, status: 'moved' }), true);
  assert.equal(canManageMember(adminCtx, { ...base, status: 'delete', district: 'Katy' }), true);
});

// ── Serialization ───────────────────────────────────────────────────────────

test('public serialization uses an allowlist — no internal fields leak', () => {
  const out = serializeMember(base, saintCtx);
  assert.equal(out.userId, undefined);
  assert.equal(out.coupleId, undefined);
  assert.equal(out.dateOfBirth, undefined);
  assert.equal(out.changedByName, undefined);
  assert.equal(out.auditLogs, undefined);
  assert.equal(out.account, undefined);
  assert.equal(out.firstName, 'Jane');
});

test('privacy flags hide fields and expose visibility hints', () => {
  const out = serializeMember({ ...base, phonePrivacy: false }, saintCtx);
  assert.equal(out.phone1, null);
  assert.equal(out.phoneVisible, false);
  const shown = serializeMember(base, saintCtx);
  assert.equal(shown.phone1, '713-555-0100');
  assert.equal(shown.address, null); // addressPrivacy false
  assert.equal(shown.addressVisible, false);
});

test('self and same-district staff get the full record', () => {
  const selfCtx = { ...saintCtx, member: { id: 'm-1' } };
  const out = serializeMember(base, selfCtx);
  assert.equal(out.dateOfBirth instanceof Date, true);
  assert.equal(out.userId, undefined); // still stripped
  const helperOut = serializeMember(base, helperCtx);
  assert.equal(helperOut.phone1, '713-555-0100');
});

// ── Status matrix ───────────────────────────────────────────────────────────

test('status permission matrix matches spec', () => {
  assert.deepEqual(STATUS_PERMISSIONS.helper, ['inactive', 'moved']);
  assert.ok(STATUS_PERMISSIONS.approver.includes('active'));
  assert.ok(!STATUS_PERMISSIONS.approver.includes('delete'));
  assert.ok(STATUS_PERMISSIONS.admin.includes('delete'));
  assert.ok(STATUS_PERMISSIONS.admin.includes('pending'));
});

// ── Phone canonicalization (SMS matching depends on NNN-NNN-NNNN storage) ───

test('canonicalPhone normalizes 10-digit NANP numbers', () => {
  assert.equal(canonicalPhone('713-555-1234'), '713-555-1234');
  assert.equal(canonicalPhone('(713) 555-1234'), '713-555-1234');
  assert.equal(canonicalPhone('713.555.1234'), '713-555-1234');
  assert.equal(canonicalPhone('7135551234'), '713-555-1234');
  assert.equal(canonicalPhone('713 555 1234'), '713-555-1234');
});

test('canonicalPhone strips a leading country code', () => {
  assert.equal(canonicalPhone('1-713-555-1234'), '713-555-1234');
  assert.equal(canonicalPhone('+1 (713) 555-1234'), '713-555-1234');
  assert.equal(canonicalPhone('+17135551234'), '713-555-1234');
});

test('canonicalPhone stores null for placeholders and malformed values', () => {
  for (const bad of [null, undefined, '', '5', '.', '555-1234', '71355512345', 'abc', '+44 20 7946 0958']) {
    assert.equal(canonicalPhone(bad), null, `input=${bad}`);
  }
});
