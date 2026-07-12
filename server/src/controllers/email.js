import prisma from '../db/client.js';
import { sendTestEmail, sendCampaignToMailingList } from '../services/emailService.js';

// Campaign Controllers
export const getCampaigns = async (req, res) => {
  try {
    const campaigns = await prisma.emailCampaign.findMany({
      where: { deletedAt: null },
      include: {
        metrics: true,
        mailingList: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(campaigns);
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
};

export const getCampaignById = async (req, res) => {
  try {
    const { id } = req.params;
    const campaign = await prisma.emailCampaign.findUnique({
      where: { id },
      include: {
        metrics: true,
        mailingList: true,
        logs: {
          orderBy: { sentAt: 'desc' },
          take: 100
        }
      }
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    res.json(campaign);
  } catch (error) {
    console.error('Error fetching campaign:', error);
    res.status(500).json({ error: 'Failed to fetch campaign' });
  }
};

export const createCampaign = async (req, res) => {
  try {
    const { name, subject, bodyHtml, mailingListId, scheduledAt } = req.body;

    const campaign = await prisma.emailCampaign.create({
      data: {
        name,
        subject,
        bodyHtml,
        mailingListId,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        status: scheduledAt ? 'scheduled' : 'draft'
      },
      include: {
        mailingList: true
      }
    });

    // Initialize metrics
    await prisma.campaignMetrics.create({
      data: {
        campaignId: campaign.id
      }
    });

    res.status(201).json(campaign);
  } catch (error) {
    console.error('Error creating campaign:', error);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
};

export const updateCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, subject, bodyHtml, mailingListId, scheduledAt, status } = req.body;

    const campaign = await prisma.emailCampaign.update({
      where: { id },
      data: {
        name,
        subject,
        bodyHtml,
        mailingListId,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        status: status || 'draft'
      },
      include: {
        mailingList: true,
        metrics: true
      }
    });

    res.json(campaign);
  } catch (error) {
    console.error('Error updating campaign:', error);
    res.status(500).json({ error: 'Failed to update campaign' });
  }
};

export const deleteCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.emailCampaign.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    res.json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    res.status(500).json({ error: 'Failed to delete campaign' });
  }
};

export const sendCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = await prisma.emailCampaign.findUnique({
      where: { id },
      include: { mailingList: true }
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (!campaign.mailingListId) {
      return res.status(400).json({ error: 'Campaign has no mailing list assigned' });
    }

    const recipients = await prisma.recipient.findMany({
      where: { mailingListId: campaign.mailingListId, status: 'active' },
    });

    if (recipients.length === 0) {
      return res.status(400).json({ error: 'Mailing list has no active recipients' });
    }

    await prisma.emailCampaign.update({
      where: { id },
      data: { status: 'sending' },
    });

    const result = await sendCampaignToMailingList(campaign, recipients);

    const updated = await prisma.emailCampaign.update({
      where: { id },
      data: {
        status: 'sent',
        sentAt: new Date(),
      },
      include: { metrics: true, mailingList: true },
    });

    res.json({ ...updated, sendResult: result });
  } catch (error) {
    console.error('Error sending campaign:', error);
    await prisma.emailCampaign.update({
      where: { id: req.params.id },
      data: { status: 'draft' },
    }).catch(() => {});
    res.status(500).json({ error: 'Failed to send campaign: ' + error.message });
  }
};

// Test Email Controller
export const sendTestEmailController = async (req, res) => {
  try {
    const { to, subject, html } = req.body;

    if (!to) {
      return res.status(400).json({ error: 'Recipient email ("to") is required' });
    }

    await sendTestEmail(to, subject, html);
    res.json({ message: `Test email sent to ${to}` });
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({ error: 'Failed to send test email: ' + error.message });
  }
};

// Mailing List Controllers
export const getMailingLists = async (req, res) => {
  try {
    const lists = await prisma.mailingList.findMany({
      include: {
        _count: {
          select: { recipients: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const listWithCounts = lists.map(list => ({
      ...list,
      count: list._count.recipients
    }));

    res.json(listWithCounts);
  } catch (error) {
    console.error('Error fetching mailing lists:', error);
    res.status(500).json({ error: 'Failed to fetch mailing lists' });
  }
};

export const createMailingList = async (req, res) => {
  try {
    const { name, description } = req.body;

    const list = await prisma.mailingList.create({
      data: {
        name,
        description
      }
    });

    res.status(201).json(list);
  } catch (error) {
    console.error('Error creating mailing list:', error);
    res.status(500).json({ error: 'Failed to create mailing list' });
  }
};

export const updateMailingList = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const list = await prisma.mailingList.update({
      where: { id },
      data: {
        name,
        description
      }
    });

    res.json(list);
  } catch (error) {
    console.error('Error updating mailing list:', error);
    res.status(500).json({ error: 'Failed to update mailing list' });
  }
};

export const deleteMailingList = async (req, res) => {
  try {
    const { id } = req.params;

    // Delete all recipients in the list first
    await prisma.recipient.deleteMany({
      where: { mailingListId: id }
    });

    // Then delete the list
    await prisma.mailingList.delete({
      where: { id }
    });

    res.json({ message: 'Mailing list deleted successfully' });
  } catch (error) {
    console.error('Error deleting mailing list:', error);
    res.status(500).json({ error: 'Failed to delete mailing list' });
  }
};

// Recipient Controllers
export const getRecipients = async (req, res) => {
  try {
    const { listId } = req.params;

    const recipients = await prisma.recipient.findMany({
      where: { mailingListId: listId },
      orderBy: { createdAt: 'desc' }
    });

    res.json(recipients);
  } catch (error) {
    console.error('Error fetching recipients:', error);
    res.status(500).json({ error: 'Failed to fetch recipients' });
  }
};

export const importRecipients = async (req, res) => {
  try {
    const { listId } = req.params;
    const { recipients } = req.body; // Array of { email, firstName, lastName, customFields }

    const created = await prisma.recipient.createMany({
      data: recipients.map(r => ({
        ...r,
        mailingListId: listId,
        customFields: r.customFields ? JSON.stringify(r.customFields) : null
      })),
      skipDuplicates: true
    });

    res.status(201).json({ 
      message: `Successfully imported ${created.count} recipients`,
      count: created.count
    });
  } catch (error) {
    console.error('Error importing recipients:', error);
    res.status(500).json({ error: 'Failed to import recipients' });
  }
};

export const createRecipient = async (req, res) => {
  try {
    const { listId } = req.params;
    const { email, firstName, lastName, customFields } = req.body;

    const recipient = await prisma.recipient.create({
      data: {
        email,
        firstName,
        lastName,
        mailingListId: listId,
        customFields: customFields ? JSON.stringify(customFields) : null
      }
    });

    res.status(201).json(recipient);
  } catch (error) {
    console.error('Error creating recipient:', error);
    res.status(500).json({ error: 'Failed to create recipient' });
  }
};

export const deleteRecipient = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.recipient.delete({
      where: { id }
    });

    res.json({ message: 'Recipient deleted successfully' });
  } catch (error) {
    console.error('Error deleting recipient:', error);
    res.status(500).json({ error: 'Failed to delete recipient' });
  }
};

// Analytics Controllers
export const getCampaignAnalytics = async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = await prisma.emailCampaign.findUnique({
      where: { id },
      include: {
        metrics: true,
        logs: {
          orderBy: { sentAt: 'desc' }
        }
      }
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    res.json(campaign);
  } catch (error) {
    console.error('Error fetching campaign analytics:', error);
    res.status(500).json({ error: 'Failed to fetch campaign analytics' });
  }
};
