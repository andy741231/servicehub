// One-way refresh between the two free Azure SQL databases: drops the target
// and recreates it as an exact copy of the source (schema + data + migration
// history). Since the copy reuses the same name on the same server, all
// connection strings, .env values, and GitHub secrets keep working.
//
//   node server/scripts/db-refresh.mjs --from stage --to test-servicehub [--yes]
//   npm run db:refresh -- --from stage --to test-servicehub
//
// Safety: the target must be a free-limit database (production can never be a
// target) and confirmation is required — either --yes or typing the target
// name. Requires `az` CLI, already signed in (az login).

import { execFileSync } from 'node:child_process';
import readline from 'node:readline/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SERVER = 'houstonservice-test';
const RESOURCE_GROUP = 'App-Services-And-Related';
const AUTO_PAUSE_DELAY = 60;
const COPY_TIMEOUT_MS = 10 * 60 * 1000;
const COPY_POLL_MS = 10_000;

export class UsageError extends Error {}

const USAGE = `Usage:
  node server/scripts/db-refresh.mjs --from <source-db> --to <target-db> [--yes]`;

export function parseArgs(argv) {
  const args = { from: null, to: null, yes: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--yes') args.yes = true;
    else if (a === '--from') {
      if (++i >= argv.length) throw new UsageError('--from needs a value');
      args.from = argv[i];
    } else if (a === '--to') {
      if (++i >= argv.length) throw new UsageError('--to needs a value');
      args.to = argv[i];
    } else {
      throw new UsageError(`unknown flag: ${a}`);
    }
  }
  if (!args.from || !args.to) throw new UsageError('both --from and --to are required');
  if (args.from === args.to) throw new UsageError('--from and --to must be different');
  return args;
}

const azJson = (args) =>
  JSON.parse(execFileSync('az', args, { shell: true, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
const azRun = (args) =>
  execFileSync('az', args, { shell: true, stdio: 'inherit' });

const dbArgs = (name) => ['--server', SERVER, '--resource-group', RESOURCE_GROUP, '--name', name];

function listDbs() {
  return azJson(['sql', 'db', 'list', '--server', SERVER, '--resource-group', RESOURCE_GROUP]);
}

function dbStatus(name) {
  return azJson(['sql', 'db', 'show', ...dbArgs(name)]).status;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function confirm(target, yes) {
  if (yes) return;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(
      `This DROPs '${target}' and recreates it as a copy. Type the target name to confirm: `,
    );
    if (answer.trim() !== target) throw new UsageError('confirmation did not match — aborted');
  } finally {
    rl.close();
  }
}

export async function main(argv) {
  const args = parseArgs(argv);
  const dbs = listDbs();
  const source = dbs.find((d) => d.name === args.from);
  const target = dbs.find((d) => d.name === args.to);
  if (!source) throw new UsageError(`source database not found: ${args.from}`);
  if (!target) throw new UsageError(`target database not found: ${args.to}`);
  if (!target.useFreeLimit) {
    throw new UsageError(
      `refusing to drop '${target.name}' — only free-limit databases may be targets (production is excluded)`,
    );
  }

  await confirm(target.name, args.yes);

  console.log(`Dropping '${target.name}'...`);
  azRun(['sql', 'db', 'delete', ...dbArgs(target.name), '--yes']);

  console.log(`Copying '${source.name}' -> '${target.name}'...`);
  azRun(['sql', 'db', 'copy', '--server', SERVER, '--resource-group', RESOURCE_GROUP,
    '--name', source.name, '--dest-name', target.name]);

  const deadline = Date.now() + COPY_TIMEOUT_MS;
  for (;;) {
    const status = dbStatus(target.name);
    if (status === 'Online') break;
    if (Date.now() > deadline) {
      throw new Error(`copy did not finish within ${COPY_TIMEOUT_MS / 60000} min — check the Azure portal`);
    }
    console.log(`  copy in progress (status: ${status})...`);
    await sleep(COPY_POLL_MS);
  }

  // The copy does not inherit the free-limit flag — re-apply it. If this fails
  // the DB still works as regular auto-paused serverless; it just isn't free.
  try {
    const updated = azJson(['sql', 'db', 'update', ...dbArgs(target.name),
      '--use-free-limit', 'true',
      '--free-limit-exhaustion-behavior', 'AutoPause',
      '--auto-pause-delay', String(AUTO_PAUSE_DELAY)]);
    if (updated.useFreeLimit) {
      console.log(`Free limit re-enabled on '${target.name}' (AutoPause on exhaustion, ${AUTO_PAUSE_DELAY} min idle).`);
    } else {
      console.log(`WARNING: '${target.name}' is running as paid serverless — free limit flag did not apply.`);
    }
  } catch {
    console.log(`WARNING: could not re-enable free limit on '${target.name}' — running as paid serverless.`);
  }

  console.log(`Done. '${target.name}' is now an exact copy of '${source.name}'.`);
}

// Windows drive-letter/path casing can differ between argv and the module URL.
const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
const modulePath = fileURLToPath(import.meta.url);
const isMain = process.platform === 'win32'
  ? invokedPath.toLowerCase() === modulePath.toLowerCase()
  : invokedPath === modulePath;
if (isMain) {
  main(process.argv.slice(2)).catch((e) => {
    console.error(e instanceof UsageError ? `${e.message}\n\n${USAGE}` : e);
    process.exitCode = 1;
  });
}
