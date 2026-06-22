import { Router } from 'express';
import { login, register, logout, refresh, me } from '../controllers/auth.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

router.post('/login', login);
router.post('/register', register);
router.post('/logout', verifyToken, logout);
router.post('/refresh', refresh);
router.get('/me', verifyToken, me);

export default router;
