import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertApplyAllowed, BACKUP_FIELDS, dbName, parseArgs, UsageError,
} from '../scripts/contacts-sync.mjs';
// The module must be importable with no DATABASE_URL and no Google
// credentials — prisma is loaded dynamically inside main() only.

// ── parseArgs ───────────────────────────────────────────────────────────────

test('parseArgs defaults to a dry run; --backup/--apply/--force parse', () => {
  assert.deepEqual(parseArgs([]),
    { backup: false, apply: false, force: false });
  assert.deepEqual(parseArgs(['--backup', '--apply', '--force']),
    { backup: true, apply: true, force: true });
});

test('parseArgs: --apply without --backup refuses', () => {
  assert.throws(() => parseArgs(['--apply']), UsageError);
  assert.throws(() => parseArgs(['--apply']), /--apply requires --backup/);
});

test('parseArgs: --yes was removed — live applies always type the DB name', () => {
  assert.throws(() => parseArgs(['--yes']), /unknown flag: --yes/);
  assert.throws(() => parseArgs(['--apply', '--backup', '--yes']),
    /unknown flag: --yes/);
});

// ── dbName — SQL Server URLs carry ;database= segments ──────────────────────

test('dbName reads the semicolon database= segment of real Azure SQL URLs', () => {
  assert.equal(dbName({
    DATABASE_URL: 'sqlserver://stage-servicehub.database.windows.net;'
      + 'database=stage;user=hub-admin;authentication=azure/activeDirectory/servicePrincipal',
  }), 'stage');
  assert.equal(dbName({
    DATABASE_URL: 'sqlserver://prod.database.windows.net;'
      + 'database=production-servicehub;user=x;password=y;options={encrypt:true}',
  }), 'production-servicehub');
  // key is case-insensitive, value may sit first (no leading ;)
  assert.equal(dbName({ DATABASE_URL: 'database=stage;server=x' }), 'stage');
  assert.equal(dbName({ DATABASE_URL: 'x=1;DATABASE=PROD-SVC' }), 'PROD-SVC');
});

test('dbName: missing/empty/quoted/unset values → unknown', () => {
  assert.equal(dbName({}), 'unknown');
  assert.equal(dbName({ DATABASE_URL: '' }), 'unknown');
  assert.equal(dbName({ DATABASE_URL: 'sqlserver://x' }), 'unknown');
  assert.equal(dbName({ DATABASE_URL: 'sqlserver://x;database="stage"' }),
    'unknown'); // quoted values don't match — never guess
});

// ── assertApplyAllowed ──────────────────────────────────────────────────────

const PROD_ENV = {
  NODE_ENV: 'production',
  DIRECTORY_JOBS_ENABLED: 'true',
  DIRECTORY_JOBS_DRY_RUN: 'maintenance',
};

test('only the production database passes — stage/test/unknown/custom refused', () => {
  for (const db of ['stage', 'test-servicehub', 'unknown', '', 'dev',
    'stage-servicehub', 'custom-prod', 'production']) {
    assert.throws(
      () => assertApplyAllowed({ env: { ...PROD_ENV }, database: db }),
      /not 'production-servicehub'/);
  }
  // case-insensitive match on the real name
  assert.doesNotThrow(() => assertApplyAllowed({
    env: PROD_ENV, database: 'PRODUCTION-SERVICEHUB' }));
  assert.doesNotThrow(() => assertApplyAllowed({
    env: PROD_ENV, database: 'production-servicehub' }));
});

test('--apply requires NODE_ENV=production', () => {
  assert.throws(() => assertApplyAllowed({
    env: { ...PROD_ENV, NODE_ENV: 'development' },
    database: 'production-servicehub',
  }), /NODE_ENV=production/);
});

test('--apply requires DIRECTORY_JOBS_ENABLED=true', () => {
  for (const v of [undefined, 'false', '1']) {
    assert.throws(() => assertApplyAllowed({
      env: { ...PROD_ENV, DIRECTORY_JOBS_ENABLED: v },
      database: 'production-servicehub',
    }), /DIRECTORY_JOBS_ENABLED=true/);
  }
});

test('--apply refused while contacts-sync is in DIRECTORY_JOBS_DRY_RUN', () => {
  for (const list of ['contacts-sync', 'maintenance, contacts-sync', ' contacts-sync ']) {
    assert.throws(() => assertApplyAllowed({
      env: { ...PROD_ENV, DIRECTORY_JOBS_DRY_RUN: list },
      database: 'production-servicehub',
    }), /DIRECTORY_JOBS_DRY_RUN/);
  }
});

// ── BACKUP_FIELDS ───────────────────────────────────────────────────────────

test('BACKUP_FIELDS is a superset of the sync fields (restore aid)', () => {
  const fields = BACKUP_FIELDS.split(',');
  for (const f of [
    'names', 'emailAddresses', 'phoneNumbers', 'userDefined', 'memberships',
    'metadata', 'photos', 'addresses', 'organizations',
    'ageRanges', 'genders', 'calendarUrls', 'locations', 'clientData',
  ]) {
    assert.ok(fields.includes(f), `missing ${f}`);
  }
});
