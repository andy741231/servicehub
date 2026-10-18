import bcrypt from 'bcrypt';
import crypto from 'crypto';
import prisma from '../db/client.js';
import { sendEmail } from '../services/emailService.js';
import { issueLoginLink, revokeLoginToken } from '../services/directoryLoginLinks.js';
import { DIRECTORY_STATUSES, DIRECTORY_ROLES } from 'shared';
import {
  signDirectorySession,
  clearDirectorySession,
} from '../middleware/directoryAuth.js';

const normalizeEmail = (email) => (email || '').trim().toLowerCase();

// Test seam — unit tests stub these two without touching the real DB or
// Azure Email. Route code always goes through `deps`, never the bare imports.
export const deps = { prisma, sendEmail };

// Every saint who can sign in has a DirectoryAccount keyed to their member
// record. Accounts are created lazily on first successful magic-link verify —
// being listed in the directory never requires one. The login email starts as
// the member's contact email and stays in sync when staff/self update it.
// The member keeps the contact email, but a sign-in email must be unique —
// when another account already owns it this account starts with email null
// and its owner signs in by SMS link instead.
export async function findOrCreateAccountForMember(member) {
  const existing = await deps.prisma.directoryAccount.findUnique({ where: { memberId: member.id } });
  if (existing) return existing;
  const email = normalizeEmail(member.email) || null;
  const clash = email
    ? await deps.prisma.directoryAccount.findFirst({ where: { email } })
    : null;
  try {
    return await deps.prisma.directoryAccount.create({
      data: { memberId: member.id, email: clash ? null : email },
    });
  } catch (err) {
    // Lost a create race: on the memberId unique the account already exists
    // (re-read it); on the filtered email unique retry once with email null.
    if (err?.code === 'P2002') {
      const again = await deps.prisma.directoryAccount.findUnique({ where: { memberId: member.id } });
      if (again) return again;
      return deps.prisma.directoryAccount.create({
        data: { memberId: member.id, email: null },
      });
    }
    throw err;
  }
}

const shapeSession = (account, member) => ({
  account: {
    id: account.id,
    email: account.email,
    hasPassword: Boolean(account.passwordHash),
    lastLoginAt: account.lastLoginAt,
  },
  member: {
    id: member.id,
    firstName: member.firstName,
    lastName: member.lastName,
    district: member.district,
    role: member.role,
    status: member.status,
  },
});

// ── Public: district helpers for the login page ───────────────────────────
// Names + districts only — enough for a visitor to know who to ask in person.
// optedIn respected: a helper who opted out of listing stays private.

export const listHelpers = async (req, res) => {
  try {
    const helpers = await prisma.directoryMember.findMany({
      where: {
        status: DIRECTORY_STATUSES.ACTIVE,
        optedIn: true,
        role: { in: [DIRECTORY_ROLES.HELPER, DIRECTORY_ROLES.APPROVER] },
      },
      select: { firstName: true, lastName: true, district: true, role: true },
      orderBy: [{ district: 'asc' }, { lastName: 'asc' }],
      take: 50,
    });
    res.json({ helpers });
  } catch (error) {
    console.error('Error listing directory helpers:', error);
    res.status(500).json({ error: 'Failed to load helpers' });
  }
};

// ── Magic link: request ────────────────────────────────────────────────────

// Several members can share a contact email (spouses often do). Pick the
// owner of the sign-in email first, then the head of household, then the
// earliest record — deterministic down to the id tie-break. Returns null
// when candidates exist but none are active.
export function pickLoginMember(candidates, email) {
  const norm = normalizeEmail(email);
  const active = candidates.filter((m) => m.status === DIRECTORY_STATUSES.ACTIVE);
  if (!active.length) return null;
  const key = (m) => [
    m.account?.email === norm ? 0 : 1,                    // owns the sign-in email
    m.isHeadOfHousehold ? 0 : 1,
    m.addedAt ? new Date(m.addedAt).getTime() : Number.MAX_SAFE_INTEGER,
    m.id,                                                 // stable final tie-break
  ];
  return active
    .map((m) => [key(m), m])
    .sort(([a], [b]) => {
      for (let i = 0; i < a.length; i++) {
        if (a[i] < b[i]) return -1;
        if (a[i] > b[i]) return 1;
      }
      return 0;
    })[0][1];
}

export const requestMagicLink = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const candidates = await deps.prisma.directoryMember.findMany({
      where: { email },
      include: { account: true },
    });
    // Honest failures — a lost saint needs actionable feedback, and the
    // request cooldown + per-IP rate limiting blunt enumeration probing.
    if (!candidates.length) {
      return res.status(404).json({
        error: "We couldn't find a directory record for that email. Check the spelling or contact a directory helper.",
      });
    }
    const member = pickLoginMember(candidates, email);
    if (!member) {
      return res.status(403).json({
        error: 'This directory record is not currently active. Contact a helper or approver in your district.',
      });
    }
    if (member.account?.disabledAt) {
      return res.status(403).json({
        error: 'This sign-in has been disabled. Contact a directory administrator.',
      });
    }

    const issued = await issueLoginLink(member, deps.prisma);
    if (issued.cooldown) {
      return res.json({ message: 'A link was just sent — check your inbox. You can request another in a minute.' });
    }
    const { link, tokenId } = issued;

    try {
      const name = [member.firstName, member.lastName].filter(Boolean).join(' ') || 'there';
      await deps.sendEmail(
        member.email,
        'Your church directory sign-in link',
        `<p>Hi ${name},</p>
         <p>Click the link below to sign in to the church directory. It works once and expires in 30 minutes.</p>
         <p><a href="${link}" style="display:inline-block;padding:12px 24px;background:#0f766e;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">Sign in to the directory</a></p>
         <p style="color:#6b7280;font-size:13px;">If you didn't request this, you can ignore this email — the link does nothing without your inbox.</p>`,
        { plainText: `Hi ${name},\n\nSign in to the church directory (link works once, expires in 30 minutes):\n${link}\n\nIf you didn't request this, you can ignore this email.` },
      );
    } catch (err) {
      // Delivery failed — remove the unusable token and tell the truth.
      await revokeLoginToken(tokenId, deps.prisma);
      console.error('[directory] magic-link email failed:', err.message);
      return res.status(502).json({ error: "We couldn't send the email right now. Please try again in a few minutes." });
    }

    res.json({ message: `We sent a sign-in link to ${email}. It expires in 30 minutes and can be used once.` });
  } catch (error) {
    console.error('Error requesting magic link:', error);
    res.status(500).json({ error: 'Failed to send sign-in link' });
  }
};

// ── Magic link: verify ─────────────────────────────────────────────────────

export const verifyMagicLink = async (req, res) => {
  try {
    const raw = (req.body.token || '').trim();
    if (!raw) return res.status(400).json({ error: 'Missing sign-in token' });

    const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
    // Atomic consume — concurrent clicks can't reuse the same link.
    const consumed = await prisma.directoryLoginToken.updateMany({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (!consumed.count) {
      return res.status(401).json({ error: 'That sign-in link is invalid or has expired. Request a new one.' });
    }
    const record = await prisma.directoryLoginToken.findUnique({
      where: { tokenHash },
      include: { member: true },
    });
    if (!record?.member) {
      return res.status(401).json({ error: 'That sign-in link is invalid or has expired. Request a new one.' });
    }
    if (record.member.status !== DIRECTORY_STATUSES.ACTIVE) {
      return res.status(403).json({ error: 'This directory record is not currently active. Contact a helper or approver in your district.' });
    }

    const account = await findOrCreateAccountForMember(record.member);
    if (account.disabledAt) {
      return res.status(403).json({ error: 'This sign-in has been disabled. Contact a directory administrator.' });
    }
    await prisma.directoryAccount.update({
      where: { id: account.id },
      data: { lastLoginAt: new Date() },
    });

    signDirectorySession(res, account);
    res.json(shapeSession(account, record.member));
  } catch (error) {
    console.error('Error verifying magic link:', error);
    res.status(500).json({ error: 'Failed to sign in' });
  }
};

// ── Password login (directory accounts only — Hub passwords untouched) ────

export const directoryLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const account = await prisma.directoryAccount.findFirst({
      where: { email: normalizeEmail(email) },
      include: { member: true },
    });
    if (!account) {
      // A listed saint with no account yet hits this — send them to the link flow.
      const member = await prisma.directoryMember.findFirst({
        where: { email: normalizeEmail(email), status: DIRECTORY_STATUSES.ACTIVE },
      });
      if (member) {
        return res.status(401).json({
          error: 'No password account yet — sign in with the email link first, then set a password from My Profile.',
        });
      }
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    if (!account.passwordHash || !(await bcrypt.compare(password, account.passwordHash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    if (account.disabledAt) {
      return res.status(403).json({ error: 'This sign-in has been disabled. Contact a directory administrator.' });
    }
    if (account.member.status !== DIRECTORY_STATUSES.ACTIVE) {
      return res.status(403).json({ error: 'This directory record is not currently active. Contact a helper or approver in your district.' });
    }

    await prisma.directoryAccount.update({ where: { id: account.id }, data: { lastLoginAt: new Date() } });
    signDirectorySession(res, account);
    res.json(shapeSession(account, account.member));
  } catch (error) {
    console.error('Directory login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
};

// ── Directory session bootstrap / logout ───────────────────────────────────

export const getDirectoryMe = async (req, res) => {
  res.json(shapeSession(req.directoryAccount, req.directoryMember));
};

export const directoryLogout = async (req, res) => {
  clearDirectorySession(res);
  res.json({ message: 'Signed out' });
};

// ── Set password (authenticated directory session — no current password
// needed because magic-link verified the inbox) ────────────────────────────

export const setDirectoryPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }
    const account = req.directoryAccount; // directory session only
    if (!account) return res.status(404).json({ error: 'No directory sign-in account' });

    const updated = await prisma.directoryAccount.update({
      where: { id: account.id },
      data: {
        passwordHash: await bcrypt.hash(newPassword, 10),
        passwordSetAt: new Date(),
        sessionVersion: { increment: 1 }, // revoke sessions on other devices
      },
    });
    signDirectorySession(res, updated); // keep this device signed in
    res.json({ message: 'Password set — you can now sign in with email and password too.' });
  } catch (error) {
    console.error('Error setting directory password:', error);
    res.status(500).json({ error: 'Failed to set password' });
  }
};
