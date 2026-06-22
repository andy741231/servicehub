import { Router } from 'express';
import { listUsers, createUser, updateUser, deleteUser } from '../controllers/users.js';
import { verifyToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/permissions.js';

const router = Router();

// Only admins can manage users
router.use(verifyToken, requireRole('admin'));

router.get('/', listUsers);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

export default router;
