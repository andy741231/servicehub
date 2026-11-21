// Pull a BACPAC copy of the Azure "stage" database into the local Docker SQL
// Server and re-import it as the local dev database (schema + data + migration
// history). Use this to refresh local dev data from the shared stage DB.
//
//   node server/scripts/db-pull-stage.mjs [--yes] [--target-db <name>]
//   npm run db:pull -- --yes
//
// Source is read from DATABASE_URL_STAGE in .env; target from DATABASE_URL.
// Safety: the target must point at localhost/127.0.0.1 (never a remote or
// Azure server) and the source can never be production-servicehub. The local
// target database is DROPPED and re-imported — confirmation is required,
// either --yes or typing the target database name.
//
// Requires SqlPackage on PATH or in a known location. If it is missing the
// script prints the install command instead of downloading it silently.
// Standalone install (no .NET SDK needed), e.g. into %LOCALAPPDATA%\SqlPackage:
//   curl -L https://aka.ms/sqlpackage-windows -o sqlpackage-win.zip
//   (extract SqlPackage.exe into %LOCALAPPDATA%\SqlPackage)
// or, with the .NET SDK installed:
//   dotnet tool install -g microsoft.sqlpackage

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCRATCH_DIR = path.join(REPO_ROOT, 'scratch');
const DEFAULT_TARGET_DB = 'servicehub_dev';
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

export class UsageError extends Error {}

const USAGE = `Usage:
  node server/scripts/db-pull-stage.mjs [--yes] [--target-db <name>] [--verify-out <file>]`;

export function parseArgs(argv) {
  const args = { yes: false, targetDb: DEFAULT_TARGET_DB, verifyOut: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--yes') args.yes = true;
    else if (a === '--target-db') {
      if (++i >= argv.length) throw new UsageError('--target-db needs a value');
      args.targetDb = argv[i];
    } else if (a === '--verify-out') {
      if (++i >= argv.length) throw new UsageError('--verify-out needs a value');
      args.verifyOut = argv[i];
    } else {
      throw new UsageError(`unknown flag: ${a}`);
    }
  }
  return args;
}

function loadEnvFile(file) {
  const out = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v;
  }
  return out;
}

// Parse Prisma-style "sqlserver://host[:port];key=value;key=value..." URLs.
function parseSqlServerUrl(url) {
  const s = url.trim().replace(/^sqlserver:\/\//i, '');
  const segs = s.split(';');
  const hm = segs[0].match(/^(?:tcp:)?([^:,]+)(?:[:,](\d+))?/i);
  if (!hm) throw new Error(`could not parse sqlserver URL host: ${segs[0]}`);
  const kv = {};
  for (const seg of segs.slice(1)) {
    if (!seg) continue;
    const i = seg.indexOf('=');
    if (i < 0) continue;
    kv[seg.slice(0, i).trim().toLowerCase()] = seg.slice(i + 1).trim();
  }
  return {
    host: hm[1],
    port: hm[2] || '1433',
    database: kv.database,
    user: kv.user,
    password: kv.password,
    encrypt: kv.encrypt ?? 'true',
    trustServerCertificate: kv.trustservercertificate ?? 'true',
  };
}

// Prisma-style URL for a different database on the same server/credentials.
function prismaUrlFor(cs, database) {
  return `sqlserver://${cs.host}:${cs.port};database=${database};user=${cs.user};password=${cs.password}` +
    `;encrypt=${cs.encrypt};trustServerCertificate=${cs.trustServerCertificate};connectionTimeout=120`;
}

// ADO.NET connection string for SqlPackage /SourceConnectionString etc.
function adoConnString(cs, database) {
  return `Server=${cs.host},${cs.port};Database=${database || cs.database}` +
    `;User ID=${cs.user};Password=${cs.password}` +
    `;Encrypt=${cs.encrypt};TrustServerCertificate=${cs.trustServerCertificate};Connection Timeout=120`;
}

function findSqlPackage() {
  const exe = process.platform === 'win32' ? 'SqlPackage.exe' : 'sqlpackage';
  const candidates = [];
  if (process.env.LOCALAPPDATA) candidates.push(path.join(process.env.LOCALAPPDATA, 'SqlPackage', exe));
  candidates.push(
    path.join(os.homedir(), '.dotnet', 'tools', 'sqlpackage'),
    path.join(os.homedir(), '.dotnet', 'tools', 'sqlpackage.exe'),
    'C:\\Program Files\\Microsoft SQL Server\\170\\DAC\\bin\\SqlPackage.exe',
    'C:\\Program Files\\Microsoft SQL Server\\160\\DAC\\bin\\SqlPackage.exe',
    'C:\\Program Files (x86)\\Microsoft SQL Server\\170\\DAC\\bin\\SqlPackage.exe',
    'C:\\Program Files (x86)\\Microsoft SQL Server\\160\\DAC\\bin\\SqlPackage.exe',
  );
  for (const c of candidates) {
    if (c && fs.existsSync(c)) return c;
  }
  const onPath = spawnSync('sqlpackage', ['-Version'], { stdio: 'pipe' });
  if (!onPath.error && onPath.status === 0) return 'sqlpackage';
  return null;
}

const SQLPACKAGE_INSTALL_HINT = [
  'SqlPackage not found. Install it with one of:',
  '  dotnet tool install -g microsoft.sqlpackage            (needs .NET SDK)',
  '  or the standalone zip into %LOCALAPPDATA%\\SqlPackage:',
  '    curl -L https://aka.ms/sqlpackage-windows -o sqlpackage-win.zip',
  '    unzip sqlpackage-win.zip -d "$LOCALAPPDATA/SqlPackage"',
].join('\n');

function runSqlPackage(bin, args, label) {
  console.log(`\n=== SqlPackage ${label} ===`);
  const r = spawnSync(bin, args, { stdio: 'inherit' });
  if (r.error) throw r.error;
  if (r.status !== 0) throw new Error(`SqlPackage ${label} failed with exit code ${r.status}`);
}

async function confirmTarget(targetDb, yes) {
  if (yes) return;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(
      `This will DROP and re-import local database "${targetDb}". Type the database name to confirm: `,
    );
    if (answer.trim() !== targetDb) throw new Error(`confirmation mismatch — aborting (expected "${targetDb}")`);
  } finally {
    rl.close();
  }
}

const quoteIdent = (n) => `[${n.replaceAll(']', ']]')}]`;

async function listTables(prisma) {
  return prisma.$queryRawUnsafe(
    `SELECT s.name AS schemaName, t.name AS tableName
       FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id
      WHERE t.is_ms_shipped = 0
      ORDER BY s.name, t.name`,
  );
}

async function tableCount(prisma, schemaName, tableName) {
  const r = await prisma.$queryRawUnsafe(
    `SELECT COUNT_BIG(*) AS n FROM ${quoteIdent(schemaName)}.${quoteIdent(tableName)}`,
  );
  return Number(r[0].n);
}

async function appliedMigrations(prisma) {
  try {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL ORDER BY migration_name`,
    );
    return rows.map((r) => r.migration_name);
  } catch {
    return null;
  }
}

async function buildVerifyReport(sourceUrl, targetUrl, targetDb) {
  const src = new PrismaClient({ datasourceUrl: sourceUrl });
  const dst = new PrismaClient({ datasourceUrl: targetUrl });
  const lines = [];
  try {
    const [srcTables, dstTables] = await Promise.all([listTables(src), listTables(dst)]);
    const key = (t) => `${t.schemaName}.${t.tableName}`;
    const names = [...new Set([...srcTables.map(key), ...dstTables.map(key)])].sort();
    lines.push(`table | source | target | match`);
    let mismatches = 0;
    for (const name of names) {
      const [schemaName, tableName] = name.split('.');
      const inSrc = srcTables.some((t) => key(t) === name);
      const inDst = dstTables.some((t) => key(t) === name);
      const s = inSrc ? await tableCount(src, schemaName, tableName) : 'MISSING';
      const d = inDst ? await tableCount(dst, schemaName, tableName) : 'MISSING';
      const match = s === d ? 'OK' : 'MISMATCH';
      if (match !== 'OK') mismatches++;
      lines.push(`${name} | ${s} | ${d} | ${match}`);
    }
    lines.push(`\ntables compared: ${names.length}, mismatches: ${mismatches}`);

    const [srcMigs, dstMigs] = [await appliedMigrations(src), await appliedMigrations(dst)];
    lines.push(`\n_applied _prisma_migrations (finished_at IS NOT NULL)_`);
    if (srcMigs === null || dstMigs === null) {
      lines.push(`_prisma_migrations missing on ${srcMigs === null ? 'source' : 'target'} — skipped`);
    } else {
      const missing = srcMigs.filter((m) => !dstMigs.includes(m));
      const extra = dstMigs.filter((m) => !srcMigs.includes(m));
      lines.push(`source: ${srcMigs.length} applied, target: ${dstMigs.length} applied`);
      lines.push(missing.length ? `missing on target: ${missing.join(', ')}` : 'missing on target: none');
      lines.push(extra.length ? `extra on target: ${extra.join(', ')}` : 'extra on target: none');
      lines.push(`migrations match: ${missing.length === 0 && extra.length === 0}`);
    }
  } finally {
    await src.$disconnect();
    await dst.$disconnect();
  }
  return lines.join('\n');
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);

  const env = loadEnvFile(path.join(REPO_ROOT, '.env'));
  const sourceUrl = env.DATABASE_URL_STAGE;
  const targetUrl = env.DATABASE_URL;
  if (!sourceUrl) throw new Error('DATABASE_URL_STAGE is not set in .env (the Azure "stage" connection string)');
  if (!targetUrl) throw new Error('DATABASE_URL is not set in .env');
  if (/production-servicehub/i.test(sourceUrl)) {
    throw new Error('refusing: DATABASE_URL_STAGE points at production-servicehub');
  }

  const src = parseSqlServerUrl(sourceUrl);
  const dst = parseSqlServerUrl(targetUrl);
  if (!LOCAL_HOSTS.has(dst.host)) {
    throw new Error(`refusing: DATABASE_URL target host "${dst.host}" is not localhost — db:pull only writes to a local server`);
  }

  const sqlpackage = findSqlPackage();
  if (!sqlpackage) throw new Error(SQLPACKAGE_INSTALL_HINT);
  console.log(`SqlPackage: ${sqlpackage}`);
  console.log(`Source: ${src.host} / ${src.database}  →  target: ${dst.host}:${dst.port} / ${args.targetDb}`);

  await confirmTarget(args.targetDb, args.yes);

  fs.mkdirSync(SCRATCH_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const bacpac = path.join(SCRATCH_DIR, `stage-${stamp}.bacpac`);

  runSqlPackage(sqlpackage, [
    '/Action:Export',
    `/TargetFile:${bacpac}`,
    `/SourceConnectionString:${adoConnString(src)}`,
    '/OverwriteFiles:True',
  ], 'Export');

  const master = new PrismaClient({ datasourceUrl: prismaUrlFor(dst, 'master') });
  try {
    await master.$executeRawUnsafe(
      `IF DB_ID('${args.targetDb.replaceAll("'", "''")}') IS NOT NULL
       BEGIN
         ALTER DATABASE ${quoteIdent(args.targetDb)} SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
         DROP DATABASE ${quoteIdent(args.targetDb)};
       END`,
    );
    console.log(`Dropped local database "${args.targetDb}" (if it existed)`);
    // Azure SQL databases are exported as contained databases — the local
    // instance needs this to import them (safe on a local dev server).
    await master.$executeRawUnsafe(`EXEC sp_configure 'contained database authentication', 1`);
    await master.$executeRawUnsafe(`RECONFIGURE`);
  } finally {
    await master.$disconnect();
  }

  runSqlPackage(sqlpackage, [
    '/Action:Import',
    `/SourceFile:${bacpac}`,
    `/TargetConnectionString:${adoConnString(dst, args.targetDb)}`,
  ], 'Import');

  console.log('\n=== Row-count comparison (source vs local target) ===');
  const report = await buildVerifyReport(
    prismaUrlFor(src, src.database),
    prismaUrlFor(dst, args.targetDb),
    args.targetDb,
  );
  console.log(report);

  if (args.verifyOut) {
    const outPath = path.isAbsolute(args.verifyOut) ? args.verifyOut : path.join(REPO_ROOT, args.verifyOut);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, report + '\n');
    console.log(`\nVerification written to ${path.relative(REPO_ROOT, outPath)}`);
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().then(() => process.exit(0)).catch((err) => {
    if (err instanceof UsageError) {
      console.error(`${err.message}\n${USAGE}`);
    } else {
      console.error(err.message || err);
    }
    process.exit(1);
  });
}
