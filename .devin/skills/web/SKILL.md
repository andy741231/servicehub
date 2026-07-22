---
name: web
argument-hint: "[page|block|template]"
description: >
  [web] Master blueprint for the Web sub-app: a Squarespace-like visual page builder.
  Use this skill whenever working on the web builder, public renderer, themes,
  blocks, or CMS data model. Trigger at the start of any Web sub-app session.
allowed-tools:
  - read
  - grep
  - glob
  - exec
  - edit
  - write
  - ask_user_question
  - todo_write
---

# Web Builder — Squarespace-like CMS (`client/src/pages/web`)

## 1. Overview

The **Web** sub-app is a visual, block-based CMS for building the public-facing
website. It has two halves:

1. **Admin Web Builder** — a drag-and-drop editor where admins add, edit,
   reorder, style, and delete blocks, place blocks into multi-column grids with
   controllable widths, and edit the page header and footer.
2. **Public Renderer** — a dynamic frontend that fetches the saved page and
   renders it using the selected template's styles.

**Core philosophy:** pages are built from an ordered list of typed blocks. Each
block has a `type`, `order`, `content` (JSON), and optional `style`. Grid blocks
can contain nested blocks, and the page header/footer are separate page-level
fields. The public renderer maps `type` to a themed React component.

**Design direction:** the visual design is defined by `THEME.md` and the design
tokens in `client/src/index.css` (CSS custom properties / Tailwind theme). The
bundled `html5up-escape-velocity` reference template has been removed; use the
theme tokens as the source of truth for colors, typography, and spacing.

## 2. Stack & Conventions

- **Frontend:** React, Vite, Tailwind CSS, `react-rnd` for the Fluid Engine
  drag/resize, `lucide-react` for icons, `marked` for markdown text blocks.
- **Active editor path:** `WebEditor.jsx` runs the Fluid Engine
  (`FluidSection` + `FluidBlock` in `editor/fluid/`). The Craft.js branch
  and legacy `@hello-pangea/dnd` drag-and-drop in the web editor have been
  removed. `@hello-pangea/dnd` remains in use by the Forms, Email, and Web
  Pages list apps.
- **Fluid Engine:** Each section is a 24-column CSS Grid. Blocks are
  positioned via grid coordinates (`colStart`/`colEnd`/`rowStart`/`rowEnd`)
  and can overlap/layer via `zIndex`. Drag and resize use `react-rnd` with
  `dragGrid`/`resizeGrid` for snap-to-grid. Press "G" to toggle the grid
  overlay. See `web-grid.md` for the previous grid architecture and the
  Fluid Engine design.
- **Editor chrome (mockup-driven):** `FluidSection.jsx` and `FluidBlock.jsx`
  follow `builder-mockup.html` for hover/select/edit interactions — solid
  2px `--primary` outline on hover or select, top/bottom `+ Add Section`
  pills, top-left Layers + `+ Add Block` pill, top-right side-panel
  (Edit Section / View Layouts / Duplicate / Save / Move up / Move down /
  Remove) + `Ask Beacon` pill, bottom-right height toggle. Blocks show a
  top-left icon-only toolbar (Text/Edit/Bring forward/Pin/Duplicate/Delete/
  Add) with 9×9 white-square resize handles. Inline text editing switches
  the outline to dashed and hides the handles. See §10.
- **Inline text editor:** `InlineTextEditor.jsx` is the active text editor
  for all web blocks. It's a `contentEditable` + dark floating toolbar
  (portal to `document.body`, z-index 9999 so it floats above the editor
  overlay at z-100). Styled after `text-editor-mocup.html` — dark `#181b22`
  bar, white icon buttons, accent active state, arrow pointer that flips
  below the selection. Formatting via `document.execCommand` (deprecated
  but universally supported; no new dependency). See §10.
- **Backend:** Node.js + Express, Prisma, Azure SQL.
- **State:** React `useState` for builder history/undo; no global store for the
  web builder.
- **Serialization:** Azure SQL has no native JSON type, so `WebBlock.content`
  is stored as a **JSON string**. Block `fluid` coords are stored inside
  `content` as `_fluid`. Section `fluidConfig` is stored in the
  `WebSection.fluidConfig` column (JSON string). The controller
  parses/serializes at the boundary. **Never** change `content` from
  `String` to `Json` in the Prisma schema.

### Three "grid" concepts (disambiguation)

The codebase has three distinct things called "grid." Do not confuse them:

1. **Fluid Engine grid** (active) — `WebSection.fluidConfig` defines a
   24-column CSS Grid. Blocks are positioned via `fluid.colStart`/`colEnd`/
   `rowStart`/`rowEnd` (stored in `content._fluid`). Driven by
   `FluidSection.jsx` and `FluidBlock.jsx` using `react-rnd`.
2. **`WebSection.columns`** (legacy) — the old section-level CSS grid
   (1–6 columns). No longer used by the active editor but still in the
   schema for backward compatibility.
3. **`GridBlock`** (legacy block type, renderer removed) — a *block type*
   with its own `content.columns` and nested `content.items[]` of blocks.
   A completely separate mechanism for nesting blocks inside a block.

## 3. File Map

```
client/src/pages/web/
├── index.jsx            # Re-exports InlineEditor (default editor)
├── InlineEditor.jsx     # Main editor: SectionWrapper, AddSectionModal, block palette
├── WebShell.jsx         # Pass-through shell (renders Outlet, registers "View site" TopBar action)
├── Pages.jsx            # Page list / management
├── Styles.jsx           # Site-wide style/token editor
├── DraftTemplates.jsx   # Draft template management
├── Assets.jsx           # Media asset library
├── HeaderFooter.jsx     # Header & footer editor
├── WebDashboard.jsx     # Dashboard overview
client/src/pages/web/editor/
├── WebEditor.jsx        # Active editor orchestrator (Fluid Engine)
├── editorComponents.jsx # BaseEditableText (delegates to InlineTextEditor), block editors, SectionWrapper
├── InlineTextEditor.jsx # ★ Inline contentEditable + dark floating toolbar (text-editor-mocup.html)
├── BlockContent.jsx     # Maps block.type → editable field tree (uses EditableText 57+ times)
├── BlockRenderer.jsx    # Re-exports EditableBlock + editors
├── editorUtils.js       # BLOCK_TYPES, DEFAULT_SECTION, factories, autoStackFluid
├── fluid/
│   ├── FluidSection.jsx # ★ 24-col CSS Grid section + mockup-style corner chrome
│   └── FluidBlock.jsx   # ★ react-rnd overlay + selection/hover/editing outlines + icon toolbar
└── ...
client/src/pages/public/
├── Home.jsx             # Public dynamic renderer
server/src/controllers/
├── web.js               # Legacy/aggregate controller (GET/PUT /api/web/:slug)
├── webPages.js          # Page CRUD
├── webStyles.js         # Site style (WebSiteStyle) CRUD
├── webDraftTemplates.js # Draft template CRUD
├── webAssets.js         # Media asset upload/list
server/src/routes/
├── web.js               # Route wiring + auth/permission guards
prisma/schema.prisma
├── WebPage              # slug, title, template, header, footer
├── WebSection           # pageId, order, columns, gap, padding, margin, backgroundColor
├── WebBlock             # pageId, sectionId (FK), type, order, content (String)
├── WebSiteStyle         # tokens (JSON), draftTemplates (JSON)
├── WebAsset             # filename, mimeType, size, url
```

## 4. Data Model

### Architecture: Page → Sections → Blocks

A **page** is composed of an ordered list of **sections**. Each section is a
full-width container with its own layout (1–6 columns), spacing, and background.
Blocks live inside sections, not directly on the page.

### Prisma schema

```prisma
model WebPage {
  id          String       @id @default(uuid())
  slug        String       @unique
  title       String
  template    String       @default("modern")
  header      String?      // JSON string
  footer      String?      // JSON string
  blocks      WebBlock[]   // legacy; new saves go via sections
  sections    WebSection[]
  updatedAt   DateTime     @updatedAt
}

model WebSection {
  id             String     @id @default(uuid())
  pageId         String
  order          Int
  columns        Int        @default(1)   // 1 = full-width, 2-6 = multi-column
  gap            Int        @default(24)  // px gap between columns
  paddingTop     Int        @default(48)
  paddingBottom  Int        @default(48)
  paddingLeft    Int        @default(0)
  paddingRight   Int        @default(0)
  marginTop      Int        @default(0)
  marginBottom   Int        @default(0)
  backgroundColor String?               // optional hex / CSS colour
  page           WebPage    @relation(fields: [pageId], references: [id])
  blocks         WebBlock[]
}

model WebBlock {
  id        String      @id @default(uuid())
  pageId    String
  sectionId String?
  type      String      // hero | text | intro | features | highlights | gallery | testimonials | contact | video | grid
  order     Int
  content   String      // JSON string
  page      WebPage     @relation(fields: [pageId], references: [id], onDelete: NoAction, onUpdate: NoAction)
  section   WebSection? @relation(fields: [sectionId], references: [id], onDelete: NoAction, onUpdate: NoAction)
}
```

### Runtime section shape

```js
{
  id:              'uuid',
  order:           0,
  columns:         1,        // 1 = full-width, 2-6 = multi-column grid
  gap:             24,       // px between columns
  paddingTop:      48,
  paddingBottom:   48,
  paddingLeft:     0,
  paddingRight:    0,
  marginTop:       0,
  marginBottom:    0,
  backgroundColor: '#f9fafb', // or null
  blocks: [/* WebBlock objects */]
}
```

### Runtime block shape

```js
{
  id:      'uuid',       // optional in builder; generated on save
  type:    'hero',
  order:   0,
  content: { title: '...', subtitle: '...' },
  style:   { backgroundColor: '#fff', textColor: '#000', padding: 40, margin: 0, customClasses: '' }
}
```

## 5. Block Registry

Current block types and their `content` schemas:

| Type | `content` fields |
|------|------------------|
| `hero` | `title`, `subtitle` |
| `text` | `content` (markdown supported) |
| `intro` | `title`, `content`, `buttonText`, `buttonLink` |
| `features` | `title`, `subtitle`, `items[]` with `{ icon, title, description }` |
| `highlights` | `title`, `items[]` with `{ title, description, imageUrl }` |
| `gallery` | `title`, `images[]` with `{ url, caption }` |
| `testimonials` | `title`, `testimonials[]` with `{ quote, author, role }` |
| `contact` | `title`, `subtitle`, `email`, `phone`, `address` |
| `video` | `title`, `videoUrl`, `description` |
| `grid` | `columns` (2-6), `gap`, `items[]` each with `{ width, blocks[] }` |
| `header` | `logo`, `navigation[]`, `styles` |
| `footer` | `sections[]`, `copyright`, `styles` |

### Adding a new block type

1. **Add default content** in `addBlock()` in `client/src/pages/web/InlineEditor.jsx`
   (`index.jsx` is just a re-export of `InlineEditor`).
2. **Add the editor form** in the switch statement that renders block controls
   (also in `InlineEditor.jsx`).
3. **Add styles** in `updateBlockStyle` switch (optional).
4. **Add the public renderer** in `client/src/pages/public/Home.jsx` inside the
   block render switch.
5. **Apply theme styling** via the design tokens in `client/src/index.css` /
   `THEME.md`. There is no `THEME_STYLES` constant in `Home.jsx`; theming is
   driven by CSS custom properties and Tailwind theme tokens.
6. **Keep the controllers type-agnostic for block content** — `webPages.js` /
   `web.js` do not inspect `block.type`. Update them only when `WebPage` itself
   gains new fields such as `header` or `footer`.

## 6. Grid Layouts

The builder supports grid-based block placement so a page can be divided into
multiple columns (e.g., 2, 3, 4, or a custom number) and each column can contain
its own nested blocks.

### Grid block structure

```js
{
  type: 'grid',
  content: {
    columns: 3,
    gap: 24,
    items: [
      { width: '33.33%', blocks: [/* nested blocks */] },
      { width: '33.33%', blocks: [] },
      { width: '33.33%', blocks: [] }
    ]
  }
}
```

### Builder behavior

- **Drag into columns:** A `Droppable` container wraps each column so existing
  blocks can be dragged into a column from the root list or from another column.
- **Width control:** Each column exposes a width input (e.g. `33.33%`, `50%`,
  `flex-1`, or a custom Tailwind class). A `columns` selector also auto-distributes
  widths when the user switches between presets (2, 3, 4, 5, 6).
- **Nested blocks:** Any registered block type can live inside a column, including
  another grid block for sub-grids.
- **Responsive defaults:** Store `mobileWidth`, `tabletWidth`, and `desktopWidth`
  on each column so the renderer can switch from `col-4` to `col-12-medium` style
  breakpoints.

### Renderer behavior

- Render the grid as a flex or CSS grid container.
- Map each column to its stored width and render its nested blocks recursively.
- Apply the `gap` value as the gutter between columns.
- Fall back to equal-width columns if no widths are stored.

## 7. Header & Footer

Pages can have a shared editable header and footer. These are not rendered as
part of the block list; they are separate page-level fields that wrap the block
content.

### Data model

`WebPage` stores `header` and `footer` as optional JSON strings (see the Prisma
schema in section 4). The controller parses/serializes them the same way it does
block content.

### Header content shape

```js
{
  logo: { text: 'Escape Velocity', imageUrl: '' },
  navigation: [
    { label: 'Home', href: '/' },
    { label: 'Dropdown', children: [
      { label: 'Left Sidebar', href: '/left-sidebar' }
    ]}
  ],
  styles: { backgroundColor: '#2c2c2c', textColor: '#fff' }
}
```

### Footer content shape

```js
{
  sections: [
    { type: 'contact-form', title: 'Get in Touch' },
    { type: 'contact-info', title: 'Contact Info' }
  ],
  copyright: '&copy; Untitled. Design: HTML5 UP',
  styles: { backgroundColor: '#f5f5f5', textColor: '#333' }
}
```

### Builder behavior

- Add a **Header** tab and **Footer** tab next to "Page Settings".
- Allow editing logo text/image, adding/removing/reordering nav items, and
  nested dropdown menus.
- For the footer, allow multi-column layout, contact form fields, and contact
  info blocks.
- Save header/footer as part of the same `PUT /api/web/:slug` payload.

### Renderer behavior

- Render the header before the first block.
- Render the footer after the last block.
- Use template-specific header/footer classes from the design tokens / Tailwind theme.

## 8. Templates

Templates are defined in two places:

- **Builder UI:** `TEMPLATES` array in `client/src/pages/web/InlineEditor.jsx`
  (legacy copy in `OldWebBuilder.jsx`).
- **Renderer styles:** design tokens in `client/src/index.css` / `THEME.md`,
  applied via the Tailwind theme (there is no `THEME_STYLES` object in `Home.jsx`).

### Current templates

| ID | Name |
|----|------|
| `modern` | Clean, spacious, slate/blue |
| `classic` | Serif, traditional business |
| `minimal` | Monospace, black & white |
| `escape-velocity` | HTML5 UP inspired, dark header, colored sections |

### Adding a new template

1. Add `{ id, name, description }` to `TEMPLATES` in the builder.
2. Add matching styles via the design tokens in `client/src/index.css` /
   `THEME.md` (container, hero, heroTitle, heroSubtitle, textBlock, and any
   extra keys for other block types).
3. Ensure `Home.jsx` has a fallback to `modern` if a saved template is missing.

## 9. API Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `GET /api/web/:slug` | Public | Fetch or bootstrap page |
| `PUT /api/web/:slug` | `verifyToken` + `requireAppAccess('web')` | Save page |

### Bootstrap behavior

`GET /api/web/:slug` creates a default page with a single `hero` block if the
slug does not exist. This keeps the public site and builder from ever showing
a 404 on a fresh database.

### Save behavior

`PUT /api/web/:slug` runs a transaction:

1. Update `WebPage.template`, `header`, and `footer`.
2. Delete all existing `WebBlock` rows for the page.
3. `createMany` the new blocks with `content` JSON-stringified.

This is a full-replace strategy. If adding versioning later, keep the current
behavior as the "publish" step and write draft rows to a separate table.

## 10. Builder Patterns

### Drag-and-drop

- `DragDropContext` wraps the block list.
- Each block is a `Draggable` with a `Droppable` container.
- `handleDragEnd` updates block order and pushes to undo history.
- Grid blocks expose their own `Droppable` columns so blocks can be dragged into
  or out of a column. The drag handler must accept `draggableId` values that encode
  both the block path and the parent grid column index.
- In the Fluid Engine, drag/resize is handled by `react-rnd` overlays in
  `FluidBlock.jsx` (not `@hello-pangea/dnd`). The overlay sits on top of the
  CSS-Grid-placed visual block; when selected, the overlay body becomes
  `pointer-events: none` so clicks reach the contentEditable below, while the
  drag handle and resize handles keep `pointer-events: auto`.

### Undo / Redo

- `history` is an array of `{ template, blocks }` snapshots.
- `historyIndex` tracks the current position.
- Every mutating operation (add, remove, reorder, content change, style change,
  template change) calls `saveToHistory(newTemplate, newBlocks)`.
- `undo()` / `redo()` restore from the stack without hitting the API.

### Device preview

- `showPreview` toggles a live preview pane.
- `previewDevice` can be `desktop`, `tablet`, or `mobile`.
- `getPreviewData()` passes the current (unsaved) state into `PublicHome` as
  `previewData`.

### Styling per block

- Each block has an optional `style` object.
- Supported style keys: `backgroundColor`, `textColor`, `padding`, `margin`,
  `customClasses`.
- The public renderer applies these as inline styles and Tailwind classes.

### Editor chrome — `builder-mockup.html` patterns (FluidSection / FluidBlock)

The section and block chrome in `editor/fluid/FluidSection.jsx` and
`FluidBlock.jsx` follow `builder-mockup.html`. Key patterns:

- **Section outline:** solid 2px `hsl(var(--primary))` outline (not border —
  avoids layout shift) shown on hover (`isHovered`) or selection
  (`isSelected`). Selected sections get `z-index: 5`.
- **Section corner chrome (top-left):** white `Layers` icon-sq-btn (36×36,
  8px radius, shadow) + light `+ Add Block` pill. Both fade in on hover.
- **Section corner chrome (top-right):** white side-panel with `Edit Section`
  / `View Layouts` rows, a 4-cell icon row (Duplicate / Save-as-tall /
  Move up / Move down), and a danger `Remove` row. Below it: an `Ask Beacon`
  pill (AI-assist placeholder). All fade in on hover.
- **Section top/bottom-center:** `+ Add Section` pills (uppercase, 20px
  radius, accent bg, shadow) — top adds above, bottom adds below.
- **Section bottom-right:** accent-filled `ArrowUpDown` icon-sq-btn to
  toggle `fluidConfig.fillScreen` (fill-screen vs hug-content height).
- **Section selection auto-clears** when a block inside it gets selected
  ("only one toolbar shows at once" — mockup spec).
- **Block outlines:** hover (non-selected, non-editing) → 2px solid
  `--primary` (6px offset). Selected (non-editing) → same solid outline.
  Editing → 2px **dashed** `--primary` (6px offset). Outlines use the
  `outline` CSS property, not `border`, to avoid layout shift.
- **Block toolbar:** top-left (`top: -46, left: 0`), icon-only, white bg
  with shadow — Text style / Edit / Bring forward / Pin / Duplicate /
  Delete / Add block. A secondary top-right cluster holds Bring-to-Front /
  Send-to-Back layering shortcuts.
- **Block resize handles:** 9×9 white squares with 2px `--primary` border,
  2px radius (matches mockup spec). Hidden while editing.
- **Block drag handle:** accent-colored grip pill above the block, visible
  only when selected and not editing. Has `pointer-events: auto` so it can
  initiate drag even while the overlay body is `pointer-events: none`.
- **`isEditing` tracking in FluidBlock:** wraps `EditableText/Button/Image`
  to capture `onEditingStart`/`onEditingEnd`. While editing, the react-rnd
  overlay is `pointer-events: none` and resize handles are hidden so the
  contentEditable receives all mouse events.
- **Topbar (WebEditor.jsx edit mode):** dark `#181b22`, 52px-tall bar per
  `builder-mockup.html`. Left: white `SAVE` pill + `Exit` + save status.
  Center: absolute-centered page title (white, bold) + `Page · Published/
  Unpublished/Draft` subtitle. Right: Desktop/Mobile viewport toggle,
  preview-device controls, undo/redo, Publish (green dot), and icon-only
  Template / History / Shortcuts / Preview actions.

### Inline text editor — `InlineTextEditor.jsx` (`text-editor-mocup.html`)

All web block text fields (hero title/subtitle, text content, intro, features,
highlights, gallery captions, testimonials, contact info, etc. — 57+ call
sites in `BlockContent.jsx`) go through `BaseEditableText`, which delegates
to `InlineTextEditor`. Key patterns:

- **Stack:** `contentEditable` + `document.execCommand` (no new dependency).
  `execCommand` is technically deprecated but universally supported; remains
  the simplest way to format a contentEditable without a full rich-text
  framework. The original Craft.js `EditableText` + `FloatingToolbar` used
  the same approach — the design was lifted into `InlineTextEditor`.
- **Toolbar:** dark `#181b22` floating bar with white icon buttons, accent
  (`--primary`) active state, 8px radius, soft shadow, and a small arrow
  pointer (`::after`) that flips when the toolbar is below the selection.
  Buttons: Undo · Redo · H1 · H2 · P · B · I · U · S · Bullet list ·
  Numbered list · Quote · Code block · Align left · Align center ·
  Align right · Link · Image. Matches `text-editor-mocup.html` exactly.
- **Portal:** rendered via `createPortal` to `document.body` so it escapes
  the Fluid Engine grid container's overflow/stacking context.
- **z-index:** `9999` — must be higher than the WebEditor's full-screen
  overlay (`z-[100]`) and the FluidBlock toolbars (`z-[100]`) since the
  toolbar is portaled to `document.body` and needs to float above
  everything in the editor. Modals also use `z-[9999]`.
- **Positioning:** appears above the current text selection; flips below if
  there isn't enough room above. Hidden on collapsed (caret-only) selections
  and when the selection leaves the editor. Re-measures after becoming
  visible (initial estimate may be off).
- **Active formatting state:** detected via `queryCommandState` /
  `queryCommandValue` on `selectionchange` and reflected as accent-filled
  buttons.
- **Selection preservation:** toolbar buttons use `onMouseDown preventDefault`
  so the editor's selection isn't cleared before the command runs.
- **Link/Image:** use `window.prompt()` for URL entry (matches the mockup's
  `data-prompt="true"` pattern). TODO: replace with a proper dialog per
  §13 (no `window.prompt` rule).
- **Single-line vs multiline:** `multiline={false}` (headings, button labels,
  eyebrows) — Enter commits/blurs instead of inserting `<br>`; paste is
  sanitized to plain text; `<br>`/`<div>`/`<p>` are stripped on blur.
  `multiline={true}` (text blocks, intro content) — Enter inserts line
  breaks normally; paste preserves formatting.
- **Escape to commit:** pressing Escape blurs the editor, committing the
  edit (matches `builder-mockup.html`'s "Click outside or press Esc to
  commit and exit" spec).
- **Placeholder:** uses `data-placeholder` attribute, picked up by the
  existing `[contenteditable="true"]:empty::before` rule in `index.css`.
  `handleInput` strips a sole leftover `<br>` after deleting all text so
  the placeholder reappears reliably.
- **`onChange(innerHTML)`** fires on every input. `onEditingStart` /
  `onEditingEnd` fire on focus/blur so `FluidBlock` can toggle its dashed
  editing outline.
- **`handleBlurSanitize`** only fires `onChange` if sanitization actually
  changed the innerHTML (diff check), avoiding redundant state updates and
  history entries on every blur.
- **CSS:** `.inline-text-toolbar`, `.inline-text-toolbar-btn`,
  `.inline-text-toolbar-div` in `index.css` (search for "InlineTextEditor").
  Includes a `prefers-reduced-motion` guard.

## 11. Public Renderer Patterns

- Fetches `/api/web/home` on mount.
- Selects the template (fallback `modern`) and applies styles from the design tokens.
- Renders the page header if `pageData.header` exists.
- Renders the footer after the block list if `pageData.footer` exists.
- Maps each block to a themed section by `type`.
- For `grid` blocks, renders the column container and recursively renders each
  column's nested blocks.
- Applies custom block styles inline.
- Renders markdown text blocks with `marked`.
- Uses `dangerouslySetInnerHTML` only for trusted markdown content.

## 12. Common Tasks

### Add a new block type

1. Add default content in `addBlock()`.
2. Add editor controls in the builder render switch.
3. Add renderer case in `Home.jsx`.
4. Add theme classes for each template if needed.
5. Update this skill's block registry section.

### Add a grid block

1. Add a `grid` block to `addBlock()` with `columns`, `gap`, and an `items[]`
   array of empty column objects.
2. In the builder, render a column selector (2-6) and a width input for each column.
3. Wrap each column in a `Droppable` so blocks can be dragged into it.
4. Recursively render nested blocks in the public renderer when `type === 'grid'`.
5. Store per-column widths and responsive breakpoints in the block content.

### Add a new template

1. Add to `TEMPLATES`.
2. Add matching styles via the design tokens in `client/src/index.css` / `THEME.md`.
3. Test by selecting the template in the builder and previewing every block.

### Edit header or footer

1. Add `header` and `footer` fields to the `WebPage` Prisma model as JSON strings.
2. Update the controller to parse/serialize them alongside blocks.
3. Add **Header** and **Footer** tabs to the builder with forms for logo, nav
   items, footer sections, and copyright.
4. Include `header` and `footer` in the `PUT /api/web/:slug` payload.
5. Render them in `Home.jsx` outside the block list, using the active template's
   header/footer classes.

### Add a new page

Pages are created on-demand via the GET endpoint bootstrap. Requesting
`GET /api/web/:slug` for a slug that does not exist creates a default page with:

- `title`: slug title-cased + " Page" (e.g. `home` → "Home Page")
- `template`: `modern`
- `blocks`: one default `hero` block

To add an explicit page creation flow:

1. Add a `POST /api/web/:slug` route that creates a `WebPage` with the provided
   `title` and `template` and at least one initial block.
2. Keep the GET bootstrap behavior so the public site never 404s on a fresh slug.
3. Update the builder to allow selecting or typing a slug instead of
   hardcoding `/web/home`.
4. Ensure the new slug is unique; return `409` if it already exists.
5. **Validate the slug against the main app's registered sub-app routes.**
   Web pages are rendered at the root path, so a page with slug `forms` would
   conflict with `/forms` if the Forms sub-app owns that route. Prevent the
   page creation and show a message like:  
   *"The path '/forms' is already used by another app. Please choose a different
   page name."*
6. **Apply the same check in reverse when adding a new sub-app route.** If a
   `WebPage` slug already occupies the proposed path, block the new sub-app
   route or warn the user to resolve the conflict before the route is active.
7. Keep the source of truth for registered routes in `shared/constants.js` or
   the route configuration so both the web builder and the main app can
   validate against the same list.

### Change page metadata

- Page title comes from `WebPage.title`.
- SEO meta, OG tags, and canonical URL should be added to `Home.jsx` or a new
  `public/Layout.jsx` shell.

### Add media uploads

- The gallery block currently uses `imageUrl` strings.
- To add uploads, create a new server route for file uploads (e.g. Azure Blob
  Storage) and a new image picker in the builder.

### Replicate the Escape Velocity template

The bundled `html5up-escape-velocity` reference HTML has been removed from the
repo. Use `THEME.md` and the design tokens in `client/src/index.css` as the
source of truth for colors, typography, and spacing when building the
`escape-velocity` template styling.

1. **Template styles:** Define `escape-velocity` styling via the design tokens
   in `client/src/index.css` / `THEME.md`. Include the dark header, colored
   section backgrounds, wrapper classes, and the distinctive section title bar.
2. **Header:** Add a `header` block with a logo, a dark background, and a
   dropdown-capable navigation menu matching the `nav` element in the reference.
3. **Intro block:** Add an `intro` block with a section title bar, centered
   container, and the `style1`, `style2`, `style3` text styling plus a large
   CTA button.
4. **Features grid:** Use a `grid` block with 2 columns on desktop, stacking to
   1 column on mobile. Each cell contains an icon heading and paragraph, matching
   `feature-list` in the reference.
5. **Highlights grid:** Use a `grid` block with 3 equal columns on desktop, each
   containing an image, title, description, and a "Learn More" button.
6. **Footer:** Add a `footer` block with a 2-column layout: a contact form on
   the left and contact info grid on the right, plus a copyright bar at the
   bottom. Match the form layout and the small feature-list contact details.
7. **Responsive:** Use `col-6 col-12-medium` and `col-4 col-12-medium` style
   breakpoints so the layout collapses correctly on tablet and mobile.

## 13. UI Design System — Dialogs & Toasts

### Rule: NEVER use `window.confirm()`, `window.alert()`, or `window.prompt()`
All user-facing confirmations and notifications must use the shared components in
`client/src/components/`.

### Components

| File | Export | Purpose |
|------|--------|---------|
| `components/Dialog.jsx` | `useConfirm()` | Blocking confirm dialog (replaces `confirm()`) |
| `components/Dialog.jsx` | `useAlert()` | Blocking alert dialog (replaces `alert()`) |
| `components/Toast.jsx`  | `useToast()`  | Non-blocking toast notification |

### useConfirm — usage pattern
```jsx
import { useConfirm } from '../../components/Dialog';
import { useToast }   from '../../components/Toast';

export default function MyComponent() {
  const { confirmDialog, ConfirmDialogMount } = useConfirm();
  const { toast, ToastMount } = useToast();

  const handleDelete = async (id) => {
    const ok = await confirmDialog({
      title:        'Delete this item?',
      message:      'This cannot be undone.',
      confirmLabel: 'Delete',      // optional, default 'Confirm'
      cancelLabel:  'Cancel',      // optional, default 'Cancel'
      variant:      'danger',      // 'danger' | 'warning' | 'default'
    });
    if (!ok) return;
    await api.delete(`/resource/${id}`);
    toast('Item deleted.', 'error');
  };

  return (
    <div>
      {/* ... your UI ... */}
      {ConfirmDialogMount}
      {ToastMount}
    </div>
  );
}
```

### useAlert — usage pattern
```jsx
const { alertDialog, AlertDialogMount } = useAlert();
await alertDialog({ title: 'Saved!', message: 'Your changes have been applied.', variant: 'default' });
// mount <AlertDialogMount /> in JSX
```

### useToast — usage pattern
```jsx
toast('Changes saved.');                  // success (default)
toast('Something went wrong.', 'error');
toast('Check your input.', 'warning');
toast('Draft auto-saved.', 'info');
```

### Variants
| Variant | Icon | Button colour | Use for |
|---------|------|---------------|---------|
| `danger`  | Trash  | Red    | Destructive actions (delete, remove) |
| `warning` | Alert  | Amber  | Reversible but risky actions |
| `default` | Info   | Blue   | Neutral confirmations and alerts |

### Rules
- Always mount `{ConfirmDialogMount}` / `{ToastMount}` **inside the same component** that calls the hook.
- Do **not** move mounts to a global layout — hooks are component-scoped.
- Toast auto-dismisses after 3.5 s; dialogs require explicit user action.
- Use `toast('…', 'error')` after a delete to provide undo-style feedback even if undo isn't implemented yet.

---

## Recently Completed (2026-07-21)

### Editor chrome — `builder-mockup.html` alignment

Reworked `FluidSection.jsx` and `FluidBlock.jsx` to match `builder-mockup.html`:
- Solid 2px `--primary` outline (using `outline`, not `border`) on hover/select
- Top/bottom `+ Add Section` pills, top-left Layers + `+ Add Block` pill
- Top-right side-panel (Edit Section / View Layouts / Duplicate / Save /
  Move up / Move down / Remove) + `Ask Beacon` pill
- Bottom-right height toggle (fill-screen vs hug-content)
- Block toolbar moved to top-left, icon-only; 9×9 white-square resize handles
- Dashed outline + hidden handles during inline text editing
- Dark `#181b22` 52px topbar in `WebEditor.jsx` with centered page title +
  `Page · Published/Unpublished/Draft` subtitle, white SAVE pill on left,
  Desktop/Mobile/Preview on right

### Inline text editor — `text-editor-mocup.html`

New `InlineTextEditor.jsx` replaces the old click-to-input `BaseEditableText`:
- `contentEditable` + `document.execCommand` (no new dependency)
- Dark floating toolbar (portal to `document.body`, z-index 9999) with arrow
  pointer, flip-below, accent active state
- Buttons: Undo · Redo · H1 · H2 · P · B · I · U · S · lists · quote · code ·
  align · link · image
- Single-line vs multiline handling, Escape-to-commit, paste sanitization,
  placeholder reliability
- All 57+ `EditableText` call sites in `BlockContent.jsx` get the inline
  editor for free via `BaseEditableText` delegation

See §10 "Editor chrome" and "Inline text editor" for full documentation.
Phase 2 (WYSIWYG) in the Roadmap is marked ✅ DONE.

## Known Issues (Tech Debt — fix later)

These are confirmed gaps between what the editor UI promises and what the public
renderer actually applies. Documented here so they aren't re-discovered from
scratch. Each entry lists the symptom, root cause, and the fix sketch.

### A. Site-wide Styles page tokens never reach the public site

**Symptom:** The Styles page (`client/src/pages/web/Styles.jsx`) lets admins edit
Colors, Typography (heading/body fonts), Spacing (base), and Shape (border
radius). Saving persists a `tokens` object to `WebSiteStyle.tokens` via
`PUT /web/styles`. None of these values affect the published page.

**Root cause:** The public renderer `client/src/pages/public/Home.jsx` never
fetches `/web/styles` and never reads `WebSiteStyle.tokens`. The site's actual
theming comes from hardcoded Tailwind theme classes (`text-primary`,
`bg-surface-raised`, …) and CSS custom properties (`hsl(var(--text-base))`, …)
defined in `client/src/index.css`. The Styles page is effectively a dead UI —
it writes to the DB but nothing reads it back.

**Confirmed by grep:** `Home.jsx` has zero references to `/web/styles`,
`siteStyle`, `tokens` (in the styling sense), or `WebSiteStyle`. The only
`tokens` matches in `Home.jsx` are the unrelated `marked` renderer link tokens.

**Fix sketch:**
1. In `Home.jsx`, fetch `/web/styles` alongside `/web/:slug` (or have the
   `/web/:slug` response include the site style tokens to avoid a second
   round-trip).
2. Inject the tokens as CSS custom properties on a root wrapper (e.g.
   `--color-primary`, `--font-heading`, `--font-body`, `--space-base`,
   `--radius-base`) so they override the defaults from `index.css` for the
   public site only.
3. Load the selected Google Font(s) dynamically (a `<link>` to
   `fonts.googleapis.com` or a `@font-face` injection) so the heading/body
   font choices actually take effect.
4. Map the token keys to the existing Tailwind theme variables the renderer
   already uses, so `text-primary`, `bg-primary`, etc. pick up the new values
   without rewriting every block renderer.

### B. Text block has no typography controls; only color + alignment apply

**Symptom:** In the web editor, opening the style panel for a `text` block shows
a "Typography" section that contains **only a Text Color picker**. There are no
font-family, font-size, font-weight, or font-style controls for text blocks.
The Text Alignment control (left/center/right/justify) does exist and works.

**Root cause:** The `TypographyControls` component in `InlineEditor.jsx` (with
`fontFamily`, `fontSize`, `fontWeight`, `fontStyle`, `textAlign` fields) is
wired **only to the hero block** — it writes `titleFontFamily`,
`titleFontSize`, … and `subtitleFontFamily`, `subtitleFontSize`, … onto
`block.style`. The text block's style panel never renders `TypographyControls`;
its "Typography" section is a hardcoded block that only exposes `color`.

On the renderer side, `Home.jsx`'s `text` branch renders the markdown content
inside a `prose` container and applies `sStyle` (background, color, padding,
margin, border, radius, `textAlign`) to the wrapping `<section>`. It does not
read any font-family/size/weight/style keys for text blocks, so even if the
editor wrote them, they wouldn't apply to the inner prose `div`.

**What currently works for text blocks on the published page:**
- `block.style.color` (text color) → applied via `sStyle.color` on the section,
  cascades into prose. ✓
- `block.style.textAlign` → applied via `sStyle.textAlign` on the section. ✓
- `block.style.backgroundColor`, padding, margin, border, radius,
  `customClasses` → applied to the section wrapper. ✓

**What does NOT work:**
- Font family, font size, font weight, font style — no editor controls, no
  renderer support. The published text uses `prose` Tailwind classes and
  inherits fonts from the global theme. ✗

**Fix sketch:**
1. In `InlineEditor.jsx`, render `TypographyControls` (or a text-block-specific
   variant) inside the text block's style panel, writing plain
   `fontFamily` / `fontSize` / `fontWeight` / `fontStyle` keys onto
   `block.style` (not the `title*` / `subtitle*` prefixed keys the hero block
   uses).
2. In `Home.jsx`'s `text` branch, apply those keys as inline styles on the
   inner prose `div` (not just the outer `<section>`), so they override the
   `prose` defaults. Note: `prose` sets its own font sizes on headings/paragraphs,
   so the inline style may need `!important` or a wrapper class that disables
   prose's typography modifiers (e.g. `prose-p:font-[inherit]`).

### C. Section-level vs block-level style overlap (FYI, not a bug)

The renderer applies `WebSection` padding/margin/background to the section
wrapper and `WebBlock.style` padding/margin/background to the block wrapper.
When both set background color, the block background paints over the section
background within the block's padding. This is intentional but worth knowing
when debugging "why doesn't my section background show" — check whether the
nested block has its own `backgroundColor`.

---

## Roadmap: Harbor Theme + Slider + WYSIWYG

Reference mockup: `landing2/index.html` (+ `about.html`, `contact.html`),
`landing2/styles.css`, `landing2/script.js`. The mockup is a three-page
"Harbor Church" site with a warm editorial design (navy/gold/ivory palette,
Libre Baskerville serif + DM Sans, eyebrow labels, numbered circles, navy
banners, hairline borders, reveal-on-scroll animations).

The goal is to (1) apply the mockup's theme to our front-facing renderer,
(2) build a Revolution-Slider-style slider block (replacing the hero block)
with image / color / gradient / video (HTML5 + YouTube + Vimeo) backgrounds,
(3) add a WYSIWYG text editor with a font-type dropdown so editors can mark
words as serif-italic inline, and (4) build the remaining mockup blocks.

### Confirmed scope decisions

- **Slider replaces the hero block** — the existing `hero` block is removed
  from the block palette. The renderer keeps the `hero` case for backward
  compatibility with already-saved pages.
- **Video: all three types at launch** — HTML5 self-hosted (`.mp4`/`.webm`
  via Assets), YouTube embed, Vimeo embed.
- **WYSIWYG editor with font-type dropdown** — title/subtitle/eyebrow fields
  use a rich text editor where the user can select text and change its font
  family (e.g. sans → serif italic) via a toolbar dropdown. This replaces the
  plain text inputs and the asterisk-syntax idea. The WYSIWYG is a reusable
  component used by the slider and eventually the text block and other blocks.
- **Styles page wired to the renderer** — fixes Known Issue A. The Styles
  page's color/typography/spacing/shape tokens are injected as CSS custom
  properties on the public renderer root, seeded with the Harbor palette.

---

### Phase 1 — Theme Infrastructure (fixes Known Issue A)

Wire the Styles page to actually drive the public renderer, seed it with the
Harbor palette, and restyle the header/footer to match the mockup.

**Tasks:**

1. **Renderer fetches site styles** — in `Home.jsx`, fetch `/web/styles`
   alongside `/web/:slug` (or include tokens in the `/web/:slug` response to
   avoid a second round-trip). Inject the `WebSiteStyle.tokens` as CSS custom
   properties on the renderer root wrapper:
   - `--color-primary` ← tokens.colors.primary (navy `#152b45`)
   - `--color-accent` ← tokens.colors.accent (gold `#b08a4a`)
   - `--color-background` ← tokens.colors.background (ivory `#f8f6f1`)
   - `--color-text` ← tokens.colors.text (navy)
   - `--color-muted` ← tokens.colors.muted (slate `#647384`)
   - `--font-heading` ← tokens.fonts.heading
   - `--font-body` ← tokens.fonts.body
   - `--space-base` ← tokens.spacing.base
   - `--radius-base` ← tokens.borderRadius.default

2. **Seed Harbor defaults** — update `DEFAULT_TOKENS` in `Styles.jsx` to the
   Harbor palette and fonts:
   - Colors: primary `#152b45`, secondary `#54738e`, accent `#b08a4a`,
     background `#f8f6f1`, text `#152b45`, muted `#647384`
   - Fonts: heading `DM Sans, sans-serif`, body `DM Sans, sans-serif`,
     plus a new `serif` token: `Libre Baskerville, Georgia, serif`

3. **Dynamic Google Fonts loading** — when the renderer fetches tokens, inject
   a `<link href="https://fonts.googleapis.com/css2?family=DM+Sans...&family=Libre+Baskerville...">`
   into `<head>` so the selected fonts actually load. Only load families that
   aren't already in the document.

4. **Add a `serif` font token** — extend `DEFAULT_TOKENS.fonts` with a `serif`
   key (`Libre Baskerville, Georgia, serif`). Add a third font dropdown to the
   Styles page Typography section. The renderer exposes it as
   `--font-serif` for use by the WYSIWYG font-type dropdown and by block
   renderers that apply serif emphasis.

5. **Restyle header renderer** — update `renderHeader()` in `Home.jsx` to
   match the mockup:
   - Brand mark: circle with letter (from `logo.text` first char), navy bg
   - Brand copy: name + small uppercase city line
   - Nav links: slate color, gold underline on hover/active
   - CTA button: support a new `header.cta` field
     `{ text, href }` rendered as a navy button on the right
   - Sticky, translucent ivory background with blur

6. **Restyle footer renderer** — update `renderFooter()` in `Home.jsx`:
   - 3-column grid: brand+tagline | link column | gatherings+email
   - Bottom bar: copyright + tagline
   - Hairline borders, slate text on ivory

7. **Add `harbor` to the Tailwind theme** — add the Harbor CSS variables to
   `client/src/index.css` as the new defaults (or scoped under a
   `.template-harbor` class if we want to keep multiple themes). Map them to
   the existing Tailwind theme tokens (`--color-primary` → `primary`, etc.)
   so `text-primary`, `bg-primary`, `text-muted`, etc. pick up the Harbor
   values automatically.

**Files touched:** `Home.jsx`, `Styles.jsx`, `index.css`, `webStyles.js`
(maybe, if we include tokens in the page response).

**Estimated effort:** ~3-4 hours

---

### Phase 2 — WYSIWYG Text Editor with Font-Type Dropdown ✅ DONE (2026-07-21)

Build a reusable rich text editor component that replaces plain text inputs
for title/subtitle/eyebrow fields. The key feature is a toolbar with a
**font-family dropdown** so editors can select text and switch it to serif
italic (or any other font family) inline — this is how the mockup's
"A place to *belong.*" emphasis is achieved.

**Status: implemented 2026-07-21.** The implementation diverged from the
original plan (Quill) in favor of a lighter approach that matches
`text-editor-mocup.html`. See §10 "Inline text editor" for the full
documentation. Summary of what was actually built:

- **Component:** `client/src/pages/web/editor/InlineTextEditor.jsx` (not
  `client/src/components/RichTextEditor.jsx` as originally planned).
- **Stack:** `contentEditable` + `document.execCommand` (not `react-quill`).
  No new dependency was added. The original Craft.js `EditableText`
  + `FloatingToolbar` used the same approach; the design was lifted into
  the new component.
- **Wiring:** `BaseEditableText` in `editorComponents.jsx` delegates to
  `InlineTextEditor` with the same prop signature, so all 57+ `EditableText`
  call sites in `BlockContent.jsx` get the inline editor for free — no
  call-site changes needed.
- **Toolbar:** dark `#181b22` floating bar (portal to `document.body`,
  z-index 9999) with white icon buttons, accent active state, arrow
  pointer that flips below the selection. Buttons: Undo · Redo · H1 · H2 ·
  P · B · I · U · S · Bullet list · Numbered list · Quote · Code block ·
  Align left · Align center · Align right · Link · Image.
- **Font-family dropdown:** NOT implemented yet. The mockup's
  `text-editor-mocup.html` doesn't have one — it uses H1/H2/P block-type
  buttons instead. A font-family dropdown can be added later by extending
  the toolbar and using `execCommand('fontName', value)`.
- **Single-line vs multiline:** `multiline={false}` fields (headings,
  button labels, eyebrows) commit on Enter, sanitize paste to plain text,
  and strip `<br>`/`<div>`/`<p>` on blur. `multiline={true}` fields (text
  blocks, intro content) preserve line breaks and formatting.
- **CSS:** `.inline-text-toolbar*` styles in `client/src/index.css`.
- **Known follow-ups:**
  - Replace `window.prompt()` for Link/Image URL entry with a proper dialog
    per §13 (no `window.prompt` rule).
  - Add a font-family dropdown if/when the design calls for one.

**Files touched:** new `client/src/pages/web/editor/InlineTextEditor.jsx`,
`client/src/pages/web/editor/editorComponents.jsx` (BaseEditableText
delegation), `client/src/index.css` (toolbar styles).

---

### Phase 3 — Slider Block (replaces hero)

Build a Revolution-Slider-style carousel block with image / color / gradient /
video (HTML5 + YouTube + Vimeo) backgrounds, text overlay, buttons, and
Swiper-powered transitions.

**Tasks:**

1. **Add Swiper dependency** — run `npm install swiper` in `client/`.
   Import `Swiper`, `SwiperSlide`, and modules (`Autoplay`, `Pagination`,
   `Navigation`, `EffectFade`, `Parallax`) in `Home.jsx`.

2. **Slider block data shape** —
   ```js
   {
     type: 'slider',
     content: {
       autoplay: true,
       interval: 6000,          // ms per slide
       transition: 'fade',      // 'fade' | 'slide' | 'none'
       showArrows: true,
       showDots: true,
       height: 'full',          // 'full' (100vh) | 'large' (600px) | 'medium' (450px) | custom px
       slides: [
         {
           id: 'slide-uuid',
           backgroundType: 'image',   // 'image'|'color'|'gradient'|'video'|'youtube'|'vimeo'
           // image/gradient:
           backgroundImage: '/uploads/hero.jpg',
           backgroundColor: '#152b45',
           // video (HTML5):
           videoUrl: '/uploads/hero.mp4',
           posterImage: '/uploads/hero-poster.jpg',
           // youtube:
           youtubeId: 'dQw4w9WgXcQ',
           // vimeo:
           vimeoId: '76979871',
           // shared:
           overlay: 'dark',           // 'dark'|'light'|'none'
           textAlign: 'left',         // 'left'|'center'|'right'
           verticalAlign: 'center',   // 'top'|'center'|'bottom'
           eyebrow: 'Welcome to Harbor Church',   // WYSIWYG HTML
           title: 'A place to <span style="font-family:var(--font-serif);font-style:italic">belong.</span>',
           subtitle: 'We are a welcoming community...',  // WYSIWYG HTML
           buttonText: 'Plan your first visit',
           buttonLink: '/contact',
           buttonVariant: 'gold',     // 'gold'|'outline'|'default'
         }
       ]
     }
   }
   ```

3. **Slider renderer in `Home.jsx`** —
   - `<Swiper>` wrapper with configured modules
   - Per-slide background rendering based on `backgroundType`:
     - `image`: `<div>` with `background-image: url(...)`, `background-size: cover`
     - `color`: `<div>` with `background-color`
     - `gradient`: `<div>` with CSS gradient (store the gradient string)
     - `video` (HTML5): `<video autoPlay muted loop playsInline poster={...}>`
     - `youtube`: `<iframe src="https://www.youtube.com/embed/{id}?autoplay=1&mute=1&controls=0&loop=1&playlist={id}&showinfo=0&modestbranding=1&rel=0">` with CSS to fill the slide
     - `vimeo`: `<iframe src="https://player.vimeo.com/video/{id}?background=1">`
   - Overlay layer (`dark` = semi-opaque navy gradient, `light` = semi-opaque white, `none` = nothing)
   - Content layer: eyebrow, title (WYSIWYG HTML via `dangerouslySetInnerHTML`), subtitle, button
   - Content positioned by `textAlign` + `verticalAlign`
   - Button styled by `buttonVariant` (gold / outline / default)

4. **Slider editor in `InlineEditor.jsx`** —
   - **Slide list panel**: shows all slides with thumbnails, add/remove/reorder (drag-and-drop via `@hello-pangea/dnd` or up/down buttons)
   - **Per-slide editor** (shown when a slide is selected):
     - Background type toggle (image / color / gradient / video / youtube / vimeo)
     - Conditional fields based on type:
       - image: background image URL (the existing Assets page can upload/select the asset)
       - color: `ColorPicker`
       - gradient: gradient string input (or a simple 2-color picker that builds a CSS gradient)
       - video: HTML5 video URL + poster image URL (the existing Assets page can upload/select the video)
       - youtube: YouTube ID/URL input
       - vimeo: Vimeo ID/URL input
     - Overlay selector (dark / light / none)
     - Eyebrow, title, subtitle: `<RichTextEditor>` (from Phase 2)
     - Button text, button link, button variant dropdown
     - Text alignment (horizontal + vertical)
   - **Slider-level settings** (separate panel or top of block editor):
     - Autoplay toggle + interval (ms)
     - Transition style (fade / slide / none)
     - Height (full / large / medium / custom)
     - Show arrows / show dots toggles

5. **Assets route: support video uploads** — in `server/src/controllers/webAssets.js`:
   - Allow MIME types: `video/mp4`, `video/webm`, `video/ogg`
   - Bump upload size limit (Azure App Service: check `web.config` `<requestLimits maxAllowedContentLength>`, Express `multer` `limits.fileSize`). Target: ~50MB.
   - Return the video URL the same way image uploads do

6. **Remove `hero` from the block palette** — in `InlineEditor.jsx`'s `addBlock()` / block palette, remove the `hero` option. Keep the `hero` renderer case in `Home.jsx` for backward compatibility with existing saved pages.

7. **Default slider content** — `addBlock('slider')` creates a single-slide slider with a color background and placeholder text, so the editor never starts empty.

**Files touched:** `Home.jsx`, `InlineEditor.jsx`, `server/src/routes/web.js`,
`client/src/index.css`, `client/package.json` (Swiper dep).

**Estimated effort:** ~9-11 hours (slider core ~5-6 hrs + all three video
types ~3-4 hrs + assets route ~0.5 hr + testing ~1 hr)

---

### Phase 4 — Remaining Mockup Blocks + Polish

Build the rest of the mockup's components as new blocks or extensions, plus
global enhancements.

**Tasks:**

1. **New block: `trust-bar`** — 3 items with big numbers + labels.
   `content: { items: [{ number, label }] }`

2. **New block: `split-banner`** — 2-col navy banner: left copy (eyebrow,
   title, text, button) + right service-times list.
   `content: { eyebrow, title, body, buttonText, buttonLink, buttonVariant, times: [{ label, value }] }`

3. **New block: `events`** — rows of date | title+desc | time.
   `content: { items: [{ date, title, description, time }] }`

4. **New block: `quote`** — big serif blockquote on gold-soft background.
   `content: { quote, citation, backgroundColor }`

5. **New block: `map`** (optional) — address + CSS placeholder or real map
   embed (Google Maps iframe). `content: { address, embedUrl }`

6. **Extend `features` block** — add per-card `variant` (white / blue / navy
   background) and a `numbered` mode (numbered circles instead of icons).
   Add `eyebrow` to the section heading.

7. **Extend `contact` block** — add form fields (name, email, reason select,
   message) + detail labels, matching the mockup's contact layout. This may
   need a backend endpoint to store submissions (or just a mailto / front-end
   only for v1).

8. **Button variant system** — any block with a button supports
   `buttonVariant: 'gold' | 'outline' | 'default'`. Add a shared
   `buttonClass(variant)` helper used by all block renderers.

9. **Reveal-on-scroll animation** — add an `IntersectionObserver` in
   `Home.jsx` that adds an `is-visible` class to sections when they enter
   the viewport. CSS handles the fade-up transition. This is a global
   renderer enhancement, not a per-block thing.

10. **Page-level `eyebrow` support** — several mockup sections use an eyebrow
    label above the heading. Add an optional `eyebrow` field to block content
    where relevant (slider already has it; add to features, events, etc.).

**Files touched:** `Home.jsx`, `InlineEditor.jsx`.

**Estimated effort:** ~6-8 hours

**Implementation note:** The Phase 4 blocks are now implemented as `trust-bar`,
`split-banner`, `events`, `quote`, and `map`. The `features` block supports
numbered cards and card variants, and the public renderer includes scoped
Harbor styling plus reduced-motion-aware reveal-on-scroll behavior.

All Phase 4 tasks are complete. Features now supports an eyebrow, numbered
cards, and variants; contact includes configurable detail labels and a reason
select; buttons use the shared `buttonClass(variant)` helper; and public blocks
support reduced-motion-aware reveal-on-scroll behavior.

---

### Total estimated effort

| Phase | Scope | Hours | Status |
|-------|-------|-------|--------|
| 1 | Theme infrastructure (Styles → renderer, Harbor palette, header/footer) | 3-4 | ✅ Done |
| 2 | WYSIWYG editor with font-type dropdown (react-quill) | 1-2 | ✅ Done |
| 3 | Slider block with image/color/gradient/video (HTML5+YouTube+Vimeo) | 9-11 | ✅ Done |
| 4 | Remaining mockup blocks + reveal animations + button variants | 6-8 | ✅ Done |
| **Total** | | **19-25** | |

### Implementation order

Phases 1 → 2 → 3 → 4. Phase 1 gives the renderer the right colors/fonts/
header/footer (the "canvas"). Phase 2 builds the WYSIWYG that the slider
needs for serif-italic emphasis. Phase 3 builds the slider itself. Phase 4
fills in the remaining mockup blocks.

### Dependencies to install

- `swiper` (slider carousel) — in `client/`
- No new WYSIWYG dependency — reuse the existing `react-quill` package in
  `client/`

### Verification per phase

- **Phase 1:** Styles page changes → refresh public site → colors/fonts/
  header/footer match the mockup. Try changing a color in Styles → save →
  public site updates.
- **Phase 2:** Web text block → enter content → select a word → choose
  "Serif Italic" from the font dropdown → word renders in Libre Baskerville
  italic on the public site. The slider's eyebrow, title, and subtitle fields
  use the same component.
- **Phase 3:** Add a slider block → add slides with each background type →
  save → public site shows autoplaying slider with transitions, arrows, dots.
  Upload a video → use as slide background → plays muted/looped. Paste a
  YouTube ID → embed plays. Paste a Vimeo ID → embed plays.
- **Phase 4:** Build a page matching the mockup using the new blocks →
  compare side-by-side with `landing2/index.html`.

---

## 14. Constraints & Guardrails

- **Do not** use Prisma `Json` type for `WebBlock.content` or `WebPage` data.
- **Do not** store secrets in the block JSON.
- **Do not** break existing block types when adding new ones.
- **Do** keep the public renderer and builder block schemas in sync.
- **Do** test the builder save + public page render after every change.
- **Do** prefer `style` object keys that already exist; new style keys must also
  be applied in `Home.jsx`.

## 14. Verification Checklist

Before considering a Web sub-app change complete:

1. Builder loads without errors.
2. Add, reorder, edit, and delete blocks work.
3. Grid blocks support 2-6 columns, custom widths, and drag-and-drop inside columns.
4. Header and footer can be edited, saved, and rendered.
5. Save updates the database and public renderer.
6. Undo/redo works across the tested flow.
7. Preview renders correctly on desktop, tablet, and mobile.
8. All existing block types still render on the public site.
9. Existing templates still work.
10. The Escape Velocity template matches the design tokens in `THEME.md` / `client/src/index.css`.

## 15. Tailwind CSS Gotchas

- **Tailwind v4 `bg-opacity-*` Deprecation**: The project uses Tailwind CSS v4, where `bg-opacity-*` classes are deprecated and no longer modify the opacity of preceding background colors. For example, `<div className="bg-black bg-opacity-30">` will result in a 100% solid black background.
- **Fix**: Always use the opacity modifier syntax (e.g., `bg-black/30`, `bg-black/50`) to create semi-transparent backgrounds and overlays.
