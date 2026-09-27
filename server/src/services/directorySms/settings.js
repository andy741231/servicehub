// Typed, cached settings over DirectorySetting (JSON values keyed by string).
// The seed script owns writes; readers overlay stored values onto
// DEFAULT_SETTINGS. Real help-topic content comes from the legacy HELP
// spreadsheet — the placeholders below stand in until that seed lands.

const LOCKUP_URL =
  'https://www.churchinhouston.org/cihweb/wp-content/uploads/2022/08/Lockup-Procedures-and-Schedule.pdf';

const helpPlaceholder = (text) => ({
  intro: 'GET HELP — reply with a number:\n1 Who are the helpers in my district?',
  topics: [{ n: '1', text }],
});

export const DEFAULT_SETTINGS = {
  'sms.acceptInbound': true,
  'sms.testMode': false,
  'sms.devPhones': [],
  'sms.maxResults': 12,
  'sms.logRetentionDays': 180,
  'sms.messages.welcome':
    'Welcome to the secure, online phone list!\n\n' +
    '     FOR HELP\n' +
    '-  TEXT    get help\n\n' +
    '     TO PRACTICE\n' +
    '-  TEXT    your first name\n' +
    '-  TEXT    LAST your last name\n' +
    '-  TEXT    me\n' +
    '----------------------------\n\n',
  'sms.messages.helpStopTrailer':
    'Text GET HELP for info, or text STOP to unsubscribe',
  'sms.messages.tempUnavailable': 'System is in test for a few minutes.',
  'sms.messages.notRecognized':
    'Your phone number not recognized. To be added to the phone list, ' +
    'contact a helper in your district.',
  'sms.keywords': [
    { word: 'lockup', saint: LOCKUP_URL, helper: LOCKUP_URL, approver: LOCKUP_URL },
  ],
  'sms.helpTopics': {
    saint: helpPlaceholder('Helpers for your district:\n###srv_offc###'),
    helper: helpPlaceholder('Helpers for your district:\n###srv_offc###'),
    approver: helpPlaceholder('Helpers for your district:\n###srv_offc###'),
  },
};

const CACHE_TTL_MS = 30 * 1000;
let cache = null;
let cacheAt = 0;

// Loads every DirectorySetting row, JSON-parses each value, and overlays it
// onto the defaults by key. Unparseable rows are skipped (default wins).
// Cached in memory for 30s; call invalidateSettings() after a write.
export async function getSettings(prisma) {
  const now = Date.now();
  if (cache && now - cacheAt < CACHE_TTL_MS) return cache;

  const merged = { ...DEFAULT_SETTINGS };
  const rows = await prisma.directorySetting.findMany();
  for (const row of rows) {
    try {
      merged[row.key] = JSON.parse(row.value);
    } catch {
      console.warn(`[directorySms] setting '${row.key}' has invalid JSON — using default`);
    }
  }
  cache = merged;
  cacheAt = now;
  return cache;
}

export function invalidateSettings() {
  cache = null;
  cacheAt = 0;
}
