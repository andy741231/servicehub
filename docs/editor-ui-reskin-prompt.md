# Prompt: reskin the web editor UI to match the reference screenshot

Copy everything below the line into a new agent session at the repo root, and attach the
reference screenshot (Squarespace-style editor: dark top bar, "Add Block" tile panel on the
left, selected section with blue outline, "Section | Page" inspector on the right).

---

The attached screenshot is the target look for the Service Hub **web editor**
(`/hub-admin/web/editor/<slug>`). This is a **UI reskin**: make the editor chrome match the
reference as closely as our design tokens allow. Do **not** change editor behavior, the data
model, or the rendered page output — **with one deliberate exception**: the column layout
model described in its own section below.

## Context you need

- Read `docs/web-editor-plan.md` and `THEME.md` first. The plan records what's built and why;
  don't undo decisions documented there.
- The canvas is an iframe (`iframe[title="Page canvas"]`, `editor/CanvasFrame.jsx`) rendering the
  real site components from `client/src/site/`. Only the chrome *around* it changes. Nothing in
  `client/src/site/**` may be touched, and public pages must render pixel-identical afterward.
- Editor chrome files (`client/src/pages/web/editor/`):
  - Top bar → `EditorToolbar.jsx` (+ `client/src/components/builder/Builder*`)
  - Left "Add block" panel → `BlockPicker.jsx` (categories/types: `editorUtils.js`)
  - Section picker → `SectionPicker.jsx`, `sectionTemplates.js`
  - Right inspector → `EditorInspector.jsx` (+ `BlockSettingsPanel.jsx`)
  - On-canvas section/block chrome → `fluid/FluidSection.jsx`, `fluid/FluidBlock.jsx`
- Theme tokens already exist: `--editor-chrome`, `--editor-chrome-text`, `--editor-chrome-muted`,
  `--editor-success`, `--surface`, `--border`, `--primary`. Reuse them; add tokens rather than
  hardcoding hex values.
- Reuse existing primitives (`Segmented`, `CommitInput`, `ColorField`, `ImageField` in
  `EditorInspector.jsx` / `BlockSettingsPanel.jsx`) — restyle them, don't fork them.

## Safety rules (mandatory)

1. **Never open, edit or publish real site pages** (`home`, `about`, etc.). Verify only on
   temporary pages from `createFixturePage()` in `e2e/helpers.mjs`; delete them with
   `deleteFixturePage()` at the end.
2. **Intercept image uploads** (`POST /api/web/assets`). Uploads go to real Azure blob storage.
3. Never run `npm ci` (wipes `node_modules` on this machine).
4. **Do not push.** Commit on a new branch and stop.
5. Auth: set `E2E_USERNAME` to a local admin (ask the user if unknown).

## Match these specifics from the reference

### Top bar (`EditorToolbar.jsx`)

- **Left:** leave the left side as it is today (Exit, Preview, save status, page title) —
  the reference's left side is out of scope.
- **Right:** icon-only device switcher (monitor / tablet / phone) — restyle
  `BuilderBreakpointSelector` to the segmented-icon look; "Preview" as a text button; undo/redo
  icons; then a prominent **solid-filled Publish** primary button (the current text+dot
  treatment is too quiet).
- Shared-component caution: `BuilderBreakpointSelector` is web-editor-only — restyle freely.
  `BuilderHistoryControls` and `BuilderSaveStatus` are **shared with the Forms and Email
  builders** — keep them prop-compatible (or wrap them in the editor) so those apps don't change
  unintentionally.
- Every existing action stays reachable (version history, save-as-template, keyboard shortcuts,
  layers, view-live). Fold the rarely used ones into a gear/overflow menu if the bar gets crowded.

### Left panel — Add block (`BlockPicker.jsx`)

- Header: "Add Block" + close X; search field beneath; "**Blocks | Custom**" tabs under search.
  Hide the Custom tab — the user's saved sections already live in the SectionPicker's "Saved"
  category (`SectionPicker.jsx`), and this panel adds blocks, not sections. Note it in the
  report rather than building it.
- Restyle the list into the reference layout: a **category rail** (Basics, Media, Layout,
  Buttons, Forms, Embed, Social, Advanced…) with the selected category's blocks as a **grid of
  tiles** — icon centered in a rounded square, label underneath, ~3 per row.
- Keep all current behavior: click adds to the target section, drag onto canvas inserts at row,
  Enter adds the first search match, panel stays open after adding, "Added X" status line.
- Map our existing `BLOCK_TYPES`/`BLOCK_CATEGORIES`. Don't add empty placeholder categories
  (no Commerce/Community rail entries with nothing in them) — but new blocks ARE in scope;
  see "Block catalog gaps" below for which ones to build.

### Canvas chrome (`fluid/FluidSection.jsx`, `fluid/FluidBlock.jsx`)

- Selected section: clean ~2px primary outline; floating mini-toolbar at top-left with a
  "**+ \<Section type\> ▾**" chip (section menu), drag grip, and ⋮ overflow; small icon buttons
  top-right for duplicate/delete/more (all exist). The reference's **eye/hide icon is a real
  feature add** — sections have no `hidden` flag today, so `SiteSections` would have to skip
  hidden sections on the public site; implement it or leave the button out, and say which.
- Centered "**+ Add Section**" pill between sections (keep the above/below semantics correct —
  the top pill inserts above).
- Block hover keeps the type label + outline; the selected block keeps its existing toolbar.
- Keep the grid overlay (G key). Drag/resize math changes only as specified in the column-model
  section below.

### Right inspector (`EditorInspector.jsx`)

- **Top: "Section | Page" tabs** when a section is selected (and the block's Content/Design/
  Layout tabs styled the same way — underline tab style, not buttons). Page tab content: the
  `WebPage` model has `title`, `slug`, `description` (1,000-char SEO description) — title +
  description are safe; a slug edit changes the public URL, so include it only behind a clear
  "this changes the page URL" warning, or leave it out and say so.
- Section selected, grouped collapsible sections in this order:
  - Header row: section icon + type name (e.g. "Hero").
  - **Background** — Color / Image / Video segmented tabs. Image tab: thumbnail preview +
    "Change image" button (reuse `ImageField`), then **Overlay as a slider with a % readout**
    (map our `none/light/medium/dark` overlay onto a % scale — actual alphas in
    `SiteSections.jsx` `SECTION_OVERLAYS` are 0/25/45/65). `fluidConfig` is JSON inside the
    section payload — no DB migration needed — but keep reading the old enum values so existing
    pages don't change appearance.
  - **Spacing** — Top / Bottom / Left / Right numeric inputs with px suffixes. All four fields
    already exist: `section.paddingTop/Bottom/Left/Right` are stored and rendered by
    `SiteSections.jsx`; the inspector just lacks the inputs — wire them up.
  - **Content width** — segmented Narrow / Medium / Wide. If sections have no width setting,
    this is a real feature add: implement it in `client/src/site/` section rendering + editor +
    report it as such (it's the one sanctioned non-chrome change).
  - Collapsible **Design** and **Advanced** groups holding the remaining settings (height/fill,
    vertical alignment, layout-grid row height/gaps).
- Keep commit-on-blur inputs, the contrast warning, and the "nothing selected" empty state —
  restyled to match.

## Column layout model (replaces freeform drag inside sections)

The biggest functional change, and the one sanctioned exception to "don't touch behavior":
sections move from the freeform 24-column grid to a **column-stack model**.

**Storage stays the same** — keep `colStart/colEnd/rowStart/rowEnd` + `fluidConfig` (JSON,
no DB migration). Columns are a constraint layer on top of the existing grid:

- `fluidConfig.columns` ∈ {1,2,3,4,6}, default **3** for new sections. (5 is skipped — it
  doesn't divide the 24-col grid evenly; add it later only as an uneven split.) Each column
  is 24/n grid columns wide.
- **New block default width = one column** (6 columns → 1/6 of section width; 1 column →
  full width).
- **Dragging a block locks it into a column** — including across sections. A column is a
  vertical stack: dropping onto an occupied column stacks the block under what's already
  there, inserting at the drop position and pushing blocks below it down. No freeform x/y
  placement inside a column-mode section.
- **Resize:** horizontal resize snaps to column boundaries — a block may span adjacent
  columns (k/n of section width). Vertical resize snaps to rows (current behavior) and pushes
  blocks below down, like auto-grow.
- **Rows are derived** in column mode: a block's `rowStart` = bottom of the block above it in
  its column(s); a multi-column block starts below the deepest spanned column. Recompute on
  every placement change and persist the derived coords so the public renderer needs no new
  logic.
- **Overlap/z-index no longer apply** in column mode — hide Bring forward / Send back / layer
  controls (and Layers-panel positioning actions) for column-mode sections.
- **Section inspector gains a "Columns" control** (segmented 1/2/3/4/6) in the Layout group.
  **Block Layout tab** shows column + span + stack position instead of raw col/row numbers.

**Existing pages (important):** sections without `fluidConfig.columns` keep rendering their
stored freeform coords — nothing on the live site changes until the user sets a column count
for that section. On conversion, snap each block's left edge to the nearest column, its span
to the nearest column multiple, stack blocks top-down in reading order, recompute rows — then
screenshot before/after. Optionally keep a "Freeform" escape hatch per section for legacy
layouts; if you skip it, say so.

**Mobile:** unaffected — columns collapse to the existing single-column auto-stack.

## Block catalog gaps (the reference has blocks we don't)

There is no per-block registry file: public rendering is one switch-style renderer in
`client/src/site/SiteBlock.jsx`, editable-field primitives are in `client/src/site/fields.jsx`.
Each new block = a branch in `SiteBlock.jsx` + fields + a `BLOCK_TYPES` entry (with sensible
default `rows` and keywords) in `editorUtils.js` — so the public site renders it too.

**Implement (small, self-contained):**

| Block | What it is | Notes |
|---|---|---|
| **Accordion** | Collapsible question/answer rows (title + rich text body, add/remove/reorder rows) | High value for FAQs; list-field editing like trust-bar items |
| **Embed / Code** | Raw HTML or iframe embed (giving forms, playlists, third-party widgets) | Render inside a sandboxed iframe or clearly-marked raw-HTML container on the public site; admin-only editor so raw HTML is acceptable — but never strip stored code on edit round-trips |
| **Audio** | HTML5 audio player (sermon recordings, podcasts) — file from asset library or URL, optional title | Cheap: `<audio controls>` + styles |
| **Social links** | Row of icon buttons (Facebook / Instagram / YouTube / X …) with per-link URLs | Simple list field: pick icon + URL |
| **Spacer** | Empty block whose only job is vertical space | Cheap on the grid; skip if auto-grow + row heights already cover it — say which |
| **Form** | Embeds a form from the Forms sub-app | Cheaper than it looks: `client/src/site/FormEmbed.jsx` already renders `/form/:id?embed=1` and `SiteBlock.jsx` uses it for the `contact` block — a standalone `form` block is just a `formId` picker + `FormEmbed` |

**Bigger feature — attempt only if contained, otherwise flag and defer:**

- **Video background** — looping muted video as a *section* background. The inspector's
  Background › Video tab needs this to exist: add `fluidConfig.backgroundVideo` (asset URL),
  render `<video autoplay muted loop playsinline>` behind section content in `client/src/site/`
  + editor canvas. If it turns into a project (upload size, hosting), defer and hide the tab.

**Deliberately skip (say so in the report):**

- **Columns** — Squarespace needs a Columns block because its layout is constrained; our 24-col
  freeform grid already does this by placing blocks side by side.
- **Section** tile — inserting sections already has a dedicated SectionPicker + "+ Add Section"
  pill.
- **Commerce, Community, and other empty categories** — no commerce/membership stack; an empty
  rail entry is worse than no rail entry.
- **Button row / extra text variants** — covered by multiple button blocks and the existing
  text block's formatting.

## Hard rules

- **Visual/UX only** beyond the flagged feature adds (Page tab, content width, the new blocks,
  section hide if you take it) and the column layout model. No changes to autosave, publish,
  undo history, selection model, or keyboard-shortcut handling; drag/resize math changes only
  per the column-model spec.
- Keep 44px touch targets, aria-labels, focus rings, and Esc walk-up behavior.
- No new dependencies without asking first.
- Dark chrome stays dark; panel surfaces use `--surface`. The reference's exact blues/spacing
  are a guide — match the *structure and hierarchy*, keep our tokens.

## Verify

1. `npm run dev`; open the editor on a temp page. Screenshot top bar, add-block panel, selected
   section chrome, and inspector (section + block) at desktop/tablet/mobile. Compare each to the
   reference side by side.
2. `npm run e2e` — all existing tests pass. Update selectors only where tests reference chrome
   you deliberately changed; note each change.
3. `npm -w client run build` and `npm -w server test` clean.
4. Public pages pixel-identical (spot-check `home` + one other at desktop and mobile).
5. For each new block: add it to a temp page, publish the temp page, verify it renders correctly
   on the public site at desktop and mobile, then delete the page.
6. Column model on a temp page: new section defaults to 3 columns; new block = 1 column wide;
   drag between columns and between sections (stacking, no overlap); horizontal resize snaps to
   column boundaries including multi-column spans; vertical resize snaps to rows and pushes
   blocks below; an existing freeform page is unchanged until you set a column count, then the
   conversion snap looks sane before/after.
7. Commit on a new branch. **Do not push.**

## Report back

- Before/after screenshots per region (paths)
- Reference elements you couldn't match, and why
- Whether "Page" tab / Content width needed schema or site-renderer changes
- Blocks implemented vs. deferred/skipped (with a screenshot of each new block on a temp page)
- Test results and the branch name
