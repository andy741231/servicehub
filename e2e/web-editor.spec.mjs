/**
 * Web editor end-to-end tests. Each test starts from the same fixture page
 * (see helpers.mjs); saves are real, so persistence is verified through the
 * API. Run with the dev stack up: `npm run e2e` (see e2e/README.md).
 */
import { test, expect } from '@playwright/test';
import {
  authenticate, createFixturePage, resetFixturePage, deleteFixturePage, getPage,
  FIXTURE_SECTIONS, comparable, diffPaths, canvas, openEditor, block, section,
  selectBlock, inspectorTitle, nextSave,
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
});
test.afterEach(() => {
  expect(pageErrors, 'uncaught errors in the page').toEqual([]);
});

const saved = async () => comparable((await getPage(fixture.slug)).sections);

test('opens straight into editing with the real site renderer', async ({ page }) => {
  await openEditor(page, fixture.slug);
  const c = canvas(page);
  await expect(c.locator('.public-trust-bar')).toHaveCount(1);
  await expect(c.locator('h1').first()).toHaveCSS('font-family', /DM Sans/i);
  await expect(page.getByRole('button', { name: /^save$/i })).toHaveCount(0);
  // No form-field blocks: everything renders as the published design.
  await expect(c.locator('.public-site.site-editor input:not([type=checkbox]), .public-site.site-editor textarea')).toHaveCount(0);
});

test('selecting a block changes nothing; one edit saves exactly one field', async ({ page }) => {
  const puts = [];
  page.on('request', (r) => { if (r.method() === 'PUT' && r.url().endsWith(`/api/web/${fixture.slug}`)) puts.push(r); });
  await openEditor(page, fixture.slug);
  await selectBlock(page, 'Hero');
  await expect.poll(() => inspectorTitle(page)).toMatch(/Hero block/);
  await page.waitForTimeout(2500);
  expect(puts).toHaveLength(0);

  const h1 = block(page, 'Hero').locator('h1[contenteditable="true"]');
  await h1.click();
  await page.keyboard.press('End');
  const save = nextSave(page, fixture.slug);
  await page.keyboard.type(' today'); // includes a space (used to be swallowed)
  await page.keyboard.press('Escape');
  await save;
  const after = await saved();
  expect(diffPaths(comparable(FIXTURE_SECTIONS), after)).toEqual(['0.blocks.0.content.title']);
  expect(after[0].blocks[0].content.title).toContain(' today');
});

test('drag moves a block on the grid; undo/redo restore it', async ({ page }) => {
  await openEditor(page, fixture.slug);
  const hero = await selectBlock(page, 'Hero');
  const before = await hero.boundingBox();
  const handle = canvas(page).locator('.fluid-drag-handle').first();
  const hb = await handle.boundingBox();
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
  await page.mouse.down();
  await page.mouse.move(hb.x + 20, hb.y + 100, { steps: 8 });
  await page.mouse.up();
  await expect.poll(async () => Math.round((await hero.boundingBox()).y)).toBeGreaterThan(Math.round(before.y));
  await page.mouse.click(5, 880);
  await page.keyboard.press('Control+z');
  await expect.poll(async () => Math.round((await hero.boundingBox()).y)).toBe(Math.round(before.y));
  await page.keyboard.press('Control+Shift+Z');
  await expect.poll(async () => Math.round((await hero.boundingBox()).y)).toBeGreaterThan(Math.round(before.y));
});

test('resizing a block snaps to the grid and saves', async ({ page }) => {
  await openEditor(page, fixture.slug);
  await selectBlock(page, 'Trust bar');
  const handle = section(page, 2).locator('.fluid-resize-r').first();
  await handle.scrollIntoViewIfNeeded();
  const hb = await handle.boundingBox();
  const save = nextSave(page, fixture.slug);
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
  await page.mouse.down();
  await page.mouse.move(hb.x - 300, hb.y + hb.height / 2, { steps: 10 });
  await page.mouse.up();
  await save;
  const f = (await saved())[1].blocks[0].fluid;
  expect(f.colStart).toBe(1);
  expect(f.colEnd).toBeLessThan(25); // narrower, on whole columns
  expect(Number.isInteger(f.colEnd)).toBe(true);
});

test('Esc walks the selection up: block → section → nothing', async ({ page }) => {
  await openEditor(page, fixture.slug);
  await selectBlock(page, 'Trust bar');
  await expect.poll(() => inspectorTitle(page)).toMatch(/Trust bar block/);
  await page.keyboard.press('Escape');
  await expect.poll(() => inspectorTitle(page)).toMatch(/Section 2/);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('complementary', { name: 'Inspector' })).toHaveCount(0);
});

test('inspector: design and section settings persist', async ({ page }) => {
  await openEditor(page, fixture.slug);
  await selectBlock(page, 'Trust bar');
  const inspector = page.getByRole('complementary', { name: 'Inspector' });
  await inspector.getByRole('tab', { name: 'Design' }).click();
  const bg = inspector.getByRole('textbox', { name: 'Background', exact: true });
  await bg.fill('#f3e9d2');
  let save = nextSave(page, fixture.slug);
  await bg.press('Enter');
  await save;
  await expect(block(page, 'Trust bar').locator('section').first()).toHaveCSS('background-color', 'rgb(243, 233, 210)');
  expect((await saved())[1].blocks[0].style).toEqual({ backgroundColor: '#f3e9d2' });

  await page.evaluate(() => document.activeElement?.blur());
  await page.keyboard.press('Escape'); // → section 2
  await expect.poll(() => inspectorTitle(page)).toMatch(/Section 2/);
  const above = inspector.getByRole('spinbutton').first();
  await above.fill('40');
  save = nextSave(page, fixture.slug);
  await above.press('Enter');
  await save;
  expect((await saved())[1].paddingTop).toBe(40);
});

test('list items: add inline, remove in the inspector; block grows with content', async ({ page }) => {
  await openEditor(page, fixture.slug);
  await selectBlock(page, 'Events');
  const events = block(page, 'Events');
  for (let i = 0; i < 4; i++) await events.getByRole('button', { name: /Add event/ }).click();
  await expect(events.locator('.public-event')).toHaveCount(6);
  await expect.poll(async () => (await saved())[4].blocks[0].content.items.length, { timeout: 10000 }).toBe(6);
  const fluid = (await saved())[4].blocks[0].fluid;
  expect(fluid.rowEnd).toBeGreaterThan(7); // grew from rows 1–7
  expect(await events.evaluate((el) => el.scrollHeight <= el.clientHeight + 2)).toBe(true);

  const inspector = page.getByRole('complementary', { name: 'Inspector' });
  await expect(inspector.locator('li')).toHaveCount(6);
  const save = nextSave(page, fixture.slug);
  await inspector.getByRole('button', { name: 'Remove item' }).last().click();
  await save;
  expect((await saved())[4].blocks[0].content.items).toHaveLength(5);
});

test('block picker: search + Enter adds below; drag inserts and pushes blocks down', async ({ page }) => {
  await openEditor(page, fixture.slug);
  const s2 = section(page, 2);
  await s2.scrollIntoViewIfNeeded();
  await s2.hover();
  await s2.getByRole('button', { name: 'Add Block', exact: true }).click();
  const picker = page.getByRole('complementary', { name: 'Add block' });
  await picker.getByRole('searchbox', { name: 'Search blocks' }).fill('calendar');
  await expect(picker.getByRole('button', { name: /^Add .* block$/ })).toHaveCount(1);
  let save = nextSave(page, fixture.slug);
  await picker.getByRole('searchbox', { name: 'Search blocks' }).press('Enter');
  await save;
  await expect.poll(() => inspectorTitle(page)).toMatch(/Events block/);
  let s = await saved();
  expect(s[1].blocks.map((b) => b.type)).toEqual(['trust-bar', 'events']);
  expect(s[1].blocks[1].fluid.rowStart).toBeGreaterThanOrEqual(s[1].blocks[0].fluid.rowEnd);

  await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
  const s3 = section(page, 3);
  await s3.scrollIntoViewIfNeeded();
  await s3.hover();
  await s3.getByRole('button', { name: 'Add Block', exact: true }).click();
  const grid = s3.locator(':scope > div.relative').last();
  const gb = await grid.boundingBox();
  save = nextSave(page, fixture.slug);
  await picker.getByRole('button', { name: 'Add Quote block' }).dragTo(grid, { targetPosition: { x: gb.width / 2, y: 20 } });
  await save;
  await page.waitForTimeout(800); // fit-to-content follows as a second save
  s = await saved();
  const quote = s[2].blocks.find((b) => b.type === 'quote').fluid;
  const features = s[2].blocks.find((b) => b.type === 'features').fluid;
  expect(quote.rowStart).toBe(1);
  expect(features.rowStart).toBeGreaterThanOrEqual(quote.rowEnd);
});

test('section picker inserts a ready-made section from a live thumbnail', async ({ page }) => {
  await openEditor(page, fixture.slug);
  await canvas(page).getByRole('button', { name: /^Add Section$/ }).last().click();
  const dlg = page.getByRole('dialog');
  const thumb = dlg.getByRole('button', { name: 'Add Upcoming events section' });
  expect(await thumb.locator('.public-event').evaluateAll((els) => els.filter((e) => e.getClientRects().length).length)).toBe(3);
  const save = nextSave(page, fixture.slug);
  await dlg.getByRole('button', { name: 'Add Two columns of text section' }).click();
  await save;
  await page.waitForTimeout(800);
  const s = await saved();
  expect(s).toHaveLength(FIXTURE_SECTIONS.length + 1);
  const added = s.at(-1).blocks;
  expect(added.map((b) => [b.fluid.colStart, b.fluid.colEnd])).toEqual([[1, 13], [13, 25]]);
  await expect.poll(() => inspectorTitle(page)).toMatch(/Section 6/);
});

test('text toolbars match the field; links use the inline URL field', async ({ page }) => {
  await openEditor(page, fixture.slug);
  const tb = page.getByRole('toolbar', { name: 'Inline text formatting' });
  // Plain field (trust number): no toolbar, no bold.
  await selectBlock(page, 'Trust bar');
  const num = block(page, 'Trust bar').locator('strong[contenteditable="true"]').first();
  await num.click();
  await expect(tb).toHaveCount(0);
  await page.keyboard.press('Control+b');
  await page.keyboard.type('X');
  expect(await num.innerHTML()).not.toContain('<b>');
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape'); await page.keyboard.press('Escape');

  // Title: inline formatting only; link via the inline field.
  await selectBlock(page, 'Hero');
  const h1 = block(page, 'Hero').locator('h1[contenteditable="true"]');
  await h1.click();
  await expect(tb.getByRole('button', { name: 'Bold' })).toHaveCount(1);
  await expect(tb.getByRole('button', { name: 'Heading', exact: true })).toHaveCount(0);
  await page.keyboard.press('Control+a');
  await tb.getByRole('button', { name: 'Link' }).click();
  const url = tb.getByRole('textbox', { name: 'Link URL' });
  await url.fill('javascript:alert(1)');
  await url.press('Enter');
  await expect(tb.getByRole('alert')).toHaveCount(1);
  await url.fill('/about');
  const save = nextSave(page, fixture.slug);
  await url.press('Enter');
  await page.keyboard.press('Escape');
  await save;
  expect((await saved())[0].blocks[0].content.title).toContain('<a href="/about">');
});

test('send to back keeps layers non-negative and the block editable', async ({ page }) => {
  await openEditor(page, fixture.slug);
  // Add a second block to the hero section so there is something to layer.
  const s1 = section(page, 1);
  await s1.hover();
  await s1.getByRole('button', { name: 'Add Block', exact: true }).click();
  let save = nextSave(page, fixture.slug);
  await page.getByRole('complementary', { name: 'Add block' }).getByRole('button', { name: 'Add Text block' }).click();
  await save;
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
  await selectBlock(page, 'Hero');
  save = nextSave(page, fixture.slug);
  await canvas(page).getByRole('button', { name: 'Arrange' }).click();
  await canvas(page).getByRole('menuitem', { name: 'Send to back' }).click();
  await save;
  const zs = (await saved())[0].blocks.map((b) => b.fluid.zIndex);
  expect(zs.every((z) => z >= 0)).toBe(true);
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
  await selectBlock(page, 'Hero');
  const h1 = block(page, 'Hero').locator('h1[contenteditable="true"]');
  await h1.click();
  await expect(h1).toBeFocused();
});

test('mobile view is a real phone viewport with auto layout, customize and reset', async ({ page }) => {
  await openEditor(page, fixture.slug);
  await page.getByRole('radio', { name: /Mobile/ }).first().click();
  const frame = page.locator('iframe[title="Page canvas"]');
  await expect.poll(() => frame.evaluate((el) => el.contentWindow.innerWidth)).toBe(375);
  // Responsive styles apply inside blocks (features collapse to one column).
  await expect.poll(() => canvas(page).locator('.public-feature-card').first()
    .evaluate((el) => getComputedStyle(el.parentElement).gridTemplateColumns.split(' ').length)).toBe(1);
  const s4 = section(page, 4);
  await s4.scrollIntoViewIfNeeded();
  await s4.hover();
  await expect(s4.locator('.react-draggable')).toHaveCount(0); // auto layout: no drag overlays
  let save = nextSave(page, fixture.slug);
  await s4.getByRole('button', { name: /Auto layout/ }).click();
  await save;
  expect((await saved())[3].blocks[0].fluidMobile).toMatchObject({ colStart: 1, colEnd: 7 });
  await s4.hover();
  save = nextSave(page, fixture.slug);
  await s4.getByRole('button', { name: /Reset to auto/ }).click();
  await save;
  expect((await saved())[3].blocks[0].fluidMobile).toBeNull();
});

test('image upload saves the uploaded asset URL (not a temporary blob: URL)', async ({ page }) => {
  // Intercept the upload so no file reaches real asset storage.
  let uploaded = 0;
  await page.route('**/api/web/assets', (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    uploaded += 1;
    return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 'e2e', url: '/uploads/e2e-upload.png', filename: 'e2e-upload.png' }) });
  });
  await openEditor(page, fixture.slug);
  const s5 = section(page, 5);
  await s5.scrollIntoViewIfNeeded();
  await s5.hover();
  await s5.getByRole('button', { name: 'Add Block', exact: true }).click();
  let save = nextSave(page, fixture.slug);
  await page.getByRole('complementary', { name: 'Add block' }).getByRole('button', { name: 'Add Gallery block' }).click();
  await save;
  const gallery = block(page, 'Gallery');
  // New galleries start with three empty image tiles.
  await expect(gallery.getByRole('button', { name: /^Add image: / })).toHaveCount(3);
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
  save = nextSave(page, fixture.slug);
  await gallery.locator('input[type="file"]').first().setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: png });
  await save;
  expect(uploaded).toBe(1);
  const images = (await saved())[4].blocks.find((b) => b.type === 'gallery').content.images;
  expect(images[0].url).toBe('/uploads/e2e-upload.png');
});

test('leaving the editor (browser back) waits for unsaved edits to save', async ({ page }) => {
  // Arrive the way users do — an in-app link — so Back stays inside the app.
  await page.goto('/hub-admin/web/pages');
  await page.locator(`a[href="/hub-admin/web/editor/${fixture.slug}"]`).click();
  await canvas(page).locator('.public-site.site-editor').waitFor();
  await selectBlock(page, 'Hero');
  const h1 = block(page, 'Hero').locator('h1[contenteditable="true"]');
  await h1.click();
  await page.keyboard.press('End');
  await page.keyboard.type(' back');
  await page.keyboard.press('Escape');
  await page.goBack(); // immediately, before the autosave delay
  await page.waitForURL('**/hub-admin/web/pages');
  await expect.poll(async () => (await saved())[0].blocks[0].content.title).toContain(' back');
});

test('preview hides the editor; exit saves and returns to Pages', async ({ page }) => {
  await openEditor(page, fixture.slug);
  await page.getByRole('button', { name: 'Preview' }).click();
  await expect(page.getByRole('button', { name: /Back to editor/ }).first()).toBeVisible();
  await expect(page.locator('iframe[title="Page canvas"]')).toHaveCount(0);
  await page.getByRole('button', { name: /Back to editor/ }).first().click();
  await selectBlock(page, 'Hero');
  const h1 = block(page, 'Hero').locator('h1[contenteditable="true"]');
  await h1.click();
  await page.keyboard.press('End');
  await page.keyboard.type('!');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Exit editor' }).click(); // before autosave fires
  await page.waitForURL('**/hub-admin/web/pages');
  expect((await saved())[0].blocks[0].content.title).toMatch(/!/);
});
