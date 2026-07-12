import prisma from '../db/client.js';

// POST /api/email/inbound — webhook called by Google Apps Script
export const receiveInboundEmail = async (req, res) => {
  try {
    const { messageId, fromEmail, fromName, toEmail, subject, bodyText, bodyHtml, labels, receivedAt } = req.body;

    // Validate required fields
    if (!fromEmail || !toEmail || !subject) {
      return res.status(400).json({ error: 'fromEmail, toEmail, and subject are required' });
    }

    // Check webhook secret
    const secret = req.headers['x-webhook-secret'];
    if (!secret || secret !== process.env.INBOUND_EMAIL_WEBHOOK_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Deduplicate by messageId if provided
    if (messageId) {
      const existing = await prisma.inboundEmail.findFirst({
        where: { messageId },
      });
      if (existing) {
        return res.json({ message: 'Duplicate email, already stored', id: existing.id });
      }
    }

    const email = await prisma.inboundEmail.create({
      data: {
        messageId: messageId || null,
        fromEmail,
        fromName: fromName || null,
        toEmail,
        subject,
        bodyText: bodyText || null,
        bodyHtml: bodyHtml || null,
        labels: labels ? JSON.stringify(labels) : null,
        receivedAt: receivedAt ? new Date(receivedAt) : new Date(),
      },
    });

    res.status(201).json({ message: 'Email stored', id: email.id });
  } catch (error) {
    console.error('Error receiving inbound email:', error);
    res.status(500).json({ error: 'Failed to store inbound email: ' + error.message });
  }
};

// GET /api/email/inbound — list inbound emails (requires auth via parent route)
export const getInboundEmails = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [emails, total] = await Promise.all([
      prisma.inboundEmail.findMany({
        orderBy: { receivedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.inboundEmail.count(),
    ]);

    const emailsWithParsedLabels = emails.map((e) => ({
      ...e,
      labels: e.labels ? JSON.parse(e.labels) : [],
    }));

    res.json({
      emails: emailsWithParsedLabels,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Error fetching inbound emails:', error);
    res.status(500).json({ error: 'Failed to fetch inbound emails' });
  }
};

// GET /api/email/inbound/:id — get single inbound email
export const getInboundEmailById = async (req, res) => {
  try {
    const { id } = req.params;

    const email = await prisma.inboundEmail.findUnique({ where: { id } });

    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }

    res.json({
      ...email,
      labels: email.labels ? JSON.parse(email.labels) : [],
    });
  } catch (error) {
    console.error('Error fetching inbound email:', error);
    res.status(500).json({ error: 'Failed to fetch inbound email' });
  }
};

// DELETE /api/email/inbound/:id — delete inbound email
export const deleteInboundEmail = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.inboundEmail.delete({ where: { id } });

    res.json({ message: 'Email deleted successfully' });
  } catch (error) {
    console.error('Error deleting inbound email:', error);
    res.status(500).json({ error: 'Failed to delete inbound email' });
  }
};
