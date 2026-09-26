// Check Azure SQL free-offer usage for the month: vCore-seconds billed vs the
// 100,000/month free quota, plus each database's current status.
//
//   node server/scripts/db-usage.mjs [--db <name> ...]
//   npm run db:usage
//
// Defaults to every database on the server flagged with the free monthly
// limit. Requires `az` CLI, already signed in (az login).

import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SERVER = 'houstonservice-test';
const RESOURCE_GROUP = 'App-Services-And-Related';
const FREE_MONTHLY_VCORE_SECONDS = 100_000;

export class UsageError extends Error {}

const USAGE = `Usage:
  node server/scripts/db-usage.mjs [--db <name> ...]`;

export function parseArgs(argv) {
  const args = { dbs: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--db') {
      if (++i >= argv.length) throw new UsageError('--db needs a value');
      args.dbs.push(argv[i]);
    } else {
      throw new UsageError(`unknown flag: ${argv[i]}`);
    }
  }
  return args;
}

function az(args) {
  const out = execFileSync('az', args, { shell: true, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  return JSON.parse(out);
}

function monthStartUtc() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01T00:00:00Z`;
}

function billedVcoreSeconds(db) {
  const res = az([
    'monitor', 'metrics', 'list',
    '--resource', db,
    '--resource-group', RESOURCE_GROUP,
    '--resource-type', 'Microsoft.Sql/servers/databases',
    '--resource-parent', `servers/${SERVER}`,
    '--resource-namespace', 'Microsoft.Sql',
    '--metric', 'app_cpu_billed',
    '--aggregation', 'total',
    '--interval', 'P1D',
    '--start-time', monthStartUtc(),
    '--end-time', new Date().toISOString(),
  ]);
  const points = res?.value?.[0]?.timeseries?.[0]?.data ?? [];
  return points.reduce((sum, p) => sum + (p.total ?? 0), 0);
}

export function main(argv) {
  const args = parseArgs(argv);
  const dbs = az(['sql', 'db', 'list', '--server', SERVER, '--resource-group', RESOURCE_GROUP]);
  const targets = args.dbs.length
    ? args.dbs.map((name) => {
        const db = dbs.find((d) => d.name === name);
        if (!db) throw new UsageError(`database not found on ${SERVER}: ${name}`);
        return db;
      })
    : dbs.filter((d) => d.useFreeLimit);
  if (!targets.length) throw new UsageError('no free-limit databases found');

  console.log(`Free-offer usage for ${new Date().toISOString().slice(0, 7)} (quota: ${FREE_MONTHLY_VCORE_SECONDS.toLocaleString()} vCore-sec/mo):\n`);
  for (const db of targets) {
    const used = Math.round(billedVcoreSeconds(db.name));
    const pct = (used / FREE_MONTHLY_VCORE_SECONDS * 100).toFixed(1);
    const flag = used > FREE_MONTHLY_VCORE_SECONDS * 0.8 ? '  <-- running low' : '';
    console.log(
      `  ${db.name.padEnd(22)} ${db.status.padEnd(10)} ${used.toLocaleString().padStart(8)} vCore-sec  (${pct}%)${flag}`,
    );
  }
}

// Windows drive-letter/path casing can differ between argv and the module URL.
const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
const modulePath = fileURLToPath(import.meta.url);
const isMain = process.platform === 'win32'
  ? invokedPath.toLowerCase() === modulePath.toLowerCase()
  : invokedPath === modulePath;
if (isMain) {
  try {
    main(process.argv.slice(2));
  } catch (e) {
    console.error(e instanceof UsageError ? `${e.message}\n\n${USAGE}` : e);
    process.exit(1);
  }
}
