# Install Plan — UX Libraries & MCPs for Service Hub Builders

**Target:** Service Hub monorepo (`client/` = Vite + React + Tailwind v4)
**Builders covered:** Web (Squarespace-like), Forms (Cognito-like), Email (Mailchimp-like)
**Agent:** Devin AI
**Package manager:** npm
**Figma:** not used (skipping Figma MCP)
**Email ESP:** Azure Communication Services Email (already provisioned) — Resend is NOT used

This plan is meant to be executed top-to-bottom in phases. After each phase, run the verification step before moving on. Do not skip verification — installing libraries without building will hide peer-dep or version conflicts until the next dev session.

---

## Phase 0 — Pre-flight checks

Before installing anything, capture the current state so we can compare.

```powershell
cd C:\Users\andy7\CascadeProjects\servicehub
git status                                   # ensure clean working tree
git log --oneline -5                         # note current HEAD
cd client
npm ls --depth=0 > ..\md files\npm-state-before.txt
npx vite build                               # baseline build must pass
```

If `vite build` fails, **stop** — fix existing errors first. Adding libraries on top of a broken build makes regressions impossible to attribute.

---

## Phase 1 — MCPs (agent-side, no app code changes)

Devin reads MCP servers from its config. Add the following servers, then restart Devin so they register.

### 1.1 Servers to add

| MCP | Purpose | Required for |
|---|---|---|
| `21st-dev-magic` | Generate polished UI components on demand (`/ui create ...`) | All three builders — chrome, buttons, panels |
| `shadcn` | Install shadcn/ui primitives (Panel, Canvas, Toolbar, Node) | Editor chrome for all three builders |
| `azure` | Azure first-party MCP — includes Communication Services Email tools for sending test emails via your existing ACS resource | Email builder Phase 8 (sending) |

### 1.2 Already available in this Devin environment (no action needed)

- `playwright` — visual validation of all three builders (canvas, drag-drop, responsive preview)
- `puppeteer` — alternative browser automation
- `cognitoforms` — reference patterns for the form builder
- `filesystem` — file ops
- `sequential-thinking` — planning complex editor logic
- `memory` — persist builder invariants across sessions

### 1.3 Devin MCP config

Devin stores MCP config at `~/.config/devin/config.json` (global) or `.devin/config.json` (project-scoped). Prefer **project-scoped** so the config travels with the repo.

Create or edit `C:\Users\andy7\CascadeProjects\servicehub\.devin\config.json`:

```json
{
  "mcpServers": {
    "21st-dev-magic": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-21st-dev-magic"]
    },
    "shadcn": {
      "command": "npx",
      "args": ["-y", "shadcn-mcp"]
    },
    "azure": {
      "command": "npx",
      "args": ["-y", "@azure/mcp@latest", "server", "start"]
    }
  }
}
```

**Notes:**
- The Azure MCP server authenticates via Azure CLI (`az login`) or environment variables. Run `az login` once before using it so the server can access your Communication Services resource. See https://github.com/MicrosoftDocs/azure-dev-docs/blob/main/articles/azure-mcp-server/tools/azure-communication.md for the full tool list.
- Azure MCP Communication Services Email tools accept your ACS endpoint (e.g. `https://<resource>.communication.azure.com`) and sender address (e.g. `donotreply@<your-domain>.azurecomm.net`). Have both ready before Phase 8.
- `shadcn-mcp` package name: confirm at https://ui.shadcn.com/docs/mcp before installing — the exact npm name has changed between releases. If `shadcn-mcp` 404s, fall back to the hosted URL form documented on that page.
- After saving the config, **restart Devin** for the servers to register.

### 1.4 Verify MCPs

After restart, ask Devin:
- `use 21st-dev-magic to create a modern sidebar navigation` → should produce a component
- `use shadcn to install the panel component` → should add files under `client/src/components/ui/`
- `use azure to send a test email from <your-acs-sender> to <your-email> with subject "MCP test" and message "hello"` → only after `az login`; confirms ACS wiring
- `use playwright to screenshot http://localhost:3000/hub-admin/web/dashboard at desktop and mobile widths` → only after the dev server is running in Phase 2

---

## Phase 2 — Shared libraries (used by all three builders)

Install once, benefit everywhere.

```powershell
cd C:\Users\andy7\CascadeProjects\servicehub\client
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
npm install react-hook-form zod @hookform/resolvers
npm install react-aria react-aria-components
npm install immer
npm install react-colorful
npm install use-debounce
```

### Why each

| Library | Role |
|---|---|
| `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` | Modern accessible drag-and-drop. Use for **new** editor surfaces; leave existing `@hello-pangea/dnd` code in forms alone to avoid churn. |
| `react-hook-form`, `zod`, `@hookform/resolvers` | Proper validation for property panels and the public form renderer. Replaces hand-rolled validation. |
| `react-aria`, `react-aria-components` | Accessibility primitives — focus traps, selection models, keyboard nav for editor surfaces. |
| `immer` | Immutable state updates for undo/redo history. |
| `react-colorful` | Smaller, accessible color picker — replaces `client/src/components/ColorPicker.jsx`. |
| `use-debounce` | Debounce inline text edits before commit (fixes janky save-on-blur in `BaseEditableText`). |

### Verify

```powershell
cd client
npx vite build
npx vite --port 3000
```

Build must pass. Click through `/hub-admin/welcome` to confirm nothing broke (these libs are installed but not yet imported anywhere, so the app should behave identically).

---

## Phase 3 — Email builder libraries (smallest scope, fastest win)

Install the email rendering layer (client) and the Azure Communication Email SDK (server), then migrate `compileEmailHtml` to React Email.

```powershell
# Client — email rendering
cd C:\Users\andy7\CascadeProjects\servicehub\client
npm install @react-email/components @react-email/render
npm install mjml mjml-react

# Server — Azure Communication Services Email SDK
cd ..\server
npm install @azure/communication-email
cd ..\client
```

### Why each

| Library | Side | Role |
|---|---|---|
| `@react-email/components` | client | Type-safe email components (`Html`, `Container`, `Section`, `Column`, `Text`, `Heading`, `Button`, `Img`, `Hr`, `Link`). Replaces ad-hoc HTML in `compileEmailHtml`. |
| `@react-email/render` | client | Renders React Email trees to email-client-safe HTML (table-based, inline styles, Outlook-safe). |
| `mjml` | client | Fallback for blocks that don't render well in React Email (complex multi-column layouts, Outlook quirks). |
| `mjml-react` | client | Type-safe MJML components if you prefer MJML semantics for a given block. |
| `@azure/communication-email` | server | Official Azure SDK for sending email via your existing ACS resource. Replaces any need for Resend. |

### Migration steps (do after install)

1. **Delete `client/src/pages/email/NewsletterBuilder.jsx`** — it's a ReactQuill stub with simulated save. The real builder is `client/src/pages/email/builder/EmailBuilder.jsx`.
2. **Audit `client/src/pages/email/builder/emailBlocks.js`** — list every `EMAIL_BLOCKS` type and its `data` shape.
3. **Create `client/src/pages/email/builder/emailComponents/`** — one React Email component per block type:
   - `TextBlock.jsx`, `ImageBlock.jsx`, `ButtonBlock.jsx`, `DividerBlock.jsx`, `SpacerBlock.jsx`, `ColumnsBlock.jsx`
4. **Rewrite `compileEmailHtml`** to compose the React Email components and call `render()` from `@react-email/render`.
5. **Keep MJML as an escape hatch** — for any block where React Email output breaks in Outlook, swap that block's render to `mjml-react`.
6. **Add the ACS sender on the server** — create `server/src/services/emailSender.js`:
   ```js
   import { EmailClient } from '@azure/communication-email';
   import { DefaultAzureCredential } from '@azure/identity';
   // or use connection string from env:
   // const conn = process.env.ACS_CONNECTION_STRING;
   // const client = new EmailClient(conn);

   const endpoint = process.env.ACS_EMAIL_ENDPOINT; // https://<resource>.communication.azure.com
   const credential = new DefaultAzureCredential();
   export const emailClient = new EmailClient(endpoint, credential);

   export async function sendCampaignEmail({ to, subject, html, from }) {
     const poller = await emailClient.beginSend({
       senderAddress: from || process.env.ACS_DEFAULT_SENDER,
       recipients: { to: Array.isArray(to) ? to.map(address => ({ address })) : [{ address: to }] },
       content: { subject, html },
     });
     return poller.pollUntilDone();
   }
   ```
7. **Wire env vars** — add to `.env` and `.env.example`:
   ```
   ACS_EMAIL_ENDPOINT=https://<your-resource>.communication.azure.com
   ACS_DEFAULT_SENDER=donotreply@<your-domain>.azurecomm.net
   # Optional if using connection string auth instead of DefaultAzureCredential:
   # ACS_CONNECTION_STRING=endpoint=...;accesskey=...
   ```
8. **Test with Azure MCP** — after `az login`, ask Devin: `use azure to send a test email from <ACS_DEFAULT_SENDER> to <your-email> with subject "ACS test" and HTML message "<h1>hello</h1>" using endpoint <ACS_EMAIL_ENDPOINT>`.
9. **Test with Playwright MCP** — screenshot the email preview at desktop (600px) and mobile (320px) widths.

### Verify

```powershell
cd client
npx vite build
npx vite --port 3000
# Navigate to /hub-admin/email/templates, open the builder, add each block type, save
# Use playwright MCP to screenshot the preview pane at 600px and 320px
# Use azure MCP to send a test email from the builder's "Send test" action
```

---

## Phase 4 — Form builder libraries (fix bugs, then upgrade validation)

Install validation and theme libraries. **Do not adopt `@rjsf/core` yet** — finish the bug fixes first, then evaluate RJSF as a separate decision (see Phase 4.5).

```powershell
cd C:\Users\andy7\CascadeProjects\servicehub\client
npm install react-confetti-canvas
# react-hook-form, zod, react-colorful already installed in Phase 2
```

### Bug fixes first (no new libraries)

Per `client/src/pages/forms/SKILL.md` "Known Issues":

1. **Repeating group data model** — add `parentFieldId` to fields, update `formStore.js` (`addField`, `moveFieldToGroup`), `FormCanvas.jsx` (render children inside group), `FormRenderer.jsx` (find children via `parentFieldId`), `FormsBuilder.jsx` (`handleAddField` passes `parentFieldId`).
2. **Computed field double-render** — initialize computed fields with their evaluated value (zeros for inputs) in the form-load `useEffect` around line 704 of `FormRenderer.jsx`.
3. **Dashboard "Duplicate" bypasses store history** — add `duplicateForm(formId)` action to `formStore.js`; `FormsDashboard.jsx` `handleDuplicate` calls it instead of `setState` directly.
4. **Command palette keyboard nav** — already done per `FormsBuilder.jsx` lines 100-116; verify and remove the known-issues entry.
5. **Runtime click-through testing** — manually walk through the list in the skill.

### Validation upgrade

Replace hand-rolled validation in `FormRenderer.jsx` with `react-hook-form` + `zod`:
- Build a `zod` schema dynamically from the form's field definitions
- Wire `useForm` with `@hookform/resolvers/zod`
- Keep the existing conditional-logic and computed-field logic intact — they run on top of the form state

### Theme picker upgrade

Replace the custom color inputs in the theme panel with `react-colorful` (`<HexColorPicker />`).

### Confetti

Add `react-confetti-canvas` to the public form submission success screen (`FormRenderer.jsx`).

### Phase 4.5 — Evaluate `@rjsf/core` (separate decision)

**Do not install yet.** After Phase 4 is done, evaluate whether to replace `FormRenderer.jsx` with RJSF:

```powershell
# Only if you decide to evaluate:
npm install @rjsf/core @rjsf/utils @rjsf/validator-ajv8
```

**Decision criteria — adopt RJSF only if ALL are true:**
- Your field types map cleanly to JSON Schema (most do: text, number, email, select, checkbox, etc.)
- You're willing to write custom widgets for: signature, repeating group, computed field, page break, content/image blocks
- The bundle size increase is acceptable (RJSF is ~150KB minified)
- You're okay losing the conversational one-question-per-screen mode unless you build a custom RJSF UI template for it

If any criterion fails, **keep your custom `FormRenderer.jsx`** — it's already feature-rich and the validation upgrade from Phase 4 is enough.

### Verify

```powershell
cd client
npx vite build
npx vite --port 3000
# Walk through every item in forms/SKILL.md "Known Issues #5 Runtime testing"
# Use playwright MCP to screenshot each field type in the builder and the public form
```

---

## Phase 5 — Web builder libraries (adopt Craft.js as the page-builder engine)

**Decision: adopt `@craftjs/core` as the web builder's canvas engine.** This is not gated behind an evaluation — install it in this phase and migrate the editor onto it. Craft.js gives us a real node tree, built-in selection/hover/drag state, serialization, and a plugin API, which removes the bulk of the custom logic currently bloating `InlineEditor.jsx`.

```powershell
cd C:\Users\andy7\CascadeProjects\servicehub\client
npm install @craftjs/core @craftjs/utils
npm install react-moveable react-rnd
# use-debounce, react-colorful already installed in Phase 2
```

### Why each

| Library | Role |
|---|---|
| `@craftjs/core` | **Page-builder engine** — node tree, selection, hover, drag, serialization, plugin API. Replaces the custom orchestration in `InlineEditor.jsx`. |
| `@craftjs/utils` | Helpers for Craft.js (node id generation, tree traversal, position utilities). |
| `react-moveable` | Drag/resize/rotate handles for canvas blocks. Works alongside Craft.js's drag system for element resizing. |
| `react-rnd` | Simple resizable+draggable wrapper for sections during edit mode (used before full Craft.js migration is complete). |
| `use-debounce` (Phase 2) | Debounce inline text edits before commit. |
| `react-colorful` (Phase 2) | Replace `client/src/components/ColorPicker.jsx`. |

### Migration strategy — incremental, not big-bang

The goal is to land on a Craft.js-powered editor without losing the ability to ship. Do this in three sub-steps:

#### Step 5.1 — Componentize `InlineEditor.jsx` first (no Craft.js yet)

Split the 240+ const monolith into the target file structure so the migration has somewhere to land:

```
client/src/pages/web/editor/
├── WebEditor.jsx          # orchestrator (replaces InlineEditor.jsx default export)
├── BlockPalette.jsx       # left sidebar — block type list
├── SectionList.jsx        # droppable section container
├── SectionEditor.jsx      # section padding/gap/background controls
├── BlockRenderer.jsx      # editable block on canvas
├── PropertyPanel.jsx      # right sidebar — per-block settings
├── useWebHistory.js       # undo/redo (copy the forms pattern)
└── PreviewFrame.jsx       # public renderer preview
```

Keep `client/src/pages/web/index.jsx` as the re-export entry point — point it at `editor/WebEditor.jsx` instead of `InlineEditor.jsx`.

**Verify after this step:** build passes, editor behaves identically to before (same blocks, same drag, same save). This is a pure refactor — no behavior change.

#### Step 5.2 — Wrap the editor in Craft.js's `<Editor>`

Add the Craft.js frame around the existing canvas without rewriting the block components yet:

1. Create `client/src/pages/web/editor/WebCraftRoot.jsx` — wraps the canvas in `<Editor resolver={...}>` and `<Frame>`.
2. Register each existing block type as a Craft.js user component in `client/src/pages/web/editor/craftBlocks/`:
   - `HeroBlock.jsx`, `TextBlock.jsx`, `IntroBlock.jsx`, `FeaturesBlock.jsx`, `HighlightsBlock.jsx`, `GalleryBlock.jsx`, `TestimonialsBlock.jsx`, `ContactBlock.jsx`, `VideoBlock.jsx`, `GridBlock.jsx`, `SliderBlock.jsx`, `TrustBarBlock.jsx`, `SplitBannerBlock.jsx`, `EventsBlock.jsx`, `QuoteBlock.jsx`, `MapBlock.jsx`
   - Each user component wraps the existing render logic and declares its `props` schema via Craft.js's `craft.props` and `craft.rules.canMove`/`canDrag`.
3. Register `SectionBlock` as a container user component (Craft.js supports nested containers — this replaces the `WebSection` row model with a node tree).
4. Replace `@hello-pangea/dnd` reordering with Craft.js's built-in drag-to-reorder (use `<Element canvas={true}>` for droppable containers).
5. Wire `useNode` and `useEditor` in `PropertyPanel.jsx` so the inspector reads/writes the selected node's props directly — no more local state sync.
6. Wire `useEditor(state => state.query.deserialize(...))` and `serialize()` for save/load. Convert between Craft.js's serialized JSON and your `WebPage → WebSection → WebBlock` DB schema in a new `client/src/pages/web/editor/craftSerializer.js`.

**Verify after this step:** build passes, editor can add/reorder/delete all block types, save round-trips through the serializer, public renderer still renders saved pages correctly.

#### Step 5.3 — Replace custom canvas logic with Craft.js features

Now that the editor runs on Craft.js, delete the custom logic that Craft.js replaces:

1. **Selection model** — remove `selectedBlockId` state from `WebEditor.jsx`; use `useEditor(state => state.events.selected)`.
2. **Hover state** — remove custom hover handlers from `BlockRenderer.jsx`; use `useNode((node) => ({ hovered: node.events.hovered }))`.
3. **Drag handles** — remove custom `GripVertical` drag logic; use Craft.js's `connectDrag` from `useNode().connectors.drag`.
4. **Resize handles** — keep `react-moveable` for image/grid block resizing, but trigger it off `node.events.selected` instead of custom state.
5. **Undo/redo** — replace `useWebHistory.js` with Craft.js's `useEditor(state => state.history)` and `actions.history.undo()`/`redo()`. Delete `useWebHistory.js` and `BuilderHistoryControls` if Craft.js's history is sufficient.
6. **Inline text editing** — keep `BaseEditableText` but wire its commit through `useNode().actions.setProp` instead of bubbling up to `WebEditor.jsx` state.

**Verify after this step:** build passes, all editor interactions work via Craft.js, no remaining references to the old custom selection/hover/drag state.

### Data model — keep `WebPage → WebSection → WebBlock` in the DB

Craft.js uses an in-memory node tree. We do **not** change the Prisma schema. Instead:

- `craftSerializer.js` converts between:
  - **DB shape:** `WebPage.sections[]` (each with `columns`, `gap`, `padding`, `backgroundColor`) → `WebSection.blocks[]` (each with `type`, `order`, `content`)
  - **Craft.js shape:** a single root `<Element canvas>` containing `SectionBlock` nodes, each containing block nodes
- On save: `serialize()` → `craftSerializer.toDb(craftJson)` → PUT `/api/web/pages/:id`
- On load: GET `/api/web/pages/:id` → `craftSerializer.fromDb(page)` → `deserialize()`
- Existing pages in production continue to work because the serializer handles the conversion both ways.
- The `WebSection` model is preserved — a `SectionBlock` in Craft.js maps 1:1 to a `WebSection` row.

### Public renderer — no changes

`client/src/pages/public/Home.jsx` continues to render from the DB shape (`WebPage → WebSection → WebBlock`). Craft.js is editor-only; the public site never imports `@craftjs/core`.

### Verify

```powershell
cd client
npx vite build
npx vite --port 3000
# Navigate to /hub-admin/web/pages, open a page in the editor
# Add each block type, drag-reorder, edit inline, resize, change colors, save, undo/redo
# Reload the page — confirm the saved state round-trips through craftSerializer
# Use playwright MCP to screenshot the editor at desktop and mobile widths
# Use playwright MCP to screenshot the public renderer at /:slug
# Verify an existing page (pre-Craft.js) still loads and edits correctly
```

---

## Phase 6 — Final verification

After all phases are done:

```powershell
cd C:\Users\andy7\CascadeProjects\servicehub
git diff --stat                                  # review changed files
cd client
npm ls --depth=0 > ..\md files\npm-state-after.txt
npx vite build                                   # full production build
```

Compare `npm-state-before.txt` and `npm-state-after.txt` to confirm the dependency delta matches this plan.

### Manual click-through matrix

| Builder | Pages to test |
|---|---|
| Web | `/hub-admin/web/dashboard`, `/hub-admin/web/pages`, editor for one page, public `/:slug` |
| Forms | `/hub-admin/forms` dashboard, builder with all 20 field types, public `/form/:slug`, submissions inbox, analytics, templates |
| Email | `/hub-admin/email` dashboard, `builder/EmailBuilder.jsx` with all block types, templates, mailing lists, campaigns |

### Playwright MCP screenshots

Ask Devin to capture screenshots at three widths (320px, 768px, 1440px) for:
- Each builder's editor view
- Each builder's public/output view
- The welcome page and app shell

Save screenshots under `mockup/ux-audit-$(date)/` for comparison against future iterations.

---

## Quick reference — install commands by phase

```powershell
# Phase 2 — shared (client)
cd C:\Users\andy7\CascadeProjects\servicehub\client
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities react-hook-form zod @hookform/resolvers react-aria react-aria-components immer react-colorful use-debounce

# Phase 3 — email (client + server)
cd client
npm install @react-email/components @react-email/render mjml mjml-react
cd ..\server
npm install @azure/communication-email
cd ..\client

# Phase 4 — forms
npm install react-confetti-canvas
# (optional, only if evaluating) npm install @rjsf/core @rjsf/utils @rjsf/validator-ajv8

# Phase 5 — web
npm install @craftjs/core @craftjs/utils react-moveable react-rnd
```

---

## Things to watch out for

1. **Tailwind v4** — your `client/src/index.css` uses `@theme` and `@custom-variant`. Some libraries (especially older ones) assume Tailwind v3 config. Test that utility classes still compile after each install.
2. **React 18** — all libraries listed above support React 18. If you upgrade to React 19 later, re-check peer deps.
3. **`react-quill`** — currently a dependency for the doomed `NewsletterBuilder.jsx`. After deleting that file in Phase 3, run `npm uninstall react-quill` to remove the dead dep.
4. **`@hello-pangea/dnd`** — keep it for the existing forms builder. Only use `@dnd-kit` for new surfaces (web editor refactor, email builder if needed).
5. **Bundle size** — `@react-email/components` + `mjml` + `mjml-react` will add ~300KB to the client bundle. Acceptable for an admin app, but consider code-splitting the email builder route.
6. **MCP restart** — after editing `.devin/config.json`, fully restart Devin (not just the session) for MCP servers to register. For the Azure MCP, also run `az login` once so the server can authenticate to your subscription.
7. **Azure ACS credentials** — never commit `ACS_CONNECTION_STRING` to git. Prefer `DefaultAzureCredential` (managed identity / az login) for production and connection-string auth only for local dev. Add the ACS env vars to `.env.example` but leave values blank.
8. **ACS sender domain verification** — your ACS Email resource must have a verified domain (either the default `*.azurecomm.net` subdomain or a custom verified domain). Confirm the sender address you put in `ACS_DEFAULT_SENDER` is from a verified domain or sends will fail with a 401/403.

---

## What this plan does NOT do

- Does not rewrite any builder from scratch
- Does not replace the auth/permission/app-registry/Prisma/Azure deploy foundation
- Does not adopt `@craftjs/core` or `@rjsf/core` blindly — both are gated behind evaluation criteria
- Does not change the data model (`WebPage → WebSection → WebBlock`, `Form` schema, `EmailCampaign` + `EmailTemplate`)
- Does not touch the public renderer for web (`client/src/pages/public/Home.jsx`) beyond what the editor refactor requires

The goal is targeted upgrades: better drag/resize, better validation, better email rendering, better color picking, better agent assistance via MCPs — without throwing away the work already done.

---

## Phase 7 — Documentation sync (after all installs are done)

Once Phases 0–6 are complete and verified, update the project's living documentation so the new dependencies and MCPs are reflected. This is what keeps the agent (and future you) from re-discovering the stack every session.

### 7.1 Update `startup.md`

Find or create `startup.md` at the project root. It should be the single source of truth for "how to get this project running from a clean clone." After the installs, it must include:

- **Prerequisites**
  - Node.js version (LTS recommended, currently 20+)
  - npm version
  - Azure CLI (`az login` required for ACS email + Azure MCP)
  - A verified Azure Communication Services Email sender (endpoint + sender address)
- **Install commands**
  - Root: `npm install` (if a root package.json / workspace exists)
  - `cd client && npm install`
  - `cd server && npm install`
- **Environment variables** — full list with which ones are required vs optional, and where to find each value in Azure Portal:
  - `ACS_EMAIL_ENDPOINT` (required for email sending)
  - `ACS_DEFAULT_SENDER` (required for email sending)
  - `ACS_CONNECTION_STRING` (optional — only if not using `DefaultAzureCredential`)
  - `DATABASE_URL` (Prisma — Azure SQL)
  - `JWT_SECRET`, `JWT_REFRESH_SECRET`
  - Any others currently in `.env.example`
- **MCP servers** — list every MCP the project expects, with the install command and what each is for:
  - `21st-dev-magic` — UI component generation
  - `shadcn` — shadcn/ui primitives
  - `azure` — Azure Communication Services Email + other Azure tools (requires `az login`)
  - `playwright` (already in environment) — visual validation
  - `puppeteer`, `cognitoforms`, `filesystem`, `sequential-thinking`, `memory` (already in environment)
- **MCP config file location** — `.devin/config.json` (project-scoped). Note that Devin must be fully restarted after editing it.
- **Dev commands**
  - `cd client && npx vite --port 3000` — frontend dev server
  - `cd server && npm run dev` (or whatever the server dev script is) — backend
  - `npx prisma studio` — DB inspector
- **Build commands**
  - `cd client && npx vite build`
  - `cd server && npm run build` (if present)
- **Verification checklist** — the same matrix from Phase 6 of this plan, condensed:
  - Web builder: dashboard, pages, editor with all block types, public renderer
  - Forms builder: dashboard, builder with all 20 field types, public form, submissions, analytics, templates
  - Email builder: dashboard, `builder/EmailBuilder.jsx` with all block types, templates, mailing lists, campaigns, ACS test send
- **Common pitfalls**
  - Azure SQL doesn't support `prisma migrate dev` shadow DBs — use `prisma db push` + manual migration files (see `AGENT.md` "Schema Change Workflow")
  - Tailwind v4 uses `@theme` and `@custom-variant` in `client/src/index.css` — don't add a `tailwind.config.js`
  - `WebBlock.content` must stay `String` (JSON serialized) — Azure SQL has no native JSON type
  - Restart Devin after editing `.devin/config.json`
  - Run `az login` before using the Azure MCP or `DefaultAzureCredential`

### 7.2 Update every sub-app `SKILL.md`

Each sub-app skill lives under `.devin/skills/<app>/SKILL.md`. After the installs, each one needs a "Dependencies & Libraries" section and an "MCPs" subsection so the agent knows what's available when working on that app.

#### 7.2.1 `.devin/skills/web/SKILL.md`

Add a new section after the existing "Stack & Conventions" section:

```markdown
## Dependencies & Libraries

### Installed (client)
- `@hello-pangea/dnd` — legacy; removed from the web editor after the Craft.js migration. Keep the dependency until Step 5.3 is verified, then `npm uninstall @hello-pangea/dnd` if no other web file imports it.
- `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` — use for NEW non-canvas drag surfaces (e.g., reordering pages in the Pages list, asset library sorting). The canvas itself uses Craft.js's built-in drag.
- `@craftjs/core` — **page-builder engine** for the web editor. Node tree, selection, hover, drag, serialization, plugin API. Replaces the custom orchestration that was in `InlineEditor.jsx`.
- `@craftjs/utils` — Craft.js helpers (node id generation, tree traversal, position utilities).
- `react-moveable` — drag/resize/rotate handles for image/grid blocks, triggered off `node.events.selected` from Craft.js.
- `react-rnd` — resizable+draggable wrapper for sections during edit mode (used during the migration; may be removed once Craft.js handles section resizing natively).
- `react-hook-form` + `zod` + `@hookform/resolvers` — validation for the property panel and any form-like editor surfaces.
- `react-aria` + `react-aria-components` — accessibility primitives (focus traps, selection, keyboard nav) for the editor chrome.
- `immer` — immutable state updates (used by `craftSerializer.js` for DB ↔ Craft.js conversions).
- `react-colorful` — replaces `client/src/components/ColorPicker.jsx`. Import `<HexColorPicker />` directly; do not add a new wrapper component.
- `use-debounce` — wrap inline text edits in `useDebouncedCallback` before committing via `useNode().actions.setProp`.

### MCPs available when working on this app
- `21st-dev-magic` — generate polished UI components on demand (`/ui create ...`)
- `shadcn` — install shadcn/ui primitives (Panel, Canvas, Toolbar, Node) for editor chrome
- `playwright` — screenshot the editor and public renderer at desktop/mobile widths for visual validation
- `sequential-thinking` — plan complex editor logic (selection model, serializer edge cases, undo/redo invariants)

### Editor architecture (Craft.js-based)

The web editor runs on Craft.js. The DB schema (`WebPage → WebSection → WebBlock`) is unchanged — `client/src/pages/web/editor/craftSerializer.js` converts between the DB shape and Craft.js's serialized node tree on save/load.

```
client/src/pages/web/editor/
├── WebEditor.jsx          # orchestrator — wraps canvas in <Editor><Frame>
├── WebCraftRoot.jsx       # <Editor resolver={...}> + <Frame> setup
├── BlockPalette.jsx       # left sidebar — block type list (draggable into canvas)
├── BlockRenderer.jsx      # editable block on canvas (uses useNode)
├── PropertyPanel.jsx      # right sidebar — reads/writes selected node props via useEditor/useNode
├── PreviewFrame.jsx       # public renderer preview
├── craftSerializer.js     # DB ↔ Craft.js JSON conversion
└── craftBlocks/           # one user component per block type
    ├── HeroBlock.jsx
    ├── TextBlock.jsx
    ├── IntroBlock.jsx
    ├── FeaturesBlock.jsx
    ├── HighlightsBlock.jsx
    ├── GalleryBlock.jsx
    ├── TestimonialsBlock.jsx
    ├── ContactBlock.jsx
    ├── VideoBlock.jsx
    ├── GridBlock.jsx
    ├── SliderBlock.jsx
    ├── TrustBarBlock.jsx
    ├── SplitBannerBlock.jsx
    ├── EventsBlock.jsx
    ├── QuoteBlock.jsx
    ├── MapBlock.jsx
    └── SectionBlock.jsx   # container node — maps to WebSection
```

### Editor invariants (encode in every change)
- **Selection:** use `useEditor(state => state.events.selected)` — do not maintain custom `selectedBlockId` state.
- **Hover:** use `useNode((node) => ({ hovered: node.events.hovered }))` — do not maintain custom hover state.
- **Drag:** use `useNode().connectors.drag` — do not wire custom `GripVertical` drag handlers.
- **Property binding:** `PropertyPanel` reads/writes via `useNode().actions.setProp` — no local state sync, no prop drilling.
- **Undo/redo:** use `useEditor(state => state.history)` and `actions.history.undo()`/`redo()` — do not maintain a separate history stack.
- **Inline text edits:** wrap commits in `useDebouncedCallback` then call `actions.setProp` — do not bubble up to `WebEditor.jsx` state.
- **Save/load:** always go through `craftSerializer.js` — never write Craft.js JSON directly to the API, never read DB rows directly into `<Frame>`.
- **Public renderer:** `client/src/pages/public/Home.jsx` renders from the DB shape only — never import `@craftjs/core` in the public renderer.
- **Theme tokens:** always use `bg-surface`, `border-border`, `text-base`, `text-muted`, `rounded-base`, `shadow-card` from `client/src/index.css`. Never hardcode hex values.
- **File boundaries:** new block types go in `craftBlocks/<Type>Block.jsx` (component + `craft.props`/`craft.rules`) + `BlockPalette.jsx` (palette entry) + `PropertyPanel.jsx` (inspector section) + `craftSerializer.js` (DB mapping if the content shape changes). Do not add new editor logic to `InlineEditor.jsx` — that file is deprecated after the migration.
```

#### 7.2.2 `.devin/skills/forms/SKILL.md`

Add a new section after the existing "Architecture" section:

```markdown
## Dependencies & Libraries

### Installed (client)
- `@hello-pangea/dnd` — existing drag-and-drop in `FormCanvas.jsx` (keep; do not migrate to @dnd-kit without a separate ticket)
- `react-hook-form` + `zod` + `@hookform/resolvers` — validation layer for `FormRenderer.jsx`. Build the zod schema dynamically from the form's field definitions; wire with `useForm({ resolver: zodResolver(schema) })`. Keep existing conditional-logic and computed-field logic — they run on top of form state.
- `react-aria` + `react-aria-components` — accessibility for the builder (focus traps in modals, keyboard nav in the command palette and field palette)
- `immer` — immutable updates for the 50-snapshot undo/redo in `store/formStore.js`
- `react-colorful` — replaces custom color inputs in the theme panel (`<HexColorPicker />`)
- `react-confetti-canvas` — submission success animation on the public form

### Under evaluation (NOT installed yet)
- `@rjsf/core`, `@rjsf/utils`, `@rjsf/validator-ajv8` — schema-driven form renderer. Only install if the criteria in `install-ux-mcp.md` Phase 4.5 are all met. Your custom `FormRenderer.jsx` is already feature-rich (conversational mode, repeating groups, computed fields, signatures, page breaks) — RJSF would require custom widgets for most of these.

### MCPs available when working on this app
- `21st-dev-magic` — generate polished UI components (field cards, property panel inputs, theme presets)
- `shadcn` — install primitives for the builder chrome (Panel, Tabs, Dialog, Command)
- `cognitoforms` — inspect real Cognito Forms for reference patterns (already in environment)
- `playwright` — screenshot the builder, public form, and submissions inbox at desktop/mobile widths

### Builder invariants (encode in every change)
- Repeating groups: child fields are designated by `parentFieldId === groupField.id` (NOT by `rowId`). See "Known Issues #1" in this skill.
- Computed fields: initialize with their evaluated value (zeros for inputs) on form load to avoid the double-render described in "Known Issues #2".
- Dashboard duplicate: must go through `formStore.duplicateForm(formId)` — never `setState` directly (see "Known Issues #3").
- Command palette: arrow-key + Enter navigation is implemented; do not regress it.
- Theme tokens: always use `bg-surface`, `border-border`, `text-base`, `text-muted`, `rounded-base`, `shadow-card`, and the badge classes (`badge-success`, `badge-warning`, etc.) from `client/src/index.css`.
```

#### 7.2.3 `.devin/skills/email/SKILL.md`

Add a new section after the existing "Technical Architecture" section, and update the "Sending Architecture" section to reflect ACS:

```markdown
## Dependencies & Libraries

### Installed (client)
- `@hello-pangea/dnd` — drag-and-drop in `builder/EmailBuilder.jsx` (keep)
- `@react-email/components` — type-safe email components (`Html`, `Container`, `Section`, `Column`, `Text`, `Heading`, `Button`, `Img`, `Hr`, `Link`). Use these in `client/src/pages/email/builder/emailComponents/` instead of writing raw HTML.
- `@react-email/render` — renders React Email trees to email-client-safe HTML. Called from the rewritten `compileEmailHtml`.
- `mjml`, `mjml-react` — fallback for blocks that don't render well in React Email (complex multi-column layouts, Outlook quirks). Use sparingly.
- `react-colorful` — color pickers in the `Inspector` panel
- `dompurify` — already in use; keep for sanitizing any user-pasted HTML in text blocks

### Installed (server)
- `@azure/communication-email` — official Azure SDK for sending email via ACS. See `server/src/services/emailSender.js`.

### Removed
- `react-quill` — uninstalled after `NewsletterBuilder.jsx` was deleted. The block-based `builder/EmailBuilder.jsx` is the only email editor.

### MCPs available when working on this app
- `21st-dev-magic` — generate polished UI components (block palette, inspector inputs, template cards)
- `shadcn` — install primitives for the builder chrome
- `azure` — send test emails directly from the agent via your ACS resource (requires `az login`). Use for verifying template renders across real email clients.
- `playwright` — screenshot the email preview at 600px (desktop) and 320px (mobile) widths

## Sending Architecture (UPDATED — Azure Communication Services Email)

This app sends email through **Azure Communication Services Email** (ACS) using the `@azure/communication-email` SDK. Resend is NOT used.

### Authentication
- **Production (Azure App Service):** use `DefaultAzureCredential` from `@azure/identity`. The App Service's managed identity must be granted access to the Communication Services resource.
- **Local dev:** either `DefaultAzureCredential` (after `az login`) or `ACS_CONNECTION_STRING` from `.env`.

### Sender address
- `ACS_DEFAULT_SENDER` must be from a verified domain on your Email Communication Services resource.
- Default Azure-provided domain: `donotreply@<your-resource>.azurecomm.net`
- Custom domain: configure and verify in Azure Portal → Email Communication Services → Domains

### Send flow
- `POST /campaigns/:id/send` validates the campaign and recipient list, flips status to `scheduled` (or `sending`), and enqueues a job — it returns immediately, it does not send synchronously.
- Use a real queue (BullMQ + managed Redis, or Azure Queue Storage + a separate worker/Azure Function). A `setTimeout`/in-process loop is not durable across app restarts or multiple instances.
- The worker batches recipients (respect ACS rate limits — check your resource's quota in Azure Portal), calls `emailClient.beginSend` per batch, and writes one `EmailLog` row per recipient per event as webhook events arrive.

### Webhook receiver
- ACS supports email event webhooks (delivered, opened, clicked, bounced, complained, unsubscribed). Configure the webhook endpoint in Azure Portal → Communication Services resource → Email events.
- Dedicated route (e.g. `POST /webhooks/email/acs`) receives ACS events — unauthenticated by JWT, verified via ACS's webhook signature mechanism.
- Each event upserts an `EmailLog` row and increments the matching counter on `CampaignMetrics`.
- A `bounced` (hard) or `complained` event also updates `Recipient.status` so future sends exclude them.

### Env vars (add to `.env` and `.env.example`)
```
ACS_EMAIL_ENDPOINT=https://<your-resource>.communication.azure.com
ACS_DEFAULT_SENDER=donotreply@<your-domain>.azurecomm.net
# Optional — only if not using DefaultAzureCredential:
# ACS_CONNECTION_STRING=endpoint=...;accesskey=...
```

### Builder invariants (encode in every change)
- `NewsletterBuilder.jsx` is deleted — do not recreate it. The block-based `builder/EmailBuilder.jsx` is the only email editor.
- Every `EMAIL_BLOCKS` type must have a matching React Email component in `client/src/pages/email/builder/emailComponents/`.
- `compileEmailHtml` must call `@react-email/render`'s `render()` — do not hand-roll HTML strings.
- Use MJML only as an escape hatch for blocks that break in Outlook. Document which blocks use MJML and why.
- Theme tokens: always use `bg-surface`, `border-border`, `text-base`, `text-muted`, `rounded-base`, `shadow-card` from `client/src/index.css`.
- File boundaries: new block types go in `emailBlocks.js` (definition) + `emailComponents/<Type>Block.jsx` (render) + `Inspector` switch case in `EmailBuilder.jsx`. Do not inline block rendering into the Inspector.
```

#### 7.2.4 `.devin/skills/admin/SKILL.md`, `.devin/skills/auth/SKILL.md`, `.devin/skills/subapp-template/SKILL.md`, `.devin/skills/directory/SKILL.md`

These apps didn't get builder-specific libraries in this plan, but they still benefit from the shared installs. Add a short "Dependencies & Libraries" section to each:

```markdown
## Dependencies & Libraries

### Shared libraries available (installed in Phase 2 of install-ux-mcp.md)
- `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` — use for any new drag-and-drop surfaces
- `react-hook-form` + `zod` + `@hookform/resolvers` — use for any form with validation (auth forms, admin user edit, directory entry edit)
- `react-aria` + `react-aria-components` — accessibility primitives (focus traps, keyboard nav)
- `react-colorful` — color pickers if needed
- `immer` — immutable state updates

### MCPs available when working on this app
- `21st-dev-magic` — generate polished UI components
- `shadcn` — install primitives (Dialog, Table, Form, Command, etc.)
- `playwright` — screenshot for visual validation
```

For `auth/SKILL.md` specifically, call out that `react-hook-form` + `zod` should replace any hand-rolled validation in `Login.jsx` and `Register.jsx`.

For `admin/SKILL.md` specifically, call out that `@dnd-kit/sortable` can be used if the user/permission list ever needs drag-to-reorder.

### 7.3 Update `AGENT.md` (project root)

Add a new top-level section near the top, after "Project Overview":

```markdown
## MCP Servers

This project expects the following MCP servers configured in `.devin/config.json` (project-scoped). Restart Devin after editing.

| MCP | Purpose | Auth |
|---|---|---|
| `21st-dev-magic` | Generate polished UI components on demand | None |
| `shadcn` | Install shadcn/ui primitives | None |
| `azure` | Azure Communication Services Email + other Azure tools | `az login` |
| `playwright` | Visual validation via browser automation | (already in Devin environment) |
| `cognitoforms` | Reference patterns for the form builder | (already in environment) |
| `filesystem`, `sequential-thinking`, `memory`, `puppeteer` | (already in environment) | — |

See `install-ux-mcp.md` for the full config JSON and install commands.
```

Also update the "Stack" line in "Project Overview" to mention the new libraries:

```markdown
**Stack:** Node.js · React · Azure SQL (SQL Server) · Tailwind CSS v4 · Prisma · @hello-pangea/dnd (legacy) + @dnd-kit (new) · react-hook-form + zod · @react-email (email rendering) · @azure/communication-email (email sending)
```

### 7.4 Verify documentation

After updating all the docs:

1. **Read each updated `SKILL.md` start-to-end** — confirm the new sections flow with the existing content and don't contradict anything.
2. **Cross-check env vars** — every env var mentioned in any `SKILL.md` or `startup.md` must also appear in `.env.example` (with a blank or placeholder value).
3. **Cross-check install commands** — every library mentioned in any `SKILL.md` must appear in either `client/package.json` or `server/package.json` after the installs.
4. **Test the agent** — start a fresh Devin session and ask it to "build a new web block type" or "add a new email block type." It should reference the new dependencies and invariants from the updated skills without being told.
5. **Commit the docs separately** — `git commit -m "docs: sync startup.md and SKILL.md with new UX libraries and MCPs"` so the doc changes are reviewable independently of the code changes.

### 7.5 Final commit structure

After Phase 7, your git history for this work should look roughly like:

```
<phase 5 commit>   feat(web): migrate editor to Craft.js engine + react-moveable
<phase 4 commit>   fix(forms): repeating group data model + react-hook-form validation
<phase 3 commit>   feat(email): React Email rendering + ACS sender, delete NewsletterBuilder
<phase 2 commit>   chore(deps): install shared UX libraries (dnd-kit, rhf, zod, react-aria, immer)
<phase 1 commit>   chore(mcp): add 21st-dev-magic, shadcn, azure MCP servers
<phase 7 commit>   docs: sync startup.md and SKILL.md with new UX libraries and MCPs
```

Each phase is independently revertable if something goes wrong. The Phase 5 commit should be split further if it gets too large — e.g., one commit for Step 5.1 (componentize), one for Step 5.2 (wrap in Craft.js), one for Step 5.3 (replace custom logic).
