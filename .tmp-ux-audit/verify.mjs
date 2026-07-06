import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = 'http://localhost:3003';
const SHOTS = './shots';
fs.mkdirSync(SHOTS, { recursive: true });

const log = [];
const note = (m) => { console.log(m); log.push(m); };
const shot = async (p, name) => {
  await p.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
  note(`[shot] ${name}.png`);
};

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: [] });
const p = await ctx.newPage();
p.on('pageerror', (e) => note(`[pageerror] ${e.message}`));

let renamedFormId = null;
let originalTitle = null;

try {
  // Login
  note('=== LOGIN ===');
  await p.goto(`${BASE}/hub-admin`, { waitUntil: 'networkidle' });
  await p.locator('input[placeholder="Username"]').fill('admin');
  await p.locator('input[type="password"]').fill('Admin@2024!');
  await p.locator('button[type="submit"]').click();
  await p.waitForTimeout(1500);

  // Go to forms dashboard
  note('=== FORMS DASHBOARD ===');
  await p.goto(`${BASE}/hub-admin/forms`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1500);
  const beforeCount = await p.locator('div.group').count();
  note(`Form cards: ${beforeCount}`);

  // Verify Rename menu item now exists
  note('=== VERIFY RENAME MENU ITEM ===');
  await p.locator('button[aria-label="More actions"]').first().click();
  await p.waitForTimeout(400);
  const menuItems = await p.locator('[role="menu"] [role="menuitem"]').allTextContents();
  note(`Menu actions: ${JSON.stringify(menuItems)}`);
  const hasRename = menuItems.map(s => s.trim()).includes('Rename');
  note(`Rename present in menu: ${hasRename}`);
  await shot(p, 'a-menu-with-rename');

  // Click Rename, verify modal opens
  note('=== OPEN RENAME MODAL ===');
  await p.locator('[role="menuitem"]:has-text("Rename")').first().click();
  await p.waitForTimeout(500);
  const dialogVisible = await p.locator('[role="dialog"][aria-modal="true"]').count();
  note(`Rename dialog visible: ${dialogVisible}`);
  const renameInput = p.locator('#rename-input');
  const inputValue = await renameInput.inputValue();
  note(`Rename input prefilled with: "${inputValue}"`);
  originalTitle = inputValue;
  await shot(p, 'b-rename-modal');

  // Type a new name and save
  note('=== SUBMIT RENAME ===');
  await renameInput.fill('UX Audit Test Form [renamed]');
  await p.locator('button[type="submit"]:has-text("Save")').click();
  await p.waitForTimeout(1500);
  const dialogAfter = await p.locator('[role="dialog"][aria-modal="true"]').count();
  note(`Dialog still open after save: ${dialogAfter}`);
  // Verify the card title updated
  const firstTitle = await p.locator('h3.truncate').first().textContent();
  note(`First card title after rename: "${firstTitle}"`);
  await shot(p, 'c-after-rename');

  // Verify toast appeared (toast container)
  const toastText = await p.locator('text=Renamed to').count();
  note(`Rename toast shown: ${toastText}`);

  // Test inline rename in builder header
  note('=== BUILDER INLINE RENAME ===');
  await p.locator('button:has-text("Edit")').first().click();
  await p.waitForTimeout(2500);
  note(`Builder URL: ${p.url()}`);
  // Click the header title button
  const headerTitleBtn = p.locator('button[aria-label="Rename form"]').first();
  const headerBtnCount = await headerTitleBtn.count();
  note(`Header rename button present: ${headerBtnCount}`);
  if (headerBtnCount) {
    await headerTitleBtn.click();
    await p.waitForTimeout(400);
    const headerInput = p.locator('input[aria-label="Rename form"]');
    const headerInputVisible = await headerInput.count();
    note(`Header inline rename input visible: ${headerInputVisible}`);
    if (headerInputVisible) {
      await headerInput.fill('UX Audit Test Form [inline]');
      await headerInput.press('Enter');
      await p.waitForTimeout(1500);
      note('Inline rename committed via Enter');
    }
    await shot(p, 'd-builder-inline-rename');
  }

  // Test delete confirm modal (styled, not native confirm)
  note('=== DELETE CONFIRM MODAL ===');
  await p.goto(`${BASE}/hub-admin/forms`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1500);
  const countBeforeDelete = await p.locator('div.group').count();
  note(`Forms before delete: ${countBeforeDelete}`);
  // Set up dialog handler to detect native confirm (should NOT fire)
  let nativeDialogFired = false;
  p.on('dialog', (d) => { nativeDialogFired = true; note(`NATIVE dialog fired: "${d.message()}"`); d.accept(); });
  await p.locator('button[aria-label="More actions"]').first().click();
  await p.waitForTimeout(400);
  await p.locator('[role="menuitem"]:has-text("Delete")').first().click();
  await p.waitForTimeout(700);
  note(`Native window.confirm fired: ${nativeDialogFired} (should be false)`);
  const deleteDialog = await p.locator('[role="dialog"][aria-modal="true"]').count();
  note(`Styled delete dialog visible: ${deleteDialog}`);
  await shot(p, 'e-delete-modal');
  // Confirm delete
  await p.locator('[role="dialog"] button:has-text("Delete")').click();
  await p.waitForTimeout(1500);
  const countAfterDelete = await p.locator('div.group').count();
  note(`Forms after delete: ${countAfterDelete}`);
  await shot(p, 'f-after-delete');

  // Test share toast feedback (clipboard may fail in headless -> info toast with link)
  note('=== SHARE FEEDBACK ===');
  if (countAfterDelete > 0) {
    await p.locator('button:has-text("Share")').first().click();
    await p.waitForTimeout(1200);
    const toastCount = await p.locator('text=/Share link copied|Copy failed/').count();
    note(`Share feedback toast shown: ${toastCount}`);
    await shot(p, 'g-share-toast');
  }

  note('=== VERIFICATION COMPLETE ===');
} catch (e) {
  note(`FATAL: ${e.stack || e.message}`);
  await shot(p, 'fatal').catch(() => {});
} finally {
  fs.writeFileSync('./verify-log.txt', log.join('\n'));
  await browser.close();
}
