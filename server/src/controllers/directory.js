import prisma from '../db/client.js';
import multer from 'multer';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { randomUUID } from 'crypto';
import {
  DIRECTORY_DISTRICTS,
  DIRECTORY_ROLES,
  DIRECTORY_STATUSES,
  DIRECTORY_MARITAL_STATUSES,
  DIRECTORY_GENDERS,
} from 'shared';
import { userHasRole } from '../middleware/permissions.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const UPLOAD_DIR = join(__dirname, '../../../uploads');
if (!existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Photo files buffer in memory — nothing touches disk until the controller
// has authorized the upload.
export const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  },
});

// ── Role / visibility helpers ──────────────────────────────────────────────

const { SAINT, HELPER, APPROVER, ADMIN } = DIRECTORY_ROLES;
const STAFF_ROLES = [HELPER, APPROVER, ADMIN]; // helper or above
// Removed-from-list statuses: only approvers/admins may see or manage these.
// Exported for tests.
export const REMOVED_STATUSES = [
  DIRECTORY_STATUSES.MOVED,
  DIRECTORY_STATUSES.DECEASED,
  DIRECTORY_STATUSES.NEGATIVE,
  DIRECTORY_STATUSES.DUPLICATE,
  DIRECTORY_STATUSES.DELETE,
];
const isRemoved = (member) => REMOVED_STATUSES.includes(member.status);

const fullName = (m) => [m?.firstName, m?.lastName].filter(Boolean).join(' ') || 'Unknown';

// Resolve the requester's directory context. Two session kinds reach here:
//   'directory' — saint/helper/approver cookie → member + role direct
//   'hub'       — Hub user → member via userId link; platform admin → admin
async function getDirectoryContext(req) {
  if (req.authKind === 'directory') {
    const member = req.directoryMember;
    return {
      role: member.role,
      district: member.district,
      member,
      actorName: fullName(member),
      actorId: req.directoryAccount.id,
    };
  }
  const [member, isPlatformAdmin, user] = await Promise.all([
    prisma.directoryMember.findFirst({ where: { userId: req.user.id } }),
    userHasRole(req.user.id, 'admin'),
    prisma.user.findUnique({ where: { id: req.user.id }, select: { name: true } }),
  ]);
  const actorName = user?.name || 'Unknown';
  if (isPlatformAdmin) {
    return { role: ADMIN, district: null, member, actorName, actorId: req.user.id };
  }
  if (!member) {
    return { role: null, district: null, member: null, actorName, actorId: req.user.id };
  }
  // A Hub session linked to a non-active member record gets no directory
  // context — mirrors the directory-session revocation rule.
  if (member.status !== DIRECTORY_STATUSES.ACTIVE) {
    return { role: null, district: null, member: null, actorName, actorId: req.user.id };
  }
  return { role: member.role, district: member.district, member, actorName, actorId: req.user.id };
}

const isStaff = (ctx) => STAFF_ROLES.includes(ctx.role);

// Full (unmasked) record access: self, admin, approver in the same district,
// or a helper in the same district for records still on the list (helpers
// assist active/pending/inactive saints; removed records are approver+ only).
export function canSeeFullRecord(ctx, member) {
  if (ctx.role === ADMIN) return true;
  if (ctx.member?.id === member.id) return true;
  if (ctx.role === APPROVER) return ctx.district === member.district;
  if (ctx.role === HELPER) return ctx.district === member.district && !isRemoved(member);
  return false;
}

// May this member appear in results at all for this requester?
export function canSeeMember(ctx, member) {
  if (canSeeFullRecord(ctx, member)) return true;
  if (ctx.role === HELPER && ctx.district === member.district && isRemoved(member)) return false;
  return member.status === DIRECTORY_STATUSES.ACTIVE && member.optedIn;
}

// Can ctx manage (edit) this member? Helpers/approvers are district-scoped;
// helpers cannot touch records removed from the list.
export function canManageMember(ctx, member) {
  if (ctx.role === ADMIN) return true;
  if (ctx.role === APPROVER) return ctx.district === member.district;
  if (ctx.role === HELPER) return ctx.district === member.district && !isRemoved(member);
  return false;
}

// Explicit allowlists — never pass the raw row to a plain saint.
const PUBLIC_MEMBER_FIELDS = [
  'id', 'firstName', 'middleName', 'lastName', 'otherName',
  'gender', 'maritalStatus', 'district', 'smallGroup', 'locality',
  'role', 'photoUrl', 'addedAt', 'spouseFirstName', 'spouseLastName',
  'email', 'phone1', 'phone2', 'address', 'apartment', 'city', 'state', 'zip',
];
const INTERNAL_FIELDS = ['userId', 'coupleId', 'account', 'auditLogs', 'loginTokens'];

// Serialize for the requester: full record for authorized staff/self;
// masked allowlist for everyone else. `phoneVisible`/`addressVisible` let the
// UI distinguish "member chose to hide" from "never provided".
export function serializeMember(member, ctx) {
  const spouse = member.spouse
    ? { id: member.spouse.id, firstName: member.spouse.firstName, lastName: member.spouse.lastName, status: member.spouse.status }
    : null;
  if (canSeeFullRecord(ctx, member)) {
    const base = { ...member, spouse };
    for (const f of INTERNAL_FIELDS) delete base[f];
    base.hasAccount = Boolean(member.account);
    return base;
  }
  const out = { spouse };
  for (const f of PUBLIC_MEMBER_FIELDS) out[f] = member[f] ?? null;
  out.phoneVisible = Boolean(member.phonePrivacy);
  out.addressVisible = Boolean(member.addressPrivacy);
  if (!member.phonePrivacy) { out.phone1 = null; out.phone2 = null; }
  if (!member.addressVisible) {
    out.address = null; out.apartment = null; out.city = null; out.state = null; out.zip = null;
  }
  return out;
}

// Audit fields stamped on the member row in the SAME update that made the
// change (so responses aren't stale) — call stampChange() when building data.
function stampChange(data, ctx, changeType) {
  data.changeType = changeType;
  data.changedAt = new Date();
  data.changedByName = ctx.actorName;
  return data;
}

// Writes the audit log row only. Not needed on hard delete (row is gone and
// FK constraints require its logs to be removed first anyway).
async function writeAudit(memberId, actorId, ctx, changeType, summary = null) {
  await prisma.directoryAuditLog.create({
    data: { memberId, actorId, actorName: ctx.actorName, changeType, summary },
  });
}

// Fields a member may update on their own record via PUT /me. Photos change
// only through the upload endpoint — never a freely-set URL.
const SELF_EDITABLE = [
  'email', 'phone1', 'phone2', 'phonePrivacy',
  'address', 'apartment', 'city', 'state', 'zip', 'addressPrivacy',
  'smallGroup', 'dateOfBirth', 'otherName', 'maritalStatus',
  'spouseFirstName', 'spouseLastName', 'optedIn',
];

// Fields staff can edit via PUT /members/:id (everything except role/status,
// which have dedicated endpoints, and audit/system fields).
const STAFF_EDITABLE = [
  ...SELF_EDITABLE,
  'firstName', 'middleName', 'lastName', 'gender', 'isHeadOfHousehold',
  'spouseMemberId', 'locality', 'userId', 'district', 'lastVerifiedAt',
];

// '' from forms/imports → null so optional columns stay clean.
function nullifyEmpty(data) {
  const out = {};
  for (const [k, v] of Object.entries(data)) out[k] = v === '' ? null : v;
  return out;
}

const DATE_FIELDS = ['dateOfBirth', 'lastVerifiedAt', 'sourceAsOf'];

function pickFields(body, allowed) {
  const data = {};
  for (const key of allowed) {
    if (body[key] !== undefined) data[key] = body[key];
  }
  for (const f of DATE_FIELDS) {
    if (data[f] !== undefined) data[f] = data[f] ? new Date(data[f]) : null;
  }
  return data;
}

function validateMemberFields(data, { partial = false } = {}) {
  const errors = [];
  // Only identity + district are required — imported phone-list rows may lack
  // email/address/gender entirely (the 2024 PDF carries name/phone/district).
  const required = ['firstName', 'lastName', 'district'];
  if (!partial) {
    for (const f of required) {
      if (data[f] === undefined || data[f] === null || data[f] === '') errors.push(`${f} is required`);
    }
  }
  if (data.district !== undefined && data.district !== '' && !DIRECTORY_DISTRICTS.includes(data.district)) {
    errors.push(`district must be one of: ${DIRECTORY_DISTRICTS.join(', ')}`);
  }
  if (data.gender && !DIRECTORY_GENDERS.includes(data.gender)) {
    errors.push(`gender must be one of: ${DIRECTORY_GENDERS.join(', ')}`);
  }
  if (data.maritalStatus && !DIRECTORY_MARITAL_STATUSES.includes(data.maritalStatus)) {
    errors.push(`maritalStatus must be one of: ${DIRECTORY_MARITAL_STATUSES.join(', ')}`);
  }
  if (data.email && !/^\S+@\S+\.\S+$/.test(data.email)) {
    errors.push('email must be a valid email address');
  }
  return errors;
}

// ── Metadata ───────────────────────────────────────────────────────────────

export const getMeta = async (req, res) => {
  try {
    const ctx = await getDirectoryContext(req);
    res.json({
      districts: DIRECTORY_DISTRICTS,
      roles: Object.values(DIRECTORY_ROLES),
      statuses: Object.values(DIRECTORY_STATUSES),
      maritalStatuses: DIRECTORY_MARITAL_STATUSES,
      genders: DIRECTORY_GENDERS,
      myRole: ctx.role,
      myDistrict: ctx.district,
      myMemberId: ctx.member?.id ?? null,
    });
  } catch (error) {
    console.error('Error getting directory meta:', error);
    res.status(500).json({ error: 'Failed to get directory metadata' });
  }
};

// ── Dashboard stats ────────────────────────────────────────────────────────

export const getStats = async (req, res) => {
  try {
    const ctx = await getDirectoryContext(req);
    if (!ctx.role) return res.status(403).json({ error: 'No directory record linked to your account' });

    const staff = isStaff(ctx);
    const scopeDistrict = ctx.role === ADMIN ? undefined : ctx.district;

    const [totalActive, byDistrict, recentlyAdded, pendingCount, myPending] = await Promise.all([
      prisma.directoryMember.count({ where: { status: DIRECTORY_STATUSES.ACTIVE, optedIn: true } }),
      prisma.directoryMember.groupBy({
        by: ['district'],
        where: { status: DIRECTORY_STATUSES.ACTIVE, optedIn: true },
        _count: { _all: true },
      }),
      prisma.directoryMember.findMany({
        where: staff && scopeDistrict
          ? { district: scopeDistrict }
          : { status: DIRECTORY_STATUSES.ACTIVE, optedIn: true },
        orderBy: { addedAt: 'desc' },
        take: 5,
        include: {
        spouse: { select: { id: true, firstName: true, lastName: true, status: true } },
        account: { select: { id: true } },
      },
      }),
      // Pending activations the requester can act on
      staff
        ? prisma.directoryMember.count({
            where: { status: DIRECTORY_STATUSES.PENDING, ...(scopeDistrict ? { district: scopeDistrict } : {}) },
          })
        : Promise.resolve(0),
      staff
        ? prisma.directoryMember.findMany({
            where: { status: DIRECTORY_STATUSES.PENDING, ...(scopeDistrict ? { district: scopeDistrict } : {}) },
            orderBy: { addedAt: 'desc' },
            take: 5,
          })
        : Promise.resolve([]),
    ]);

    res.json({
      totalActive,
      districtsCovered: byDistrict.length,
      byDistrict: byDistrict.map((d) => ({ name: d.district, count: d._count._all })),
      recentlyAdded: recentlyAdded.filter((m) => canSeeMember(ctx, m)).map((m) => serializeMember(m, ctx)),
      pendingCount,
      pending: myPending.map((m) => serializeMember(m, ctx)),
      myRole: ctx.role,
      myDistrict: ctx.district,
    });
  } catch (error) {
    console.error('Error getting directory stats:', error);
    res.status(500).json({ error: 'Failed to get directory stats' });
  }
};

// ── List / search ──────────────────────────────────────────────────────────

export const listMembers = async (req, res) => {
  try {
    const ctx = await getDirectoryContext(req);
    if (!ctx.role) return res.status(403).json({ error: 'No directory record linked to your account' });

    const { q, district, status, initial, page = '1', pageSize = '100' } = req.query;
    // Multi-select support: ?district=a&district=b (or district[]=) → array.
    const districts = [].concat(district ?? []).filter((d) => DIRECTORY_DISTRICTS.includes(d));
    const districtFilter = districts.length ? { district: { in: districts } } : {};
    const take = Math.min(parseInt(pageSize, 10) || 100, 500);
    const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;
    // Optional A–Z jump: ?initial=C → last names starting with C.
    const initialFilter = /^[a-z]$/i.test(initial || '') ? { lastName: { startsWith: initial.toUpperCase() } } : {};

    const searchFilter = q
      ? {
          OR: [
            { firstName: { contains: q } },
            { lastName: { contains: q } },
            { otherName: { contains: q } },
            { email: { contains: q } },
            { phone1: { contains: q } },
            { phone2: { contains: q } },
          ],
        }
      : {};

    // Saints only ever see active, opted-in members. Staff additionally see
    // everything in their own district (admins everywhere).
    let where;
    if (ctx.role === ADMIN) {
      where = {
        ...searchFilter,
        ...districtFilter,
        ...initialFilter,
        ...(status ? { status } : {}),
      };
    } else if (ctx.role === HELPER || ctx.role === APPROVER) {
      // Helpers/approvers browse all active+opted-in members church-wide
      // (masked), plus every record in their own district — except helpers
      // never see removed-from-list statuses (approver/admin only per spec).
      const includeOwnDistrict = !districts.length || districts.includes(ctx.district);
      const ownDistrictStatus = status
        ? { status: { equals: status, ...(ctx.role === HELPER ? { notIn: REMOVED_STATUSES } : {}) } }
        : (ctx.role === HELPER ? { status: { notIn: REMOVED_STATUSES } } : {});
      where = {
        AND: [
          searchFilter,
          initialFilter,
          {
            OR: [
              { status: DIRECTORY_STATUSES.ACTIVE, optedIn: true, ...districtFilter },
              ...(includeOwnDistrict ? [{ district: ctx.district, ...ownDistrictStatus }] : []),
            ],
          },
        ],
      };
    } else {
      where = {
        ...searchFilter,
        ...initialFilter,
        status: DIRECTORY_STATUSES.ACTIVE,
        optedIn: true,
        ...districtFilter,
      };
    }

    const [total, members] = await Promise.all([
      prisma.directoryMember.count({ where }),
      prisma.directoryMember.findMany({
        where,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        take,
        skip,
        include: {
        spouse: { select: { id: true, firstName: true, lastName: true, status: true } },
        account: { select: { id: true } },
      },
      }),
    ]);

    res.json({
      members: members.filter((m) => canSeeMember(ctx, m)).map((m) => serializeMember(m, ctx)),
      total,
      page: parseInt(page, 10) || 1,
      pageSize: take,
    });
  } catch (error) {
    console.error('Error listing directory members:', error);
    res.status(500).json({ error: 'Failed to list members' });
  }
};

export const getMember = async (req, res) => {
  try {
    const ctx = await getDirectoryContext(req);
    if (!ctx.role) return res.status(403).json({ error: 'No directory record linked to your account' });

    const member = await prisma.directoryMember.findUnique({
      where: { id: req.params.id },
      include: {
        spouse: { select: { id: true, firstName: true, lastName: true, status: true } },
        account: { select: { id: true } },
      },
    });
    if (!member || !canSeeMember(ctx, member)) {
      return res.status(404).json({ error: 'Member not found' });
    }
    res.json({ member: serializeMember(member, ctx) });
  } catch (error) {
    console.error('Error getting directory member:', error);
    res.status(500).json({ error: 'Failed to get member' });
  }
};

// ── Create / update ────────────────────────────────────────────────────────

export const createMember = async (req, res) => {
  try {
    const ctx = await getDirectoryContext(req);
    if (!isStaff(ctx)) return res.status(403).json({ error: 'Requires helper role or above' });

    const data = nullifyEmpty(pickFields(req.body, STAFF_EDITABLE));
    const errors = validateMemberFields(data);
    if (errors.length) return res.status(400).json({ error: errors.join('; ') });

    // Helpers/approvers can only add to their own district
    if (ctx.role !== ADMIN && data.district !== ctx.district) {
      return res.status(403).json({ error: 'You can only add members to your own district' });
    }

    // Duplicate guard: exact email match (case-insensitive) — only when an
    // email was provided; imported phone-list rows often have none.
    const existing = data.email && await prisma.directoryMember.findFirst({
      where: { email: { equals: data.email } },
    });
    if (existing) {
      return res.status(409).json({
        error: 'A member with this email already exists',
        existing: { id: existing.id, firstName: existing.firstName, lastName: existing.lastName, district: existing.district, status: existing.status },
      });
    }

    // Only approver+ may create an already-active member; otherwise pending
    // until an approver activates them (per spec workflow).
    let status = DIRECTORY_STATUSES.PENDING;
    if ((ctx.role === APPROVER || ctx.role === ADMIN) && req.body.status === DIRECTORY_STATUSES.ACTIVE) {
      status = DIRECTORY_STATUSES.ACTIVE;
    }

    // New records are always saints — role elevation goes through PATCH /role
    // which enforces the spec's activity matrix. Staff-entered data is
    // verified at entry; `source: 'manual'` distinguishes it from imports.
    const member = await prisma.directoryMember.create({
      data: {
        ...stampChange(data, ctx, 'created'),
        status,
        role: SAINT,
        source: 'manual',
        lastVerifiedAt: new Date(),
      },
    });
    await writeAudit(member.id, ctx.actorId, ctx, 'created', `Added by ${ctx.role}`);

    const full = await prisma.directoryMember.findUnique({
      where: { id: member.id },
      include: {
        spouse: { select: { id: true, firstName: true, lastName: true, status: true } },
        account: { select: { id: true } },
      },
    });
    res.status(201).json({ member: serializeMember(full, ctx) });
  } catch (error) {
    console.error('Error creating directory member:', error);
    res.status(500).json({ error: 'Failed to create member' });
  }
};

export const updateMember = async (req, res) => {
  try {
    const ctx = await getDirectoryContext(req);
    const member = await prisma.directoryMember.findUnique({ where: { id: req.params.id } });
    if (!member) return res.status(404).json({ error: 'Member not found' });
    if (!canManageMember(ctx, member)) {
      return res.status(403).json({ error: 'You can only manage members in your own district' });
    }

    const data = nullifyEmpty(pickFields(req.body, STAFF_EDITABLE));
    const errors = validateMemberFields(data, { partial: true });
    if (errors.length) return res.status(400).json({ error: errors.join('; ') });

    // District transfer is an approver+ action (spec: fellowship between districts)
    if (data.district !== undefined && data.district !== member.district) {
      if (!(ctx.role === APPROVER || ctx.role === ADMIN)) {
        return res.status(403).json({ error: 'District changes require approver role or above' });
      }
    }
    // Linking a member to a Hub login is an admin-only operation — helpers
    // must not be able to attach arbitrary Hub users to directory records.
    if (data.userId !== undefined && ctx.role !== ADMIN) {
      return res.status(403).json({ error: 'Linking a Hub login requires admin role' });
    }

    // Keep spouse/couple link consistent
    if (data.spouseMemberId !== undefined && data.spouseMemberId !== member.spouseMemberId) {
      const newSpouseId = data.spouseMemberId;
      // Unlink previous spouse (both sides)
      if (member.spouseMemberId) {
        await prisma.directoryMember.updateMany({
          where: { spouseMemberId: member.id },
          data: { spouseMemberId: null, coupleId: null },
        });
      }
      if (newSpouseId) {
        const newSpouse = await prisma.directoryMember.findUnique({ where: { id: newSpouseId } });
        if (!newSpouse) return res.status(400).json({ error: 'Linked spouse member not found' });
        if (newSpouse.spouseMemberId && newSpouse.spouseMemberId !== member.id) {
          return res.status(409).json({ error: 'That member is already linked to a different spouse' });
        }
        const coupleId = member.coupleId || randomUUID();
        await prisma.directoryMember.update({
          where: { id: newSpouseId },
          data: { spouseMemberId: member.id, coupleId },
        });
        data.coupleId = coupleId;
      } else {
        data.coupleId = null;
      }
    }

    // Changing the contact email moves the sign-in email with it, so a magic
    // link always reaches the address shown on the record. Conflicts (another
    // account already using that email) are rejected before any write.
    if (data.email !== undefined && data.email !== member.email) {
      const account = await prisma.directoryAccount.findUnique({ where: { memberId: member.id } });
      if (account && data.email) {
        const clash = await prisma.directoryAccount.findUnique({ where: { email: data.email.trim().toLowerCase() } });
        if (clash && clash.memberId !== member.id) {
          return res.status(409).json({ error: 'Another directory sign-in already uses that email' });
        }
        await prisma.directoryAccount.update({
          where: { id: account.id },
          data: { email: data.email.trim().toLowerCase() },
        });
      }
    }

    const changedFields = Object.keys(data).join(', ');
    const changeType = data.district && data.district !== member.district ? 'district_changed' : 'updated';
    const updated = await prisma.directoryMember.update({
      where: { id: member.id },
      data: stampChange(data, ctx, changeType),
      include: {
        spouse: { select: { id: true, firstName: true, lastName: true, status: true } },
        account: { select: { id: true } },
      },
    });
    await writeAudit(member.id, ctx.actorId, ctx, changeType, changedFields);

    res.json({ member: serializeMember(updated, ctx) });
  } catch (error) {
    console.error('Error updating directory member:', error);
    res.status(500).json({ error: 'Failed to update member' });
  }
};

// ── Status lifecycle ───────────────────────────────────────────────────────

// Which statuses each role may set (within their district unless admin).
// Exported for tests.
export const STATUS_PERMISSIONS = {
  [HELPER]: [DIRECTORY_STATUSES.INACTIVE, DIRECTORY_STATUSES.MOVED],
  [APPROVER]: [
    DIRECTORY_STATUSES.ACTIVE, DIRECTORY_STATUSES.INACTIVE, DIRECTORY_STATUSES.MOVED,
    DIRECTORY_STATUSES.DECEASED, DIRECTORY_STATUSES.NEGATIVE, DIRECTORY_STATUSES.DUPLICATE,
  ],
  [ADMIN]: Object.values(DIRECTORY_STATUSES),
};

export const updateMemberStatus = async (req, res) => {
  try {
    const ctx = await getDirectoryContext(req);
    const { status } = req.body;
    if (!Object.values(DIRECTORY_STATUSES).includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${Object.values(DIRECTORY_STATUSES).join(', ')}` });
    }

    const member = await prisma.directoryMember.findUnique({ where: { id: req.params.id } });
    if (!member) return res.status(404).json({ error: 'Member not found' });
    if (!canManageMember(ctx, member)) {
      return res.status(403).json({ error: 'You can only manage members in your own district' });
    }
    const allowed = STATUS_PERMISSIONS[ctx.role] || [];
    if (!allowed.includes(status)) {
      return res.status(403).json({ error: `Your role cannot set status "${status}"` });
    }

    const changeType = status === DIRECTORY_STATUSES.ACTIVE ? 'activated' : 'status_changed';
    const [updated] = await prisma.$transaction([
      prisma.directoryMember.update({
        where: { id: member.id },
        data: stampChange({ status }, ctx, changeType),
        include: {
        spouse: { select: { id: true, firstName: true, lastName: true, status: true } },
        account: { select: { id: true } },
      },
      }),
      // Leaving active revokes every directory session immediately — a moved/
      // deceased/removed saint must not keep browsing on an old token.
      ...(status !== DIRECTORY_STATUSES.ACTIVE
        ? [prisma.directoryAccount.updateMany({
            where: { memberId: member.id },
            data: { sessionVersion: { increment: 1 } },
          })]
        : []),
    ]);
    await writeAudit(member.id, ctx.actorId, ctx, changeType, `${member.status} → ${status}`);

    res.json({ member: serializeMember(updated, ctx) });
  } catch (error) {
    console.error('Error updating member status:', error);
    res.status(500).json({ error: 'Failed to update member status' });
  }
};

// ── Role changes (per spec activity matrix) ────────────────────────────────

export const updateMemberRole = async (req, res) => {
  try {
    const ctx = await getDirectoryContext(req);
    const { role } = req.body;
    if (!Object.values(DIRECTORY_ROLES).includes(role)) {
      return res.status(400).json({ error: `role must be one of: ${Object.values(DIRECTORY_ROLES).join(', ')}` });
    }

    const member = await prisma.directoryMember.findUnique({ where: { id: req.params.id } });
    if (!member) return res.status(404).json({ error: 'Member not found' });
    if (!canManageMember(ctx, member)) {
      return res.status(403).json({ error: 'You can only manage members in your own district' });
    }

    // Spec matrix:
    //  saint|approver → helper : approver
    //  saint|helper   → approver: approver
    //  helper         → saint  : helper or approver
    //  approver       → saint  : approver
    //  anything       → admin  : admin only
    //  admin          → anything: admin only
    const from = member.role;
    const actor = ctx.role;
    let allowed = false;
    if (actor === ADMIN) allowed = true;
    else if (from === ADMIN || role === ADMIN) allowed = false;
    else if (role === HELPER) allowed = actor === APPROVER && (from === SAINT || from === APPROVER);
    else if (role === APPROVER) allowed = actor === APPROVER && (from === SAINT || from === HELPER);
    else if (role === SAINT) {
      allowed =
        (from === HELPER && (actor === HELPER || actor === APPROVER)) ||
        (from === APPROVER && actor === APPROVER) ||
        (from === SAINT && actor === APPROVER);
    }

    if (!allowed) {
      return res.status(403).json({ error: `Your role cannot change ${from} to ${role}` });
    }

    const updated = await prisma.directoryMember.update({
      where: { id: member.id },
      data: stampChange({ role }, ctx, 'role_changed'),
      include: {
        spouse: { select: { id: true, firstName: true, lastName: true, status: true } },
        account: { select: { id: true } },
      },
    });
    await writeAudit(member.id, ctx.actorId, ctx, 'role_changed', `${from} → ${role}`);

    res.json({ member: serializeMember(updated, ctx) });
  } catch (error) {
    console.error('Error updating member role:', error);
    res.status(500).json({ error: 'Failed to update member role' });
  }
};

// ── Hard delete (duplicates only) ──────────────────────────────────────────

export const deleteMember = async (req, res) => {
  try {
    const ctx = await getDirectoryContext(req);
    const member = await prisma.directoryMember.findUnique({ where: { id: req.params.id } });
    if (!member) return res.status(404).json({ error: 'Member not found' });
    if (!canManageMember(ctx, member)) {
      return res.status(403).json({ error: 'You can only manage members in your own district' });
    }
    if (member.status !== DIRECTORY_STATUSES.DUPLICATE) {
      return res.status(400).json({ error: 'Only records marked DUPLICATE can be permanently deleted' });
    }
    if (ctx.role !== APPROVER && ctx.role !== ADMIN) {
      return res.status(403).json({ error: 'Requires approver role or above' });
    }

    // FK constraints are NO ACTION: unlink any spouse pointing at this record
    // and remove dependent rows before the member can be deleted.
    await prisma.$transaction([
      prisma.directoryMember.updateMany({
        where: { spouseMemberId: member.id },
        data: { spouseMemberId: null, coupleId: null },
      }),
      prisma.directoryAccount.deleteMany({ where: { memberId: member.id } }),
      prisma.directoryLoginToken.deleteMany({ where: { memberId: member.id } }),
      prisma.directoryAuditLog.deleteMany({ where: { memberId: member.id } }),
      prisma.directoryMember.delete({ where: { id: member.id } }),
    ]);
    res.json({ message: 'Member deleted' });
  } catch (error) {
    console.error('Error deleting directory member:', error);
    res.status(500).json({ error: 'Failed to delete member' });
  }
};

// ── Self-service (My Profile) ──────────────────────────────────────────────

export const getMe = async (req, res) => {
  try {
    const ctx = await getDirectoryContext(req);
    if (!ctx.member) {
      return res.status(404).json({ error: 'No directory record linked to your account' });
    }
    const member = await prisma.directoryMember.findUnique({
      where: { id: ctx.member.id },
      include: {
        spouse: { select: { id: true, firstName: true, lastName: true, status: true } },
        account: { select: { id: true } },
      },
    });
    res.json({ member: serializeMember(member, ctx) });
  } catch (error) {
    console.error('Error getting own directory record:', error);
    res.status(500).json({ error: 'Failed to get your directory record' });
  }
};

export const updateMe = async (req, res) => {
  try {
    const ctx = await getDirectoryContext(req);
    const member = ctx.member;
    if (!member) return res.status(404).json({ error: 'No directory record linked to your account' });

    const data = nullifyEmpty(pickFields(req.body, SELF_EDITABLE));
    const errors = validateMemberFields(data, { partial: true });
    if (errors.length) return res.status(400).json({ error: errors.join('; ') });

    // Contact email doubles as the sign-in email — keep the account in sync.
    if (data.email !== undefined && data.email !== member.email) {
      const account = await prisma.directoryAccount.findUnique({ where: { memberId: member.id } });
      if (account && data.email) {
        const clash = await prisma.directoryAccount.findUnique({ where: { email: data.email.trim().toLowerCase() } });
        if (clash && clash.memberId !== member.id) {
          return res.status(409).json({ error: 'Another directory sign-in already uses that email' });
        }
        await prisma.directoryAccount.update({
          where: { id: account.id },
          data: { email: data.email.trim().toLowerCase() },
        });
      }
    }

    const updated = await prisma.directoryMember.update({
      where: { id: member.id },
      data: stampChange(data, ctx, 'updated'),
      include: {
        spouse: { select: { id: true, firstName: true, lastName: true, status: true } },
        account: { select: { id: true } },
      },
    });
    await writeAudit(member.id, ctx.actorId, ctx, 'updated', `Self-update: ${Object.keys(data).join(', ')}`);

    res.json({ member: serializeMember(updated, ctx) });
  } catch (error) {
    console.error('Error updating own directory record:', error);
    res.status(500).json({ error: 'Failed to update your directory record' });
  }
};

// ── Duplicate check (pre-add verification) ─────────────────────────────────

export const checkDuplicates = async (req, res) => {
  try {
    const ctx = await getDirectoryContext(req);
    if (!isStaff(ctx)) return res.status(403).json({ error: 'Requires helper role or above' });

    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Provide a search query (name, email, or phone)' });
    }
    const query = q.trim();
    const digits = (s) => (s || '').replace(/\D/g, '');
    const qDigits = digits(query);

    // Search ALL members church-wide (any status/district) — the whole point
    // is catching records added by another helper or district. Phone numbers
    // are stored formatted ("713-555-1234"), so digit-typed queries probe on
    // the last-4 then compare fully-normalized digits in JS.
    const [textMatches, phoneCandidates] = await Promise.all([
      prisma.directoryMember.findMany({
        where: {
          OR: [
            { firstName: { contains: query } },
            { lastName: { contains: query } },
            { otherName: { contains: query } },
            { email: { contains: query } },
            { phone1: { contains: query } },
            { phone2: { contains: query } },
          ],
        },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        take: 20,
      }),
      qDigits.length >= 7
        ? prisma.directoryMember.findMany({
            where: {
              OR: [
                { phone1: { contains: qDigits.slice(-4) } },
                { phone2: { contains: qDigits.slice(-4) } },
              ],
            },
            take: 50,
          })
        : Promise.resolve([]),
    ]);

    const seen = new Set();
    const matches = [...textMatches, ...phoneCandidates]
      .filter((m) => (seen.has(m.id) ? false : (seen.add(m.id), true)))
      .map((m) => {
        const phoneHit = qDigits.length >= 7
          && (digits(m.phone1) === qDigits || digits(m.phone2) === qDigits);
        const nameHit = [m.firstName, m.lastName].filter(Boolean).join(' ')
          .toLowerCase() === query.toLowerCase();
        return {
          id: m.id,
          firstName: m.firstName,
          middleName: m.middleName,
          lastName: m.lastName,
          email: m.email,
          phone1: m.phone1,
          district: m.district,
          status: m.status,
          addedAt: m.addedAt,
          exactPhone: phoneHit,
          exactName: nameHit,
        };
      })
      .sort((a, b) => (b.exactPhone || b.exactName ? 1 : 0) - (a.exactPhone || a.exactName ? 1 : 0));

    res.json({ matches: matches.slice(0, 20) });
  } catch (error) {
    console.error('Error checking duplicates:', error);
    res.status(500).json({ error: 'Failed to check for duplicates' });
  }
};

// ── Photo upload ───────────────────────────────────────────────────────────

export const uploadPhoto = async (req, res) => {
  try {
    const ctx = await getDirectoryContext(req);
    const member = await prisma.directoryMember.findUnique({ where: { id: req.params.id } });
    if (!member) return res.status(404).json({ error: 'Member not found' });

    const isSelf = ctx.member?.id === member.id;
    if (!isSelf && !canManageMember(ctx, member)) {
      return res.status(403).json({ error: 'You can only update members in your own district' });
    }
    if (!req.file) return res.status(400).json({ error: 'No image file provided (jpeg/png/gif/webp only)' });

    // File buffered in memory — only now that authorization passed do we
    // write it to disk. Extension derives from the verified mimetype, not the
    // uploader's filename.
    const extByMime = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif', 'image/webp': '.webp' };
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extByMime[req.file.mimetype]}`;
    writeFileSync(join(UPLOAD_DIR, filename), req.file.buffer);
    const photoUrl = `/uploads/${filename}`;
    const updated = await prisma.directoryMember.update({
      where: { id: member.id },
      data: stampChange({ photoUrl }, ctx, 'updated'),
      include: {
        spouse: { select: { id: true, firstName: true, lastName: true, status: true } },
        account: { select: { id: true } },
      },
    });
    await writeAudit(member.id, ctx.actorId, ctx, 'updated', 'photoUrl');

    res.json({ member: serializeMember(updated, ctx) });
  } catch (error) {
    console.error('Error uploading member photo:', error);
    res.status(500).json({ error: 'Failed to upload photo' });
  }
};

// ── Audit history ──────────────────────────────────────────────────────────

export const getMemberHistory = async (req, res) => {
  try {
    const ctx = await getDirectoryContext(req);
    const member = await prisma.directoryMember.findUnique({ where: { id: req.params.id } });
    if (!member) return res.status(404).json({ error: 'Member not found' });
    const isSelf = ctx.member?.id === member.id;
    if (!isSelf && !canManageMember(ctx, member)) {
      return res.status(403).json({ error: 'Requires approver/helper access for this district' });
    }

    const logs = await prisma.directoryAuditLog.findMany({
      where: { memberId: member.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ logs });
  } catch (error) {
    console.error('Error getting member history:', error);
    res.status(500).json({ error: 'Failed to get member history' });
  }
};
