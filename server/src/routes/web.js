import { Router } from 'express';
import multer from 'multer';
import { getPageBySlug, updatePage } from '../controllers/web.js';
import { listPages, createPage, updatePageMeta, deletePage, reorderPages } from '../controllers/webPages.js';
import { getSiteStyles, updateSiteStyles } from '../controllers/webStyles.js';
import { getDraftTemplates, updateDraftTemplates } from '../controllers/webDraftTemplates.js';
import { listWebTemplates, createWebTemplate, deleteWebTemplate, applyWebTemplate, listWebPageVersions, restoreWebPageVersion } from '../controllers/webTemplates.js';
import { listAssets, uploadAsset, deleteAsset } from '../controllers/webAssets.js';
import { verifyToken } from '../middleware/auth.js';
import { requireAppAccess } from '../middleware/permissions.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB for video backgrounds
  fileFilter: (req, file, cb) => {
    const allowed = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'video/mp4', 'video/webm', 'video/ogg',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    cb(null, allowed.includes(file.mimetype));
  },
});

const router = Router();
const protect = [verifyToken, requireAppAccess('web')];

// ── Named routes FIRST (must come before /:slug catch-all) ──

// Pages CRUD
router.get('/pages', ...protect, listPages);
router.post('/pages', ...protect, createPage);
router.patch('/pages/:id', ...protect, updatePageMeta);
router.delete('/pages/:id', ...protect, deletePage);
router.put('/pages/reorder', ...protect, reorderPages);

// Site styles
router.get('/styles', ...protect, getSiteStyles);
router.put('/styles', ...protect, updateSiteStyles);

// Draft page templates (GET is public so the 404/draft page can fetch it without auth)
router.get('/draft-templates', getDraftTemplates);
router.put('/draft-templates', ...protect, updateDraftTemplates);

// Reusable Web Builder page templates (intentionally separate from email/form templates)
router.get('/page-templates', ...protect, listWebTemplates);
router.post('/page-templates', ...protect, createWebTemplate);
router.delete('/page-templates/:id', ...protect, deleteWebTemplate);
router.post('/page-templates/:id/apply/:slug', ...protect, applyWebTemplate);

// Saved Web Builder page versions
router.get('/page/:slug/versions', ...protect, listWebPageVersions);
router.post('/page/:slug/versions/:versionId/restore', ...protect, restoreWebPageVersion);

// Assets
router.get('/assets', ...protect, listAssets);
router.post('/assets', ...protect, upload.single('file'), uploadAsset);
router.delete('/assets/:id', ...protect, deleteAsset);

// ── Admin page fetch (bypasses draft check) ──
router.get('/admin/:slug([a-z0-9-]+)', ...protect, getPageBySlug);

// ── Page-by-slug (catch-all — must be LAST) ──
router.get('/page/:slug', getPageBySlug);
router.put('/page/:slug', ...protect, updatePage);
router.get('/:slug([a-z0-9-]+)', getPageBySlug);
router.put('/:slug([a-z0-9-]+)', ...protect, updatePage);

export default router;
