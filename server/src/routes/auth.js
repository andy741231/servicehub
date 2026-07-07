import { Router } from 'express';
import { login, logout, refresh, me, updatePreferences, updateProfile } from '../controllers/auth.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

router.post('/login', login);
router.post('/logout', verifyToken, logout);
router.post('/refresh', refresh);
router.get('/me', verifyToken, me);
router.put('/profile', verifyToken, updateProfile);
router.put('/preferences', verifyToken, updatePreferences);

export default router;
