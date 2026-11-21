# Editor ↔ Public Parity Audit — Web Builder

Date: 2026-09-27. Method: live browser, same viewport, compared
`client/.../editor/fluid/FluidSection.jsx` canvas output against the published
page rendered by `client/src/pages/public/Home.jsx` + the `/api/web/home`
payload. Page: `home` (5 sections: hero, trust-bar, features, split-banner,
events).

## Measured divergence (before fix)

| Section | Editor height | Published height | Note |
|---|---|---|---|
| 0 hero      | 966px | 683px | editor +2 spare rows +96 phantom + off-by-one |
| 1 trust-bar | 520px | 88px  | 5.9× taller in editor |
| 2 features  | 696px | 737px | content 819px clipped in a 432px cell |
| 3 split     | 756px | 663px | |
| 4 events    | 696px | 732px | content 579px clipped in a 432px cell |

Published page rendered **no fluid grid at all** (`section.fluidConfig: null`,
`block.fluid: null` in the live DB and published snapshot) — it fell back to
the legacy stacked path.

## Findings

- **PAR-1 (critical) — published page ignores the fluid layout entirely.**
  `normalizeSectionBlocks` synthesizes `block.fluid` coords on load but never
  sets `section.fluidConfig`. The save path writes `sec.fluidConfig` verbatim
  → stays `null` → the publish snapshot has no fluidConfig →
  `Home.jsx` `if (section.fluidConfig)` is false forever → public renders the
  legacy stacked layout. The designer's canvas positioning never ships.
  (`editorUtils.js` ~L390, `controllers/web.js` ~L305, `Home.jsx` ~L846.)

- **PAR-2 (high) — editor inflates every section's geometry.**
  `FluidSection` renders `maxRowEnd + 2` spare rows at all times, computes
  `contentHeight` with an off-by-one (`maxRowEnd` rows instead of
  `maxRowEnd - 1`), and adds a `+96px` phantom `minHeight`. Public renders
  `maxRowEnd - 1` rows, no phantom. Net: ~250–350px phantom per section.
  (`FluidSection.jsx` ~L133–136, L160.)

- **PAR-3 (high) — overflow is asymmetric: editor clips, public spills.**
  Editor blocks are wrapped in `overflow-hidden` (FluidBlock ~L341), so tall
  content inside a too-small row span is silently hidden on canvas. Public
  grid items have no clipping → the same content spills over the next block.
  Migrated `LEGACY_ROW_SPANS` under-size real content (features: 819px content
  in a 5-row/448px box; events: 579px in 448px).

- **PAR-4 (info) — block internals already share classes.** `BlockContent.jsx`
  renders `public-*` classes, so block chrome is faithful once the grid
  geometry matches. Remaining risk is per-type inner markup drift (e.g.
  hero actions wrapper), spot-checked after the fix.

## Fix plan

1. **Persist fluidConfig on migration** (`editorUtils.js`): assign
   `{ ...DEFAULT_SECTION.fluidConfig, mobileAuto: section.mobileAuto ?? true }`
   when a section with blocks lacks one, and surface `mobileAuto` top-level so
   the save path serializes it. After one save+publish the public page renders
   the same fluid grid the editor shows.
2. **Match grid math** (`FluidSection.jsx`): idle rows =
   `max(maxRowEnd - 1, 1)` exactly like `Home.jsx`; keep the +2 spare rows only
   while dragging/resizing or showing a drop hint (`showGrid || dropHint`);
   fix the off-by-one in `contentHeight`; drop the `+96` phantom (empty
   sections keep a 4-row drop target).
3. **Auto-fit overflow** (`FluidBlock.jsx` + `FluidSection.jsx`): after render,
   measure the block's content height vs its row span; if it overflows, grow
   `rowEnd` up to the next block's `rowStart` (or the grid bottom). Persisted
   via the normal update path so public inherits it — Squarespace-style
   "blocks hug their content."
4. **Verify**: save+publish → confirm `.fluid-grid-desktop` renders → re-run
   the section metrics table → expect editor/public within a few px.

## Results — implemented & verified in-browser

| Section | Editor | Public | Δ |
|---|---|---|---|
| hero        | 702 | 703 | 1px rounding |
| trust-bar   | 256 | 257 | 1px |
| features    | 872 | 873 | 1px (auto-fit grew span 1/6 → 1/11) |
| split-banner| 492 | 493 | 1px |
| events      | 608 | 609 | 1px (auto-fit grew span 1/6 → 1/8) |

- **PAR-1 fixed**: `normalizeSectionBlocks` now assigns `fluidConfig` (defaults
  + `mobileAuto`, surfaced top-level) when a section with blocks lacks one.
  All 5 sections/blocks now carry fluid data in the published snapshot; public
  renders `.fluid-grid-desktop`/`.fluid-grid-mobile` — the same layout engine
  as the canvas. (`editorUtils.js`)
- **PAR-2 fixed**: idle grid = `maxRowEnd - 1` rows exactly like `Home.jsx`;
  `+2` spare rows appear only while dragging/resizing/drop-hovering
  (`showGrid || dropHint`), verified live (3 → 5 → 3). Phantom `+96` minHeight
  removed; off-by-one in `contentHeight` corrected. (`FluidSection.jsx`)
- **PAR-3 fixed**: auto-fit measures each block's `scrollHeight` vs its row
  span and grows `rowEnd` (clamped at the next same-column block) via the
  normal update path — persisted + published. Grow-only; never shrinks a
  deliberate resize. (`FluidBlock.jsx` + `FluidSection.jsx`)
- **Bonus fix — stale-load race**: `fetchPage` was called in a StrictMode
  double-mounted effect; the second response re-applied pristine data over
  any state that landed in between (silently reverted auto-fit, could revert
  a fast user edit). Responses now carry a request sequence; superseded
  responses are dropped. (`WebEditor.jsx`)

## Verified

- Editor ↔ public section heights within 1px; identical grid coords.
- Hero block: same `public-*` classes, same fonts (107.2px DM Sans), same
  button colors in canvas and public.
- Mobile (390px): public `.fluid-grid-mobile` auto-stacks hugging content —
  same formula as the editor's auto mode.
- Clean reload: no migration banner, no phantom dirty (persisted `fluidConfig`
  ends the migrate-every-load cycle), SAVE disabled.
- Drag still extends the grid (+2 spare rows) while dragging, then collapses.
- Console: 0 errors.

## Residual notes

- The published page's *appearance* changed vs the old legacy render (e.g.
  trust-bar now occupies its full row span instead of hugging at ~88px). That
  is the point — the canvas now ships what it shows. Designers tighten spans
  by dragging block edges.
- Nested-grid columns, custom `fluidMobile` coords, and `zIndex` overlap
  follow the same coord path on both sides; spot-verified by formula, not yet
  pixel-diffed for every block type.
