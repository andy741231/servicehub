import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { getPageBySlug, updatePage } from '../controllers/web.js';
import { listPages, createPage, updatePageMeta, deletePage, reorderPages } from '../controllers/webPages.js';
import { getSiteStyles, updateSiteStyles } from '../controllers/webStyles.js';
import { getDraftTemplates, updateDraftTemplates } from '../controllers/webDraftTemplates.js';
import { listAssets, uploadAsset, deleteAsset } from '../controllers/webAssets.js';
import { verifyToken } from '../middleware/auth.js';
import { requireAppAccess } from '../middleware/permissions.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '../../../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
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
