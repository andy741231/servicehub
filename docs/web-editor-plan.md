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
