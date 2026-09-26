// Import the phonelist "saints" sheet export into the Directory tables.
//
//   node server/scripts/import-phonelist.mjs <saints.csv> [--apply] [--yes]
//       [--as-of <ISO8601>] [--tz <IANA>] [--offline]
//   node server/scripts/import-phonelist.mjs --purge-batch <batchId>
//
// Default mode is a dry run: prints an aggregate report and writes it plus a
// per-row warnings CSV to <repo>/scratch/. --apply writes to the database
// after a typed confirmation (the database name). --purge-batch removes a
// prior import batch (dev/test only; always prompts). The sheet's "Last
// change" wall-clock values are read in --tz (default America/Chicago);
// --as-of defaults to the CSV file's mtime. If DATABASE_URL is not in the
// environment, the repo-root .env is loaded.

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import csv from 'csv-parser';
import {
  analyzeSheet, batchIdForAsOf, buildDbPlan, formatReport, formatWarningsCsv,
  memberEquals, normalizeHeader, purgeRefusal, writeData,
} from './lib/phonelistTransform.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..', '..');
const SCRATCH_DIR = path.join(REPO_ROOT, 'scratch');
const TX_OPTS = { timeout: 120000, maxWait: 30000 };
const CHUNK = 500;

export class UsageError extends Error {}

const USAGE = `Usage:
  node server/scripts/import-phonelist.mjs <saints.csv> [--apply] [--yes]
      [--as-of <ISO8601>] [--tz <IANA>] [--offline]
  node server/scripts/import-phonelist.mjs --purge-batch <batchId>`;

export function parseArgs(argv) {
  const args = { csvPath: null, apply: false, yes: false, offline: false, asOf: null, tz: 'America/Chicago', purgeBatch: null };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--apply') args.apply = true;
    else if (a === '--yes') args.yes = true;
    else if (a === '--offline') args.offline = true;
    else if (a === '--as-of') {
      if (++i >= argv.length) throw new UsageError('--as-of needs a value');
      args.asOf = new Date(argv[i]);
      if (Number.isNaN(args.asOf.getTime())) throw new UsageError(`bad --as-of: ${argv[i]}`);
    } else if (a === '--tz') {
      if (++i >= argv.length) throw new UsageError('--tz needs a value');
      args.tz = argv[i];
      try { new Intl.DateTimeFormat('en-US', { timeZone: args.tz }); }
      catch { throw new UsageError(`bad --tz: ${args.tz}`); }
    } else if (a === '--purge-batch') {
      if (++i >= argv.length) throw new UsageError('--purge-batch needs a value');
      args.purgeBatch = argv[i];
    } else if (a.startsWith('--')) {
      throw new UsageError(`unknown flag: ${a}`);
    } else {
      positional.push(a);
    }
  }
  if (args.purgeBatch !== null) {
    if (args.apply) throw new UsageError('--purge-batch cannot be combined with --apply');
    if (positional.length) throw new UsageError('--purge-batch takes no CSV argument');
    if (args.offline) throw new UsageError('--purge-batch cannot run --offline');
  } else {
    if (positional.length !== 1) throw new UsageError('expected exactly one CSV path');
    args.csvPath = positional[0];
  }
  if (args.apply && args.offline) {
    throw new UsageError('--apply needs the database — cannot run with --offline');
  }
  return args;
}

// ── CSV parsing (the e2e test drives analysis through this same path) ───────

export function parsePhonelistCsv(stream) {
  return new Promise((resolve, reject) => {
    const records = [];
    let headers = [];
    stream
      .pipe(csv({ mapHeaders: ({ header }) => normalizeHeader(header) }))
      .on('headers', (h) => { headers = h.map((x) => (x === null ? null : normalizeHeader(x))); })
      .on('data', (r) => records.push(r))
      .on('error', reject)
      .on('end', () => resolve({ headers, records }));
  });
}

// ── DB helpers ──────────────────────────────────────────────────────────────

async function getPrisma() {
  const { default: prisma } = await import('../src/db/client.js');
  return prisma;
}

function dbName() {
  const m = String(process.env.DATABASE_URL ?? '').match(/database=([^;"']+)/i);
  return m ? m[1] : 'unknown';
}

async function chunked(values, fn, size = CHUNK) {
  const out = [];
  for (let i = 0; i < values.length; i += size) {
    out.push(...await fn(values.slice(i, i + size)));
  }
  return out;
}

async function promptLine(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    return await rl.question(question);
  } finally {
    rl.close();
  }
}

async function fetchPlanInputs(prisma, analysis) {
  const legacyIds = analysis.rows.map((r) => r.legacyId);
  const members = await chunked(legacyIds, (c) =>
    prisma.directoryMember.findMany({ where: { legacyId: { in: c } } }));
  const memberIds = members.map((m) => m.id);
  const accounts = await chunked(memberIds, (c) =>
    prisma.directoryAccount.findMany({ where: { memberId: { in: c } }, select: { memberId: true, email: true } }));
  const legacyRows = await prisma.directoryMember.findMany({
    where: { legacyId: { not: null } }, select: { legacyId: true, importBatchId: true },
  });
  const nullLegacyRows = await prisma.directoryMember.findMany({
    where: { legacyId: null }, select: { source: true, importBatchId: true },
  });
  const existingByLegacy = new Map(members.map((m) => [m.legacyId, m]));
  const linkedDbIds = analysis.rows
    .filter((r) => r.partnerLegacyId)
    .map((r) => existingByLegacy.get(r.legacyId)?.id)
    .filter(Boolean);
  const spousePointers = await chunked(linkedDbIds, (c) =>
    prisma.directoryMember.findMany({
      where: { spouseMemberId: { in: c } },
      select: { id: true, legacyId: true, spouseMemberId: true },
    }));
  const phones = [...analysis.smsPhones.keys()];
  const smsPhones = await chunked(phones, (c) =>
    prisma.directorySmsPhone.findMany({ where: { phone: { in: c } } }));
  return { members, accounts, legacyRows, nullLegacyRows, spousePointers, smsPhones };
}

// ── Apply ───────────────────────────────────────────────────────────────────

async function applyImport(prisma, analysis, plan) {
  const counts = {
    created: 0, updated: 0, unchanged: 0,
    linksSet: 0, linksCleared: 0, conflicts: plan.conflictPairs.length,
    auditRows: 0, smsCreated: 0, smsFilled: 0,
  };
  const batchId = analysis.batchId;
  const idByLegacy = new Map([...plan.existingByLegacy.entries()].map(([k, m]) => [k, m.id]));

  // Pass 1 — create/update member rows (never link fields or create-only
  // defaults on update). Rows that only differ in link fields wait for pass 2.
  const linkOnlyChanged = new Set();
  const ops = [];
  for (const row of analysis.rows) {
    const ex = plan.existingByLegacy.get(row.legacyId);
    if (!ex) {
      ops.push({ kind: 'create', row });
    } else if (memberEquals(ex, row.data, null, { includeLinks: false })) {
      // Unchanged on non-link fields; link status decided in pass 2.
      linkOnlyChanged.add(row.legacyId);
    } else {
      ops.push({ kind: 'update', row, id: ex.id });
    }
  }
  for (let i = 0; i < ops.length; i += 100) {
    const chunk = ops.slice(i, i + 100);
    await prisma.$transaction(async (tx) => {
      for (const op of chunk) {
        if (op.kind === 'create') {
          const m = await tx.directoryMember.create({ data: writeData(op.row.data, { forCreate: true }) });
          idByLegacy.set(op.row.legacyId, m.id);
          counts.created++;
        } else {
          await tx.directoryMember.update({
            where: { id: op.id }, data: writeData(op.row.data, { forCreate: false }),
          });
          counts.updated++;
        }
      }
    }, TX_OPTS);
  }

  // Pass 2 — spouse links. Desired state resolves against real ids now that
  // every member exists. Conflicted pairs (a non-imported member already
  // points at one side) keep their current values.
  const idOf = (legacyId) => idByLegacy.get(legacyId) ?? null;
  const desiredFor = (row) => {
    const op = plan.linkOps.get(row.legacyId);
    if (!op || op.skip) {
      const ex = plan.existingByLegacy.get(row.legacyId);
      return { spouse: ex?.spouseMemberId ?? null, couple: ex?.coupleId ?? null };
    }
    return {
      spouse: row.partnerLegacyId ? idOf(row.partnerLegacyId) : null,
      couple: row.data.coupleId,
    };
  };
  const currentOf = (row) => {
    if (!plan.existingByLegacy.has(row.legacyId)) return { spouse: null, couple: null };
    const ex = plan.existingByLegacy.get(row.legacyId);
    return { spouse: ex.spouseMemberId ?? null, couple: ex.coupleId ?? null };
  };
  const touched = (row) => {
    const d = desiredFor(row);
    const c = currentOf(row);
    return d.spouse !== c.spouse || d.couple !== c.couple;
  };

  // Phase A: null both link fields where the current link state is stale.
  const clears = analysis.rows.filter((row) => {
    if (!plan.existingByLegacy.has(row.legacyId)) return false; // new rows are already null
    if (!touched(row)) return false;
    const c = currentOf(row);
    return c.spouse !== null || c.couple !== null;
  });
  // Phase B: write the desired spouseMemberId + coupleId.
  const sets = analysis.rows.filter((row) => {
    const d = desiredFor(row);
    return (d.spouse !== null || d.couple !== null) && touched(row);
  });

  const runLinkOps = async (list, dataFn) => {
    for (let i = 0; i < list.length; i += 100) {
      const chunk = list.slice(i, i + 100);
      await prisma.$transaction(async (tx) => {
        for (const row of chunk) {
          await tx.directoryMember.update({ where: { id: idOf(row.legacyId) }, data: dataFn(row) });
        }
      }, TX_OPTS);
    }
  };
  await runLinkOps(clears, () => ({ spouseMemberId: null, coupleId: null }));
  await runLinkOps(sets, (row) => {
    const d = desiredFor(row);
    return { spouseMemberId: d.spouse, coupleId: d.couple };
  });
  counts.linksCleared = clears.length;
  counts.linksSet = sets.length;

  // Members that pass-1 skipped but whose links moved count as updated.
  for (const row of [...clears, ...sets]) {
    if (linkOnlyChanged.delete(row.legacyId)) counts.updated++;
  }
  // Unchanged = pre-existing members whose every sheet-mapped field (incl.
  // link fields) already matched the sheet.
  let finalUnchanged = 0;
  for (const row of analysis.rows) {
    const ex = plan.existingByLegacy.get(row.legacyId);
    if (!ex) continue;
    const d = desiredFor(row);
    if (memberEquals(ex, row.data, d.spouse, { includeLinks: true })
      && (ex.coupleId ?? null) === d.couple) {
      finalUnchanged++;
    }
  }
  counts.unchanged = finalUnchanged;

  // Audit rows — one per member per batch, skipped if already present.
  const memberIds = analysis.rows.map((r) => idOf(r.legacyId)).filter(Boolean);
  const existingAudits = await chunked(memberIds, (c) =>
    prisma.directoryAuditLog.findMany({
      where: { memberId: { in: c }, actorId: `import:${batchId}`, changeType: 'imported' },
      select: { memberId: true },
    }));
  const hasAudit = new Set(existingAudits.map((a) => a.memberId));
  const auditData = analysis.rows
    .map((row) => ({ row, memberId: idOf(row.legacyId) }))
    .filter((a) => a.memberId && !hasAudit.has(a.memberId))
    .map(({ row, memberId }) => ({
      memberId,
      actorId: `import:${batchId}`,
      actorName: 'Phonelist import',
      changeType: 'imported',
      summary: `Imported from the phonelist sheet (batch ${batchId}). Legacy history: ${row.meta.historyRaw || '(none)'}`,
    }));
  for (let i = 0; i < auditData.length; i += 300) {
    const res = await prisma.directoryAuditLog.createMany({ data: auditData.slice(i, i + 300) });
    counts.auditRows += res.count;
  }

  // SMS phones — create missing; fill only currently-null fields. The create
  // and fill payloads are already computed in plan.sms by buildDbPlan.
  for (let i = 0; i < plan.sms.create.length; i += 300) {
    const res = await prisma.directorySmsPhone.createMany({ data: plan.sms.create.slice(i, i + 300) });
    counts.smsCreated += res.count;
  }
  for (let i = 0; i < plan.sms.fill.length; i += 100) {
    const chunk = plan.sms.fill.slice(i, i + 100);
    await prisma.$transaction(async (tx) => {
      for (const f of chunk) {
        await tx.directorySmsPhone.update({ where: { phone: f.phone }, data: f.data });
      }
    }, TX_OPTS);
  }
  counts.smsFilled = plan.sms.fill.length;
  return counts;
}

// ── Purge ───────────────────────────────────────────────────────────────────

async function purgeBatch(prisma, batchId, name) {
  const refusal = purgeRefusal(name);
  if (refusal) {
    console.error(refusal);
    process.exitCode = 1;
    return;
  }
  const count = await prisma.directoryMember.count({ where: { importBatchId: batchId } });
  console.log(`Database "${name}" — ${count} member(s) with importBatchId "${batchId}".`);
  const answer = await promptLine('Type the batch id to confirm: ');
  if (answer.trim() !== batchId) {
    console.log('Confirmation did not match — aborted, no writes.');
    process.exitCode = 1;
    return;
  }
  const result = await prisma.$transaction(async (tx) => {
    const ids = (await tx.directoryMember.findMany({
      where: { importBatchId: batchId }, select: { id: true },
    })).map((m) => m.id);
    if (!ids.length) return { unlinked: 0, tokens: 0, accounts: 0, audits: 0, members: 0 };
    let unlinked = 0;
    let tokens = 0;
    let accounts = 0;
    let audits = 0;
    let members = 0;
    for (let i = 0; i < ids.length; i += CHUNK) {
      const c = ids.slice(i, i + CHUNK);
      unlinked += (await tx.directoryMember.updateMany({
        where: { spouseMemberId: { in: c } },
        data: { spouseMemberId: null, coupleId: null },
      })).count;
      tokens += (await tx.directoryLoginToken.deleteMany({ where: { memberId: { in: c } } })).count;
      accounts += (await tx.directoryAccount.deleteMany({ where: { memberId: { in: c } } })).count;
      audits += (await tx.directoryAuditLog.deleteMany({ where: { memberId: { in: c } } })).count;
      members += (await tx.directoryMember.deleteMany({ where: { id: { in: c } } })).count;
    }
    return { unlinked, tokens, accounts, audits, members };
  }, TX_OPTS);
  console.log(`Purged batch "${batchId}": unlinked ${result.unlinked}, `
    + `login tokens ${result.tokens}, accounts ${result.accounts}, `
    + `audit rows ${result.audits}, members ${result.members}.`);
}

// ── Main ────────────────────────────────────────────────────────────────────

function loadEnvIfNeeded() {
  if (process.env.DATABASE_URL) return;
  const envPath = path.join(REPO_ROOT, '.env');
  if (!fs.existsSync(envPath)) return;
  try {
    process.loadEnvFile(envPath);
  } catch { /* older Node — use --env-file=.env on the command line */ }
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (e) {
    if (!(e instanceof UsageError)) throw e;
    console.error(`${e.message}\n${USAGE}`);
    process.exitCode = 2;
    return;
  }
  loadEnvIfNeeded();

  let prisma = null;
  try {
    if (args.purgeBatch !== null) {
      prisma = await getPrisma();
      await purgeBatch(prisma, args.purgeBatch, dbName());
      return;
    }

    if (!fs.existsSync(args.csvPath)) {
      console.error(`CSV not found: ${args.csvPath}`);
      process.exitCode = 2;
      return;
    }
    const asOf = args.asOf ?? fs.statSync(args.csvPath).mtime;
    const batchId = batchIdForAsOf(asOf);
    const { headers, records } = await parsePhonelistCsv(fs.createReadStream(args.csvPath));
    const analysis = analyzeSheet({ headers, records }, { asOf, tz: args.tz, batchId });

    let dbPlan = null;
    let target = 'offline';
    if (!args.offline) {
      prisma = await getPrisma();
      target = dbName();
      dbPlan = buildDbPlan(analysis, await fetchPlanInputs(prisma, analysis));
    }

    const warningsCsvName = `phonelist-import-${batchId}-warnings.csv`;
    const reportName = `phonelist-import-${batchId}-report.txt`;
    fs.mkdirSync(SCRATCH_DIR, { recursive: true });
    const report = formatReport(analysis, {
      csvPath: args.csvPath,
      dbTarget: target,
      dbPlan,
      warningsCsvPath: path.join('scratch', warningsCsvName),
      apply: args.apply,
    });
    fs.writeFileSync(path.join(SCRATCH_DIR, reportName), report);
    fs.writeFileSync(path.join(SCRATCH_DIR, warningsCsvName), formatWarningsCsv(analysis.warnings));
    process.stdout.write(report);

    const fatalCount = analysis.warnings.filter((w) => w.severity === 'fatal').length;
    if (fatalCount > 0) {
      console.error(`${fatalCount} fatal problem(s) — refusing to write anything.`);
      process.exitCode = 1;
      return;
    }

    if (args.apply) {
      if (!args.yes) {
        const answer = await promptLine(`Type the database name to write to it: `);
        if (answer.trim() !== target) {
          console.log('Confirmation did not match — aborted, no writes.');
          process.exitCode = 1;
          return;
        }
      }
      const counts = await applyImport(prisma, analysis, dbPlan);
      console.log('Apply complete:', JSON.stringify(counts));
    }
  } finally {
    if (prisma) await prisma.$disconnect();
  }
}

// Windows drive-letter/path casing can differ between argv and the module URL.
const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
const modulePath = fileURLToPath(import.meta.url);
const isMain = process.platform === 'win32'
  ? invokedPath.toLowerCase() === modulePath.toLowerCase()
  : invokedPath === modulePath;
if (isMain) {
  main().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
}
