# Web Editor — Review & Plan

_Reviewed 2026-11-21 against `/hub-admin/web/editor/home` (code + headless browser probe)._

## 1. Review summary

**The editor is not dead — it is fragile and not WYSIWYG.** With correct timing the core loop works:
click a block → toolbar + drag handle appear → click again → edit text inline → drag snaps to the grid.
But several bugs make it *feel* broken, and the canvas looks nothing like the published site.

### Root cause: two renderers

| | Public site | Editor canvas |
|---|---|---|
| Renderer | `pages/public/Home.jsx` `renderBlocks()` | `editor/BlockContent.jsx` + `editor/editorComponents.jsx` |
| Site theme (fonts, colors, `siteStyle`) | ✅ applied | ❌ not applied — system font, Tailwind admin styles |
| Header / footer | ✅ | ❌ hidden |
| trust-bar, split-banner, events, quote, map | rendered design | **raw form inputs** (`StructuredBlockEditor`) |
| Hero | centered, navy, brand font | left-aligned heading, centered body, system font |

Every block type is implemented twice, and the two copies have drifted. No amount of interaction
polish makes this feel like Squarespace until **the editor renders the same components as the site**.

### Confirmed bugs (each verified in code; ★ = also reproduced in browser)

| # | Bug | Where |
|---|---|---|
| B1 ★ | A plain click on a block marks the page "Unsaved changes" and adds a history entry — react-rnd fires `onDragStop` on every mouseup and we rewrite the position unconditionally | `fluid/FluidBlock.jsx` `handleDragStop` / `handleResizeStop` |
| B2 ★ | For ~1s after clicking **Edit**, all clicks are swallowed (`elementFromPoint` → `<html>`) by the View Transition overlay + 320ms CSS stage animation | `WebEditor.jsx` `transitionToViewMode` |
| B3 ★ | Clicking a block focuses the **section** `div`; pressing Space/Enter then deselects the block and selects the section. Backspace/Delete deletes the block even when focus is on a `<select>` or button | `FluidSection.jsx` `onKeyDown`; `WebEditor.jsx` keydown guard |
| B4 ★ | Toolbar: page title "Home Page" overlaps the Desktop/Tablet/Mobile switcher | `EditorToolbar.jsx` |
| B5 ★ | Structured blocks use `<input>`; line breaks in content ("One welcoming⏎community") are lost on any edit → **data loss** | `editorComponents.jsx` `StructuredBlockEditor` |
| B6 ★ | Large empty gaps / clipped text: rows are fixed-height and blocks are `overflow-hidden`; content never grows its block | `FluidSection.jsx`, `FluidBlock.jsx` |
| B7 | **Crash**: Mobile inspector calls `updateSectionBlocks(sIdx, fn)` but the function expects an array → `section.blocks` becomes a function → render throws | `WebEditor.jsx:917` |
| B8 | "Exit without saving" sets status `clean` but keeps the edited state — the "discarded" edits reappear and get saved by the next change | `WebEditor.jsx` `handleExitEdit` |
| B9 | Two `onRestored` props on `WebVersionHistoryPanel`; the first (marks dirty) is silently dropped | `WebEditor.jsx:778,790` |
| B10 | Undo history: debounced commit uses a `window.__webEditorHistoryTimer` global and a stale `saveToHistory` closure → lost/overwritten history entries; undo-toast calls `saveToHistory` inside a `setSections` updater (double push under StrictMode) | `WebEditor.jsx:420–440, 466, 547` |
| B11 | Top "Add Section" pill is titled "Add section above" but inserts below | `FluidSection.jsx:175` |
| B12 | Tablet/Mobile preview only narrows a `div`; Tailwind `md:` breakpoints still see the full window width, so the preview ≠ real mobile | `WebEditor.jsx` device classes |
| B13 | Overlay math measures the *section* width (incl. padding) and ignores `verticalAlignment` → drag overlay misaligns when section has side padding or is centered/bottom-aligned | `FluidSection.jsx` `measure()` |
| B14 | Mojibake `Ã—` in the remove-row button | `editorComponents.jsx` `StructuredBlockEditor` |
| B15 | Editor unit tests don't run at all: vitest/jsdom fails with `ERR_REQUIRE_ESM` (`html-encoding-sniffer` → `@exodus/bytes`) | client test env |

### Dead / half-finished code

- Empty files: `BlockRenderer.jsx`, `PropertyPanel.jsx`, `SectionEditor.jsx`, `SectionList.jsx`.
- Never imported: `useWebDocument.js` (also imports non-existent `duplicateBlockEntity`), `useWebHistory.js`,
  `gridPlacement.js` (387 lines of tests, zero consumers), `EditorErrorBoundary.jsx`, `BlockPalette.jsx`,
  `PreviewFrame.jsx`, `SiteBgSwatches.jsx`; `pages/web/InlineEditor.jsx` is a re-export stub.
- `editor-lab/` (Puck + Craft.js spikes, untracked, unrouted). `labBlocks.jsx` there is actually the most
  useful thing in it: a start on shared block components.

## 2. "Should I use REA (Reverse Engineer Anything) to copy Squarespace's editor?"

**No — it targets a problem we don't have, and carries risk.**

- You already have Squarespace's core model (24-col freeform grid per section, separate mobile layout,
  section/block toolbars). What's missing isn't knowledge of how Squarespace works; it's a single
  renderer and a clean interaction/state layer inside *our* code. Dissecting Squarespace doesn't fix either.
- Squarespace's editor is a large minified bundle coupled to its backend — the output would be
  behavioral notes at best, which an hour on a Squarespace trial gives faster.
- Squarespace's terms prohibit reverse-engineering their services; anything derived that way is a
  liability in a shipped product. (If REA is ever used, install only from the official source — fake copies exist.)
- If you want reference implementations, read open-source editors directly (Puck, GrapesJS, Craft.js).
- Related: the UI and comments say "Fluid Engine" / "Fluid Section Settings" — that's Squarespace's
  product name. Rename user-facing labels (e.g. "Layout grid", "Section settings").

## 3. Engine decision

| Option | Fits | Cost |
|---|---|---|
| **A. Keep the custom grid engine (recommended)** | Freeform, overlapping, Squarespace-7.1-style layout. Data model + public renderer already built around it. | Fix bugs + unify renderer. Moderate. |
| B. Switch to Puck (MIT) | Stacked sections with columns/DropZones (Squarespace "classic" style). Gives inspector panel, drag-from-palette, outline for free. | No freeform grid; migrate every page's `fluid` data to a stack; rewrite canvas. |
| C. Craft.js | Flexible but low-level — you'd rebuild most of what you have. | High. |

Recommend **A**. Pick **B** only if you decide freeform positioning isn't important for your users
(church/org sites mostly use stacked sections) — then a 1-day spike on the existing `PuckLab.jsx`
using the shared blocks from Phase 1 would confirm it. Either way **Phase 1 is required**, so do it first;
it keeps option B open.

## 4. Plan

### Phase 0 — Stop the bleeding (≈1–2 days)

**Status (2026-11-21): done except B15.** B1–B5, B7–B11, B13, B14 fixed and verified with a headless
probe (19/19 checks, no page errors, no server writes). Extras found along the way: `?` shortcut could
never fire (needed Shift); Ctrl+S while typing opened the browser's Save-page dialog; Ctrl+Y redo added;
first section's "Add Section" pill overlapped the toolbar; duplicate height-toggle button removed.
B15 is environmental — local Node is 20.11, CI uses 24; jsdom 29 needs Node ≥ 20.19. Upgrade local Node.

Small, independent fixes; ship each separately.

1. **B1** No-op `onUpdate` when computed grid coords equal current coords (drag & resize).
2. **B2** Remove the View Transition / stage animation on Edit (or keep it but set `pointer-events` normally and drop `startViewTransition`). Open straight into edit mode from Pages.
3. **B7** Mobile inspector: pass the new blocks array, not a function.
4. **B8** "Exit without saving" restores the last-saved snapshot (keep it in a ref after fetch/save).
5. **B9** Merge the two `onRestored` handlers into one.
6. **B3** Central `isTypingTarget(e)` (`isContentEditable`, `INPUT`, `TEXTAREA`, `SELECT`, `BUTTON`, `[role=menu]`) used by every shortcut; section Space/Enter handler ignores events when a block is selected; clicking a block focuses the block, not the section.
7. **B11** Top pill inserts above (`sIdx - 1`).
8. **B4, B14** Toolbar layout; fix encoding of `editorComponents.jsx`.
9. **B5** Use auto-growing `<textarea>` for multi-line fields; preserve `\n`/`<br>` round-trip.
10. **B15** Fix vitest env (pin `jsdom` to a version whose deps are CJS-compatible, or switch the env to `happy-dom`), so the existing editor tests run in CI.

**Done when:** the Playwright probe (see §5) passes: click → select without dirtying; edit text; drag; save; no console errors.

### Phase 1 — One renderer, real WYSIWYG (≈1–2 weeks) — the important one

**Status (2026-11-21): 1–3 and 5 done; 4 (iframe) not started.**
- `client/src/site/` now holds the only block renderer (`SiteBlock`), header/footer (`SiteChrome`),
  section layout math (`SiteSections`), theme (`siteTheme`) and rich text (`siteRichText`).
  `pages/public/Home.jsx` went from 930 to 154 lines and renders through it — verified **pixel-identical**
  on all 9 published pages at desktop + mobile.
- The editor canvas renders the same components inside the real theme, with the site header/footer
  (read-only, link to Header & Footer). Canvas vs. public page: pixel-identical for `home`.
- Editing: text/images/link labels in place (`editor/siteEditBridge.jsx`); URLs, styles, toggles and
  list remove/reorder in a per-block settings popover (`editor/BlockSettingsPanel.jsx`); "+ Add item"
  on list blocks. Field names now match the site (editor used to write `imageUrl`/`author`/`description`
  that the site never read).
- Admin page API now returns `siteStyle` + `nav` (shared `loadSiteContext()` in `controllers/web.js`).
- Bugs found and fixed on the way: couldn't type a space in inline text (block's Space handler
  swallowed it); block toolbar/settings unclickable for first-row blocks (covered by the previous
  section's drag overlays and the block's own resize handles); focusing+blurring a field silently
  rewrote stored content; hero title forced left-aligned in the editor.
- Verified: 27 interaction checks + a save-payload check (edit one field → PUT differs from the loaded
  page in exactly that field; header/footer untouched).
- **1b done (2026-11-21):** the canvas renders inside a same-origin iframe (`editor/CanvasFrame.jsx`):
  Tablet/Mobile are real 768px/375px viewports, so blocks' responsive styles and the header's mobile
  menu behave as on a device (B12). Canvas code uses the element's own document/window; the formatting
  toolbar, image dialog and pickers stay in the editor window. react-rnd's `bounds="parent"` breaks
  across realms (`instanceof HTMLElement`), so placement is clamped on drop instead.
- **Known data quirk:** fields stored as markdown render inside `<p>` (e.g. event titles pick up
  paragraph styling on the site). Once edited inline they're saved without `<p>` and change look
  slightly. A one-off normalisation of stored content would make this consistent.
- **Mobile bug found (live site):** blocks without a mobile layout reuse desktop columns on the 6-col
  mobile grid; a block placed right of column 7 on desktop is invisible on phones. Fix with
  Phase 2 item 9 (auto-stack).

1. Create `client/src/site/blocks/` — one module per block type exporting
   `{ type, label, icon, defaults, fields, Component }`. `Component` takes `(content, { editable, onChange })`.
   Seed it from `public/Home.jsx` (source of truth for looks) and `editor-lab/labBlocks.jsx`.
2. `public/Home.jsx` renders via the registry. Visual-diff the public site before/after — it must not change.
3. Editor canvas renders the same registry with `editable: true`:
   text fields become inline-editable in place (reuse `InlineTextEditor`); list fields (trust-bar items,
   events, service times) render as the real design with hover "+ / ×" affordances, details in the inspector.
   Delete `StructuredBlockEditor` and the per-type editor copies in `editorComponents.jsx` / `BlockContent.jsx`.
4. **Canvas in an iframe** that loads the site's CSS + `siteStyle` tokens + fonts and renders header & footer
   (click → Header & Footer panel). Fixes theme mismatch, isolates admin Tailwind, and makes Tablet/Mobile
   previews use real media queries (B12). Drag/resize overlays live inside the iframe document.
5. Fix overlay math to measure the grid container itself (B13).

**Done when:** a screenshot of the edit canvas with chrome hidden matches the live page (pixel diff under a small threshold) for every seeded page, at desktop and mobile widths.

### Phase 2 — Squarespace-like interaction (≈2–3 weeks)

**Status (2026-11-21): all items done.** Second round (4, 5, 8):
- **Block picker (4):** docked "Add block" panel — categories, keyword search (Enter adds the top
  match), click to add at the bottom of the section, or drag onto any section to insert at that row
  (blocks below move down; never overlaps). Hero is now offered. New blocks start at a per-type
  height and are fitted to their content on insert (batched when several appear at once).
- **Section picker (5):** 13 ready-made sections (welcome, call to action, two columns, features,
  stories, service times, events, contact, location, video…) with live thumbnails rendered by the
  real site components in the site theme. Replaces the old columns/padding/margin dialog (whose
  "columns" setting did nothing on layout-grid sections).
- **Text toolbar (8):** per field type — plain fields (dates, numbers, labels) get none and block
  Ctrl+B/I/U (formatting there was silently dropped on save); titles get bold/italic/underline/
  strike/link/clear; text blocks add paragraph/H2/H3, lists, quote, alignment. Links use an inline
  URL field with validation and "remove link" (no browser prompt/alert).
- **Bugs found:** section "Add Block"/"Edit Section" clicks hit the block underneath (block drag
  overlays were above the section chrome); "Send to back" set z-index −1000, which hides the block
  behind the page background on the live site and makes it uneditable — layers are now kept 0…n−1
  and grids isolate their stacking.
- Verified: 28 new browser checks + the 48 earlier ones (saves intercepted), public site still
  pixel-identical.
- **One mode + autosave (1, 7):** pages open straight into editing; drafts autosave ~1.5s after the
  last change (Ctrl+S saves now); Publish pushes live; Preview shows the page without chrome; Exit saves
  and returns to Pages. Saves are serialized and always send the latest state; edits made during a
  request trigger another save; failed saves retry every 10s. Server: autosaves snapshot a version at
  most every 10 min (explicit saves always do).
- **Inspector (3):** docked right panel — block Content / Design / Layout tabs, section settings.
  Replaces the block settings popover, the section settings popover and the mobile layout inspector.
- **Selection (2):** hover shows the block type; Esc walks up text → block → section → none; block
  toolbar sits above the block (inside only at the very top of the page).
- **Auto-grow (6):** when an edit makes content taller than the block, the block grows and blocks
  below it are pushed down (one undo step). Only after edits — never on load.
- **Mobile auto-stack (9):** blocks without a phone layout stack in reading order, full width, and
  grow with their content (public site + editor). Editor shows "Auto layout · Customize" per section;
  customizing freezes measured positions into a draggable 6-col grid; "Reset to auto layout" undoes it.
  **Live-site effect:** desktop pixel-identical on all pages; mobile changed only on 3 pages, all fixes
  (home: "Come curious" banner no longer covers feature card 03).
- **Bug found:** `block.style` was never persisted by the server (styles were dropped on every save).
  Now stored with the block (`_style`), verified with a server round-trip on a temporary page.
- Verified: 24 browser checks (saves intercepted, nothing written) + server round-trip + 294 server tests.

1. **One mode.** Opening a page = editing it. "Preview" toggles editor chrome off; no separate live/edit screens.
2. **Selection model.** Hover outline + type label; click selects; click again / double-click edits text;
   `Esc` walks up (text → block → section → none); `Tab` cycles blocks.
3. **Right inspector panel** (Content / Design / Layout tabs) for the selected block or section. Replaces the
   floating section-settings popover and the bulk of per-block settings. Generated from each block's `fields`.
4. **Block picker**: categorized, searchable, drag a block onto the grid at the drop cell.
5. **Section picker with prebuilt sections** (hero, events, service times, gallery, contact…) built from
   the registry. This is Squarespace's biggest productivity feature.
6. **Auto-grow rows** (B6): measure rendered content; if it overflows, extend `rowEnd` (and push blocks
   below). Eliminates clipped text and most manual resizing.
7. **Autosave drafts** (debounced ~1.5s) + explicit **Publish**; remove the manual Save button.
8. Inline rich-text toolbar (bold / italic / link / heading level / alignment).
9. Mobile layout: default "auto-stack from desktop"; once edited, store `fluidMobile`; "Reset to auto" button.

### Phase 3 — Structure & hardening (parallel with Phase 2)

**Status (2026-11-21): 2, 4, 5 done; 1 deferred; 3 is the owner's call.**
- (2) Deleted 17 dead files incl. `editorComponents.jsx` (~1,500 lines), `BlockContent`,
  `ReadOnlyBlockContent`, `MobileLayoutInspector`, `useWebDocument`/`useWebHistory`, `gridPlacement`,
  the empty stubs and `pages/web/InlineEditor.jsx`; legacy constants and transition CSS. The image
  field moved to `EditableImage.jsx` — and **"Upload" now really uploads** to the asset library
  (it used to save a temporary `blob:` URL that broke after reload and on the live site).
- (4) App uses `createBrowserRouter`; the editor's `useBlocker` holds in-app navigation (sidebar,
  Back) until unsaved edits are saved, asking only if the save fails. All 36 app routes smoke-tested.
- (5) `EditorErrorBoundary` wraps the canvas and each block (a broken block shows a small card and can
  still be deleted from its toolbar).
- (1) Editor store refactor deferred: the undo/autosave bugs it was meant to fix are fixed and covered
  by e2e tests; it's now a maintainability change, not a correctness one.
- (3) `editor-lab/` left untouched (owner's experiment, untracked).
- **Bug found:** React StrictMode (dev) ran the auto-grow effect twice on mount, so *opening* the
  editor grew and autosaved any block whose content already overflowed. Fixed (compare content
  identity instead of a first-run flag).

1. **Editor store** with zustand + immer (already dependencies): `document`, `selection`, `history`
   (immer patches → reliable undo/redo and grouped typing). Replaces the 30 `useState`s in `WebEditor.jsx`
   and fixes B10. Either fold `useWebDocument`/`useWebHistory` into it or delete them.
2. Delete dead files listed in §1; adopt `gridPlacement.js` for overlay/drag math (it's already tested) or delete it.
3. Remove `editor-lab/` and the `@measured/puck` / `@craftjs/*` installs once the engine decision is final.
4. Migrate to a data router (`createBrowserRouter`) so `useBlocker` can guard unsaved changes on in-app navigation.
5. Wrap the canvas in `EditorErrorBoundary` so one bad block can't blank the editor.

## 5. Verification

**Status (2026-11-21):** `e2e/` holds a Playwright suite (15 tests, ~1 min) run with
`E2E_USERNAME=<admin> npm run e2e` against the local dev stack — see `e2e/README.md`. Each run uses
a temporary unpublished, hidden page and real saves (asset uploads are intercepted so nothing hits
blob storage). Not wired into CI: it needs the app, a database and an admin account. Public-page
visual regression was done ad hoc (pixel-identical on all pages after every change); not yet automated.

- Turn the headless probe used for this review into a Playwright E2E spec:
  load editor → select block (status stays "Saved") → edit text → drag → undo/redo → autosave → publish →
  assert the public page shows the change. Run in CI.
- Visual-regression snapshots: public page vs. editor canvas (chrome hidden), desktop + mobile.
- Unit tests for the store (history grouping, undo across delete, auto-grow pushdown).

## 6. Second interactive review — 2026-11-21

_Hands-on pass over `/hub-admin/web/editor/home` in a real browser (Playwright): every toolbar control,
panel, breakpoint and block interaction exercised._

### Verified working

Login → editor loads 6 sections with read-only site header/footer · autosave → DB (verified) ·
toolbar undo/redo · inline text editing + floating toolbar (B/I/U/S/link/clear, active-state toggles) ·
block select / drag (snaps 88px/row) / resize (snaps) / delete with Undo toast · inspector
Content/Design/Layout tabs · BlockPicker (search, categories, adds at next free row, auto-selects) ·
SectionPicker (13 templates, live mini-previews, category filters, correct insert position) · section
hover chrome (Add Section pills, Edit / Add Below / Duplicate / height toggle / move / Remove) ·
`G` grid overlay on all sections · keyboard-shortcuts modal · Preview mode (chrome-free + "Back to
editor") · breakpoints: Desktop editable, Tablet = preview-only 768px, Mobile = editable 375px with
its own `fluidMobile` layout and hamburger header · Layers tree panel · Version History panel ·
Publish · aria-labels / aria-pressed / `role=status` toasts / SR live region.

### New bugs (fixed 2026-11-21)

| # | Severity | Bug | Fix |
|---|---|---|---|
| B16 ★ | **High** | **Canvas jitter loop:** the iframe gained/lost its vertical scrollbar several times a second → ~8px horizontal oscillation of the whole canvas. Cause: block resize handles (`.fluid-resize-r/-br`, negative offsets) protrude past the viewport → `scrollWidth` 1588 vs viewport 1563 → scrollbar appear/disappear feedback with `CanvasFrame` auto-height. Made every Playwright hover/click time out ("element not stable") — i.e. the editor was effectively untestable and imprecise for real users too. | `overflow-x: clip` on the iframe `html`+`body` in `CanvasFrame.jsx` — document scrollWidth can no longer exceed the viewport |
| B17 ★ | Med | `Duplicate block` placed the copy at identical `rowStart`/`colStart` — invisible under the original. | Copy is now placed directly below the original (own height offset on `fluid` + `fluidMobile`) and auto-selected |
| B18 ★ | Med | Layering controls asymmetric: Bring forward / Bring to front / Send to back — no **Send backward**. | Added to the block toolbar (`layerBlock` already supported `'backward'`) |
| B19 ★ | Med | Inspector color pickers showed `#ffffff` for unset Background/Text colors while the rendered block was dark navy — misleading "theme default" state. | Unset colors now show a checkerboard "theme default" swatch instead of white |
| B20 ★ | Low | **Publish** fired instantly — one misclick ships the site live. | Added a confirm dialog ("Publish this page?") before the request |
| B21 ★ | Low | "Save as template" used a native `window.prompt` — inconsistent with the custom dialogs. | Now uses the shared `usePrompt` PromptDialog |
| B22 ★ | Low | `/favicon.ico` 404 (no icon declared). | Inline SVG favicon in `index.html` |

### Open / watch items

- `GET /api/web/pages/home` → 404 seen once in console; **not reproducible** on reload — likely a
  transient/stale fetch from a specific interaction. No client call site found; revisit if it recurs.
- `WebPageVersion` rows grow unboundedly (v214+). Server already caps autosave snapshots to ~10 min;
  consider pruning old versions per page.
- `Ctrl+Z` inside `contentEditable` is native text-undo only (by design — `isTextEntryTarget` guard);
  structural undo is the toolbar button. Worth a docs note so users don't expect it while typing.
- Block toolbar is flush to the canvas edge for column-1 blocks (cosmetic; B16's clip keeps it inside).
- In-block item editors (add feature/event/item), "Open published page" external link, and
  keyboard-only canvas navigation were not fully exercised this round.

## 7. Third interactive review — 2026-11-21

_Follow-up pass after B16–B22 covering dark-mode contrast, full-page scroll audit, Tablet/Mobile
modes, keyboard shortcuts, inline link editing, and narrower laptop viewports (`1280px` / `1024px`)._

### Verified working (post-B16–B22)

B16 stability holds (`element is visible, enabled and stable` in Playwright; zero horizontal
overflow across Desktop `1578px`, Tablet `768px`, Mobile `375px`) · `?` / `+` / `ArrowDown` nudge +
`Ctrl+Z` / `Esc` walk-up chain (`text → block → section → none`) · Mobile `Auto layout · Customize`
→ 6-col grid → `Reset to auto layout` · Design inspector alignment edit + undo.

### New bugs (fixed 2026-11-21)

| # | Severity | Bug | Fix |
|---|---|---|---|
| B23 ★ | **High** | **Dark-mode bleed into canvas iframe (~1.25:1 contrast):** `CanvasFrame.jsx` mirrored `html.dark` from the admin shell into the iframe, turning `text-text-base` to `#e5e7eb` on `bg-white` canvas chrome (block toolbar icons, `+ Add Block`, `Edit Section`, `Auto layout · Customize`, `Edit header/footer`) AND on public Feature card titles (`Sunday worship`, `Groups`, `Serve the city` rendered light gray on white instead of dark charcoal). | Force `light` (`colorScheme = 'light'`, never mirror `dark`) on the iframe `documentElement` in `CanvasFrame.jsx` |
| B24 ★ | **High** | **Stuck / resurrecting inline text toolbar:** `InlineTextEditor` `scroll` listener called `computePosition()` without checking `activeElement === target`; because browsers retain the last `Selection` after blur, scrolling resurrected the dark `B I U S` toolbar over unrelated sections. Clicking parent UI also left it open, and scrolling while editing clamped it over the 52px top toolbar. | Guard `computePosition()` with `docOf().activeElement === target`, blur editor on parent/outside capture `mousedown`, and clamp `top >= 60px` (`InlineTextEditor.jsx`) |
| B25 ★ | **High** | **Desktop hover outline & block type label never appeared:** `onMouseEnter`/`onMouseLeave` were only on the grid item under `<Rnd>`'s transparent click-catcher (`pointerEvents: auto`), so hovering unselected blocks never set `isHovered`. | Added `onMouseEnter`/`onMouseLeave` to `<Rnd>`'s click-catcher (`FluidBlock.jsx`) |
| B26 ★ | Med | **Tablet mode labeled "Preview only · 768 px" was fully editable:** `WebEditor.jsx` hardcoded `readOnly={false}`, leaving 54 `contenteditable` fields, 6 `<Rnd>` overlays, 33 chrome controls, and the Inspector active. | Pass `readOnly={previewDevice === 'tablet'}` to `FluidSection` and hide the Inspector & bottom Add Section CTA in tablet preview |
| B27 ★ | Med | **Top toolbar overlapped at `1024px` (B4 regression):** `"Saved · HH:MM"` collided with `[Desktop]` and the page title collapsed to `0px`. | Tightened responsive gaps/button widths below `xl`, added `overflow-hidden` on the left flex group, and kept title visible from `lg` up (`EditorToolbar.jsx`) |
| B28 ★ | Med | **Mobile text click edited without selecting block:** `InlineTextEditor` stopped `mousedown` propagation so clicking a heading in Mobile auto-layout entered edit mode while the Inspector stayed on the previous section. | `FluidBlock.startEditing` now calls `onSelect(false)` if not already selected |
| B29 ★ | Med | **`Ctrl/Cmd + P` opened the published site in a new tab** instead of toggling in-editor Preview (contradicting the Shortcuts modal label and hiding unpublished draft edits). | Changed `Ctrl/Cmd + P` to toggle `viewMode` (`live` ↔ `edit`) (`WebEditor.jsx`) |
| B30 ★ | Low | Inline link editor (`EditLink` in `siteEditBridge.jsx`) still used native `window.prompt()`. | Replaced with an inline URL popover with validation, Apply/Cancel, and `Escape` / outside-click dismiss |
| B31 ★ | Low | Redundant stacked `+ Add Section` buttons at the bottom of the page (last section's floating bottom pill 8px above the page-level `+ Add Section` CTA). | Omit the floating bottom pill on `isLastSection` (`FluidSection.jsx`) |
| B32 ★ | Low | Mobile hover section menu (`168px` vertical card) covered half the Hero headline at `375px`. | Render a compact single-row icon bar on mobile (`FluidSection.jsx`) |

### Data note

- Section 3's `"Find your place."` `<h2>` is saved with `#ffffff` text on cream even on the live `/`
  page (likely an artifact from the pre-B19 white-default color picker) — content data issue, not an
  editor bug.

## UI test findings (2026-11-21)

_Builder-style test of `/hub-admin/web/editor/<slug>` on temporary `e2e-` pages only (created
unpublished + hidden, deleted afterwards; uploads intercepted). Four real homepages were rebuilt
through the editor UI, every block and ready-made section was used, and every control was
inventoried (188 controls, `docs/ui-test-evidence/p3-inventory.json`). Evidence paths below are
relative to `docs/ui-test-evidence/` (`ref/` = the reference sites)._

### Rebuilds (Phase 1)

| Reference | Type | How close | What blocked it |
|---|---|---|---|
| King, kingrestaurant.nyc (`ref/king-*`) | Squarespace-built restaurant | ~50% (`r-king-desktop.jpg`) | No Image block: full-bleed photos only via a Hero background (typed URL); the photo didn't fill the block (U9); no letter-spacing or serif heading control; footer links are site-wide only |
| Trinity Church Wall St (`ref/trinity-*`) | Church | ~45% (`r-trinity-desktop.jpg`) | Hero has no button; subtitle unreadable on the photo (U10); cards cramp when narrowed (U27); Quote has no button; no newsletter form |
| Houston Food Bank (`ref/foodbank-*`) | Community org | ~35% (`r-foodbank-desktop.jpg`) | Split hero (text + photo) impossible without an Image block; logo strip impossible (Gallery is 3 big tiles); no carousel; no sign-up form. Video + text side by side **was** possible through the Layout tab |
| Tartine Bakery (`ref/tartine-*`) | Small business | ~40% (`r-tartine-desktop-after.jpg`) | Text + photo split, photo mosaic and monospace brand type impossible; the first attempt broke on U1 (the quote spilled over the page) |

Steps: 34 (King) to 65 (Food Bank) UI actions for 4–5 sections each. What worked well: the section
picker, inline text editing, the Layout tab's column/width/row for side-by-side blocks, section colours.

### Findings

| ID | Area | Finding | Evidence | Severity | Proposed fix | Effort | Status |
|---|---|---|---|---|---|---|---|
| U1 | Canvas / auto-grow | Content that grows after the first measurement (web font loads, field re-render when editing ends) spills out of the block and over the next section; a long Quote covered the page's "Add Section" button | `u1-quote-overflow-before.png` → `r-tartine-desktop-after.jpg` | blocker | Re-measure with a ResizeObserver (+ font `loadingdone`) for a few seconds after an edit or insert | M | **Fixed** (b26a3aa) |
| U2 | Quote block | In the editor the “ ” marks sat on their own lines (editable `<p>` inside the mark `<span>`); the site renders them inline. The block jumped ~250px taller when editing ended | `p2-quote-trust-default.png` | major | Unwrap a single `<p>` for decorated fields | S | **Fixed** (b26a3aa) |
| U3 | New blocks/sections | Blocks keep the picker's preset height and never shrink: a new Hero is ~520px for ~200px of content; bands of empty rows everywhere | `u3-hero-preset-height-before.png`, `p2-twocol-trust.png` | major | Fit just-inserted blocks to their content (grow or shrink); edits only grow | S | **Fixed** (b26a3aa) |
| U4 | Section chrome | The desktop section menu (168×170px) covered blocks; a click meant for a short block's right side hit **Remove** (one click, no confirm) | `p3-section-chrome.png` → `p3-section-chrome-after.png` | major | One-row bar (Duplicate · Up · Down · Remove), as on mobile; settings and height live in the inspector | S | **Fixed** (b26a3aa) |
| U5 | Resize | A full-width block's right and corner handles were clipped by the canvas edge (B16's `overflow-x: clip`); the baseline e2e resize test failed | baseline `npm run e2e` (1 failed, 11 not run) | major | Pull edge handles inside the block when it touches the canvas edge | S | **Fixed** (b26a3aa) |
| U6 | Contact block | Title and labels white on pale mint (contrast 1.13:1), in the editor and on the site | `p2-contact-default.png` → `r-tartine-public-after.jpg` | major | Colours from the site theme (primary background, accent icons, inverse text); the Design tab still overrides | S | **Fixed** (b26a3aa) |
| U7 | Hero inspector | Background image only by typing a URL — no upload | `p2-insp-hero-content.png` | major | Image setting with preview, Upload/Replace, Remove, or paste a URL | S | **Fixed** (b26a3aa) |
| U8 | Block picker | Features, Highlights, Gallery and Testimonials started **empty** (a title and "+ Add") | `p2-all-blocks-desktop.jpg` | major | Starter items, as in the section templates | S | **Fixed** (b26a3aa) |
| U9 | Hero | The photo covered only the padded text area, leaving page-colour bands inside the block | `r-king-desktop.jpg` → `u9-u10-photo-hero-after.png` | major | A photo hero fills its block, content centred vertically | S | **Fixed** (b26a3aa) |
| U10 | Hero | The subtitle stayed muted grey on a photo — unreadable | `r-trinity-desktop.jpg` → `u9-u10-photo-hero-after.png` | major | Light subtitle when there is a background image | S | **Fixed** (b26a3aa) |
| U11 | Quote | Design-tab Background was ignored (the content `backgroundColor` overrode it); two background controls; the citation ignored Text colour | `r-trinity-desktop.jpg` | minor | Design wins; Content-tab field removed; citation follows the text colour | S | **Fixed** (b26a3aa) |
| U12 | Inspector | Esc did nothing once focus was in the inspector (e.g. after clicking a tab) | `u12-esc-swallowed-by-inspector.png` | minor | Esc only blurs text fields; elsewhere it walks the selection up | S | **Fixed** (b26a3aa) |
| U13 | Version history | The panel ignored Esc | `u13-history-ignores-esc.png` | minor | Esc closes it | S | **Fixed** (b26a3aa) |
| U14 | Preview | Preview rendered inside the admin shell (sidebar, search), ~1160px wide — not what visitors see | `p3-preview.png` | major | Full-screen preview | S | **Fixed** (b26a3aa) |
| U15 | Layers | Clicking a section did nothing; the selected-row highlight never applied (`${…}` inside a plain string); the panel scrolled away; names like "Split-banner block 1" | `p3-layers.png` → `p3-layers-after.png` | minor | Select and reveal the section; fix the class; sticky panel; picker names | S | **Fixed** (b26a3aa) |
| U16 | Layers | "Hide block on canvas" (eye) only struck the name through — nothing was hidden | `p3-layers.png` | major | Removed (there is no real hide feature) | S | **Fixed** (b26a3aa) |
| U17 | Keyboard | Delete/Backspace removed a block with no Undo toast (the toolbar Delete has one) | code + e2e U17 | minor | Same path as the toolbar Delete | S | **Fixed** (b26a3aa) |
| U18 | Naming | The picker says "Service times"; the hover label, inspector and layers said "Split banner" | `p2-insp-service-times-content.png` | minor | One name source (the block catalog) | S | **Fixed** (b26a3aa) |
| U19 | Block picker | Duplicate icons (star ×2, rows ×2, grid ×2, sparkles ×2) | `p2-block-picker.png` | minor | Distinct icons | S | **Fixed** (b26a3aa) |
| U20 | Toolbar | The keyboard-shortcuts button used a "T" (text) icon | `p3-keyboard-help.png` | minor | Keyboard icon | S | **Fixed** (b26a3aa) |
| U21 | Touch targets | 63 controls under 32px: inspector list buttons 22px, close buttons 28px, segmented controls and the breakpoint switcher 25–28px tall | `p3-inventory.json` | minor | ≥32px | S | **Partly fixed** (b26a3aa: list and close buttons). Segmented controls and breakpoint switcher deferred (toolbar height budget) |
| U22 | Section picker | Live thumbnails contained keyboard-focusable links and buttons | `p3-inventory.json` | minor | `inert` thumbnails | S | **Fixed** (b26a3aa) |
| U23 | Empty section | Two "Add Block" buttons (pill + empty state) | `p2-block-picker.png` | minor | Hide the pill when the section is empty | S | **Fixed** (b26a3aa) |
| U24 | Titles | Gallery/Highlights/Testimonials/Video titles couldn't be removed (a blank title left an empty heading and its margin) | Tartine rebuild | minor | Optional titles | S | **Fixed** (b26a3aa) |
| U25 | Images | An unset image rendered a broken `<img>` on the site | code | minor | Render nothing; the gallery skips empty tiles | S | **Fixed** (b26a3aa) |
| U26 | Theme | Site Styles colours never reach Tailwind token classes in blocks (`bg-primary`, `bg-surface-raised`, `bg-primary-light`…): `--color-*` is resolved at `:root` with the **admin** palette. The live site shows admin teal/mint (Intro band, Highlights/Gallery backgrounds, feature icon circles) | `p2-all-templates-desktop.jpg`, `r-tartine-public-after.jpg` | major | Redefine `--color-*` inside `.public-site` and revisit the site token mapping | M | **Fixed** (d310ff4): `--color-*` resolved again on `.public-site` (and on editor chrome, which stays admin). Token map: `--primary-light` is now a pale tint of the primary (was the secondary slate), `--primary-hover` a shade of it, `--surface-tertiary` one step darker than the background. Live changes: Intro band teal → site navy; feature number circles mint/teal → pale navy/navy (white on the blue card); mobile menu icon colour. Evidence `u26-*-before/after.png` |
| U27 | Responsive | Blocks narrowed on the grid keep viewport breakpoints (3 cards in a 14-column block) | `r-trinity-sidebyside.png`, `r-foodbank-split-hero.png` | major | Container queries in `SiteBlock` | M | **Fixed** (ROUND5): every block root is a size container (`.site-block { container-type: inline-size }`) and its grids use `@min-[600px]`/`@min-[700px]`/`@min-[900px]` container variants (Features, Highlights, Gallery, Testimonials, Contact, Trust bar, hero title size). Thresholds keep full-width blocks identical at 1440/1024/768/390 (public pages pixel-identical at all four). Narrowing a block in the editor now grows it to fit the reflowed content. Split banner and Events still switch on window width (their own grid can't query itself). Evidence `u27-half-width-after.png` |
| U28 | Header/footer | The editor's header/footer differ from the published page for a page with an empty own header (editor: page-title logo, light footer; site: site header, dark footer) | `r-tartine-desktop-after.jpg` vs `r-tartine-public-after.jpg` | major | Resolve header/footer the way `pages/public/Home.jsx` does | M | **Fixed** (e044188): the public page always uses the home page's header/footer for other pages; the admin endpoint now also returns that pair as `siteHeader`/`siteFooter` and the canvas renders them. The page's own `header`/`footer` still round-trip on save, so nothing is copied into the page. Evidence `u28-editor-header-after.png` |
| U29 | Hero / Quote | No button in Hero or Quote ("See schedule", "Give now", "Learn more") | rebuild notes | major | Button block, or an optional button field | M | **Fixed** (1de8621): Button block + optional hero button (renders nothing until labelled). Quote button not added |
| U30 | Images | No Image block: full-bleed photos, image + text splits and logo strips are impossible | `r-king-desktop.jpg`, `r-foodbank-split-hero.png` | blocker (capability) | Image block (fit/fill, focal point, link, alt) | L | **Fixed** (1de8621): Image block (upload, fill/fit, focus, alt, caption, link; fills its cell, keeps its height when stacked on phones) |
| U31 | Hero | "Left" alignment leaves the subtitle in a centred max-width box | `r-tartine-desktop-after.jpg` | minor | Align the subtitle box too | S | **Fixed** (1de8621) |
| U32 | Block picker | Closes after every add (3 blocks = 3 round trips) | probe | minor | Keep it open with "Done", or Shift-click to add several | S | Deferred — the new block is auto-selected; a behaviour change that wants owner input |
| U33 | Image dialog | No alt text, no asset-library browse, no crop/focal point | `r-trinity-image-dialog.png` | major | Alt field, library picker, focal point | M | **Partly fixed** (1de8621): the Image block has alt text and a crop focus. Library browse and alt for images inside other blocks deferred |
| U34 | Text | A grey DOM selection highlight stays on a field after Esc | `r-king-desktop.jpg` | minor | Clear the selection on blur | S | **Fixed** (1de8621) |
| U35 | Layers | "Move block up/down" only reorders the array — no visible effect on the desktop grid | code | minor | Remove, or relabel as mobile order | S | **Fixed** (1de8621): removed |
| U36 | Preview | Site nav links in Preview navigate away from the editor | `p3-preview.png` | minor | Intercept links in preview | S | **Fixed** (1de8621): links are inert with a notice |
| U37 | Server | `GET /api/web/:slug` (public, no auth) created a page row for any unknown slug, so any visitor could add pages, which then appear in the admin page list (how `nonexistent-page-xyz` was most likely born) | probe: `GET /api/web/e2e-…` | major | Return 404; pages are created from the Pages screen / admin endpoint | S | **Fixed** (e044188) |
| U38 | Header & Footer | The Header & Footer screen loaded the home page's **published** copy but saves to the **draft**, so saving could undo unpublished header/footer edits | code | minor | Load from `/web/admin/home` (the draft) | S | **Fixed** (e044188) |
| U39 | Header & Footer | Header & Footer changes reach visitors only after the **home page** is published; the screen just says "saved" | code | major | Publish header/footer separately (own snapshot), or say "Publish the home page to make this live" with a button | M | Deferred — needs a product decision on how shared chrome is published |
| U40 | Canvas | Opening the inspector narrows the desktop canvas from 1440 to ~1120px; now that blocks follow their own width, a half-width list block can show 1 column in the editor but 2 on the live page | `u27-half-width-after.png` vs the U27 test | minor | Overlay the inspector, or render the canvas at the target width and scale it | M | Deferred |

**Counts:** 2 blockers (U1, U30), 18 majors, 20 minors (U37–U39 added in round 4, U40 in round 5). **Fixed:** 32 (U1–U25 in b26a3aa; U29–U31, U34–U36 in 1de8621;
U21 and U33 partly). **Open:** U32, U39, U40 and the rest of U21/U33. U27 fixed in ROUND5. U26 fixed in d310ff4; U28, U37, U38 in e044188.
Public-site check: all 9 published pages, desktop + mobile, **pixel-identical** before vs after
(`public-before/` vs `public-after/`). The intended public changes apply only to things no published
page uses today (Contact colours, photo hero fill and subtitle, Quote background precedence,
optional empty titles, unset images).

### Merge / remove controls

- **Add Section (4 entry points → 3):** removed the section menu's "Add Section Below" (same as the
  bottom pill). Keep the between-section pills (they show *where* the section goes) and the page-end
  button (the only option below the last section). The empty-page button is separate and fine.
- **Height toggle in the section menu → removed.** Its arrows icon read as "full-screen preview";
  the inspector's labelled *Height: Fit content / Tall* is now the one place.
- **"Edit Section" (menu) vs the sliders button (top-left) → merged** into the sliders button.
- **Block toolbar ✎ vs clicking text:** keep — it is the keyboard route into text. Low priority.
- **Eye/Preview vs external-link button:** different jobs (draft preview vs live page). Kept both;
  the external link is now "View live page" and only shows once the page is published (on a draft it
  opened a 404). Done (1de8621).
- **"T" keyboard-help button:** now a keyboard icon. Could also move into a single "?" help menu.
- **Layers toolbar button:** keep — it now selects sections and blocks and stays in view.
- **Bring forward / Send backward / Bring to front / Send to back:** four always-visible buttons on
  every block toolbar for a rare action (the Layout tab already has *Layer*). Recommend one
  "Arrange" menu. Not done.
- **Layers "hide on canvas" eye → removed** (it did nothing).

### Missing capabilities (ranked by impact on what a site owner can make)

1. ~~Image block~~ — **added** (1de8621; `new-blocks-public-desktop.jpg`, `new-blocks-public-mobile.jpg`, editor: `new-blocks-desktop.jpg`). Logo strips still need a multi-image layout (see 6).
2. ~~Button block / hero button~~ — **added** (1de8621); Quote still has no button.
3. ~~Section background image (+ overlay)~~ — **added** (1de8621): Section settings → Background photo +
   Darken (none/light/medium/dark). Stored in the section's `fluidConfig` JSON (no schema change).
4. **Global styles that reach blocks** (U26) plus per-block type controls (font family, size,
   letter-spacing for headings) — needed for any brand that isn't the default.
5. **Form block** (newsletter / sign-up with chosen fields and a destination).
6. Container-aware block layouts (U27) and Gallery layouts (grid, masonry, logo strip, aspect ratio).
7. Spacer/divider block; image alt text, focal point and asset library (U33).
8. Reusable saved sections (save-as-template covers whole pages only); carousel/slider.
9. Duplicate-to-mobile and animation: low priority for this audience (alignment guides already exist).

### Prioritised plan

- **Done on branch `web-editor-ui-test-findings`:** U1–U25 (b26a3aa); Image block, Button block,
  hero button, section background photo, U31, U34–U36, "View live page" (1de8621).
- **Done (d310ff4):** theme token scoping (U26), with before/after of all 9 published pages.
- **Done (e044188):** header/footer parity (U28); unknown URLs no longer create pages (U37); Header &
  Footer screen loads the draft (U38).
- **Done (ROUND5):** container queries (U27).
- **Next:** Header & Footer publishing (U39, needs a decision) → canvas width with the inspector
  open (U40) → keep the block picker open (U32).
- **Content note (not a code bug):** the live home page's "Find your place." Features block has a
  saved text colour of #ffffff, so its heading is white on cream. Fix by clearing the text colour in the
  block's Design tab. A contrast warning in the Design tab would catch this.
- **Later:** asset-library browse and alt text everywhere (U33), Arrange menu,
  form block, gallery layouts, the remaining minors (U31–U36).
- Tests: `e2e/ui-findings.spec.mjs` covers U1–U17, the new blocks (N1–N3) and U34/U36 (16 tests).
- Public check, round 2: 8 of 9 published pages pixel-identical before vs after. The 9th,
  `nonexistent-page-xyz`, changed because its content was edited and published by another user
  (version 1, saved by Andy Chan at 02:07 UTC) during the session — not by these changes.
