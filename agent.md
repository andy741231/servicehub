---
name: service-hub
description: >
  Master blueprint for building Service Hub — a multi-purpose web platform with pluggable sub-apps.
  Use this skill whenever working on any part of the Service Hub project: scaffolding, adding a new
  sub-app, wiring permissions, setting up auth, building UI shells, writing API routes, or preparing
  for Azure deployment. Trigger this skill at the start of every Service Hub coding session to stay
  consistent with the architecture.

  **For UI/UX work:** Also invoke the `ui-ux-pro-max` skill for advanced design guidance, accessibility
  best practices, interaction patterns, and UX validation when building or reviewing UI components.
  Prefer **shadcn/ui** (https://ui.shadcn.com) for accessible, Radix-based primitives — it integrates
  cleanly with the Tailwind + React stack used here. shadcn is wired as an **MCP server** (`shadcn`)
  in `.devin/config.json` — invoke it via MCP
  (`mcp_call_tool` with `server_name: "shadcn"`) to generate/install components directly.
  See `install-ux-mcp.md` for the full install + verification plan.
---

# Service Hub — Multi-App Platform

## Project Overview

Service Hub is a **monorepo, single-backend, multi-frontend** web platform. All sub-apps share one auth system, one database, and one shell UI. New sub-apps plug in with minimal changes.

**Stack:** Node.js · React · Azure SQL (SQL Server) · Tailwind CSS · @dnd-kit · react-hook-form + zod · react-colorful · @react-email · @craftjs/core
**Local dev DB:** Azure SQL `test-servicehub` (remote, no local DB needed)  
**Production DB:** Azure SQL `production-servicehub`  
**Deploy:** Azure App Service (`houstonservicehub.azurewebsites.net`)  
**CI/CD:** GitHub Actions → Azure (push to `main` auto-deploys)  
**Version Control:** GitHub (`github.com/andy741231/servicehub`)

---

## Folder Structure

```
service-hub/
├── client/                         # React frontend (Vite)
│   ├── src/
│   │   ├── components/             # Shared UI (Button, Modal, Table, GlobalSearch, etc.)
│   │   ├── layouts/
│   │   │   ├── AppShell.jsx        # Sidebar (drill-down/accordion) + topbar wrapper
│   │   │   └── AuthLayout.jsx      # Login/register pages
│   │   ├── pages/
│   │   │   ├── auth/               # Login, Register
│   │   │   ├── admin/              # User Management
│   │   │   ├── web/                # App 1 - Web Builder
│   │   │   │   ├── InlineEditor.jsx  # Thin re-export → editor/WebEditor
│   │   │   │   └── editor/           # Craft.js migration (Step 5.1 done)
│   │   │   │       ├── WebEditor.jsx      # Orchestrator (replaces InlineEditor monolith)
│   │   │   │       ├── editorComponents.jsx # Editable blocks, sections, toolbars
│   │   │   │       ├── editorUtils.js     # Shared constants, block types, factories
│   │   │   │       ├── BlockPalette.jsx   # Left sidebar — block type list
│   │   │   │       ├── BlockRenderer.jsx  # Re-exports EditableBlock + editors
│   │   │   │       ├── SectionEditor.jsx  # Re-exports SectionWrapper + AddSectionModal
│   │   │   │       ├── SectionList.jsx    # Re-exports SectionWrapper
│   │   │   │       ├── PropertyPanel.jsx  # Re-exports field editors / dialogs
│   │   │   │       ├── SliderInspectorPanel.jsx # Right-hand inspector for slider block (Craft.js useEditor)
│   │   │   │       ├── PreviewFrame.jsx   # Device-width preview frame
│   │   │   │       ├── useWebHistory.js   # Undo/redo hook
│   │   │   │       ├── craftSerializer.js # DB ↔ Craft.js conversion
│   │   │   │       ├── WebCraftRoot.jsx   # Craft.js Editor/Frame wrapper
│   │   │   │       └── craftBlocks/       # Craft.js user components (Step 5.2)
│   │   │   │           └── SectionBlock.jsx
│   │   │   ├── forms/              # App 2 - Form Builder
│   │   │   ├── email/              # App 3 - Email Sender
│   │   │   ├── directory/          # App 4 - Directory
│   │   │   ├── portal/             # App 5 - Portal
│   │   │   ├── Welcome.jsx         # Post-login landing page
│   │   │   ├── Search.jsx          # Full search results page
│   │   │   └── public/             # Public renderer
│   │   ├── search/                 # Global search registry (pluggable providers)
│   │   │   └── registry.js
│   │   ├── store/                  # Zustand global stores
│   │   │   └── authStore.js        # JWT + user state (permissions via user.permissions array)
│   │   └── utils/                  # api.js (axios instance), helpers
│   └── public/
│
├── server/                         # Node.js + Express backend
│   ├── src/
│   │   ├── routes/
│   │   │   ├── index.js            # ← ROUTE REGISTRY (plug new routes here)
│   │   │   ├── auth.js
│   │   │   ├── users.js
│   │   │   ├── web.js
│   │   │   ├── email.js
│   │   │   ├── forms.js
│   │   │   └── hub-admin.js        # directory/portal handled here (placeholder — frontend-only for now)
│   │   ├── middleware/
│   │   │   ├── auth.js             # JWT verify
│   │   │   └── permissions.js      # App-level access guard
│   │   ├── controllers/            # Business logic, one file per domain
│   │   ├── models/                 # Prisma schema / query helpers
│   │   └── db/
│   │       └── client.js           # Prisma client singleton
│   ├── app.cjs                     # CJS entry-point shim for iisnode
│   └── package.json
│
├── shared/                         # Shared constants (app IDs, roles, etc.)
│   └── constants.js
│
├── prisma/
│   ├── schema.prisma               # Single source of truth for DB schema
│   └── seed.js                     # Seeds roles + admin user
│
├── .github/
│   └── workflows/
│       └── azure-deploy.yml        # CI/CD: build → zip → Kudu deploy on push to main
│
├── web.config                      # IIS/iisnode config for Azure App Service (Windows)
├── .env                            # Local dev secrets — never commit
├── .env.example                    # Template — safe to commit
└── .env.production.example         # Production env var reference
```

---

## App Registry (Key Extensibility Pattern)

Every sub-app is registered in **two places**. Permissions, sidebar nav, and route guards all derive from these files.

**`client/src/layouts/AppShell.jsx`** (frontend app registry):
```js
export const APPS = [
  {
    id: APP_IDS.WEB, label: 'Website', path: '/hub-admin/web/dashboard', Icon: Globe,
    children: [
      { label: 'Dashboard',       path: '/hub-admin/web/dashboard',     Icon: Gauge },
      { label: 'Pages',           path: '/hub-admin/web/pages',         Icon: Files },
      { label: 'Header & Footer', path: '/hub-admin/web/header-footer', Icon: PanelTop },
      { label: 'Styles',          path: '/hub-admin/web/styles',        Icon: Palette },
      { label: 'Assets',          path: '/hub-admin/web/assets',        Icon: Images },
      { label: 'Draft Templates', path: '/hub-admin/web/templates',     Icon: FileStack },
    ],
  },
  // ... other apps follow the same pattern with their own children
];
```

Each app entry has: `id` (APP_IDS key), `label`, `path` (dashboard route),
`Icon` (lucide-react), and `children` (array of section pages shown as
drill-down/accordion items in the sidebar).

**`shared/constants.js`** (backend app IDs):
```js
export const APP_IDS = {
  WEB: 'web',
  FORMS: 'forms',
  EMAIL: 'email',
  DIRECTORY: 'directory',
  PORTAL: 'portal',
};
```

To add a new sub-app:
1. Add the ID to `shared/constants.js`
2. Add the app object (with `children`) to the `APPS` array in `client/src/layouts/AppShell.jsx`
3. Create the page folder in `client/src/pages/` (include a `<App>Shell.jsx` pass-through)
4. Add the route in the frontend router (`client/src/App.jsx`)
5. Add the backend route in `server/src/routes/`
6. (Optional) Add a search provider in `client/src/search/registry.js`

---

## Navigation & Shell Architecture

### Sidebar (Conditional)

The sidebar in `AppShell.jsx` renders differently based on how many apps the
user can access:

- **Single app** → **Accordion sidebar**: the one app is a parent row with a
  `ChevronDown` that expands/collapses inline to show its section children.
- **Multiple apps** → **Drill-down sidebar**: clicking a parent navigates
  *into* that level (replacing the list with children), with a Back button to
  return. Stack-based navigation with slide animations.

Both variants share the `APPS` registry's `children` arrays for their nav items.

### Sub-App Shells

Each sub-app has a `<App>Shell.jsx` that is a **pass-through wrapper** rendering
`<Outlet />`. Section navigation lives in the sidebar (as drill-down/accordion
children), not in the TopBar. Shells may optionally register TopBar actions via
`useTopBar().registerActions` (e.g. WebShell's "View site" link).

### TopBar

The TopBar layout is: **left** (hamburger on mobile + sub-app title), **center**
(global search bar, hidden on mobile), **right** (sub-app actions + shared user
menu with theme toggle + logout). The TopBar no longer hosts sub-app section
tabs — those moved into the sidebar.

### Welcome Page (`/hub-admin/welcome`)

Shown after login for all users with at least one accessible sub-app. Contains:
user greeting, app cards grid, quick stats (scoped to accessible apps), and
recent activity. Login redirect logic in `Login.jsx` sends users here.

### Global Search

A global search bar in the TopBar searches across app content, scoped to the
user's accessible apps. Uses a pluggable provider pattern
(`client/src/search/registry.js`): each app registers a provider with
`{ appId, label, Icon, search(query) }`. The registry filters by accessible app
IDs at query time. A dropdown shows live results; pressing Enter navigates to
the full search page at `/hub-admin/search`.

---

## Database Schema (Prisma)

### Schema Change Workflow (IMPORTANT)

Azure SQL does not support shadow databases, so `prisma migrate dev` (which
auto-generates migration files) does not work. The workflow is:

1. **Edit `prisma/schema.prisma`** — add/modify models
2. **Run `npx prisma db push`** — syncs the dev DB (`test-servicehub`) directly
3. **Create a migration file manually** — this is the critical step that's easy
   to miss. `db push` does NOT create a migration file, but production deploy
   uses `prisma migrate deploy` which ONLY applies migration files. Without a
   migration file, the change will never reach production.
   - Create `prisma/migrations/<YYYYMMDD_descriptive_name>/migration.sql`
   - Use `IF NOT EXISTS` guards so the migration is idempotent (safe to re-run
     on DBs where `db push` already applied the change)
   - See existing migrations like `20260707_add_user_preferences` for the pattern
4. **Do NOT add the migration to the `resolve` step** — the resolve step
   (`prisma migrate resolve --applied`) marks a migration as applied WITHOUT
   running the SQL. It's only for migrations that failed partway. New migrations
   should be left out of resolve so that `migrate deploy` actually executes them.
   Only add to resolve if a migration previously failed mid-application.

**Why this matters:** If you skip step 3, the feature will work locally but
silently fail in production because the table/column doesn't exist. If you
incorrectly add the migration to the resolve step (step 4), the migration gets
marked as applied without the SQL ever running — same result. Both happened
with the `FormFolder` table — see commits `217d1cf` and `653feb0` for the fix.

### Core (shared across all apps)
```prisma
model User {
  id           String   @id @default(uuid())
  username     String?  @unique
  email        String
  password     String
  name         String
  isActive     Boolean  @default(true)
  refreshToken String?
  createdAt    DateTime @default(now())
  roles        UserRole[]
  permissions  AppPermission[]
}

model Role {
  id    String     @id @default(uuid())
  name  String     @unique   // "super_admin" | "admin" | "editor" | "viewer"
  users UserRole[]
}

model UserRole {
  userId String
  roleId String
  user   User @relation(fields: [userId], references: [id])
  role   Role @relation(fields: [roleId], references: [id])
  @@id([userId, roleId])
}

model AppPermission {
  id        String  @id @default(uuid())
  userId    String
  appId     String  // matches APPS[].id
  canAccess Boolean @default(false)
  user      User @relation(fields: [userId], references: [id])
  @@unique([userId, appId])
}
```

### App 1 — Web Builder
```prisma
model WebPage {
  id          String     @id @default(uuid())
  slug        String     @unique
  title       String
  template    String     @default("modern")
  header      String?    // JSON serialized — parsed/serialized in controller
  footer      String?    // JSON serialized — parsed/serialized in controller
  isPublished Boolean    @default(true)
  navLabel    String?
  href        String?    // for external link nav items
  parentId    String?    // self-referencing for sub-menu items
  order       Int        @default(0) // for drag-and-drop reordering
  isReserved  Boolean    @default(false) // reserved for system use
  hideFromNav Boolean    @default(false) // hide from main navigation
  blocks      WebBlock[]
  sections    WebSection[]
  updatedAt   DateTime   @updatedAt
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
  type      String      // "hero" | "text" | "image" | "features" | ...
  order     Int
  content   String      // JSON serialized — parsed/serialized in controller
  page      WebPage     @relation(fields: [pageId], references: [id], onDelete: NoAction, onUpdate: NoAction)
  section   WebSection? @relation(fields: [sectionId], references: [id], onDelete: NoAction, onUpdate: NoAction)
}
```

### App 2 — Form Builder
```prisma
model Form {
  id          String           @id @default(uuid())
  title       String           @db.NVarChar(255)
  schema      String           @db.NVarChar(Max) // JSON serialized — parsed/serialized in controller
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt
  deletedAt   DateTime?        // Soft delete support
  submissions FormSubmission[]
  versions    FormVersion[]
}

model FormSubmission {
  id        String   @id @default(uuid())
  formId    String
  data      String   @db.NVarChar(Max) // JSON serialized — parsed/serialized in controller
  createdAt DateTime @default(now())
  form      Form @relation(fields: [formId], references: [id])
}

model FormVersion {
  id        String   @id @default(uuid())
  formId    String
  title     String   @db.NVarChar(255)
  schema    String   @db.NVarChar(Max) // JSON snapshot of the form schema at save time
  savedById String   // User who saved this version
  savedByName String @db.NVarChar(255) // Display name cached at save time
  versionNumber Int  // Sequential version counter per form
  createdAt DateTime @default(now())
  form      Form     @relation(fields: [formId], references: [id])
}
```

### App 3 — Email Sender
```prisma
model EmailCampaign {
  id             String             @id @default(uuid())
  name           String
  subject        String
  bodyHtml       String
  status         String             // "draft" | "scheduled" | "sent" | "paused"
  scheduledAt    DateTime?
  sentAt         DateTime?
  mailingListId  String?
  mailingList    MailingList?       @relation(fields: [mailingListId], references: [id])
  createdAt      DateTime           @default(now())
  updatedAt      DateTime           @updatedAt
  deletedAt      DateTime?          // Soft delete support
  logs           EmailLog[]
  metrics        CampaignMetrics?
}

model MailingList {
  id          String      @id @default(uuid())
  name        String
  description String?
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  recipients  Recipient[]
  campaigns   EmailCampaign[]
}

model Recipient {
  id            String      @id @default(uuid())
  email         String
  firstName     String?
  lastName      String?
  customFields  String?     // JSON serialized for custom contact fields
  status        String      @default("active") // "active" | "unsubscribed" | "bounced" | "complained"
  mailingListId String
  list          MailingList @relation(fields: [mailingListId], references: [id])
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
}

model EmailLog {
  id         String        @id @default(uuid())
  campaignId String
  recipient  String
  status     String        // "sent" | "delivered" | "opened" | "clicked" | "bounced" | "complained" | "unsubscribed"
  sentAt     DateTime      @default(now())
  metadata   String?       // JSON serialized for additional event data
  campaign   EmailCampaign @relation(fields: [campaignId], references: [id])
}

model CampaignMetrics {
  id          String        @id @default(uuid())
  campaignId  String        @unique
  sent        Int           @default(0)
  delivered   Int           @default(0)
  opened      Int           @default(0)
  clicked     Int           @default(0)
  bounced     Int           @default(0)
  unsubscribed Int          @default(0)
  complained  Int           @default(0)
  campaign    EmailCampaign @relation(fields: [campaignId], references: [id])
}
```

### App 1 — Web Builder (extended)
```prisma
model WebSiteStyle {
  id             String   @id @default(uuid())
  tokens         String   // JSON: { colors: { primary, secondary, accent, background, text }, fonts: { heading, body }, spacing: { base } }
  draftTemplates String?  // JSON: { homeDraft: {...}, pageDraft: {...} }
  updatedAt      DateTime @updatedAt
}

model WebAsset {
  id           String   @id @default(uuid())
  filename     String
  originalName String
  mimeType     String
  size         Int
  url          String   // relative path like /uploads/filename
  createdAt    DateTime @default(now())
}
```

> **Pattern for future apps:** prefix new models conceptually (e.g. `InvoiceItem`, `InventoryProduct`) and add them here. No changes needed to auth or permissions.

---

## Auth System & Security

- **JWT** stored in `httpOnly` cookie (not localStorage)
- **CSRF Protection:** SameSite cookie configuration + anti-CSRF double-submit token verification
- Access token: 15 min expiry
- Refresh token: 7 days, stored in DB
- Middleware chain: `verifyToken` → `checkAppPermission(appId)`

```js
// server/src/middleware/permissions.js
export const requireAppAccess = (appId) => async (req, res, next) => {
  const permission = await prisma.appPermission.findUnique({
    where: { userId_appId: { userId: req.user.id, appId } }
  });
  if (!permission?.canAccess) return res.status(403).json({ error: 'Access denied' });
  next();
};

// Usage in routes:
router.get('/forms', verifyToken, requireAppAccess('forms'), formsController.list);
```

---

## Build Phases

Work through these in order. Complete each phase before moving to the next.

| Phase | Focus | Key Deliverables |
|-------|-------|-----------------|
| **1** | Monorepo scaffold | Folder structure, `package.json` workspaces, Turborepo setup, `.env.example` |
| **2** | Database | `prisma/schema.prisma` (core tables + soft delete patterns), `prisma db push`, seed script |
| **3** | Auth & Security | Register, login, logout, JWT & CSRF middlewares, refresh token |
| **4** | User Management | User CRUD, role assignment, app permission toggles (`/admin/users`) |
| **5** | App Shell | React Router v6, lazy-loaded routes, conditional sidebar (drill-down/accordion) from `APPS` registry, welcome page, global search, permission guards |
| **6** | App 1 — CMS | Block editor UI, public homepage render, image upload |
| **7** | App 2 — Forms | Drag-and-drop builder, submission inbox, CSV export |
| **8** | App 3 — Email | Template builder, mailing lists, campaign scheduler, send logs |
| **9** | Azure Deploy | GitHub Actions CI/CD, env secrets on Azure App Service |

---

## Environment Variables

```bash
# .env (local dev — never commit this file)
DATABASE_URL="sqlserver://houstonservice-test.database.windows.net;database=test-servicehub;user=servicehub_dev;password=<ask_team>;encrypt=true;trustServerCertificate=false;"
JWT_SECRET=change_me_in_production
JWT_REFRESH_SECRET=change_me_too
CLIENT_URL=http://localhost:3000

# Email (App 3)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=

# Azure Storage (future)
AZURE_STORAGE_CONNECTION_STRING=
```

Production env vars are set directly on the Azure App Service (not in any committed file).

---

## Azure Deployment

| Azure Resource | Purpose |
|----------------|---------|
| App Service `houstonservicehub` | Hosts Express server + built React frontend (Windows, iisnode) |
| Azure SQL `test-servicehub` | Development database |
| Azure SQL `production-servicehub` | Production database |
| GitHub Actions `azure-deploy.yml` | CI/CD: builds, assembles self-contained package, deploys via Kudu ZIP API |

**Deploy flow on push to `main`:**
1. Install all dependencies (`npm ci`)
2. Build React frontend (`npm run build`)
3. Generate Prisma client with Windows + Linux binaries (`npx prisma generate`)
4. Assemble a self-contained `deploy/` folder (no workspace symlinks — Windows compatible)
5. Upload via Kudu ZIP Deploy API using `AZURE_DEPLOY_USER` / `AZURE_DEPLOY_PWD` secrets

**iisnode note:** The entry point is `server/app.cjs` (a CJS shim that dynamically imports the ESM `src/index.js`). The `web.config` at root configures IIS to route all traffic through iisnode.

---

## Adding a New Sub-App (Checklist)

When you're ready to add App 4, 5, etc.:

- [ ] Add entry to `shared/constants.js` (`APP_IDS`)
- [ ] Add entry to `client/src/layouts/AppShell.jsx` (`APPS` array with `children`)
- [ ] Create `client/src/pages/<appname>/` (include `<App>Shell.jsx` pass-through + `<App>Dashboard.jsx`)
- [ ] Add the frontend route in `client/src/App.jsx` (nest under `<AppShell>`)
- [ ] Create `server/src/routes/<appname>.js`
- [ ] Register route in `server/src/routes/index.js`
- [ ] Add Prisma models to `schema.prisma`, run `npx prisma db push`, **then create a migration file** (see Schema Change Workflow above)
- [ ] Seed default `AppPermission` rows for existing users
- [ ] (Optional) Add a search provider in `client/src/search/registry.js`

That's it. Auth, permissions, sidebar, nav, and search update automatically.

---

## Design System

**Always read `THEME.md` before writing any UI code.**

The project uses a semantic token design system. All visual decisions (colors, spacing, radius, shadows, typography) are defined in `THEME.md` and implemented in:
- `client/src/index.css` — CSS variable values + base styles + utility classes
- `client/tailwind.config.js` — Tailwind token names that map to the CSS variables

**Rules:**
- Use token class names only: `bg-primary`, `text-text-muted`, `border-border`, `rounded-card`, `shadow-card`
- Never use raw Tailwind color values: no `bg-blue-600`, `text-gray-400`, `border-gray-200`
- Use typography utilities: `.text-display`, `.text-heading`, `.text-body`, `.text-label`
- Use `.card` utility class for all card containers
- Use `.badge`, `.badge-success`, etc. for status indicators
- Changing the theme = edit `THEME.md` and update CSS variables in `index.css` only

---

## Coding Conventions

- **React:** functional components + hooks only. No class components.
- **State:** Zustand for global state (auth, permissions) instead of React Context providers. Local `useState` for component state. App-specific stores live under each sub-app's folder (e.g. `client/src/pages/forms/store/formStore.js`, `client/src/pages/email/store/emailStore.js`); only the shared auth store lives in `client/src/store/authStore.js`.
- **API calls:** centralized `client/src/utils/api.js` (axios instance with base URL + interceptors, handles CSRF header attachment automatically).
- **Styling:** Tailwind utility classes only, using semantic token names from `THEME.md`. No raw color values.
- **Backend:** async/await throughout. No callbacks. Errors bubble to a global Express error handler.
- **ORM:** Prisma for all DB access. No raw SQL except for complex reports.
- **Commits:** conventional commits (`feat:`, `fix:`, `chore:`) on feature branches. PRs to `main`.

---

## References

- See `.env.example` for all required environment variable keys.
- See `.env.production.example` for production-specific variable reference.
- See `prisma/seed.js` to understand the default roles and admin user.
