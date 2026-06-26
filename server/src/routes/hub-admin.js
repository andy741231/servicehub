import { Router } from 'express';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

// Placeholder endpoint for hub-admin portal
router.get('/portal', verifyToken, (req, res) => {
  res.json({ 
    message: 'Hub Admin Portal - Placeholder',
    status: 'active',
    timestamp: new Date().toISOString()
  });
});

export default router;
