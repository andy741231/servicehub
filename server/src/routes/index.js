import { Router } from 'express';
import authRoutes from './auth.js';
import usersRoutes from './users.js';
import webRoutes from './web.js';
import emailRoutes from './email.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/web', webRoutes);
router.use('/email', emailRoutes);

export default router;
