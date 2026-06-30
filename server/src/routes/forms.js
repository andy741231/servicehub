import { Router } from 'express';
import {
  listForms,
  getForm,
  createForm,
  updateForm,
  deleteForm,
  listSubmissions,
  createSubmission,
  uploadFile,
  upload,
  listVersions,
  restoreVersion,
} from '../controllers/forms.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

// Public routes (no auth required)
router.get('/public/:id', getForm);
router.post('/public/:id/submissions', createSubmission);
router.post('/upload', upload.single('file'), uploadFile);

// Admin routes (auth required)
router.get('/', verifyToken, listForms);
router.post('/', verifyToken, createForm);
router.get('/:id', verifyToken, getForm);
router.put('/:id', verifyToken, updateForm);
router.delete('/:id', verifyToken, deleteForm);
router.get('/:id/submissions', verifyToken, listSubmissions);
router.get('/:id/versions', verifyToken, listVersions);
router.post('/:id/versions/:versionId/restore', verifyToken, restoreVersion);

export default router;
