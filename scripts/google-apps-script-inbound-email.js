/**
 * Google Apps Script — Forward inbound emails to ServiceHub API
 *
 * Setup:
 * 1. Go to https://script.google.com and create a new project
 * 2. Paste this entire file
 * 3. Update the CONFIG values below
 * 4. Run `setupTrigger()` once to install the time-based trigger
 * 5. The script will check for new emails every 5 minutes and forward them
 */

const CONFIG = {
  // Your ServiceHub API endpoint for inbound emails
  WEBHOOK_URL: 'http://localhost:4000/api/email/inbound',
  // Must match INBOUND_EMAIL_WEBHOOK_SECRET in your .env
  WEBHOOK_SECRET: 'kx9f2m7p4q8w3z1a',

  // The Gmail label to watch (use '' for inbox, or a label name like 'ServiceHub')
  WATCH_LABEL: '',
  // Only process emails newer than this many hours
  HOURS_BACK: 1,
};

/**
 * Installs a time-based trigger that runs every 5 minutes.
 * Run this function once manually.
 */
function setupTrigger() {
  // Remove any existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => ScriptApp.deleteTrigger(t));

  ScriptApp.newTrigger('processNewEmails')
    .timeBased()
    .everyMinutes(5)
    .create();

  console.log('Trigger installed — will check for new emails every 5 minutes');
}

/**
 * Main function — fetches new emails and sends them to the API.
 */
function processNewEmails() {
  const threads = getNewThreads();

  if (threads.length === 0) {
    console.log('No new emails to process');
    return;
  }

  let processed = 0;
  let failed = 0;

  threads.forEach(thread => {
    const messages = thread.getMessages();

    messages.forEach(message => {
      try {
        const payload = extractEmailData(message);
        sendToApi(payload);
        processed++;
      } catch (e) {
        console.error('Failed to process message:', e);
        failed++;
      }
    });

    // Mark thread as read so it's not processed again
    thread.markRead();
  });

  console.log(`Processed: ${processed}, Failed: ${failed}`);
}

/**
 * Gets unread threads matching the watch label.
 */
function getNewThreads() {
  const afterDate = new Date(Date.now() - CONFIG.HOURS_BACK * 60 * 60 * 1000);
  const dateStr = Utilities.formatDate(afterDate, Session.getScriptTimeZone(), 'yyyy/MM/dd');

  let query = `is:unread after:${dateStr}`;

  if (CONFIG.WATCH_LABEL) {
    query = `label:${CONFIG.WATCH_LABEL} ${query}`;
  }

  return GmailApp.search(query, 0, 50);
}

/**
 * Extracts email data from a GmailMessage object.
 */
function extractEmailData(message) {
  const from = message.getFrom();
  const to = message.getTo();
  const subject = message.getSubject();
  const date = message.getDate();
  const bodyPlain = message.getPlainBody();
  const bodyHtml = message.getBody();
  const id = message.getId();

  // Parse "Name <email@example.com>" format
  let fromEmail = from;
  let fromName = null;
  const match = from.match(/^(.+?)\s*<(.+?)>$/);
  if (match) {
    fromName = match[1].trim().replace(/"/g, '');
    fromEmail = match[2].trim();
  }

  // Extract Message-ID header
  let messageId = null;
  try {
    const raw = message.getRawContent();
    const midMatch = raw.match(/^Message-ID:\s*<(.+?)>/im);
    if (midMatch) messageId = midMatch[1];
  } catch (e) {
    // Ignore — not critical
  }

  // Get labels
  const labels = [];
  try {
    const thread = message.getThread();
    thread.getLabels().forEach(label => labels.push(label.getName()));
  } catch (e) {
    // Ignore
  }

  return {
    messageId,
    fromEmail,
    fromName,
    toEmail: to.split(',')[0].trim(),
    subject,
    bodyText: bodyPlain,
    bodyHtml,
    labels,
    receivedAt: date.toISOString(),
  };
}

/**
 * Sends the email payload to the ServiceHub API.
 */
function sendToApi(payload) {
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'x-webhook-secret': CONFIG.WEBHOOK_SECRET,
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };

  const response = UrlFetchApp.fetch(CONFIG.WEBHOOK_URL, options);
  const code = response.getResponseCode();

  if (code >= 200 && code < 300) {
    console.log(`OK — stored email from ${payload.fromEmail}: ${payload.subject}`);
  } else {
    console.error(`API returned ${code}: ${response.getContentText()}`);
    throw new Error(`API returned ${code}`);
  }
}
