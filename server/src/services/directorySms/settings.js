// Typed, cached settings over DirectorySetting (JSON values keyed by string).
// The seed script owns writes; readers overlay stored values onto
// DEFAULT_SETTINGS. Help-topic content is the text extracted from the legacy
// HELP spreadsheet — it lives in server/scripts/lib/helpTopics.json so the
// seed script and this file share one source.

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const HELP_TOPICS = require(
  path.join(__dirname, '..', '..', '..', 'scripts', 'lib', 'helpTopics.json'));

const LOCKUP_URL =
  'https://www.churchinhouston.org/cihweb/wp-content/uploads/2022/08/Lockup-Procedures-and-Schedule.pdf';
const PAYMENTS_URL =
  'https://docs.google.com/spreadsheets/d/1s_ezlAqXoqeQuE35eUDTCJyrtciwirKYoqmtncUBmqQ/edit#gid=939698078';
const UNPAID_URL =
  'https://docs.google.com/spreadsheets/d/1Z9Lv9bcZsND4vCdRLOrEiS8T0FnYw95UpkV_4ZbExm8/edit#gid=1428010479';
const ANAHEIM_URL =
  'https://docs.google.com/spreadsheets/d/1s_ezlAqXoqeQuE35eUDTCJyrtciwirKYoqmtncUBmqQ/edit#gid=1653627291';
const VIDEO_URL =
  'https://docs.google.com/spreadsheets/d/1s_ezlAqXoqeQuE35eUDTCJyrtciwirKYoqmtncUBmqQ/edit#gid=342295052';

// wk_SingleWordCommands — the xxx* prefix is how the sheet disabled a keyword
// for saints (saint column is null); staff still get URLs.
export const DEFAULT_KEYWORDS = [
  { word: 'lockup', saint: LOCKUP_URL, helper: LOCKUP_URL, approver: LOCKUP_URL },
  { word: 'xxxpayments', saint: null, helper: PAYMENTS_URL, approver: PAYMENTS_URL },
  { word: 'xxxunpaid', saint: null, helper: UNPAID_URL, approver: UNPAID_URL },
  { word: 'xxxanaheim', saint: null, helper: ANAHEIM_URL, approver: ANAHEIM_URL },
  { word: 'xxxvideo', saint: null, helper: VIDEO_URL, approver: VIDEO_URL },
];

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
  'sms.keywords': DEFAULT_KEYWORDS,
  'sms.helpTopics': HELP_TOPICS,
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
