import { Router } from 'express';
import authRoutes from './auth.js';
import usersRoutes from './users.js';
import webRoutes from './web.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/web', webRoutes);

export default router;
