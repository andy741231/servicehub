/**
 * Regression tests for the 2026-11-21 UI test findings (docs/web-editor-plan.md,
 * "UI test findings"). Same fixture page approach as web-editor.spec.mjs:
 * a temporary unpublished, hidden page, reset before every test.
 */
import { test, expect } from '@playwright/test';
import {
  authenticate, createFixturePage, resetFixturePage, deleteFixturePage, getPage, api,
  canvas, openEditor, block, section, selectBlock, inspectorTitle, nextSave,
} from './helpers.mjs';

test.describe.configure({ mode: 'serial' });

let fixture;
test.beforeAll(async () => { fixture = await createFixturePage(); });
test.afterAll(async () => { if (fixture) await deleteFixturePage(fixture.id); });
let pageErrors = [];
test.beforeEach(async ({ context, page }) => {
  await resetFixturePage(fixture.slug);
  await authenticate(context);
  pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  // Never send uploads to real asset storage.
  await page.route('**/api/web/assets', (route) => (route.request().method() !== 'POST' ? route.continue()
    : route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 'e2e', url: '/uploads/e2e-bg.png' }) })));
});
test.afterEach(() => { expect(pageErrors, 'uncaught errors in the page').toEqual([]); });

const saved = async () => (await getPage(fixture.slug)).sections;
const inspector = (page) => page.getByRole('complementary', { name: 'Inspector' });
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');

async function addSection(page, name) {
  await canvas(page).getByRole('button', { name: /^Add Section$/ }).last().click();
  await page.getByRole('dialog').getByRole('button', { name: `Add ${name} section` }).click();
}
async function addBlock(page, n, name) {
  const s = section(page, n);
  await s.scrollIntoViewIfNeeded();
  await s.hover();
  await s.getByRole('button', { name: 'Add Block', exact: true }).click();
  await expect(page.getByRole('complementary', { name: 'Add block' })).toBeVisible();
  await page.getByRole('complementary', { name: 'Add block' }).getByRole('button', { name: `Add ${name} block` }).click();
}
/** Bottom of the block's rendered content minus the block's own bottom (≤ 0 = fits). */
const overflowPx = (loc) => loc.evaluate((el) => {
  const r = el.getBoundingClientRect();
  return Math.max(...[...el.children].map((c) => c.getBoundingClientRect().bottom)) - r.bottom;
});
/** WCAG contrast of an element's text colour against a background colour. */
const contrast = (fg, bg) => {
  const lum = (c) => { const [r, g, b] = c.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
};

test('U1/U2: a long quote stays inside its block; marks sit inline like the site', async ({ page }) => {
  await openEditor(page, fixture.slug);
  let save = nextSave(page, fixture.slug);
  await addSection(page, 'Quote');
  await save;
  const q = block(page, 'Quote');
  // Quote marks are inline: the editable text is not a separate <p> paragraph.
  await expect(q.locator('blockquote p')).toHaveCount(0);
  await expect.poll(() => overflowPx(q), { timeout: 8000 }).toBeLessThanOrEqual(2);
  // Type a long quote, then leave the field (the field re-renders on blur).
  const text = q.locator('blockquote [contenteditable="true"]');
  await selectBlock(page, 'Quote');
  await text.click();
  await page.keyboard.press('Control+a');
  await page.keyboard.type('Fresh out of the oven, each loaf has a shell of blistered mahogany and an interior so chewy and preternaturally moist that it shimmers in the light');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await expect.poll(() => overflowPx(q), { timeout: 8000 }).toBeLessThanOrEqual(2);
  // The page-level "Add Section" button is not covered by the quote.
  const cta = canvas(page).getByRole('button', { name: /^Add Section$/ }).last();
  await cta.scrollIntoViewIfNeeded();
  await cta.click({ trial: true, timeout: 5000 });
});

test('U3: a block added from the picker is fitted to its content (no empty rows)', async ({ page }) => {
  await openEditor(page, fixture.slug);
  const save = nextSave(page, fixture.slug);
  await addBlock(page, 1, 'Hero');
  await save;
  const heroes = canvas(page).locator('[role="group"][aria-label^="Hero block"]');
  const added = heroes.nth(1);
  await expect.poll(async () => {
    const box = await added.boundingBox();
    const content = await added.evaluate((el) => el.firstElementChild.getBoundingClientRect().height);
    return box.height - content;
  }, { timeout: 8000 }).toBeLessThan(90); // at most one row of slack
  await expect.poll(async () => { const f = (await saved())[0].blocks[1].fluid; return f.rowEnd - f.rowStart; }, { timeout: 8000 }).toBeLessThan(6);
});

test('U4: section actions are one compact row; clicking near a block edge selects the block', async ({ page }) => {
  await openEditor(page, fixture.slug);
  const s2 = section(page, 2);
  await s2.scrollIntoViewIfNeeded();
  await s2.hover();
  const bar = s2.getByRole('toolbar', { name: 'Section actions' });
  await expect(bar).toBeVisible();
  expect((await bar.boundingBox()).height).toBeLessThan(44);
  await expect(s2.getByRole('button', { name: /Add Section Below/ })).toHaveCount(0);
  // Where the old 170px menu sat (right edge, inside the trust bar) is now the block.
  const tb = await block(page, 'Trust bar').boundingBox();
  const b = await bar.boundingBox();
  await page.mouse.click(tb.x + tb.width - 60, Math.max(b.y + b.height + 12, tb.y + tb.height - 14));
  await expect.poll(() => inspectorTitle(page)).toMatch(/Trust bar block/);
  expect(await saved()).toHaveLength(5); // nothing removed
});

test('U5: resize handles of a full-width block are inside the canvas', async ({ page }) => {
  await openEditor(page, fixture.slug);
  await selectBlock(page, 'Trust bar');
  const frame = await page.locator('iframe[title="Page canvas"]').boundingBox();
  for (const cls of ['.fluid-resize-r', '.fluid-resize-br']) {
    const h = await section(page, 2).locator(cls).first().boundingBox();
    expect(h.x + h.width).toBeLessThanOrEqual(frame.x + frame.width + 0.5);
  }
});

test('U6: Contact block text is readable on its background', async ({ page }) => {
  await openEditor(page, fixture.slug);
  const save = nextSave(page, fixture.slug);
  await addSection(page, 'Contact');
  await save;
  const sec = block(page, 'Contact').locator('section').first();
  const bg = await sec.evaluate((el) => getComputedStyle(el).backgroundColor);
  for (const el of [sec.locator('h2'), sec.locator('h3').first()]) {
    const fg = await el.evaluate((n) => getComputedStyle(n).color);
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  }
});

test('U7/U9/U10: hero background image uploads from the inspector, fills the block, subtitle readable', async ({ page }) => {
  await openEditor(page, fixture.slug);
  await selectBlock(page, 'Hero');
  const save = nextSave(page, fixture.slug);
  await inspector(page).locator('input[type="file"]').setInputFiles({ name: 'bg.png', mimeType: 'image/png', buffer: png });
  await save;
  expect((await saved())[0].blocks[0].content.backgroundImage).toBe('/uploads/e2e-bg.png');
  const hero = block(page, 'Hero');
  const sec = hero.locator('section').first();
  await expect.poll(async () => Math.abs((await sec.boundingBox()).height - (await hero.boundingBox()).height)).toBeLessThan(2);
  const subColor = await hero.locator('p').first().evaluate((el) => getComputedStyle(el).color);
  const [r, g, b] = subColor.match(/\d+/g).map(Number);
  expect(r + g + b).toBeGreaterThan(600); // light text on the photo
});

test('U11: Quote Design background applies (content-level colour no longer overrides it)', async ({ page }) => {
  await openEditor(page, fixture.slug);
  await addSection(page, 'Quote');
  await selectBlock(page, 'Quote');
  await inspector(page).getByRole('tab', { name: 'Design' }).click();
  const bg = inspector(page).getByRole('textbox', { name: 'Background', exact: true });
  await bg.fill('#111111');
  await bg.press('Enter');
  await expect(block(page, 'Quote').locator('section').first()).toHaveCSS('background-color', 'rgb(17, 17, 17)');
  await page.getByRole('tab', { name: 'Content' }).click();
  await expect(inspector(page).getByText('Background color')).toHaveCount(0);
});

test('U12/U13: Esc from the inspector walks the selection up; version history closes on Esc', async ({ page }) => {
  await openEditor(page, fixture.slug);
  await selectBlock(page, 'Trust bar');
  await inspector(page).getByRole('tab', { name: 'Design' }).click(); // focus is now in the inspector
  await page.keyboard.press('Escape');
  await expect.poll(() => inspectorTitle(page)).toMatch(/Section 2/);
  await page.getByRole('button', { name: 'Version history' }).click();
  await expect(page.getByRole('dialog', { name: 'Page version history' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Page version history' })).toHaveCount(0);
});

test('U14: preview is full screen (no admin navigation)', async ({ page }) => {
  await openEditor(page, fixture.slug);
  await page.getByRole('button', { name: 'Preview' }).click();
  await expect(page.getByRole('button', { name: /Back to editor/ }).first()).toBeVisible();
  const box = await page.locator('.public-site').first().boundingBox();
  expect(box.x).toBe(0);
  expect(box.width).toBeGreaterThanOrEqual(1400);
});

test('U28: the canvas shows the same shared header and footer as the published page', async ({ page, browser }) => {
  // The fixture page has an empty own header/footer, like a newly made page.
  // Publish it briefly and read it as an anonymous visitor.
  await api('POST', `/${fixture.slug}/publish`);
  const norm = (s) => s.replace(/\s+/g, ' ').trim();
  let pubHeader; let pubFooter;
  try {
    const visitor = await browser.newContext();
    const v = await visitor.newPage();
    await v.goto(`/${fixture.slug}`);
    await v.locator('.public-site header').waitFor();
    pubHeader = norm(await v.locator('.public-site header').innerText());
    pubFooter = norm(await v.locator('.public-site footer').innerText());
    await visitor.close();
  } finally {
    await api('POST', `/${fixture.slug}/unpublish`);
  }
  await openEditor(page, fixture.slug);
  expect(norm(await canvas(page).locator('.site-editor-frame header').innerText())).toBe(pubHeader);
  expect(norm(await canvas(page).locator('.site-editor-frame footer').innerText())).toBe(pubFooter);

  // Saving never copies the shared header/footer into the page's own.
  const save = nextSave(page, fixture.slug);
  await addBlock(page, 1, 'Button');
  await save;
  const own = await getPage(fixture.slug);
  expect(own.header?.logo?.text ?? null).toBeNull();
  expect(own.footer?.sections?.length ?? 0).toBe(0);
});

test('U27: list blocks lay out by their own width; narrowing grows the block to fit', async ({ page }) => {
  const feat = () => block(page, 'Features');
  const cols = () => feat().locator('.public-feature-card').first().evaluate((el) => getComputedStyle(el.parentElement).gridTemplateColumns.split(' ').length);
  await openEditor(page, fixture.slug);
  await expect.poll(cols).toBe(3); // full width at 1440
  const rowsBefore = (await saved())[2].blocks[0].fluid.rowEnd;

  // Narrow it to about half with the right-hand resize handle.
  await selectBlock(page, 'Features');
  const handle = section(page, 3).locator('.fluid-resize-r').first();
  await handle.scrollIntoViewIfNeeded();
  const hb = await handle.boundingBox();
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
  await page.mouse.down();
  const bb = await feat().boundingBox();
  await page.mouse.move(bb.x + bb.width * 0.5, hb.y + hb.height / 2, { steps: 12 });
  await page.mouse.up();

  await expect.poll(cols).toBe(2); // two cards across, not three
  // The third card wraps to a new row; the block grows instead of spilling over.
  await expect.poll(() => overflowPx(feat())).toBeLessThanOrEqual(1);
  await expect.poll(async () => (await saved())[2].blocks[0].fluid.rowEnd, { timeout: 10000 }).toBeGreaterThan(rowsBefore);
  const f = (await saved())[2].blocks[0].fluid;
  expect(f.colEnd).toBeLessThanOrEqual(14);
});

test('U40: with the inspector open the desktop canvas keeps the window width (scaled to fit)', async ({ page }) => {
  await openEditor(page, fixture.slug);
  await selectBlock(page, 'Features');
  await expect(inspector(page)).toBeVisible();
  const frame = page.locator('iframe[title="Page canvas"]');
  // Laid out at the window width, like the live page in this window…
  const inner = await canvas(page).locator('body').evaluate((b) => b.ownerDocument.defaultView.innerWidth);
  expect(inner).toBe(await page.evaluate(() => document.documentElement.clientWidth));
  // …and scaled to the room left beside the inspector, so nothing is cut off.
  const scale = Number(await frame.getAttribute('data-canvas-scale'));
  expect(scale).toBeLessThan(1);
  const fb = await frame.boundingBox();
  const ib = await inspector(page).boundingBox();
  expect(fb.x + fb.width).toBeLessThanOrEqual(ib.x + 1);
  // Raw mouse coordinates (from the block's on-screen box) still hit the right block.
  await selectBlock(page, 'Hero');
  await expect.poll(() => inspectorTitle(page)).toMatch(/Hero block/);
});

test('U39: the header/footer publish on their own, without the page content', async ({ request }) => {
  const slug = fixture.slug;
  try {
    await api('POST', `/${slug}/publish`);
    const published = (await getPage(slug)).sections;
    expect((await getPage(slug)).headerFooterLive).toBe(true);

    // Draft edits to the header AND the content.
    const sections = published.map((s, i) => (i !== 0 ? s : {
      ...s, blocks: [{ ...s.blocks[0], content: { ...s.blocks[0].content, title: 'Draft-only title' } }],
    }));
    await api('PUT', `/${slug}`, { header: { logo: { text: 'E2E new header' } }, footer: {}, sections });
    expect((await getPage(slug)).headerFooterLive).toBe(false);

    await api('POST', `/${slug}/publish-header-footer`);
    expect((await getPage(slug)).headerFooterLive).toBe(true);
    // The content edit is still a draft: visitors see the published title.
    const pub = await (await request.get(`/api/web/${slug}`)).json();
    expect(JSON.stringify(pub.sections)).not.toContain('Draft-only title');
  } finally {
    await api('POST', `/${slug}/unpublish`);
  }
});

test('U39: Header & Footer screen shows whether changes are live and publishes them', async ({ page }) => {
  // Never touch the real home page: every home request is answered here.
  const calls = [];
  let live = false;
  await page.route('**/api/web/**', (route) => (route.request().method() === 'GET' ? route.continue() : route.abort()));
  await page.route('**/api/web/admin/home', (route) => route.fulfill({ json: {
    slug: 'home', header: { logo: { text: 'E2E Church' }, navigation: [], styles: {} }, footer: { sections: [], styles: {} }, headerFooterLive: live,
  } }));
  await page.route('**/api/web/home', (route) => { calls.push(route.request().method()); return route.fulfill({ json: {} }); });
  await page.route('**/api/web/home/publish-header-footer', (route) => { calls.push('publish'); live = true; return route.fulfill({ json: { headerFooterLive: true } }); });

  await page.goto('/hub-admin/web/header-footer');
  await expect(page.getByRole('status').filter({ hasText: 'not live yet' })).toBeVisible();
  const publish = page.getByRole('button', { name: 'Publish' });
  await publish.click();
  await expect(page.getByRole('status').filter({ hasText: /^\s*Live on the site\s*$/ })).toBeVisible();
  await expect(publish).toBeDisabled();
  expect(calls).toEqual(['publish']); // nothing unsaved, so no save first

  // An edit is saved first, then published.
  await page.locator('input[value="E2E Church"]').fill('E2E Church 2');
  await expect(page.getByRole('status').filter({ hasText: 'Unsaved changes' })).toBeVisible();
  await publish.click();
  await expect(page.getByRole('status').filter({ hasText: /^\s*Live on the site\s*$/ })).toBeVisible();
  expect(calls).toEqual(['publish', 'PUT', 'publish']);
});

test('U32: the Add block panel stays open to add several blocks; Done closes it', async ({ page }) => {
  await openEditor(page, fixture.slug);
  const picker = page.getByRole('complementary', { name: 'Add block' });
  let save = nextSave(page, fixture.slug);
  await addBlock(page, 2, 'Button');
  await save;
  await expect(picker).toBeVisible();
  await expect(picker.getByRole('status')).toHaveText('Added Button to section 2.');
  save = nextSave(page, fixture.slug);
  await picker.getByRole('button', { name: 'Add Text block' }).click();
  await save;
  await expect(picker.getByRole('status')).toHaveText(/Added Text/);
  const types = (await saved())[1].blocks.map((b) => b.type);
  expect(types).toEqual(expect.arrayContaining(['trust-bar', 'button', 'text']));
  await picker.getByRole('button', { name: 'Done' }).click();
  await expect(picker).toHaveCount(0);
});

test('U37: visiting an unknown URL or editor link does not create a page', async ({ request }) => {
  const slug = `e2e-unknown-${Date.now()}`;
  const res = await request.get(`/api/web/${slug}`);
  expect(res.status()).toBe(404);
  // Nor does opening the editor on it (that brought deleted temp pages back,
  // published and in the nav).
  await expect(api('GET', `/admin/${slug}`)).rejects.toThrow(/404/);
  const pages = await api('GET', '/pages');
  const list = Array.isArray(pages) ? pages : (pages.pages || pages.data || []);
  expect(list.some((p) => p.slug === slug)).toBe(false);
});

test('U15/U16: layers panel selects sections, uses picker names, has no fake hide toggle', async ({ page }) => {
  await openEditor(page, fixture.slug);
  await page.getByRole('button', { name: 'Toggle layers panel' }).click();
  const layers = page.getByRole('complementary', { name: 'Layers panel' });
  await expect(layers.getByText('Service times 1')).toBeVisible();
  await expect(layers.getByRole('button', { name: /Hide block on canvas/ })).toHaveCount(0);
  await layers.getByText(/^Section 3/).click();
  await expect.poll(() => inspectorTitle(page)).toMatch(/Section 3/);
  await layers.getByText('Service times 1').click();
  await expect.poll(() => inspectorTitle(page)).toMatch(/Service times block/);
});

test('U17: Delete key offers Undo like the toolbar', async ({ page }) => {
  await openEditor(page, fixture.slug);
  await selectBlock(page, 'Trust bar');
  await page.evaluate(() => document.activeElement?.blur());
  let save = nextSave(page, fixture.slug);
  await page.keyboard.press('Delete');
  await save;
  expect((await saved())[1].blocks).toHaveLength(0);
  save = nextSave(page, fixture.slug);
  await page.getByRole('button', { name: 'Undo' }).last().click();
  await save;
  expect((await saved())[1].blocks).toHaveLength(1);
});

test('U8: list blocks from the picker start with content', async ({ page }) => {
  await openEditor(page, fixture.slug);
  const save = nextSave(page, fixture.slug);
  await addBlock(page, 1, 'Features');
  await save;
  await expect(block(page, 'Features').locator('.public-feature-card')).toHaveCount(3);
});

test('U26: site colours reach token classes in blocks; editor chrome keeps the admin palette', async ({ page }) => {
  await openEditor(page, fixture.slug);
  const save = nextSave(page, fixture.slug);
  await addBlock(page, 1, 'Features');
  await save;
  const icon = block(page, 'Features').locator('.public-feature-icon').first();
  const { fg, bg, sitePrimary } = await icon.evaluate((el) => {
    const site = el.closest('.public-site');
    const probe = document.createElement('span');
    probe.style.color = 'hsl(var(--primary))';
    site.appendChild(probe);
    const sitePrimary = getComputedStyle(probe).color;
    probe.remove();
    return { fg: getComputedStyle(el).color, bg: getComputedStyle(el).backgroundColor, sitePrimary };
  });
  // text-primary is the site's primary, not the admin teal.
  expect(fg).toBe(sitePrimary);
  // bg-primary-light is a pale tint of it: same hue family, never the admin mint (240, 253, 250).
  expect(bg).not.toBe('rgb(240, 253, 250)');
  const [r, g, b] = bg.match(/\d+/g).map(Number);
  expect(Math.min(r, g, b)).toBeGreaterThan(200);
  expect(b).toBeGreaterThanOrEqual(r);
  // Chrome inside the canvas still resolves tokens to the admin palette.
  await selectBlock(page, 'Features');
  const [chrome, root] = await canvas(page).locator('.site-editor-chrome').first().evaluate((el) => [
    getComputedStyle(el).getPropertyValue('--color-primary').trim(),
    getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim(),
  ]);
  expect(chrome).toBe(root);
});

// ── New capabilities (Image block, Button block, hero button, section photo) ──

test('N1: Image block — upload fills the block; alt text and sizing are saved', async ({ page }) => {
  await openEditor(page, fixture.slug);
  let save = nextSave(page, fixture.slug);
  await addBlock(page, 2, 'Image');
  await save;
  const img = block(page, 'Image');
  save = nextSave(page, fixture.slug);
  await img.locator('input[type="file"]').setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: png });
  await save;
  const shown = img.locator('img').first();
  await expect(shown).toBeVisible();
  const [ib, bb] = [await shown.boundingBox(), await img.boundingBox()];
  expect(Math.abs(ib.height - bb.height)).toBeLessThan(2);
  expect(Math.abs(ib.width - bb.width)).toBeLessThan(2);
  const alt = inspector(page).getByRole('textbox', { name: /Alt text/ });
  await alt.fill('Families at the picnic');
  save = nextSave(page, fixture.slug);
  await alt.blur();
  await save;
  const saved1 = (await saved())[1].blocks.find((b) => b.type === 'image');
  expect(saved1.content).toMatchObject({ url: '/uploads/e2e-bg.png', alt: 'Families at the picnic', fit: 'cover' });
});

test('N2: Button block and the optional hero button', async ({ page }) => {
  await openEditor(page, fixture.slug);
  // Hero: placeholder button in the editor only; label it to make it real.
  const heroBtn = block(page, 'Hero').locator('a [contenteditable="true"]');
  await expect(heroBtn).toHaveCount(1);
  await selectBlock(page, 'Hero');
  await heroBtn.click();
  await page.keyboard.type('Plan a visit');
  let save = nextSave(page, fixture.slug);
  await page.keyboard.press('Escape');
  await save;
  expect((await saved())[0].blocks[0].content.buttonText).toBe('Plan a visit');
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
  save = nextSave(page, fixture.slug);
  await addBlock(page, 2, 'Button');
  await save;
  await expect(block(page, 'Button').locator('a')).toContainText('Learn more');
});

test('N3: section background photo with overlay is saved and rendered', async ({ page }) => {
  await openEditor(page, fixture.slug);
  const s1 = section(page, 1);
  await s1.hover();
  await s1.getByRole('button', { name: 'Section settings' }).click();
  let save = nextSave(page, fixture.slug);
  await inspector(page).locator('input[type="file"]').setInputFiles({ name: 'bg.png', mimeType: 'image/png', buffer: png });
  await save;
  save = nextSave(page, fixture.slug);
  await inspector(page).getByRole('radiogroup', { name: /Darken photo/ }).getByRole('radio', { name: 'Dark' }).click();
  await save;
  expect((await saved())[0].fluidConfig).toMatchObject({ backgroundImage: '/uploads/e2e-bg.png', backgroundOverlay: 'dark' });
  await expect.poll(() => s1.evaluate((el) => getComputedStyle(el).backgroundImage)).toMatch(/linear-gradient.*e2e-bg\.png/);
});

test('U34/U36/live link: selection cleared after editing; preview links inert; no live-page button on a draft', async ({ page }) => {
  await openEditor(page, fixture.slug);
  // Draft page (never published): nothing to open.
  await expect(page.getByRole('button', { name: 'View live page' })).toHaveCount(0);
  await selectBlock(page, 'Hero');
  const h1 = block(page, 'Hero').locator('h1[contenteditable="true"]');
  await h1.click();
  await page.keyboard.press('Control+a');
  await page.keyboard.press('Escape');
  const leftover = await page.locator('iframe[title="Page canvas"]').evaluate((f) => f.contentDocument.getSelection().toString());
  expect(leftover).toBe('');
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Preview' }).click();
  const url = page.url();
  await page.locator('.public-site a[href]').first().click();
  await expect(page.getByText(/Links are disabled in preview/)).toBeVisible();
  expect(page.url()).toBe(url);
});
