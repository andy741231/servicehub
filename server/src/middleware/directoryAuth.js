import jwt from 'jsonwebtoken';
import prisma from '../db/client.js';
import { DIRECTORY_STATUSES } from 'shared';
import { verifyToken } from './auth.js';
import { requireAppAccess } from './permissions.js';

// Directory sessions are intentionally separate from Hub sessions: distinct
// cookie name, a `kind: 'directory'` claim, and a DirectoryAccount identity —
// a directory token can never authorize Hub routes and a Hub token never
// creates a directory account.
export const DIRECTORY_COOKIE = 'directoryToken';
export const DIRECTORY_SESSION_DAYS = 30;

const cookieOptions = (maxAge) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge,
});

export const signDirectorySession = (res, account, days = DIRECTORY_SESSION_DAYS) => {
  const token = jwt.sign(
    { kind: 'directory', accountId: account.id, memberId: account.memberId, sv: account.sessionVersion },
    process.env.JWT_SECRET,
    { expiresIn: `${days}d` },
  );
  res.cookie(DIRECTORY_COOKIE, token, cookieOptions(days * 24 * 60 * 60 * 1000));
};

export const clearDirectorySession = (res) => {
  res.clearCookie(DIRECTORY_COOKIE, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
};

// Accepts either a directory session (saints/helpers/approvers at /directory)
// or a Hub session with directory app access (staff at /hub-admin). Directory
// sessions are validated against the account on EVERY request: disabled
// accounts, inactive members, and bumped sessionVersion revoke instantly.
export const verifyDirectoryAccess = async (req, res, next) => {
  const dirToken = req.cookies[DIRECTORY_COOKIE];
  if (dirToken) {
    try {
      const decoded = jwt.verify(dirToken, process.env.JWT_SECRET);
      if (decoded.kind !== 'directory') throw new Error('not a directory token');
      const account = await prisma.directoryAccount.findUnique({
        where: { id: decoded.accountId },
        include: { member: true },
      });
      if (!account || !account.member || account.disabledAt
          || account.sessionVersion !== decoded.sv
          || account.member.status !== DIRECTORY_STATUSES.ACTIVE) {
        clearDirectorySession(res);
        return res.status(401).json({ error: 'Your directory session has ended. Please sign in again.' });
      }
      req.authKind = 'directory';
      req.directoryAccount = account;
      req.directoryMember = account.member;
      return next();
    } catch (err) {
      if (err.message === 'not a directory token' || err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        clearDirectorySession(res);
        return res.status(401).json({ error: 'Your directory session has ended. Please sign in again.' });
      }
      throw err;
    }
  }
  // No directory cookie — fall back to a Hub session (staff/admin context).
  verifyToken(req, res, () => {
    if (res.headersSent) return;
    requireAppAccess('directory')(req, res, () => {
      if (res.headersSent) return;
      req.authKind = 'hub';
      next();
    });
  });
};

// Lightweight per-IP rate limiter for public auth endpoints (magic link,
// password login, verify). In-memory is sufficient for a single-instance app.
const buckets = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [key, hits] of buckets) {
    const fresh = hits.filter((t) => now - t < 15 * 60 * 1000);
    if (fresh.length === 0) buckets.delete(key); else buckets.set(key, fresh);
  }
}, 5 * 60 * 1000).unref();

export const rateLimit = ({ windowMs, max, message }) => (req, res, next) => {
  const key = `${req.ip}:${req.path}`;
  const now = Date.now();
  const hits = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  if (hits.length >= max) {
    return res.status(429).json({ error: message || 'Too many attempts. Please wait a few minutes and try again.' });
  }
  hits.push(now);
  buckets.set(key, hits);
  next();
};
