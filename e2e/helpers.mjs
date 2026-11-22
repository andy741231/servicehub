/**
 * Shared helpers for the end-to-end tests.
 *
 * The tests run against a local dev stack (client + server + database). They
 * authenticate by minting a short-lived session cookie for E2E_USERNAME with
 * the local JWT_SECRET (dev only), and work on a temporary page that is
 * created unpublished + hidden from the nav and deleted afterwards — real
 * site pages are never touched.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import jwt from 'jsonwebtoken';
import prismaPkg from '@prisma/client';

const { PrismaClient } = prismaPkg;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Load .env (without overriding real environment variables).
const envFile = path.join(ROOT, '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

export const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const prisma = new PrismaClient();

let cachedToken = null;
/** Session cookie value for E2E_USERNAME (must be an admin). */
export async function sessionToken() {
  if (cachedToken) return cachedToken;
  const username = process.env.E2E_USERNAME;
  if (!username) throw new Error('Set E2E_USERNAME to the username of a local admin account (see e2e/README.md).');
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not set (.env).');
  const user = await prisma.user.findFirst({ where: { username } });
  if (!user) throw new Error(`E2E_USERNAME "${username}" not found in the database.`);
  cachedToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '30m' });
  return cachedToken;
}

export async function authenticate(context) {
  const { hostname } = new URL(BASE_URL);
  await context.addCookies([{ name: 'token', value: await sessionToken(), domain: hostname, path: '/' }]);
}

export async function api(method, url, body) {
  const res = await fetch(`${BASE_URL}/api/web${url}`, {
    method,
    headers: { cookie: `token=${await sessionToken()}`, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`${method} ${url} → ${res.status} ${JSON.stringify(data)}`);
  return data;
}

// ── Fixture page ──────────────────────────────────────────────────────────
const full = (rowStart, rows) => ({ colStart: 1, colEnd: 25, rowStart, rowEnd: rowStart + rows, zIndex: 0 });
const GRID = { gridColumns: 24, rowHeight: 80, gap: { horizontal: 8, vertical: 8 }, fillScreen: false, minHeight: 320, verticalAlignment: 'top' };

export const FIXTURE_SECTIONS = [
  { fluidConfig: GRID, paddingTop: 80, paddingBottom: 80, blocks: [
    { type: 'hero', fluid: full(1, 5), content: { title: 'A place to <i>belong.</i>', subtitle: 'A welcoming community for every generation.' } },
  ] },
  { fluidConfig: GRID, paddingTop: 0, paddingBottom: 0, blocks: [
    { type: 'trust-bar', fluid: full(1, 2), content: { items: [{ number: '01', label: 'One community' }, { number: '03', label: 'Ways to connect' }, { number: '∞', label: 'Room for you' }] } },
  ] },
  { fluidConfig: GRID, paddingTop: 0, paddingBottom: 0, blocks: [
    { type: 'features', fluid: full(1, 8), content: { eyebrow: 'Life together', title: 'Find your place.', subtitle: 'A next step for everyone.', numbered: true, items: [
      { number: '01', title: 'Worship', text: 'Music, teaching and prayer.' },
      { number: '02', title: 'Groups', text: 'Friendships around shared meals.' },
      { number: '03', title: 'Serve', text: 'Make a difference nearby.' },
    ] } },
  ] },
  { fluidConfig: GRID, paddingTop: 30, paddingBottom: 30, blocks: [
    { type: 'split-banner', fluid: full(1, 6), content: { eyebrow: 'Your first Sunday', title: 'Come curious.', body: 'No pressure.', buttonText: 'What to expect', buttonLink: '/visit', buttonVariant: 'gold', times: [{ label: 'Sunday', value: '9:00 AM' }] } },
  ] },
  { fluidConfig: GRID, paddingTop: 0, paddingBottom: 0, blocks: [
    { type: 'events', fluid: full(1, 6), content: { eyebrow: 'Coming up', title: 'Make room.', items: [
      { date: 'AUG 18', title: 'Picnic', description: 'Bring a blanket.', time: '12:30 PM' },
      { date: 'AUG 28', title: 'Midweek', description: 'A meal together.', time: '6:30 PM' },
    ] } },
  ] },
];

/** Create the temporary page (unpublished, hidden from nav). */
export async function createFixturePage() {
  const slug = `e2e-editor-${Date.now()}`;
  const page = await prisma.webPage.create({
    data: { slug, title: 'E2E editor page', template: 'modern', isPublished: false, hideFromNav: true },
  });
  await resetFixturePage(slug);
  return { slug, id: page.id };
}

/** Put the fixture content back (one explicit save). */
export async function resetFixturePage(slug) {
  await api('PUT', `/${slug}`, { header: {}, footer: {}, sections: FIXTURE_SECTIONS });
}

export async function deleteFixturePage(id) {
  try { await api('DELETE', `/pages/${id}`); } finally { await prisma.$disconnect(); }
}

export const getPage = (slug) => api('GET', `/admin/${slug}`);

/** Paths where two values differ (for "exactly this changed" assertions). */
export function diffPaths(a, b, p = '') {
  if (JSON.stringify(a) === JSON.stringify(b)) return [];
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    return [...keys].flatMap((k) => diffPaths(a[k], b[k], p ? `${p}.${k}` : k));
  }
  return [p];
}

/** Comparable section data (drops server-generated ids/order/timestamps). */
export function comparable(sections) {
  return sections.map((s) => ({
    fluidConfig: s.fluidConfig, paddingTop: s.paddingTop, paddingBottom: s.paddingBottom, backgroundColor: s.backgroundColor ?? null,
    blocks: (s.blocks || []).map((b) => ({ type: b.type, content: b.content, fluid: b.fluid, fluidMobile: b.fluidMobile ?? null, style: b.style ?? null })),
  }));
}

// ── Editor page helpers ───────────────────────────────────────────────────
export const canvas = (page) => page.frameLocator('iframe[title="Page canvas"]');

export async function openEditor(page, slug) {
  await page.goto(`/hub-admin/web/editor/${slug}`);
  await canvas(page).locator('.public-site.site-editor').waitFor();
}

export const block = (page, label) => canvas(page).locator(`[role="group"][aria-label^="${label} block"]`).first();
export const section = (page, n) => canvas(page).locator(`[role="group"][aria-label^="Section ${n}"]`);
export const inspectorTitle = (page) => page.getByRole('complementary', { name: 'Inspector' }).locator('h2').textContent().catch(() => null);

/** Select a block by clicking near its bottom-right corner (clear of text and handles). */
export async function selectBlock(page, label) {
  const b = block(page, label);
  // Centre it: a block at the top edge sits under the sticky editor toolbar.
  await b.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  const box = await b.boundingBox();
  await page.mouse.click(box.x + box.width - 30, box.y + box.height - 20);
  return b;
}

/** Resolves when the next save of `slug` has completed. */
export const nextSave = (page, slug) => page.waitForResponse(
  (r) => r.request().method() === 'PUT' && r.url().endsWith(`/api/web/${slug}`) && r.ok(),
  { timeout: 15000 },
);
