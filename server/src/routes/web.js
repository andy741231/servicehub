import { Router } from 'express';
import { getPageBySlug, updatePage } from '../controllers/web.js';
import { verifyToken } from '../middleware/auth.js';
import { requireAppAccess } from '../middleware/permissions.js';

const router = Router();

// Public route to fetch page data
router.get('/:slug', getPageBySlug);

// Protected route to update page data (requires token and 'web' app permission)
router.put('/:slug', verifyToken, requireAppAccess('web'), updatePage);

export default router;
