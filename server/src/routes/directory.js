import express, { Router } from 'express';
import {
  getMeta,
  getStats,
  listMembers,
  getMember,
  createMember,
  updateMember,
  updateMemberStatus,
  updateMemberRole,
  deleteMember,
  getMe,
  updateMe,
  updateHouseholdMember,
  checkDuplicates,
  photoUpload,
  uploadPhoto,
  getMemberHistory,
} from '../controllers/directory.js';
import {
  requestMagicLink,
  verifyMagicLink,
  directoryLogin,
  getDirectoryMe,
  directoryLogout,
  setDirectoryPassword,
  listHelpers,
} from '../controllers/directoryAuth.js';
import { receiveTwilioSms, simulateSms } from '../controllers/directorySms.js';
import { listJobs, runJob } from '../controllers/directoryJobs.js';
import { verifyDirectoryAccess, rateLimit } from '../middleware/directoryAuth.js';
import { requireRole } from '../middleware/permissions.js';

const router = Router();
const protect = [verifyDirectoryAccess];
// Directory session only (helpers/saints) — Hub sessions get null here.
const directoryOnly = (req, res, next) =>
  req.authKind === 'directory'
    ? next()
    : res.status(403).json({ error: 'Requires a directory sign-in' });
// Hub session + admin role — the SMS simulate endpoint is staff tooling for
// replaying golden replies (§9/S13), not something saints should reach.
export const hubAdminOnly = (req, res, next) =>
  req.authKind === 'hub'
    ? requireRole('admin')(req, res, next)
    : res.status(403).json({ error: 'Requires a Hub admin session' });

// ── Saint-facing auth (public — rate-limited) ──
router.post('/auth/request-link', rateLimit({ windowMs: 5 * 60 * 1000, max: 10 }), requestMagicLink);
router.post('/auth/verify', rateLimit({ windowMs: 5 * 60 * 1000, max: 20 }), verifyMagicLink);
router.post('/auth/login', rateLimit({ windowMs: 5 * 60 * 1000, max: 10 }), directoryLogin);
router.get('/auth/helpers', listHelpers);

// ── SMS (public webhook + Hub-admin simulate) ─────────────────────────────
// Twilio posts application/x-www-form-urlencoded; index.js only mounts
// express.json() globally, so the form parser is attached to this route.
// The Twilio signature check happens inside the controller.
router.post('/sms', express.urlencoded({ extended: false }), receiveTwilioSms);
router.post('/sms/simulate', ...protect, hubAdminOnly, simulateSms);

// Directory session lifecycle (directory cookie only)
router.get('/auth/me', verifyDirectoryAccess, directoryOnly, getDirectoryMe);
router.post('/auth/logout', directoryLogout);
router.post('/auth/password', verifyDirectoryAccess, directoryOnly, setDirectoryPassword);

// Metadata + dashboard (either session kind)
router.get('/meta', ...protect, getMeta);
router.get('/stats', ...protect, getStats);

// Self-service (saint's own record) — must be before /members/:id
router.get('/me', ...protect, getMe);
router.put('/me', ...protect, updateMe);
router.put('/me/household/:memberId', ...protect, updateHouseholdMember);

// Background jobs (§6.4) — Hub admin only
router.get('/jobs', ...protect, hubAdminOnly, listJobs);
router.post('/jobs/:name/run', ...protect, hubAdminOnly, runJob);

// Pre-add duplicate check (church-wide)
router.get('/check-duplicates', ...protect, checkDuplicates);

// Members CRUD + lifecycle
router.get('/members', ...protect, listMembers);
router.post('/members', ...protect, createMember);
router.get('/members/:id', ...protect, getMember);
router.put('/members/:id', ...protect, updateMember);
router.patch('/members/:id/status', ...protect, updateMemberStatus);
router.patch('/members/:id/role', ...protect, updateMemberRole);
router.delete('/members/:id', ...protect, deleteMember);
router.post('/members/:id/photo', ...protect, photoUpload.single('file'), uploadPhoto);
router.get('/members/:id/history', ...protect, getMemberHistory);

export default router;
