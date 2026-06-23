---
name: web
argument-hint: "[page|block|template]"
description: >
  Master blueprint for the Web sub-app: a Squarespace-like visual page builder.
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

**Initial reference design:** the `escape-velocity` template should visually
match `html5up-escape-velocity/index.html`, including its dark header, colored
section wrappers, feature grids, highlights, and footer.

## 2. Stack & Conventions

- **Frontend:** React, Vite, Tailwind CSS, `@hello-pangea/dnd` for drag-and-drop,
  `lucide-react` for icons, `marked` for markdown text blocks.
- **Backend:** Node.js + Express, Prisma, Azure SQL.
- **State:** React `useState` for builder history/undo; no global store for the
  web builder.
- **Serialization:** Azure SQL has no native JSON type, so `WebBlock.content` is
  stored as a **JSON string**. The controller parses/serializes at the boundary.
  **Never** change `content` from `String` to `Json` in the Prisma schema.

## 3. File Map

```
client/src/pages/web/
├── index.jsx            # Web Builder admin UI
client/src/pages/public/
├── Home.jsx             # Public dynamic renderer
server/src/controllers/
├── web.js               # GET /api/web/:slug, PUT /api/web/:slug
server/src/routes/
├── web.js               # Route wiring + auth/permission guards
prisma/schema.prisma
├── WebPage              # slug, title, template, header, footer
├── WebBlock             # pageId, type, order, content (String)
html5up-escape-velocity/
├── index.html           # Reference design for the escape-velocity theme
```

## 4. Data Model

### Prisma schema

```prisma
model WebPage {
  id        String     @id @default(uuid())
  slug      String     @unique
  title     String
  template  String     @default("modern")
  header    String?    // JSON string
  footer    String?    // JSON string
  blocks    WebBlock[]
  updatedAt DateTime   @updatedAt
}

model WebBlock {
  id      String  @id @default(uuid())
  pageId  String
  type    String  // hero | text | intro | features | highlights | gallery | testimonials | contact | video | grid | header | footer
  order   Int
  content String  // JSON string
  page    WebPage @relation(fields: [pageId], references: [id])
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

1. **Add default content** in `addBlock()` in `client/src/pages/web/index.jsx`.
2. **Add the editor form** in the switch statement that renders block controls.
3. **Add styles** in `updateBlockStyle` switch (optional).
4. **Add the public renderer** in `client/src/pages/public/Home.jsx` inside the
   `pageData.blocks.map(...)` switch.
5. **Add theme-specific classes** to `THEME_STYLES` in `Home.jsx` for each
   template that needs custom styling.
6. **Keep `server/src/controllers/web.js` unchanged for block content** — it is
   type-agnostic. Update it only when `WebPage` itself gains new fields such as
   `header` or `footer`.

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
- Use template-specific header/footer classes from `THEME_STYLES`.

## 8. Templates

Templates are defined in two places:

- **Builder UI:** `TEMPLATES` array in `client/src/pages/web/index.jsx`.
- **Renderer styles:** `THEME_STYLES` object in `client/src/pages/public/Home.jsx`.

### Current templates

| ID | Name |
|----|------|
| `modern` | Clean, spacious, slate/blue |
| `classic` | Serif, traditional business |
| `minimal` | Monospace, black & white |
| `escape-velocity` | HTML5 UP inspired, dark header, colored sections |

### Adding a new template

1. Add `{ id, name, description }` to `TEMPLATES` in the builder.
2. Add a matching key to `THEME_STYLES` in `Home.jsx` with `container`,
   `hero`, `heroTitle`, `heroSubtitle`, `textBlock`, and any extra keys for
   other block types.
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

## 11. Public Renderer Patterns

- Fetches `/api/web/home` on mount.
- Selects the template from `THEME_STYLES` (fallback `modern`).
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
2. Add to `THEME_STYLES`.
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

Use the HTML5 UP Escape Velocity layout as the first reference design. The goal
is to make the public renderer output match the structure and styling of
`html5up-escape-velocity/index.html`.

1. **Template styles:** Add `escape-velocity` to `THEME_STYLES` in
   `client/src/pages/public/Home.jsx`. Include the dark header, colored section
   backgrounds, wrapper classes, and the distinctive section title bar.
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
10. The Escape Velocity template visually matches `html5up-escape-velocity/index.html`.
