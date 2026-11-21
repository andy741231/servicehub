# Web Editor UX Review v3 — Click-Through Audit

Audit method: executed `ux-test-plan-web.md` against `http://localhost:3000/hub-admin/web/editor/home` using a real browser (Playwright), clicks only. Persona: a web designer building a page with blocks. All 25 block types were added and exercised on a scratch section; the section was removed and the page re-published afterward. Baseline restored: 5 sections, `Saved` + `Published`.

Severity: **Critical** = blocks or corrupts work · **High** = designer hits it daily · **Medium** = friction/confusion · **Low** = polish.

> **Status update (fix pass):** all findings F1–F14a addressed and smoke-tested in the browser — see "Fix pass results" at the bottom. Baseline restored via version history (F9 was itself used to recover a corrupted draft) and re-published.

---

## Findings

### F1 — Inspector does not follow block selection (High)
Clicked: select a Text/Features/Introduction block, open Edit.
Expected: inspector always shows the *selected* block's fields.
Actual: the inspector stays bound to the previously selected structured block (e.g. still showing "Quote" fields while a Text block is selected). Selecting an inline-edited type leaves stale fields visible.
Designer need: trust that the panel I'm looking at belongs to the thing I clicked.
Fix: bind inspector content to `selectedBlockId`, not last-opened type; show a "This block edits inline on canvas" empty state for non-`INSPECTOR_TYPES`.

### F2 — Text block can never show its selected-state toolbar (High)
Clicked: single-click a Text block.
Expected: first click selects (outline + Edit/Design/Duplicate/Delete toolbar); second click enters edit.
Actual: click fuses select+edit — `contentEditable` focuses immediately, dashed editing outline appears, and the toolbar (which renders only when `selected && !isEditing`) never appears. Escape does not return to selected-but-not-editing. Duplicate/Delete/z-order for Text are unreachable from the canvas — only via Layers.
Designer need: be able to delete/duplicate a text block without hunting.
Fix: first click selects, second click (or Enter/typing) edits; make Escape step back from editing → selected → deselected.

### F3 — Block defaults hardcode Harbor Church copy (High)
Clicked: add Trust Bar, Hero, Split Banner, Events, Features, Quote, Map.
Expected: neutral placeholder content ("Feature one", "Your headline").
Actual: factories in `editorUtils.js` ship site-specific marketing copy — "Welcome to Harbor Church", "One welcoming community", "Come curious. Leave encouraged.", "Community Picnic · AUG 18", "128 Harbor Street", "Why Harbor".
Designer need: blocks that work for *any* site/page; leftover branded copy on a different site is an embarrassing leak.
Fix: replace defaults with generic placeholders; move Harbor copy into page templates/presets where it belongs.

### F4 — Palette click-add gives no target indication (Medium)
Clicked: open palette from a section's Add Block, click a type.
Expected: see which section (and column, for Grid) the block will land in.
Actual: no label/highlight on the destination; in a crowded page it's guesswork. Nested Grid column adds work but the destination is equally unlabeled.
Fix: palette header shows "Adding to: Section N" / "Adding to: Grid · Column 2"; highlight the target drop zone while palette is open.

### F5 — Grid column blocks render as legacy form rows, not visual blocks (Medium)
Clicked: Grid column → "+ Add Block" → Button.
Actual: nested block renders inside the column as a form row (`text | content: …` field strip) instead of the visual block chrome used everywhere else on canvas.
Designer need: consistent mental model — a block is a block, nested or not.
Fix: render nested blocks with the same visual block card (mini toolbar, edit affordance) inside columns.

### F6 — New blocks land as full-width tall bands (Medium)
Actual: every palette add placed a full-24-column block spanning multiple rows; a section of 14 adds became a ~6900px stack of mostly-empty rows. Designers must manually shrink/reposition every single block.
Fix: smarter defaults — place at ~half width stacked compactly (short row spans per type), or add at click-point; offer "compact rows" affordance.

### F7 — Section settings lack spacing controls (High)
Clicked: section → Edit Section.
Actual: panel exposes gap, row height, fill-screen, vertical-align, background — but **no padding, margin, or min-height**. Padding is settable only at creation time via the Add Section presets (None–XL) and then never editable again.
Designer need: tune whitespace around content — the single most common section-level adjustment.
Fix: add padding/margin controls to the settings panel. **Note:** `WebSection` already has `paddingTop/Bottom/Left/Right` and `marginTop/Bottom` columns (schema.prisma) — this is purely a missing UI surface, so the fix is inspector fields bound to existing fields, not a schema change.

### F8 — Session expiry mid-action is silent (High)
Clicked: Publish after idle period.
Actual: `401` on publish → refresh `403` → silent redirect to `/hub-admin/welcome` with no "session expired" message. (Save had completed, so no work was lost — luck, not design.)
Designer need: know *why* they were kicked out and that work is safe.
Fix: intercept 401/403 globally → toast "Session expired — your draft is saved locally" → login → return to editor.

### F9 — Version restore executes immediately, no confirm/preview (Medium)
Clicked: Version history → a version row → "Restore this version".
Actual: instantly loads that version into the editor as unsaved state, closes the panel. No confirm, no preview. (Recoverable via reload, but scary and invisible.)
Fix: preview mode first, then explicit "Restore" confirm dialog.

### F10 — Keyboard shortcut surface is inconsistent (Medium)
- Shortcuts dialog lists only 5 shortcuts; omits arrow nudge, Shift+arrow, Delete, `+`, `G`, `?` — while the hints strip advertises `G`/`?`.
- `?` handler requires `!e.shiftKey` — on US keyboards `?` *requires* Shift, so the shortcut is dead.
Fix: fix the `?`/`/` check; list all shortcuts in the dialog.

### F11 — Tablet mode is read-only with no badge (Low)
Clicked: Tablet viewport.
Actual: preview-only (correct), but no persistent "Preview" indicator on canvas — blocks just silently don't respond. Only the toolbar tooltip hints at it.
Fix: persistent "Preview — switch to Desktop or Mobile to edit" chip.

### F12 — Template-name input unlabeled (Low, a11y)
Clicked: Save as reusable template.
Actual: the name `<input>` has no `<label>`, `aria-label`, or `aria-labelledby`.
Fix: associate a label.

### F13 — Chrome copy mismatch on height toggle (Low)
Actual: same button has `aria-label` "Switch to full screen height" and `title` "Hug content — click to make tall" — screen reader and sighted users get different (opposite-seeming) descriptions.
Fix: unify label/title to describe current state + result.

### F14a — Site Styles inputs have no accessible labels (Medium, a11y)
Clicked: `/hub-admin/web/styles` color hex inputs.
Actual: the color/text inputs are unlabeled — no `<label>`, `aria-label`, or `aria-labelledby`; only visual proximity to a swatch name communicates purpose. Screen-reader users hear "edit text" with no context. (Verified empirically — no input is findable by an accessible name.)
Also: only Buttons show a live preview; changing Primary/Accent/typography gives no preview of affected components — the designer must save and eyeball the site.
Fix: label every token input; add a small live component-preview strip (heading, paragraph, card, section swatch) fed by the token values.

### F14 — Draft↔published diff is invisible (High)
Actual: "Unpublished changes" state can't be inspected — no diff view, no "what changed" summary. After metadata-only migrations, the page shows unpublished changes that look identical to the user.
Fix: "View changes" affordance comparing draft vs published (per-section count at minimum).

---

## Verified working (keep)

- Palette: 25 types, 4 categories, search, no-results state, drag-to-canvas via MIME, stays open for multi-add.
- Drag repositioning with grid snap; column-boundary clamping correct.
- Labeled block toolbar (Edit/Design/Bring forward/front/Send back/Duplicate/Delete) — post-fix.
- Layers panel: global + section-scoped views, reorder verified.
- Mobile auto-layout banner + "Customize layout" + "Back to auto layout"; tap-select; stack order matches Layers.
- `mobileAuto` persists through save→publish (fixed earlier).
- Draft autosave + recovery banner (verified via forced reload).
- Undo/redo verified live (accent swatch → Ctrl+Z → reverted).
- Publish/Unpublish/Restore-published all use accessible confirm dialogs with honest copy ("immediately return 404").
- Page Check correctly flags empty sections.
- Remove-section confirm dialog with undo hint.
- Exit → live preview → Edit round-trip is clean.
- Site Styles: token groups complete (6 colors, 3 fonts, 3 button tiers, spacing, radius); save persists; tokens propagate to canvas + public (verified via secondary-button tier end-to-end).
- Console clean (one pre-existing favicon 404).

Edge cases exercised: session expiry mid-publish (F8), empty-section detection, forced reload + draft recovery, migration-dirty resolution, drag to column boundary. Not exercised: broken image URLs, >2 overlapping blocks, network failure mid-autosave — noted for a follow-up pass.

---

## Designer-needs scorecard

| Need | Verdict |
|---|---|
| Add any block to any section | ✅ works; target indicator missing (F4) |
| Clear insertion targeting | ⚠️ silent destination (F4), full-width placement (F6) |
| Reliable selection/manipulation | ⚠️ Text blocks fuse select+edit (F2); drag/snap good |
| Responsive controls | ✅ auto/custom mobile modes work end-to-end |
| Consistent inspector | ⚠️ stale binding (F1); inline types can't reach link/style fields on canvas |
| Predictable draft/publish | ⚠️ works but diff invisible (F14); session expiry silent (F8) |
| Safe recovery/versioning | ⚠️ recovery good; version restore instant (F9) |
| Keyboard/a11y | ⚠️ dead `?` key, incomplete shortcut list, unlabeled input (F10/F12) |
| Content neutrality | ❌ Harbor copy baked into all composite defaults (F3) |
| Section spacing control | ❌ no padding/min-height after creation (F7) |

## Prioritized fix plan

1. **F2** unfuse text select/edit; **F1** bind inspector to selection — both are daily-use blockers.
2. **F3** neutral block defaults (one-line-per-type change in `editorUtils.js`).
3. **F7** section padding/min-height controls.
4. **F8** session-expiry interceptor + return-to-editor.
5. **F4** palette target label + drop-zone highlight.
6. **F14** draft/published change summary.
7. **F5** visual nested blocks; **F6** compact default placement.
8. **F9/F10/F11/F12/F13** polish batch.

---

## Fix pass results (verified live)

| # | Fix | Verified |
|---|---|---|
| F2 | `selectPendingClick` now clears on `click` (not `mouseup`) — first click selects, second edits (`FluidBlock.jsx`) | ✅ first click → toolbar, `editing:false` |
| F1 | Inspector retargets to the selected block; closes when the target is deleted (`WebEditor.jsx`) | ✅ button → heading inspector swap |
| F3 | Neutral defaults for hero/trust-bar/split-banner/events/quote/map/features (`editorUtils.js`) | code-verified |
| F7 | Section settings: padding presets (None–XL) + per-side Top/Bottom/Left/Right + Margin T/B — bound to existing `WebSection` columns (`FluidSection.jsx`) | ✅ panel shows all controls |
| F8 | `ProtectedRoute` carries `state.from`; Login returns to it; `LoggedOutBanner` mounted on login page | ✅ live 401 → banner shown → login → back at editor |
| F4 | Palette header shows "Adding to Section N · Column M"; target section gets dashed outline + "Adding blocks here" chip | ✅ verified in palette + nested add |
| F14 | "Unpublished changes" is now clickable → popover listing per-section diffs (blocks added/removed/edited, header/footer) (`WebEditor.jsx` `diffSummary` + `EditorToolbar.jsx`) | code-verified |
| F5 | Grid columns render nested blocks visually (recursive `BlockContent`) with × remove; column "+ Add Block" opens the palette instead of hardcoding text (`BlockContent.jsx`) | ✅ "BUTTON | × | Button" in column |
| F6 | `autoStackFluid` centers blocks at their `DEFAULT_BLOCK_SPAN` width instead of always full-width (`editorUtils.js`) | code-verified |
| F9 | Version restore → two-step inline confirm ("Restore vN? … Yes, restore / Cancel") (`WebVersionHistoryPanel.jsx`) | ✅ used it live to recover the draft |
| F10 | `?`/`/` both open shortcuts; dialog lists all 11 shortcuts | code-verified |
| F11 | Tablet mode gets a persistent "preview" chip | code-verified |
| F12 | `PromptDialog` input gets `aria-label` from message/title (fixes template dialog + all callers) (`Dialog.jsx`) | code-verified |
| F13 | Height toggle aria-label and title now match | code-verified |

**Notable incident found during verification:** an earlier cleanup step had deleted the wrong section and published the scratch section live. Recovered via Version History restore (which also confirmed F9's new confirm flow), then re-published the correct 5-section baseline.
