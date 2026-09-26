// §7.5 verification — re-derives expected state from a saints CSV with the
// same analyzeSheet() the importer uses, then diffs it against the DB.
//
//   node server/scripts/verify-phonelist-import.mjs <saints.csv>
//
// Run after each --apply (stage rehearsal and the T0 prod apply).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  analyzeSheet, batchIdForAsOf, memberEquals,
} from './lib/phonelistTransform.mjs';
import { parsePhonelistCsv } from './import-phonelist.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..', '..');

if (!process.env.DATABASE_URL) {
  try { process.loadEnvFile(path.join(REPO_ROOT, '.env')); } catch { /* older Node */ }
}

const csvPath = process.argv[2];
if (!csvPath || !fs.existsSync(csvPath)) {
  console.error('usage: node server/scripts/verify-phonelist-import.mjs <saints.csv>');
  process.exit(2);
}

const { default: prisma } = await import('../src/db/client.js');

const asOf = fs.statSync(csvPath).mtime;
const batchId = batchIdForAsOf(asOf);
const { headers, records } = await parsePhonelistCsv(fs.createReadStream(csvPath));
const analysis = analyzeSheet({ headers, records }, { asOf, tz: 'America/Chicago', batchId });

let pass = 0, fail = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
  if (ok) pass++; else fail++;
};

// 1. status × district matrix matches the sheet (this batch's rows only)
const expected = {};
for (const r of analysis.rows) {
  const k = `${r.data.district}|${r.data.status}`;
  expected[k] = (expected[k] ?? 0) + 1;
}
const actual = {};
for (const row of await prisma.directoryMember.groupBy({
  by: ['district', 'status'],
  where: { importBatchId: batchId },
  _count: true,
})) {
  actual[`${row.district}|${row.status}`] = (actual[`${row.district}|${row.status}`] ?? 0) + row._count;
}
const mismatches = [];
for (const [k, n] of Object.entries(expected)) {
  if (actual[k] !== n) mismatches.push(`${k}: sheet ${n} vs db ${actual[k] ?? 0}`);
}
check('status x district counts', mismatches.length === 0, mismatches.slice(0, 5).join('; '));

// 2. spouse links are mutual and match the expected linked rows
const linked = await prisma.directoryMember.findMany({
  where: { importBatchId: batchId, spouseMemberId: { not: null } },
  select: { id: true, legacyId: true, spouseMemberId: true },
});
const idToRow = new Map(linked.map((m) => [m.id, m]));
let mutual = 0, broken = 0;
for (const m of linked) {
  const partner = idToRow.get(m.spouseMemberId);
  if (partner?.spouseMemberId === m.id) mutual++; else broken++;
}
const expectedLinked = analysis.rows.filter((r) => r.partnerLegacyId).length;
check('spouse links mutual', mutual === expectedLinked && broken === 0,
  `${mutual} linked rows (${broken} broken), expected ${expectedLinked}`);

// 3. 25 random records, field-by-field via memberEquals
const pool = [...analysis.rows];
for (let i = pool.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [pool[i], pool[j]] = [pool[j], pool[i]];
}
const sample = pool.slice(0, 25);
const partnerIds = [...new Set(sample.map((r) => r.partnerLegacyId).filter(Boolean))];
const partnerRows = partnerIds.length
  ? await prisma.directoryMember.findMany({
    where: { legacyId: { in: partnerIds } }, select: { id: true, legacyId: true },
  }) : [];
const partnerDbId = new Map(partnerRows.map((m) => [m.legacyId, m.id]));
const dbRows = await prisma.directoryMember.findMany({
  where: { legacyId: { in: sample.map((r) => r.legacyId) } },
});
const dbByLegacy = new Map(dbRows.map((m) => [m.legacyId, m]));
const diffs = [];
for (const r of sample) {
  const db = dbByLegacy.get(r.legacyId);
  if (!db) { diffs.push(`${r.legacyId}: missing from db`); continue; }
  const spouseId = r.partnerLegacyId ? partnerDbId.get(r.partnerLegacyId) ?? null : null;
  if (!memberEquals(db, r.data, spouseId, { includeLinks: true })) {
    const fields = Object.keys(r.data).filter((f) => {
      if (f === 'spouseMemberId') return (db.spouseMemberId ?? null) !== spouseId;
      const a = db[f] instanceof Date ? db[f].toISOString() : db[f];
      const b = r.data[f] instanceof Date ? r.data[f].toISOString() : r.data[f];
      return a !== b;
    });
    diffs.push(`${r.legacyId}: ${fields.join(',')}`);
  }
}
check('25-record field diff', diffs.length === 0, diffs.slice(0, 6).join('; '));

// 4. every active member with a usable cell resolves by phone1
const missing = await prisma.directoryMember.count({
  where: { importBatchId: batchId, status: 'active', phone1: null },
});
const expectedMissing = analysis.rows.filter((r) => r.data.status === 'active' && !r.data.phone1).length;
check('active without cell', missing === expectedMissing, `db ${missing} vs expected ${expectedMissing}`);

// 5. auxiliary counts
const [members, audits, sms, optedOut, welcomed, married] = await Promise.all([
  prisma.directoryMember.count({ where: { importBatchId: batchId } }),
  prisma.directoryAuditLog.count({ where: { actorId: `import:${batchId}`, changeType: 'imported' } }),
  prisma.directorySmsPhone.count({ where: { phone: { in: [...analysis.smsPhones.keys()] } } }),
  prisma.directorySmsPhone.count({ where: { phone: { in: [...analysis.smsPhones.keys()] }, optedOutAt: { not: null } } }),
  prisma.directorySmsPhone.count({ where: { phone: { in: [...analysis.smsPhones.keys()] }, welcomedAt: { not: null } } }),
  prisma.directoryMember.count({ where: { importBatchId: batchId, maritalStatus: 'married' } }),
]);
check('members imported', members === analysis.rows.length, `${members} vs ${analysis.rows.length}`);
check('audit rows', audits === analysis.rows.length, `${audits} vs ${analysis.rows.length}`);
check('sms phones seeded', sms === analysis.smsPhones.size, `${sms} vs ${analysis.smsPhones.size}`);
check('opted out', optedOut === 2, `${optedOut}`);
check('welcomed', welcomed === 361, `${welcomed}`);
check('married', married === analysis.stats.households.married, `${married} vs ${analysis.stats.households.married}`);

console.log(`\n${pass} pass, ${fail} fail`);
await prisma.$disconnect();
process.exit(fail ? 1 : 0);
