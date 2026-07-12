import { EmailClient } from '@azure/communication-email';
import prisma from '../db/client.js';

const connectionString = process.env.AZURE_COMMUNICATION_CONNECTION_STRING;
const senderAddress = process.env.AZURE_COMMUNICATION_SENDER_EMAIL;

let client = null;

function getClient() {
  if (!connectionString) {
    throw new Error('AZURE_COMMUNICATION_CONNECTION_STRING is not set. Configure it in .env');
  }
  if (!client) {
    client = new EmailClient(connectionString);
  }
  return client;
}

function getSender() {
  if (!senderAddress) {
    throw new Error('AZURE_COMMUNICATION_SENDER_EMAIL is not set. Configure it in .env');
  }
  return senderAddress;
}

export async function sendTestEmail(to, subject, html) {
  const emailClient = getClient();
  const from = getSender();

  const message = {
    senderAddress: from,
    recipients: { to: [{ address: to }] },
    content: {
      subject: subject || 'ServiceHub Test Email',
      html: html || '<p>This is a test email from ServiceHub.</p>',
    },
  };

  const result = await emailClient.beginSend(message);
  return result;
}

export async function sendCampaignEmail(recipient, campaign) {
  const emailClient = getClient();
  const from = getSender();

  const personalizedHtml = campaign.bodyHtml
    .replace(/{{firstName}}/g, recipient.firstName || '')
    .replace(/{{lastName}}/g, recipient.lastName || '')
    .replace(/{{email}}/g, recipient.email || '');

  const message = {
    senderAddress: from,
    recipients: { to: [{ address: recipient.email }] },
    content: {
      subject: campaign.subject,
      html: personalizedHtml,
    },
  };

  const result = await emailClient.beginSend(message);
  return result;
}

export async function sendCampaignToMailingList(campaign, recipients) {
  let sent = 0;
  let bounced = 0;
  const logs = [];

  for (const recipient of recipients) {
    try {
      await sendCampaignEmail(recipient, campaign);
      sent++;
      logs.push({
        campaignId: campaign.id,
        recipient: recipient.email,
        status: 'sent',
      });
    } catch (err) {
      console.error(`Failed to send to ${recipient.email}:`, err.message);
      bounced++;
      logs.push({
        campaignId: campaign.id,
        recipient: recipient.email,
        status: 'bounced',
        metadata: JSON.stringify({ error: err.message }),
      });
    }
  }

  if (logs.length > 0) {
    await prisma.emailLog.createMany({ data: logs });
  }

  await prisma.campaignMetrics.update({
    where: { campaignId: campaign.id },
    data: {
      sent: { increment: sent },
      bounced: { increment: bounced },
    },
  });

  return { sent, bounced, total: recipients.length };
}
