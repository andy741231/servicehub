import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS, getSettings, invalidateSettings }
  from '../src/services/directorySms/settings.js';

const stubPrisma = (rows) => {
  const p = { calls: 0 };
  p.directorySetting = { findMany: async () => { p.calls += 1; return rows; } };
  return p;
};

beforeEach(() => invalidateSettings());

test('defaults load when the table is empty', async () => {
  const prisma = stubPrisma([]);
  const s = await getSettings(prisma);
  assert.equal(s['sms.acceptInbound'], true);
  assert.equal(s['sms.testMode'], false);
  assert.deepEqual(s['sms.devPhones'], []);
  assert.equal(s['sms.maxResults'], 12);
  assert.equal(s['sms.logRetentionDays'], 180);
  assert.match(s['sms.messages.welcome'], /^Welcome to the secure, online phone list!/);
  assert.equal(s['sms.keywords'][0].word, 'lockup');
  assert.ok(s['sms.helpTopics'].saint.intro.length > 0);
  // the ###srv_offc### placeholder lives in the "helpers in your district" topic
  assert.ok(s['sms.helpTopics'].approver.topics.some((t) => t.text.includes('###srv_offc###')));
});

test('stored rows overlay the defaults', async () => {
  const prisma = stubPrisma([
    { key: 'sms.testMode', value: 'true' },
    { key: 'sms.maxResults', value: '5' },
    { key: 'sms.devPhones', value: '["+17135551234"]' },
    { key: 'sms.messages.notRecognized', value: '"custom msg"' },
  ]);
  const s = await getSettings(prisma);
  assert.equal(s['sms.testMode'], true);
  assert.equal(s['sms.maxResults'], 5);
  assert.deepEqual(s['sms.devPhones'], ['+17135551234']);
  assert.equal(s['sms.messages.notRecognized'], 'custom msg');
  // untouched keys keep defaults
  assert.equal(s['sms.acceptInbound'], true);
});

test('a row that fails to parse is skipped with a warning', async () => {
  const prisma = stubPrisma([{ key: 'sms.maxResults', value: '{not json' }]);
  const warnings = [];
  const orig = console.warn;
  console.warn = (msg) => warnings.push(msg);
  try {
    const s = await getSettings(prisma);
    assert.equal(s['sms.maxResults'], 12);
  } finally {
    console.warn = orig;
  }
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /sms\.maxResults/);
});

test('results are cached for 30s; invalidateSettings forces a reload', async () => {
  const prisma = stubPrisma([{ key: 'sms.testMode', value: 'true' }]);
  await getSettings(prisma);
  await getSettings(prisma);
  assert.equal(prisma.calls, 1); // second call served from cache
  invalidateSettings();
  await getSettings(prisma);
  assert.equal(prisma.calls, 2);
});
