/**
 * Regression tests for the 2026-11-21 UI test findings (docs/web-editor-plan.md,
 * "UI test findings"). Same fixture page approach as web-editor.spec.mjs:
 * a temporary unpublished, hidden page, reset before every test.
 */
import { test, expect } from '@playwright/test';
import {
  authenticate, createFixturePage, resetFixturePage, deleteFixturePage, getPage, api, FIXTURE_SECTIONS,
  canvas, openEditor, block, section, selectBlock, inspectorTitle, nextSave, pickBlock,
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
  await (await pickBlock(page, name)).click();
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
  await page.getByRole('button', { name: 'More actions' }).click();
  await page.getByRole('menuitem', { name: 'Version history' }).click();
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
  // …and after that save the canvas still shows the shared ones (it used to
  // switch to the page's own empty header/footer after the first autosave).
  expect(norm(await canvas(page).locator('.site-editor-frame header').innerText())).toBe(pubHeader);
  expect(norm(await canvas(page).locator('.site-editor-frame footer').innerText())).toBe(pubFooter);
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

test('U40/V1: the canvas never shrinks below 80%, controls keep their size, selecting doesn\'t zoom', async ({ page }) => {
  await openEditor(page, fixture.slug);
  const frame = page.locator('iframe[title="Page canvas"]');
  const scale = async () => Number(await frame.getAttribute('data-canvas-scale'));
  // The inspector column is there even with nothing selected…
  await expect(inspector(page)).toBeVisible();
  const before = await scale();
  // …so selecting a block doesn't change the zoom (the page used to jump).
  await selectBlock(page, 'Features');
  await expect.poll(() => inspectorTitle(page)).toMatch(/Features block/);
  expect(await scale()).toBe(before);
  // Near the window width (1440) and never below 80%.
  expect(before).toBeGreaterThanOrEqual(0.8);
  const inner = await canvas(page).locator('body').evaluate((b) => b.ownerDocument.defaultView.innerWidth);
  expect(inner).toBeGreaterThanOrEqual(1300);
  // Nothing cut off behind the inspector.
  const fb = await frame.boundingBox();
  const ib = await inspector(page).boundingBox();
  expect(fb.x + fb.width).toBeLessThanOrEqual(ib.x + 1);
  // Editor controls on the canvas keep their real size on screen.
  const tbBtn = await canvas(page).getByRole('toolbar', { name: 'Block actions' }).getByRole('button').nth(1).boundingBox();
  expect(Math.round(tbBtn.height)).toBeGreaterThanOrEqual(32);

  // Add block + inspector: still at least 80%; and only one left panel at a time.
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
  const s3 = section(page, 3);
  await s3.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await s3.hover();
  await s3.getByRole('button', { name: 'Add Block', exact: true }).click();
  const picker = page.getByRole('complementary', { name: 'Add block' });
  await expect(picker).toBeVisible();
  expect(await scale()).toBeGreaterThanOrEqual(0.8);
  await page.getByRole('button', { name: 'Toggle layers panel' }).click();
  await expect(page.getByRole('complementary', { name: 'Layers panel' })).toBeVisible();
  await expect(picker).toHaveCount(0);
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
  await (await pickBlock(page, 'Text')).click();
  await save;
  await expect(picker.getByRole('status')).toHaveText(/Added Text/);
  const types = (await saved())[1].blocks.map((b) => b.type);
  expect(types).toEqual(expect.arrayContaining(['trust-bar', 'button', 'text']));
  await picker.getByRole('button', { name: 'Close add block panel' }).click();
  await expect(picker).toHaveCount(0);
});

test('U33: reuse an image from the library (canvas and inspector); alt text for gallery images', async ({ page }) => {
  // A fake library: never list (or touch) the real asset store.
  const LIB = [
    { id: 'e2e-1', url: '/uploads/e2e-lib-1.png', originalName: 'e2e-lib-1.png', mimeType: 'image/png' },
    { id: 'e2e-2', url: '/uploads/e2e-doc.pdf', originalName: 'e2e-doc.pdf', mimeType: 'application/pdf' },
  ];
  await page.route('**/api/web/assets', (route) => (route.request().method() === 'GET' ? route.fulfill({ json: LIB }) : route.fallback()));
  await openEditor(page, fixture.slug);

  // Canvas: an empty gallery tile → dialog → library (images only) → pick.
  let save = nextSave(page, fixture.slug);
  await addBlock(page, 1, 'Gallery');
  await save;
  await page.getByRole('complementary', { name: 'Add block' }).getByRole('button', { name: 'Close add block panel' }).click();
  const gallery = block(page, 'Gallery');
  await gallery.getByRole('button', { name: /^Add image/ }).first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('list', { name: 'Image library' }).getByRole('button')).toHaveCount(1);
  save = nextSave(page, fixture.slug);
  await dialog.getByRole('button', { name: 'Use e2e-lib-1.png' }).click();
  await save;
  const galleryBlock = () => saved().then((secs) => secs[0].blocks.find((b) => b.type === 'gallery'));
  expect((await galleryBlock()).content.images[0].url).toBe('/uploads/e2e-lib-1.png');

  // Alt text for that image, from the inspector list.
  await selectBlock(page, 'Gallery');
  save = nextSave(page, fixture.slug);
  await inspector(page).getByLabel(/^Alt text/).first().fill('Children painting a mural');
  await save;
  await expect.poll(async () => (await galleryBlock()).content.images[0].alt).toBe('Children painting a mural');
  await expect(gallery.locator('img[src="/uploads/e2e-lib-1.png"]')).toHaveAttribute('alt', 'Children painting a mural');

  // Inspector image field: Library → pick.
  await selectBlock(page, 'Hero');
  await inspector(page).getByRole('button', { name: 'Library' }).click();
  save = nextSave(page, fixture.slug);
  await inspector(page).getByRole('button', { name: 'Use e2e-lib-1.png' }).click();
  await save;
  await expect.poll(async () => (await saved())[0].blocks.find((b) => b.type === 'hero').content.backgroundImage).toBe('/uploads/e2e-lib-1.png');
});

test('R1: the Design tab warns when text would be hard to read', async ({ page }) => {
  // The live home page had exactly this: a Features block with white text on cream.
  await openEditor(page, fixture.slug);
  await selectBlock(page, 'Features');
  await inspector(page).getByRole('tab', { name: 'Design' }).click();
  const warning = inspector(page).getByRole('status').filter({ hasText: 'Hard to read' });
  await expect(warning).toHaveCount(0);
  const color = inspector(page).getByRole('textbox', { name: 'Text color', exact: true });
  await color.fill('#ffffff');
  await color.press('Enter');
  await expect(warning).toBeVisible();
  await expect(warning).toContainText('nearly invisible');
  await color.fill('#152b45');
  await color.press('Enter');
  await expect(warning).toHaveCount(0);
});

test('R2: one Arrange menu replaces the four layer buttons (mouse and keyboard)', async ({ page }) => {
  await openEditor(page, fixture.slug);
  await selectBlock(page, 'Trust bar');
  const toolbar = canvas(page).getByRole('toolbar', { name: 'Block actions' });
  await expect(toolbar.getByRole('button', { name: /Bring|Send/ })).toHaveCount(0);
  const arrange = toolbar.getByRole('button', { name: 'Arrange' });
  await arrange.click();
  const menu = canvas(page).getByRole('menu', { name: 'Arrange' });
  await expect(menu.getByRole('menuitem')).toHaveText(['Bring to front', 'Bring forward', 'Send backward', 'Send to back']);
  await expect(menu.getByRole('menuitem').first()).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(menu.getByRole('menuitem', { name: 'Bring forward' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);
  await expect(arrange).toBeFocused();

  // Layers only mean something with two blocks: duplicate (both start at 0).
  let save = nextSave(page, fixture.slug);
  await toolbar.getByRole('button', { name: 'Duplicate block' }).click();
  await save;
  expect((await saved())[1].blocks.map((b) => b.fluid.zIndex ?? 0)).toEqual([0, 0]);
  await canvas(page).getByRole('toolbar', { name: 'Block actions' }).getByRole('button', { name: 'Arrange' }).click();
  save = nextSave(page, fixture.slug);
  await menu.getByRole('menuitem', { name: 'Send to back' }).click();
  await save;
  expect((await saved())[1].blocks.map((b) => b.fluid.zIndex).sort()).toEqual([0, 1]);
  await expect(menu).toHaveCount(0);
});

test('R3/R4/R5: Divider block, Quote button, Gallery layouts', async ({ page }) => {
  await openEditor(page, fixture.slug);
  const picker = page.getByRole('complementary', { name: 'Add block' });

  // Divider: a line by default; switch to empty space.
  let save = nextSave(page, fixture.slug);
  await addBlock(page, 1, 'Divider');
  await save;
  await expect(block(page, 'Divider').locator('hr')).toHaveCount(1);
  // Quote and Gallery from the still-open panel.
  save = nextSave(page, fixture.slug);
  await (await pickBlock(page, 'Quote')).click();
  await save;
  save = nextSave(page, fixture.slug);
  await (await pickBlock(page, 'Gallery')).click();
  await save;
  await picker.getByRole('button', { name: 'Close add block panel' }).click();
  // Closing the panel widens the canvas (its scale changes); wait until it settles.
  const frame = page.locator('iframe[title="Page canvas"]');
  await expect.poll(async () => {
    const a = await frame.boundingBox();
    await page.waitForTimeout(150);
    const b = await frame.boundingBox();
    return a.width === b.width && a.height === b.height;
  }).toBe(true);
  const added = async (type) => (await saved())[0].blocks.find((b) => b.type === type);

  await selectBlock(page, 'Divider');
  save = nextSave(page, fixture.slug);
  await inspector(page).getByLabel('Style').selectOption('space');
  await save;
  await expect(block(page, 'Divider').locator('hr')).toHaveCount(0);
  expect((await added('divider')).content.style).toBe('space');

  // Quote: an optional button, placeholder only until it has a label.
  const quote = block(page, 'Quote');
  await expect(quote.locator('a [contenteditable="true"]')).toHaveCount(1);
  await selectBlock(page, 'Quote');
  await expect(inspector(page).getByLabel('Button style')).toHaveValue('outline');

  // Gallery: logo strip = 6 across at desktop; photo shape = square tiles.
  const gal = block(page, 'Gallery');
  const cols = () => gal.locator('.grid').first().evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
  await expect.poll(cols).toBe(3);
  await selectBlock(page, 'Gallery');
  save = nextSave(page, fixture.slug);
  await inspector(page).getByRole('combobox', { name: /^Layout/ }).selectOption('logos');
  await save;
  await expect.poll(cols).toBe(6);
  save = nextSave(page, fixture.slug);
  await inspector(page).getByRole('combobox', { name: /^Layout/ }).selectOption('photos');
  await save;
  save = nextSave(page, fixture.slug);
  await inspector(page).getByLabel('Photo shape').selectOption('square');
  await save;
  const tile = gal.getByRole('button', { name: /^Add image/ }).first();
  await expect.poll(() => tile.evaluate((el) => getComputedStyle(el).aspectRatio)).toBe('1 / 1');
  expect((await added('gallery')).content).toMatchObject({ layout: 'photos', aspect: 'square' });
});

test('R6: the Contact block shows a form from the Forms app (no dead built-in form)', async ({ page, browser }) => {
  // Fake forms list: never read or touch real forms.
  await page.route('**/api/forms', (route) => route.fulfill({ json: { forms: [{ id: 'e2e-form-1', title: 'E2E sign-up' }] } }));
  await openEditor(page, fixture.slug);
  let save = nextSave(page, fixture.slug);
  await addBlock(page, 1, 'Contact');
  await save;
  await page.getByRole('complementary', { name: 'Add block' }).getByRole('button', { name: 'Close add block panel' }).click();
  const contact = block(page, 'Contact');
  await expect(contact.locator('form')).toHaveCount(0); // the old fake form is gone
  await selectBlock(page, 'Contact');
  const picker = inspector(page).getByRole('combobox', { name: /^Form \(from the Forms app\)/ });
  await expect(picker.locator('option')).toHaveText(['No form', 'E2E sign-up']);
  save = nextSave(page, fixture.slug);
  await picker.selectOption('e2e-form-1');
  await save;
  const content = (await saved())[0].blocks.find((b) => b.type === 'contact').content;
  expect(content).toMatchObject({ formId: 'e2e-form-1', formTitle: 'E2E sign-up' });
  const frame = contact.locator('iframe[title="E2E sign-up"]');
  await expect(frame).toHaveAttribute('src', '/form/e2e-form-1?embed=1');
  // Embed mode: the form page drops its full-screen height so the frame fits the form.
  const v = await browser.newPage();
  await v.goto('/form/e2e-form-1?embed=1');
  await expect(v.locator('html')).toHaveClass(/form-embed/);
  await v.close();
});

test('R7: per-block heading size, weight and font (Design tab)', async ({ page }) => {
  await openEditor(page, fixture.slug);
  const h2 = block(page, 'Features').locator('h2').first();
  const before = await h2.evaluate((el) => getComputedStyle(el).fontSize);
  await selectBlock(page, 'Features');
  await inspector(page).getByRole('tab', { name: 'Design' }).click();
  const size = inspector(page).getByRole('spinbutton', { name: /^Size \(px\)/ }).first();
  let save = nextSave(page, fixture.slug);
  await size.fill('56');
  await size.press('Enter');
  await save;
  await expect.poll(() => h2.evaluate((el) => getComputedStyle(el).fontSize)).toBe('56px');
  expect(before).not.toBe('56px');
  save = nextSave(page, fixture.slug);
  await inspector(page).getByRole('combobox', { name: /^Weight/ }).first().selectOption('800');
  await save;
  save = nextSave(page, fixture.slug);
  await inspector(page).getByRole('combobox', { name: /^Font/ }).selectOption('serif');
  await save;
  await expect.poll(() => h2.evaluate((el) => getComputedStyle(el).fontWeight)).toBe('800');
  await expect.poll(() => h2.evaluate((el) => getComputedStyle(el).fontFamily)).toMatch(/Baskerville|Georgia|serif/);
  expect((await saved())[2].blocks[0].style).toMatchObject({ headingFontSize: 56, headingFontWeight: '800', headingFont: 'serif' });
});

test('R8: save a section and reuse it from Add section → Saved', async ({ page }) => {
  // Saved sections live in the templates table (outside the temp page), so the
  // UI test answers those calls itself — nothing real is written.
  const store = [];
  await page.route('**/api/web/page-templates**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (req.method() === 'POST') {
      const body = req.postDataJSON();
      const row = { id: `e2e-saved-${store.length + 1}`, name: body.name, snapshot: body.snapshot };
      store.push(row);
      return route.fulfill({ status: 201, json: row });
    }
    if (req.method() === 'GET' && url.searchParams.get('kind') === 'section') return route.fulfill({ json: { templates: store } });
    if (req.method() === 'DELETE') { store.splice(store.findIndex((r) => url.pathname.endsWith(r.id)), 1); return route.fulfill({ json: { ok: true } }); }
    return route.abort();
  });
  await openEditor(page, fixture.slug);

  // Save section 3 (Features) under a name.
  const s3 = section(page, 3);
  await s3.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await s3.hover();
  await s3.getByRole('button', { name: /^Section menu/ }).click();
  await canvas(page).getByRole('menuitem', { name: 'Save section' }).click();
  const dlg = page.getByRole('dialog');
  await dlg.getByRole('textbox').fill('E2E features band');
  await dlg.getByRole('button', { name: 'Save section' }).click();
  await expect.poll(() => store.length).toBe(1);
  expect(store[0].snapshot.kind).toBe('section');
  expect(store[0].snapshot.sections).toHaveLength(1);
  expect(store[0].snapshot.sections[0].blocks[0]).toMatchObject({ type: 'features' });
  expect(store[0].snapshot.sections[0].blocks[0].id).toBeUndefined();

  // Insert it at the end of the page from the Saved tab.
  await canvas(page).getByRole('button', { name: /^Add Section$/ }).last().click();
  const picker = page.getByRole('dialog');
  await picker.getByRole('tab', { name: 'Saved' }).click();
  const save = nextSave(page, fixture.slug);
  await picker.getByRole('button', { name: 'Add E2E features band section' }).click();
  await save;
  const secs = await saved();
  expect(secs).toHaveLength(FIXTURE_SECTIONS.length + 1);
  expect(secs.at(-1).blocks[0].type).toBe('features');
  expect(secs.at(-1).blocks[0].content.title).toBe(secs[2].blocks[0].content.title);

  // Delete it from the Saved tab.
  await canvas(page).getByRole('button', { name: /^Add Section$/ }).last().click();
  await picker.getByRole('tab', { name: 'Saved' }).click();
  await picker.getByRole('button', { name: 'Delete saved section E2E features band' }).click();
  await page.getByRole('alertdialog').or(page.getByRole('dialog').filter({ hasText: 'keep their copy' })).getByRole('button', { name: 'Delete' }).click();
  await expect(picker.getByText('No saved sections yet')).toBeVisible();
  expect(store).toHaveLength(0);
});

test('R8: saved sections stay out of the page-template list; malformed ones are refused', async () => {
  const pageTemplates = (await api('GET', '/page-templates')).templates;
  expect(pageTemplates.every((t) => t.snapshot?.kind !== 'section')).toBe(true);
  await expect(api('POST', '/page-templates', { name: 'e2e bad', snapshot: { kind: 'section', sections: [] } })).rejects.toThrow(/400/);
});

test('R9: Slideshow block — arrows, dots and keyboard, in the editor and on the site', async ({ page, browser }) => {
  await openEditor(page, fixture.slug);
  let save = nextSave(page, fixture.slug);
  await addBlock(page, 1, 'Slideshow');
  await save;
  await page.getByRole('complementary', { name: 'Add block' }).getByRole('button', { name: 'Close add block panel' }).click();
  const show = block(page, 'Slideshow');
  const visibleTitle = () => show.locator('[aria-roledescription="slide"][aria-hidden="false"] h3').innerText();
  await expect(show.getByRole('button', { name: /^Show slide/ })).toHaveCount(3);
  await expect.poll(visibleTitle).toBe('Welcome');
  await selectBlock(page, 'Slideshow');
  await show.getByRole('button', { name: 'Next slide' }).click();
  await expect.poll(visibleTitle).toBe('Join us on Sunday');
  await expect(show.getByRole('button', { name: 'Show slide 2' })).toHaveAttribute('aria-current', 'true');
  await show.getByRole('button', { name: 'Previous slide' }).click();
  await show.getByRole('button', { name: 'Previous slide' }).click();
  await expect.poll(visibleTitle).toBe('Serve the city'); // wraps around

  // Published, as a visitor: arrow keys move between slides; auto-advance is off.
  await api('POST', `/${fixture.slug}/publish`);
  try {
    const visitor = await browser.newContext();
    const v = await visitor.newPage();
    await v.goto(`/${fixture.slug}`);
    const pub = v.locator('[aria-roledescription="carousel"]:visible');
    const title = () => pub.locator('[aria-roledescription="slide"][aria-hidden="false"] h3').innerText();
    await expect.poll(title).toBe('Welcome');
    await pub.getByRole('button', { name: 'Next slide' }).focus();
    await v.keyboard.press('ArrowRight');
    await expect.poll(title).toBe('Join us on Sunday');
    await v.keyboard.press('ArrowLeft');
    await expect.poll(title).toBe('Welcome');
    await v.waitForTimeout(6500);
    expect(await title()).toBe('Welcome');
    await visitor.close();
  } finally {
    await api('POST', `/${fixture.slug}/unpublish`);
  }
});

test('U42: a block with long content saves (needs migration 20261122_web_json_columns_nvarchar_max)', async () => {
  // WebBlock.content was NVARCHAR(1000): a few paragraphs of text could not be saved.
  // KNOWN FAILING until the migration is applied to this database
  // (`npx prisma migrate deploy`). Then this test passes, Playwright reports
  // the expected failure as unexpected — delete the next line.
  test.fail(true, 'database column still NVARCHAR(1000) — apply migration 20261122_web_json_columns_nvarchar_max');
  const long = `<p>${'A welcoming community learning to follow Jesus. '.repeat(80)}</p>`; // ~4,000 chars
  const sections = FIXTURE_SECTIONS.map((s, i) => (i !== 0 ? s : {
    ...s, blocks: [...s.blocks, { type: 'text', fluid: { colStart: 1, colEnd: 25, rowStart: 6, rowEnd: 12, zIndex: 0 }, content: { html: long } }],
  }));
  await api('PUT', `/${fixture.slug}`, { header: {}, footer: {}, sections });
  const text = (await saved())[0].blocks.find((b) => b.type === 'text');
  expect(text.content.html).toBe(long);
});

test('V5: a refused save explains itself, stops retrying, and undo gets saving going again', async ({ page }) => {
  await openEditor(page, fixture.slug);
  const heroId = (await saved())[0].blocks[0].id;
  // The server refuses saves as "too long" (what the 1,000-character column did).
  let refuse = true;
  let puts = 0;
  await page.route(`**/api/web/${fixture.slug}`, (route) => {
    if (route.request().method() !== 'PUT') return route.fallback();
    puts += 1;
    if (!refuse) return route.fallback();
    return route.fulfill({ status: 422, json: { error: 'Part of this page is too long to save.', code: 'TOO_LONG', column: 'content', blockId: heroId, blockType: 'hero' } });
  });

  // Any edit triggers a save, which the server refuses.
  await selectBlock(page, 'Hero');
  const h1 = block(page, 'Hero').locator('h1[contenteditable="true"]');
  await h1.click();
  await page.keyboard.press('End');
  await page.keyboard.type(' now');
  await page.keyboard.press('Escape');
  const bar = page.getByRole('alert').filter({ hasText: 'aren’t saved' });
  await expect(bar).toBeVisible();
  await expect(bar).toContainText('the Hero block is too long to save');
  // No futile automatic retries (they used to run every 10 s forever).
  const before = puts;
  await page.waitForTimeout(11500);
  expect(puts).toBe(before);

  // Show block selects it; undoing the refused change saves the page again.
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
  await bar.getByRole('button', { name: 'Show block' }).click();
  await expect.poll(() => inspectorTitle(page)).toMatch(/Hero block/);
  refuse = false;
  const save = nextSave(page, fixture.slug);
  await bar.getByRole('button', { name: 'Undo last change' }).click();
  await save;
  await expect(bar).toHaveCount(0);
  expect((await saved())[0].blocks[0].content.title).not.toContain(' now');
});

// ── Reskin (docs/editor-ui-reskin-prompt.md) ───────────────────────────────

/** Publish the fixture, run `fn` with a visitor page, then unpublish. */
async function asVisitor(browser, fn) {
  await api('POST', `/${fixture.slug}/publish`);
  const ctx = await browser.newContext();
  try {
    const v = await ctx.newPage();
    await v.goto(`/${fixture.slug}`);
    await v.locator('.public-site').waitFor();
    await fn(v);
  } finally {
    await ctx.close();
    await api('POST', `/${fixture.slug}/unpublish`);
  }
}

test('RS1: top bar — icon device switcher, solid Publish, rarer actions in the ⚙ menu', async ({ page }) => {
  await openEditor(page, fixture.slug);
  for (const n of [/^Desktop/, /^Tablet/, /^Mobile/]) await expect(page.getByRole('radio', { name: n })).toBeVisible();
  const publish = page.getByRole('button', { name: 'Publish' });
  const bg = await publish.evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(bg).not.toBe('rgba(0, 0, 0, 0)'); // filled, not text + dot
  await page.getByRole('button', { name: 'More actions' }).click();
  const menu = page.getByRole('menu', { name: 'More actions' });
  await expect(menu.getByRole('menuitem')).toHaveText(['Version history', 'Save as template', 'Keyboard shortcuts']);
  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'More actions' })).toBeFocused();
  await expect(page.getByRole('button', { name: 'Toggle layers panel' })).toBeVisible();
});

test('RS2: Add Block — category rail with tiles; search spans categories; Enter adds the first match', async ({ page }) => {
  await openEditor(page, fixture.slug);
  const s1 = section(page, 1);
  await s1.hover();
  await s1.getByRole('button', { name: 'Add Block', exact: true }).click();
  const picker = page.getByRole('complementary', { name: 'Add block' });
  const rail = picker.getByRole('tablist', { name: 'Block categories' });
  await expect(rail.getByRole('tab')).toHaveText(['Basics', 'Media', 'Lists & features', 'Community', 'Forms', 'Embed', 'Social']);
  // Every category has blocks (no empty rail entries).
  for (const tab of await rail.getByRole('tab').all()) {
    await tab.click();
    expect(await picker.getByRole('tabpanel').getByRole('button').count()).toBeGreaterThan(0);
  }
  await rail.getByRole('tab', { name: 'Media' }).click();
  await expect(picker.getByRole('button', { name: 'Add Audio block' })).toBeVisible();
  await expect(picker.getByRole('button', { name: 'Add Text block' })).toHaveCount(0);
  await picker.getByRole('searchbox').fill('faq');
  await expect(picker.getByRole('button', { name: 'Add Accordion block' })).toBeVisible();
  const save = nextSave(page, fixture.slug);
  await picker.getByRole('searchbox').press('Enter');
  await save;
  expect((await saved())[0].blocks.some((b) => b.type === 'accordion')).toBe(true);
  await expect(picker.getByRole('status')).toHaveText(/Added Accordion/);
});

test('RS3: hide a section — dimmed in the editor, gone from the published page', async ({ page, browser }) => {
  await openEditor(page, fixture.slug);
  const s2 = section(page, 2);
  await s2.hover();
  let save = nextSave(page, fixture.slug);
  await s2.getByRole('button', { name: 'Hide section on the site' }).click();
  await save;
  expect((await saved())[1].fluidConfig.hidden).toBe(true);
  await expect(s2.getByText('Hidden on the site')).toBeVisible();
  await asVisitor(browser, async (v) => {
    await expect(v.locator('.public-site').getByText('One community')).toHaveCount(0); // the trust bar
    await expect(v.locator('.public-site').getByText('Find your place.').first()).toBeVisible(); // others still there
  });
  await s2.hover();
  save = nextSave(page, fixture.slug);
  await s2.getByRole('button', { name: 'Show section on the site' }).click();
  await save;
  expect((await saved())[1].fluidConfig.hidden).toBe(false);
});

test('RS4/RS5: section inspector — spacing, content width, overlay % (old values still read)', async ({ page, browser }) => {
  // An older page: overlay stored as 'dark'.
  const sections = FIXTURE_SECTIONS.map((s, i) => (i !== 0 ? s : { ...s, fluidConfig: { ...s.fluidConfig, backgroundImage: '/uploads/e2e-bg.png', backgroundOverlay: 'dark' } }));
  await api('PUT', `/${fixture.slug}`, { header: {}, footer: {}, sections });
  await openEditor(page, fixture.slug);
  const s1 = section(page, 1);
  await s1.hover();
  await s1.getByRole('button', { name: 'Section settings' }).click();
  await expect(inspector(page).getByRole('tab', { name: 'Section' })).toHaveAttribute('aria-selected', 'true');
  await expect(inspector(page).getByRole('radio', { name: 'Image' })).toHaveAttribute('aria-checked', 'true');
  await expect(inspector(page).getByRole('slider', { name: 'Overlay darkness' })).toHaveValue('65');
  await expect.poll(() => s1.evaluate((el) => getComputedStyle(el).backgroundImage)).toMatch(/rgba\(0, 0, 0, 0\.65\)/);

  let save = nextSave(page, fixture.slug);
  const left = inspector(page).getByRole('spinbutton', { name: /^Left/ });
  await left.fill('40');
  await left.press('Enter');
  await save;
  save = nextSave(page, fixture.slug);
  await inspector(page).getByRole('radiogroup', { name: 'Content width' }).getByRole('radio', { name: 'Narrow' }).click();
  await save;
  const s = (await saved())[0];
  expect(s.paddingLeft).toBe(40);
  expect(s.fluidConfig.contentWidth).toBe('narrow');
  await expect.poll(() => s1.locator(':scope > div[style*="grid"]').first().evaluate((el) => el.getBoundingClientRect().width)).toBeLessThanOrEqual(761);
  await asVisitor(browser, async (v) => {
    const grid = v.locator('.fluid-grid-desktop').first();
    expect(await grid.evaluate((el) => getComputedStyle(el).maxWidth)).toBe('760px');
    await expect.poll(() => v.locator('.public-site main > div').first().evaluate((el) => getComputedStyle(el).backgroundImage)).toMatch(/rgba\(0, 0, 0, 0\.65\)/);
  });
});

test('RS6: Page tab — rename the page (the address stays on the Pages screen)', async ({ page }) => {
  await openEditor(page, fixture.slug);
  const s1 = section(page, 1);
  await s1.hover();
  await s1.getByRole('button', { name: 'Section settings' }).click();
  await inspector(page).getByRole('tab', { name: 'Page' }).click();
  const title = inspector(page).getByRole('textbox', { name: /^Page title/ });
  const patched = page.waitForResponse((r) => r.request().method() === 'PATCH' && /\/api\/web\/pages\//.test(r.url()) && r.ok());
  await title.fill('E2E renamed page');
  await title.press('Enter');
  await patched;
  expect((await getPage(fixture.slug)).title).toBe('E2E renamed page');
  await expect(inspector(page).getByText(`/${fixture.slug}`)).toBeVisible();
  await api('PATCH', `/pages/${fixture.id}`, { title: 'E2E editor page' });
});

test('RS7: new blocks — Accordion, Code, Audio, Social links, Spacer, Form — in the editor and on the site', async ({ page, browser }) => {
  await page.route('**/api/forms', (route) => route.fulfill({ json: { forms: [{ id: 'e2e-form-1', title: 'E2E sign-up' }] } }));
  await openEditor(page, fixture.slug);
  // Each one can be added from the panel.
  const s1 = section(page, 1);
  await s1.hover();
  await s1.getByRole('button', { name: 'Add Block', exact: true }).click();
  for (const name of ['Accordion', 'Code', 'Audio', 'Social links', 'Spacer', 'Form']) {
    const save = nextSave(page, fixture.slug);
    await (await pickBlock(page, name)).click();
    await save;
  }
  const types = (await saved())[0].blocks.map((b) => b.type);
  expect(types).toEqual(expect.arrayContaining(['accordion', 'embed', 'audio', 'social', 'spacer', 'form']));
  await expect(block(page, 'Spacer').getByText('Spacer')).toBeVisible(); // visible while editing

  // Content for the site check, set directly (each block on its own rows).
  const raw = '<div id="e2e-raw">Hello <b>embed</b></div><script>document.getElementById("e2e-raw").dataset.ran = "1"</script>';
  const blocks = [
    { type: 'accordion', content: { title: 'FAQ', openFirst: true, items: [{ question: 'Q one', answer: 'A one' }, { question: 'Q two', answer: 'A two' }] } },
    { type: 'embed', content: { code: raw, height: 200, label: 'Raw embed' } },
    { type: 'embed', content: { code: '<iframe src="https://www.example.com/widget" title="Example widget" allowfullscreen></iframe>', height: 200 } },
    { type: 'audio', content: { title: 'Sermon', url: '/uploads/e2e-sermon.mp3' } },
    { type: 'social', content: { links: [{ network: 'facebook', url: 'https://facebook.com/e2e' }, { network: 'instagram', url: '' }] } },
    { type: 'spacer', content: {} },
    { type: 'form', content: { formId: 'e2e-form-1', formTitle: 'E2E sign-up' } },
  ].map((b, i) => ({ ...b, fluid: { colStart: 1, colEnd: 25, rowStart: 1 + i * 4, rowEnd: 5 + i * 4, zIndex: 0 } }));
  await api('PUT', `/${fixture.slug}`, { header: {}, footer: {}, sections: [{ ...FIXTURE_SECTIONS[0], blocks }] });
  expect((await saved())[0].blocks[1].content.code).toBe(raw); // stored exactly as typed

  for (const width of [1440, 390]) {
    await asVisitor(browser, async (v) => {
      await v.setViewportSize({ width, height: 900 });
      const site = v.locator(width > 700 ? '.fluid-grid-desktop' : '.fluid-grid-mobile').first();
      // Accordion: native disclosure, first open
      await expect(site.locator('details')).toHaveCount(2);
      await expect(site.locator('details').first()).toHaveAttribute('open', '');
      await site.locator('summary', { hasText: 'Q two' }).click();
      await expect(site.locator('details').nth(1)).toHaveAttribute('open', '');
      // Code: raw HTML in a sandbox without same-origin; a lone https iframe passes through
      const rawFrame = site.locator('iframe[title="Raw embed"]');
      expect(await rawFrame.getAttribute('sandbox')).not.toContain('allow-same-origin');
      await expect(rawFrame.contentFrame().locator('#e2e-raw')).toHaveAttribute('data-ran', '1');
      await expect(site.locator('iframe[src="https://www.example.com/widget"]')).toHaveCount(1);
      // Audio
      await expect(site.locator('audio[src="/uploads/e2e-sermon.mp3"]')).toHaveCount(1);
      // Social: only links with an address
      await expect(site.getByRole('link', { name: 'Facebook' })).toHaveAttribute('href', 'https://facebook.com/e2e');
      await expect(site.getByRole('link', { name: 'Instagram' })).toHaveCount(0);
      // Spacer: nothing visible
      await expect(site.getByText('Spacer', { exact: true })).toHaveCount(0);
      // Form from the Forms app
      await expect(site.locator('iframe[title="E2E sign-up"]')).toHaveAttribute('src', '/form/e2e-form-1?embed=1');
    });
  }
});

test('RS8: section video background — set in the inspector, plays on the site', async ({ page, browser }) => {
  await openEditor(page, fixture.slug);
  const s1 = section(page, 1);
  await s1.hover();
  await s1.getByRole('button', { name: 'Section settings' }).click();
  await inspector(page).getByRole('radio', { name: 'Video' }).click();
  const save = nextSave(page, fixture.slug);
  const url = inspector(page).getByRole('textbox', { name: /URL$/ });
  await url.fill('/uploads/e2e-loop.mp4');
  await url.press('Enter');
  await save;
  expect((await saved())[0].fluidConfig.backgroundVideo).toBe('/uploads/e2e-loop.mp4');
  await expect(s1.locator('video[src="/uploads/e2e-loop.mp4"]')).toHaveCount(1);
  await asVisitor(browser, async (v) => {
    const video = v.locator('.public-site video').first();
    await expect(video).toHaveAttribute('src', '/uploads/e2e-loop.mp4');
    expect(await video.evaluate((el) => [el.muted, el.loop, el.autoplay, el.closest('[aria-hidden="true"]') != null])).toEqual([true, true, true, true]);
  });
});

// ── Column layout model ────────────────────────────────────────────────────

/** Section 1 in 3 columns (Text + Button stacked in column 1, Quote in column 2) above a freeform section. */
async function columnFixture() {
  const col = (c, r0, r1) => ({ colStart: c * 8 + 1, colEnd: c * 8 + 9, rowStart: r0, rowEnd: r1, zIndex: 0 });
  const sections = [
    { fluidConfig: { gridColumns: 24, rowHeight: 80, gap: { horizontal: 8, vertical: 8 }, columns: 3 }, paddingTop: 40, paddingBottom: 40, blocks: [
      { type: 'text', fluid: col(0, 1, 3), content: { content: '<p>Column one, first.</p>' } },
      { type: 'button', fluid: col(0, 3, 5), content: { buttonText: 'Give', buttonLink: '/give', buttonVariant: 'gold', align: 'center' } },
      { type: 'quote', fluid: col(1, 1, 4), content: { quote: 'Column two.', citation: 'Q' } },
    ] },
    FIXTURE_SECTIONS[1],
  ];
  await api('PUT', `/${fixture.slug}`, { header: {}, footer: {}, sections });
}
const fluids = async (sIdx = 0) => (await saved())[sIdx].blocks.map((b) => ({ type: b.type, ...b.fluid }));
const noOverlap = (list) => {
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i]; const b = list[j];
      const overlap = a.colStart < b.colEnd && b.colStart < a.colEnd && a.rowStart < b.rowEnd && b.rowStart < a.rowEnd;
      if (overlap) return `${a.type} overlaps ${b.type}`;
    }
  }
  return null;
};
const byType = (list, t) => list.find((f) => f.type === t);
async function dragBy(page, label, dx, dy) {
  await selectBlock(page, label);
  const handle = canvas(page).locator('.fluid-drag-handle').first(); // only the selected block shows one
  const hb = await handle.boundingBox();
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
  await page.mouse.down();
  await page.mouse.move(hb.x + hb.width / 2 + dx, hb.y + hb.height / 2 + dy, { steps: 12 });
  await page.mouse.up();
}

test('CM1: switch a section to columns and back — freeform stays exactly as it was', async ({ page }) => {
  await openEditor(page, fixture.slug);
  const before = (await saved())[2].blocks[0].fluid;
  const s3 = section(page, 3);
  await s3.hover();
  await s3.getByRole('button', { name: 'Section settings' }).click();
  const cols = inspector(page).getByRole('radiogroup', { name: 'Columns' });
  await expect(cols.getByRole('radio', { name: 'Free' })).toHaveAttribute('aria-checked', 'true'); // existing sections
  let save = nextSave(page, fixture.slug);
  await cols.getByRole('radio', { name: '3' }).click();
  await save;
  const s = (await saved())[2];
  expect(s.fluidConfig.columns).toBe(3);
  expect(s.blocks[0].fluid).toMatchObject({ colStart: 1, colEnd: 25, rowStart: 1 }); // full width = all 3 columns
  save = nextSave(page, fixture.slug);
  await cols.getByRole('radio', { name: 'Free' }).click();
  await save;
  expect((await saved())[2].fluidConfig.columns).toBeUndefined();
  expect((await saved())[2].blocks[0].fluid).toMatchObject({ colStart: before.colStart, colEnd: before.colEnd });
});

test('CM2: new blocks are one column wide and go to the shortest column; no layer controls', async ({ page }) => {
  await columnFixture();
  await openEditor(page, fixture.slug);
  const s1 = section(page, 1);
  await s1.hover();
  await s1.getByRole('button', { name: 'Add Block', exact: true }).click();
  let save = nextSave(page, fixture.slug);
  await (await pickBlock(page, 'Image')).click();
  await save;
  let list = await fluids();
  expect(byType(list, 'image')).toMatchObject({ colStart: 17, colEnd: 25, rowStart: 1 }); // column 3 was empty
  save = nextSave(page, fixture.slug);
  await (await pickBlock(page, 'Divider')).click();
  await save;
  list = await fluids();
  // Column heights now: 1 → row 5, 2 → row 4, 3 → below the image. Column 2 is shortest.
  expect(byType(list, 'divider')).toMatchObject({ colStart: 9, colEnd: 17, rowStart: 4 });
  expect(noOverlap(list)).toBeNull();
  await page.getByRole('complementary', { name: 'Add block' }).getByRole('button', { name: 'Close add block panel' }).click();
  // Layers don't apply in column mode; the freeform section still has them.
  await selectBlock(page, 'Quote');
  await expect(canvas(page).getByRole('toolbar', { name: 'Block actions' }).getByRole('button', { name: 'Arrange' })).toHaveCount(0);
  await selectBlock(page, 'Trust bar');
  await expect(canvas(page).getByRole('toolbar', { name: 'Block actions' }).getByRole('button', { name: 'Arrange' })).toHaveCount(1);
});

test('CM3: dragging a block into another column inserts it there and pushes the column down', async ({ page }) => {
  await columnFixture();
  await openEditor(page, fixture.slug);
  const btn = await block(page, 'Button').boundingBox();
  const quote = await block(page, 'Quote').boundingBox();
  const save = nextSave(page, fixture.slug);
  await dragBy(page, 'Button', quote.x - btn.x, quote.y - btn.y); // onto the top of column 2
  await save;
  const list = await fluids();
  expect(byType(list, 'button')).toMatchObject({ colStart: 9, colEnd: 17, rowStart: 1, rowEnd: 3 });
  expect(byType(list, 'quote')).toMatchObject({ colStart: 9, rowStart: 3, rowEnd: 6 }); // pushed down
  expect(byType(list, 'text')).toMatchObject({ colStart: 1, rowStart: 1 }); // column 1 closed up
  expect(noOverlap(list)).toBeNull();
});

test('CM4: horizontal resize snaps to whole columns; nothing overlaps', async ({ page }) => {
  await columnFixture();
  await openEditor(page, fixture.slug);
  await selectBlock(page, 'Text');
  const tb = await block(page, 'Text').boundingBox();
  const handle = section(page, 1).locator('.fluid-resize-r').first();
  const hb = await handle.boundingBox();
  const save = nextSave(page, fixture.slug);
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
  await page.mouse.down();
  await page.mouse.move(hb.x + tb.width * 1.1, hb.y + hb.height / 2, { steps: 12 }); // ~2.1 columns wide
  await page.mouse.up();
  await save;
  const list = await fluids();
  const text = byType(list, 'text');
  expect((text.colStart - 1) % 8).toBe(0);
  expect((text.colEnd - 1) % 8).toBe(0);
  expect(text.colEnd - text.colStart).toBe(16); // two columns
  // Spanning columns 1–2, it now sits above the quote, which moved down.
  expect(noOverlap(list)).toBeNull();
});

test('CM5: Layout tab — column, width and position in the column', async ({ page }) => {
  await columnFixture();
  await openEditor(page, fixture.slug);
  await selectBlock(page, 'Quote');
  await inspector(page).getByRole('tab', { name: 'Layout' }).click();
  let save = nextSave(page, fixture.slug);
  await inspector(page).getByRole('combobox', { name: /^Column/ }).selectOption({ label: '3 of 3' });
  await save;
  expect(byType(await fluids(), 'quote')).toMatchObject({ colStart: 17, rowStart: 1 });

  await selectBlock(page, 'Button');
  await inspector(page).getByRole('tab', { name: 'Layout' }).click();
  await expect(inspector(page).getByText('2 of 2')).toBeVisible();
  save = nextSave(page, fixture.slug);
  await inspector(page).getByRole('button', { name: 'Move up' }).click();
  await save;
  const list = await fluids();
  expect(byType(list, 'button')).toMatchObject({ rowStart: 1, rowEnd: 3 });
  expect(byType(list, 'text')).toMatchObject({ rowStart: 3, rowEnd: 5 });
  await expect(inspector(page).getByText('1 of 2')).toBeVisible();
});

test('CM6: drag a block onto another section to move it there', async ({ page }) => {
  await columnFixture();
  await openEditor(page, fixture.slug);
  await selectBlock(page, 'Button');
  const hb = await canvas(page).locator('.fluid-drag-handle').first().boundingBox();
  const save = nextSave(page, fixture.slug);
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
  await page.mouse.down();
  await page.mouse.move(hb.x + hb.width / 2 + 10, hb.y + hb.height / 2 + 10, { steps: 3 });
  // Measure the target now: while dragging, the source section shows two
  // spare rows, which moves the sections below it down.
  const target = await section(page, 2).boundingBox();
  await page.mouse.move(target.x + target.width / 2, target.y + 40, { steps: 12 });
  await page.mouse.up();
  await save;
  const secs = await saved();
  expect(secs[0].blocks.map((b) => b.type)).toEqual(['text', 'quote']);
  expect(secs[1].blocks.map((b) => b.type)).toEqual(['trust-bar', 'button']);
  expect(noOverlap(await fluids(0))).toBeNull();
});

test('CM7: a new blank section starts with 3 columns', async ({ page }) => {
  await openEditor(page, fixture.slug);
  const save = nextSave(page, fixture.slug);
  await canvas(page).getByRole('button', { name: /^Add Section$/ }).last().click();
  await page.getByRole('dialog').getByRole('button', { name: 'Add Blank section' }).click();
  await save;
  const secs = await saved();
  expect(secs.at(-1).fluidConfig.columns).toBe(3);
  expect(secs.slice(0, -1).every((s) => s.fluidConfig.columns === undefined)).toBe(true); // existing ones untouched
});

// ── Site color palette ─────────────────────────────────────────────────────
// The theme is site-wide (not a temp page), so these tests answer
// /api/web/styles themselves — the real theme is never written.
const FAKE_TOKENS = {
  colors: { primary: '#152b45', secondary: '#54738e', accent: '#b08a4a', background: '#f8f6f1', text: '#152b45', muted: '#647384' },
  fonts: { heading: 'DM Sans, sans-serif', body: 'DM Sans, sans-serif', serif: 'Libre Baskerville, Georgia, serif' },
  spacing: { base: 16 },
  borderRadius: { default: 5 },
  palette: [{ name: 'E2E Rose', value: '#d14d72' }, { name: 'E2E Moss', value: '#5b7553' }],
};
async function fakeStyles(page, tokens = FAKE_TOKENS) {
  const puts = [];
  let current = JSON.parse(JSON.stringify(tokens));
  await page.route('**/api/web/styles', async (route) => {
    if (route.request().method() === 'PUT') {
      const body = route.request().postDataJSON();
      puts.push(body.tokens);
      current = body.tokens;
      return route.fulfill({ json: { id: 'e2e', tokens: current } });
    }
    return route.fulfill({ json: { id: 'e2e', tokens: current } });
  });
  return puts;
}

test('P1: Styles — palette rows: add, rename, recolour, normalise, delete; presets in the token pickers', async ({ page }) => {
  const puts = await fakeStyles(page);
  await page.goto('/hub-admin/web/styles');
  const section = page.getByRole('region', { name: 'Color palette' });
  await expect(section.getByRole('textbox', { name: /^Name of palette color/ })).toHaveCount(2);
  // Token picker shows theme + palette presets.
  await page.getByRole('button', { name: 'Pick Primary color' }).click();
  const dialog = page.getByRole('dialog', { name: 'Color picker' });
  await expect(dialog.getByRole('group', { name: 'Site colors' }).getByRole('button')).toHaveCount(8);
  await expect(dialog.getByRole('button', { name: 'E2E Rose #d14d72' })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Primary #152b45' })).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');

  // Add → "Color 3", rename + short hex, which is normalised on save.
  await section.getByRole('button', { name: 'Add color' }).click();
  const name3 = section.getByRole('textbox', { name: 'Name of palette color 3' });
  await expect(name3).toHaveValue('Color 3');
  await name3.fill('E2E Sky');
  await section.getByRole('textbox', { name: 'Hex value of E2E Sky' }).fill('#8CF');
  // An unnamed color blocks saving.
  await section.getByRole('textbox', { name: 'Name of palette color 1' }).fill('');
  await expect(section.getByText('Give this color a name')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();
  await section.getByRole('textbox', { name: 'Name of palette color 1' }).fill('E2E Rose');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect.poll(() => puts.length).toBe(1);
  expect(puts[0].palette).toEqual([{ name: 'E2E Rose', value: '#d14d72' }, { name: 'E2E Moss', value: '#5b7553' }, { name: 'E2E Sky', value: '#88ccff' }]);
  expect(puts[0].colors).toEqual(FAKE_TOKENS.colors); // the rest of the theme rides along untouched

  // Delete all → empty state; saving an empty palette keeps it empty.
  for (const n of ['E2E Rose', 'E2E Moss', 'E2E Sky']) await section.getByRole('button', { name: `Delete ${n}` }).click();
  await expect(section.getByText(/No palette colors\. Add your brand colors/)).toBeVisible();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect.poll(() => puts.length).toBe(2);
  expect(puts[1].palette).toEqual([]);
});

test('P1b: Styles — an older theme without a palette shows the default one (and keeps it on save)', async ({ page }) => {
  const { palette, ...older } = FAKE_TOKENS; // eslint-disable-line no-unused-vars
  await fakeStyles(page, older);
  await page.goto('/hub-admin/web/styles');
  const section = page.getByRole('region', { name: 'Color palette' });
  await expect(section.getByRole('textbox', { name: /^Name of palette color/ })).toHaveCount(8);
  await expect(section.getByRole('textbox', { name: 'Name of palette color 1' })).toHaveValue('White');
});

test('P2: inspector colors — site presets apply in one undo step; custom hex commits once on Done', async ({ page }) => {
  // The editor gets the theme with the page: swap in a known palette.
  await page.route(`**/api/web/admin/${fixture.slug}`, async (route) => {
    const res = await route.fetch();
    const json = await res.json();
    json.siteStyle = { ...(json.siteStyle || {}), tokens: FAKE_TOKENS };
    return route.fulfill({ response: res, json });
  });
  await openEditor(page, fixture.slug);
  await selectBlock(page, 'Features');
  await inspector(page).getByRole('tab', { name: 'Design' }).click();
  const trigger = inspector(page).getByRole('button', { name: 'Pick Background color' });
  await expect(trigger).toHaveAttribute('title', /theme default/);
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Color picker' });
  await expect(dialog.getByRole('group', { name: 'Site colors' }).getByRole('button')).toHaveCount(8);
  // Unset (theme default): no preset claims to be the current color.
  await expect(dialog.locator('[aria-pressed="true"]')).toHaveCount(0);
  let save = nextSave(page, fixture.slug);
  await dialog.getByRole('button', { name: 'E2E Moss #5b7553' }).click();
  await save;
  expect((await saved())[2].blocks[0].style).toMatchObject({ backgroundColor: '#5b7553' });
  await expect(dialog.getByRole('button', { name: 'E2E Moss #5b7553' })).toHaveAttribute('aria-pressed', 'true');
  await dialog.getByRole('button', { name: 'Done' }).click();
  await expect(dialog).toHaveCount(0);
  // One undo step reverts it.
  save = nextSave(page, fixture.slug);
  await page.keyboard.press('Control+z');
  await save;
  expect((await saved())[2].blocks[0].style?.backgroundColor).toBeUndefined();

  // Custom hex in the popover: nothing saved while typing, one save on Done.
  const puts = [];
  page.on('request', (r) => { if (r.method() === 'PUT' && r.url().endsWith(`/api/web/${fixture.slug}`)) puts.push(r); });
  await trigger.click();
  await dialog.getByRole('textbox').fill('#123456');
  await page.waitForTimeout(2500); // longer than the autosave pause
  expect(puts).toHaveLength(0);
  save = nextSave(page, fixture.slug);
  await dialog.getByRole('button', { name: 'Done' }).click();
  await save;
  expect((await saved())[2].blocks[0].style).toMatchObject({ backgroundColor: '#123456' });
  await page.waitForTimeout(500);
  expect(puts).toHaveLength(1);
  // Reset → back to the theme default.
  save = nextSave(page, fixture.slug);
  await inspector(page).getByRole('button', { name: 'Clear Background' }).click();
  await save;
  expect((await saved())[2].blocks[0].style?.backgroundColor).toBeUndefined();
});

test('P3: Header & Footer color rows offer the site colors', async ({ page }) => {
  await fakeStyles(page);
  await page.route('**/api/web/**', (route) => (route.request().method() === 'GET' ? route.fallback() : route.abort()));
  await page.route('**/api/web/admin/home', (route) => route.fulfill({ json: { slug: 'home', header: { logo: { text: 'E2E' }, navigation: [], styles: {} }, footer: { sections: [], styles: {} }, headerFooterLive: true } }));
  await page.goto('/hub-admin/web/header-footer');
  await page.getByRole('button', { name: /^Pick .* color$/ }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Color picker' });
  await expect(dialog.getByRole('button', { name: 'E2E Rose #d14d72' })).toBeVisible();
  await expect(dialog.getByRole('group', { name: 'Site colors' }).getByRole('button')).toHaveCount(8);
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
  await inspector(page).getByRole('radio', { name: 'Image' }).click();
  let save = nextSave(page, fixture.slug);
  await inspector(page).locator('input[type="file"]').setInputFiles({ name: 'bg.png', mimeType: 'image/png', buffer: png });
  await save;
  save = nextSave(page, fixture.slug);
  await inspector(page).getByRole('slider', { name: 'Overlay darkness' }).fill('65');
  await save;
  expect((await saved())[0].fluidConfig).toMatchObject({ backgroundImage: '/uploads/e2e-bg.png', backgroundOverlay: 65 });
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
