// Column-level schema/migration drift check.
//
// The CI build checks that every model has a CREATE TABLE, but that misses
// columns added later via `db push` without a migration file (the
// `publishedSnapshot` incident — prod ran for months missing the column and
// every WebPage query 500'd). This script checks every scalar field in
// schema.prisma against the migration SQL: if `[field]` never appears, the
// column was never migrated and deploy targets won't have it.
//
//   node server/scripts/check-column-drift.mjs   → exit 1 on drift

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCHEMA = path.join(REPO_ROOT, 'prisma', 'schema.prisma');
const MIGRATIONS_DIR = path.join(REPO_ROOT, 'prisma', 'migrations');

const schema = fs.readFileSync(SCHEMA, 'utf8');

// Collect scalar fields per model. A field whose type is another model name
// is a relation, not a column.
const models = {};
let cur = null;
for (const line of schema.split('\n')) {
  const m = line.match(/^model\s+(\w+)/);
  if (m) { cur = m[1]; models[cur] = []; continue; }
  if (!cur) continue;
  if (/^}/.test(line)) { cur = null; continue; }
  const f = line.match(/^\s{2}(\w+)\s+(\w+)/);
  if (f) models[cur].push({ name: f[1], type: f[2] });
}
const modelNames = new Set(Object.keys(models));

let migSql = '';
for (const d of fs.readdirSync(MIGRATIONS_DIR)) {
  const p = path.join(MIGRATIONS_DIR, d, 'migration.sql');
  if (fs.existsSync(p)) migSql += fs.readFileSync(p, 'utf8') + '\n';
}

const missing = [];
for (const [model, fields] of Object.entries(models)) {
  for (const f of fields) {
    if (modelNames.has(f.type)) continue; // relation, not a column
    if (!new RegExp(`\\[${f.name}\\]`).test(migSql)) missing.push(`${model}.${f.name}`);
  }
}

if (missing.length) {
  console.error('::error::Column drift detected! These schema.prisma fields have no');
  console.error('::error::corresponding column in any migration file:');
  for (const m of missing) console.error(`::error::  ${m}`);
  console.error('::error::Production deploy uses prisma migrate deploy, which only applies');
  console.error('::error::migration files. Run npx prisma db push locally, then create a');
  console.error('::error::migration file manually. See AGENT.md → Schema Change Workflow.');
  process.exit(1);
}
console.log(`All scalar fields have corresponding migration columns — no drift (${Object.keys(models).length} models checked).`);
