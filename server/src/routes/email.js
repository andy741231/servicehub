import { Router } from 'express';
import {
  getCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  sendCampaign,
  getMailingLists,
  createMailingList,
  updateMailingList,
  deleteMailingList,
  getRecipients,
  importRecipients,
  createRecipient,
  deleteRecipient,
  getCampaignAnalytics
} from '../controllers/email.js';

const router = Router();

// Campaign routes
router.get('/campaigns', getCampaigns);
router.get('/campaigns/:id', getCampaignById);
router.post('/campaigns', createCampaign);
router.put('/campaigns/:id', updateCampaign);
router.delete('/campaigns/:id', deleteCampaign);
router.post('/campaigns/:id/send', sendCampaign);
router.get('/campaigns/:id/analytics', getCampaignAnalytics);

// Mailing list routes
router.get('/lists', getMailingLists);
router.post('/lists', createMailingList);
router.put('/lists/:id', updateMailingList);
router.delete('/lists/:id', deleteMailingList);

// Recipient routes
router.get('/lists/:listId/recipients', getRecipients);
router.post('/lists/:listId/import', importRecipients);
router.post('/lists/:listId/recipients', createRecipient);
router.delete('/recipients/:id', deleteRecipient);

export default router;
