import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = 'http://localhost:3003';
const SHOTS = './.tmp-ux-audit/shots';
fs.mkdirSync(SHOTS, { recursive: true });

const log = [];
const note = (m) => { console.log(m); log.push(m); };
const shot = async (p, name) => {
  await p.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
  note(`[shot] ${name}.png`);
};

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
p.on('console', (m) => { if (m.type() === 'error') note(`[console.error] ${m.text()}`); });
p.on('pageerror', (e) => note(`[pageerror] ${e.message}`));

try {
  // 1. Login as admin
  note('=== STEP 1: Login as admin ===');
  await p.goto(`${BASE}/hub-admin`, { waitUntil: 'networkidle' });
  await shot(p, '01-login');
  // Fill login form (username-based)
  const userInput = p.locator('input[placeholder="Username"]').first();
  await userInput.fill('admin');
  const pwInput = p.locator('input[type="password"]').first();
  await pwInput.fill('Admin@2024!');
  const submitBtn = p.locator('button[type="submit"]').first();
  await submitBtn.click();
  await p.waitForURL(/hub-admin\/(forms|web|admin|email|directory|portal)/, { timeout: 15000 }).catch(() => note('warn: no nav after login'));
  await p.waitForTimeout(1500);
  await shot(p, '02-after-login');
  note(`URL after login: ${p.url()}`);

  // 2. Navigate to Forms dashboard
  note('=== STEP 2: Go to Forms dashboard ===');
  await p.goto(`${BASE}/hub-admin/forms`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1500);
  await shot(p, '03-forms-dashboard');
  note(`URL: ${p.url()}`);

  // Count form cards
  const cards = await p.locator('div.group').count();
  note(`Form cards visible: ${cards}`);

  // Inspect the overflow menu items available
  note('=== STEP 3: Inspect overflow menu actions ===');
  if (cards > 0) {
    const menuBtn = p.locator('button[aria-label="More actions"]').first();
    await menuBtn.click();
    await p.waitForTimeout(400);
    await shot(p, '04-overflow-menu');
    const menuItems = await p.locator('[role="menu"] [role="menuitem"]').allTextContents();
    note(`Overflow menu actions: ${JSON.stringify(menuItems)}`);
    // close menu
    await p.mouse.click(10, 10);
    await p.waitForTimeout(300);
  } else {
    note('No forms exist — creating one to test against');
    await p.locator('button:has-text("Create Form")').first().click();
    await p.waitForTimeout(2000);
    await shot(p, '04b-new-form-builder');
  }

  // 4. Try RENAME from dashboard: look for any inline rename / rename menu item
  note('=== STEP 4: Look for Rename capability on dashboard ===');
  const renameMenu = await p.locator('[role="menuitem"]:has-text("Rename")').count();
  const renameBtn = await p.locator('button:has-text("Rename")').count();
  const editableTitle = await p.locator('h3[contenteditable="true"]').count();
  note(`Rename menu item count: ${renameMenu}, Rename button count: ${renameBtn}, contenteditable title: ${editableTitle}`);
  // Try double-clicking the title to see if inline edit exists
  if (cards > 0) {
    const title = p.locator('h3.truncate').first();
    await title.dblclick().catch(() => note('dblclick on title failed'));
    await p.waitForTimeout(500);
    await shot(p, '05-after-dblclick-title');
    const hasInput = await p.locator('input:focus, textarea:focus').count();
    note(`Focused input after dblclick: ${hasInput}`);
  }

  // 5. EDIT a form (open builder)
  note('=== STEP 5: Open builder (Edit) ===');
  await p.goto(`${BASE}/hub-admin/forms`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1200);
  const editBtn = p.locator('button:has-text("Edit")').first();
  if (await editBtn.count()) {
    await editBtn.click();
    await p.waitForTimeout(2500);
    await shot(p, '06-builder');
    note(`Builder URL: ${p.url()}`);
    // Look for title editing in builder
    const titleInputs = await p.locator('input, textarea, [contenteditable]').allTextContents();
    note(`Builder editable elements (first 5): ${JSON.stringify(titleInputs.slice(0, 5))}`);
    // Check for a title field
    const titleField = p.locator('input[aria-label*="title" i], input[placeholder*="title" i], h1, h2').first();
    note(`Title field present: ${await titleField.count()}`);
  } else {
    note('No Edit button found');
  }

  // 6. View submissions
  note('=== STEP 6: View submissions ===');
  await p.goto(`${BASE}/hub-admin/forms`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1200);
  const menuBtn2 = p.locator('button[aria-label="More actions"]').first();
  if (await menuBtn2.count()) {
    await menuBtn2.click();
    await p.waitForTimeout(400);
    const subsItem = p.locator('[role="menuitem"]:has-text("Submissions")').first();
    if (await subsItem.count()) {
      await subsItem.click();
      await p.waitForTimeout(2000);
      await shot(p, '07-submissions');
      note(`Submissions URL: ${p.url()}`);
      const rows = await p.locator('table tbody tr').count();
      note(`Submission rows: ${rows}`);
    } else {
      note('No Submissions menu item');
    }
  }

  // 7. Delete a form
  note('=== STEP 7: Delete a form ===');
  await p.goto(`${BASE}/hub-admin/forms`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1200);
  const beforeCount = await p.locator('div.group').count();
  note(`Form count before delete: ${beforeCount}`);
  if (beforeCount > 0) {
    // Set up dialog handler BEFORE triggering
    p.once('dialog', (d) => { note(`Dialog: "${d.message()}"`); d.accept(); });
    const menuBtn3 = p.locator('button[aria-label="More actions"]').first();
    await menuBtn3.click();
    await p.waitForTimeout(400);
    const delItem = p.locator('[role="menuitem"]:has-text("Delete")').first();
    await delItem.click();
    await p.waitForTimeout(1500);
    await shot(p, '08-after-delete');
    const afterCount = await p.locator('div.group').count();
    note(`Form count after delete: ${afterCount}`);
  }

  // 8. Try the share action
  note('=== STEP 8: Share link ===');
  await p.goto(`${BASE}/hub-admin/forms`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1200);
  const shareBtn = p.locator('button:has-text("Share")').first();
  if (await shareBtn.count()) {
    await shareBtn.click();
    await p.waitForTimeout(800);
    await shot(p, '09-share');
    note('Share clicked (copies to clipboard)');
  }

  note('=== AUDIT COMPLETE ===');
} catch (e) {
  note(`FATAL: ${e.stack || e.message}`);
  await shot(p, 'fatal').catch(() => {});
} finally {
  fs.writeFileSync('./.tmp-ux-audit/audit-log.txt', log.join('\n'));
  await browser.close();
}
