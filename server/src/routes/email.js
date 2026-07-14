import { Router } from 'express';
import {
  getCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  sendCampaign,
  sendTestEmailController,
  getMailingLists,
  createMailingList,
  updateMailingList,
  deleteMailingList,
  getRecipients,
  importRecipients,
  createRecipient,
  deleteRecipient,
  getCampaignAnalytics,
  getEmailTemplates,
  getEmailTemplateById,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate
} from '../controllers/email.js';
import {
  receiveInboundEmail,
  getInboundEmails,
  getInboundEmailById,
  deleteInboundEmail,
} from '../controllers/inboundEmail.js';

const router = Router();

// Email template routes
router.get('/templates', getEmailTemplates);
router.get('/templates/:id', getEmailTemplateById);
router.post('/templates', createEmailTemplate);
router.put('/templates/:id', updateEmailTemplate);
router.delete('/templates/:id', deleteEmailTemplate);

// Campaign routes
router.get('/campaigns', getCampaigns);
router.get('/campaigns/:id', getCampaignById);
router.post('/campaigns', createCampaign);
router.put('/campaigns/:id', updateCampaign);
router.delete('/campaigns/:id', deleteCampaign);
router.post('/campaigns/:id/send', sendCampaign);
router.get('/campaigns/:id/analytics', getCampaignAnalytics);

// Test email
router.post('/test', sendTestEmailController);

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

// Inbound email routes
router.post('/inbound', receiveInboundEmail);
router.get('/inbound', getInboundEmails);
router.get('/inbound/:id', getInboundEmailById);
router.delete('/inbound/:id', deleteInboundEmail);

export default router;
