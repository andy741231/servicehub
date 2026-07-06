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
---

# Service Hub — Multi-App Platform

## Project Overview

Service Hub is a **monorepo, single-backend, multi-frontend** web platform. All sub-apps share one auth system, one database, and one shell UI. New sub-apps plug in with minimal changes.

**Stack:** Node.js · React · Azure SQL (SQL Server) · Tailwind CSS  
**Local dev DB:** Azure SQL `free-test-servicehub` (remote, no local DB needed)  
**Production DB:** Azure SQL `free-production-servicehub`  
**Deploy:** Azure App Service (`houstonservicehub.azurewebsites.net`)  
**CI/CD:** GitHub Actions → Azure (push to `main` auto-deploys)  
**Version Control:** GitHub (`github.com/andy741231/servicehub`)

---

## Folder Structure

```
service-hub/
├── client/                         # React frontend (Vite)
│   ├── src/
│   │   ├── components/             # Shared UI (Button, Modal, Table, etc.)
│   │   ├── layouts/
│   │   │   ├── AppShell.jsx        # Sidebar + topbar wrapper, also holds the APPS registry
│   │   │   └── AuthLayout.jsx      # Login/register pages
│   │   ├── pages/
│   │   │   ├── auth/               # Login, Register
│   │   │   ├── admin/              # User Management
│   │   │   ├── web/                # App 1 - Web Builder
│   │   │   ├── forms/              # App 2 - Form Builder
│   │   │   ├── email/              # App 3 - Email Sender
│   │   │   ├── directory/          # App 4 - Directory
│   │   │   ├── portal/             # App 5 - Portal
│   │   │   ├── public/             # Public renderer
│   │   │   └── _template/          # Copy this folder for new sub-apps
│   │   ├── store/                  # Zustand global stores
│   │   │   ├── authStore.js        # JWT + user state
│   │   │   └── permissionsStore.js
│   │   ├── hooks/                  # useAuth, usePermissions, useApi
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
│   │   │   ├── forms.js
│   │   │   └── email.js
│   │   ├── middleware/
│   │   │   ├── auth.js             # JWT verify
│   │   │   └── permissions.js      # App-level access guard
│   │   ├── controllers/            # Business logic, one file per domain
│   │   ├── validators/             # Zod schemas per model — see "Input Validation" below
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
│   ├── migrations/                 # Committed migration history — see "Database Migrations" below
│   └── seed.js                     # Seeds roles + admin user
│
├── .github/
│   └── workflows/
│       └── azure-deploy.yml        # CI/CD: build → migrate → zip → Kudu deploy on push to main
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
  { id: APP_IDS.WEB,       label: 'Website',      path: '/hub-admin/web/pages',  Icon: Globe,         sub: null },
  { id: APP_IDS.FORMS,     label: 'Form Builder',  path: '/hub-admin/forms',      Icon: ClipboardList, sub: null },
  { id: APP_IDS.EMAIL,     label: 'Email Sender',  path: '/hub-admin/email',      Icon: Mail,          sub: null },
  { id: APP_IDS.DIRECTORY, label: 'Directory',     path: '/hub-admin/directory',  Icon: BookOpen,      sub: null },
  { id: APP_IDS.PORTAL,    label: 'Portal',        path: '/hub-admin/portal',     Icon: LayoutDashboard, sub: null },
];
```

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
2. Add the app object to the `APPS` array in `client/src/layouts/AppShell.jsx`
3. Create the page folder in `client/src/pages/`
4. Add the route in the frontend router
5. Add the backend route in `server/src/routes/`

---

## Database Schema (Prisma)

### Core (shared across all apps)
```prisma
model User {
  id           String   @id @default(uuid())
  username     String?  @unique
  email        String
  password     String
  name         String
  isActive     Boolean  @default(true)
  refreshToken String?  // hashed, single active token — see "Refresh Token Rotation" below
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
  page           WebPage    @relation(fields: [pageId], references: [id], onDelete: Cascade)
  blocks         WebBlock[]
}

model WebBlock {
  id        String      @id @default(uuid())
  pageId    String
  sectionId String?
  type      String      // "hero" | "text" | "image" | "features" | ...
  order     Int
  content   String      // JSON serialized — parsed/serialized in controller
  page      WebPage     @relation(fields: [pageId], references: [id], onDelete: Cascade)
  section   WebSection? @relation(fields: [sectionId], references: [id], onDelete: SetNull)
}
```
> Cascade note: `WebSection` and `WebBlock` cascade-delete with their parent `WebPage`. `WebBlock.sectionId` is set to null (not deleted) if its section is removed, since a block can exist without a section. If your Azure SQL setup rejects multiple cascade paths on the same table, handle the `WebBlock` cleanup explicitly in the `WebPage` delete controller instead of relying on `onDelete: Cascade` in both relations.

### App 2 — Form Builder
```prisma
model Form {
  id          String           @id @default(uuid())
  title       String           @db.NVarChar(255)
  schema      String           @db.NVarChar(Max) // JSON serialized — parsed/serialized in controller
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt
  deletedAt   DateTime?        // Soft delete — see "Soft Delete Convention" below
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
  bodyHtml       String             // sanitized on write — see "Input Validation" below
  status         String             // "draft" | "scheduled" | "sent" | "paused"
  scheduledAt    DateTime?
  sentAt         DateTime?
  mailingListId  String?
  mailingList    MailingList?       @relation(fields: [mailingListId], references: [id])
  createdAt      DateTime           @default(now())
  updatedAt      DateTime           @updatedAt
  deletedAt      DateTime?          // Soft delete — see "Soft Delete Convention" below
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

## Soft Delete Convention

Soft delete (`deletedAt DateTime?`) applies to models where preserving history matters or where users expect an "undo"/trash view: `Form`, `EmailCampaign`. Everything else (`User`, `WebPage`, `MailingList`, etc.) is hard-deleted directly, relying on cascade rules to clean up dependents.

When adding a new model, default to **hard delete** unless the data has audit, compliance, or "restore" requirements — don't add `deletedAt` reflexively. If you do add it, every query against that model (`findMany`, `findUnique`, counts) must filter `deletedAt: null`; wrap this in a Prisma extension or a `findActive` helper rather than repeating the filter ad hoc in every controller.

---

## Input Validation

Every JSON-serialized field (`WebBlock.content`, `WebPage.header`/`footer`, `Form.schema`, `EmailCampaign.bodyHtml`, `Recipient.customFields`, etc.) is user-controlled input, not trusted data. Before it touches the database or gets rendered:

- Define a Zod schema per model in `server/src/validators/`, matching the JSON shape expected by the frontend editor for that field.
- Validate on every write (create and update controllers), not just on the initial create.
- `EmailCampaign.bodyHtml` and any other field rendered as raw HTML (in-app or in outbound email) must be sanitized with an HTML sanitizer (e.g. `sanitize-html`) on write, not just escaped on read — this content gets sent to real inboxes and rendered in browsers.
- Reject, don't silently coerce: if a payload doesn't match the schema, return a 400 with the validation errors rather than trying to guess intent.

---

## Auth System & Security

- **JWT** stored in `httpOnly` cookie (not localStorage)
- **CSRF Protection:** SameSite cookie configuration + anti-CSRF double-submit token verification
- Access token: 15 min expiry
- Refresh token: 7 days, stored in DB (hashed, not plaintext)
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

### Refresh Token Rotation

- On every use of a refresh token, issue a new one and invalidate the old one (rotate-on-use). Store only a hash of the current token on `User.refreshToken`, never the raw value.
- If a refresh token is presented that doesn't match the stored hash (i.e. an already-rotated or forged token), treat it as reuse: invalidate the session (`refreshToken = null`) and require re-login. This catches stolen-token replay.
- `User.refreshToken` as a single field only supports one active session per user. If multi-device login is a requirement, this needs to become a separate `RefreshToken` table keyed by device/session — flag this to the user before building it, since it's a schema change, not just a logic change.

---

## Build Phases

Work through these in order. Complete each phase before moving to the next.

| Phase | Focus | Key Deliverables |
|-------|-------|-----------------|
| **1** | Monorepo scaffold | Folder structure, `package.json` workspaces, Turborepo setup, `.env.example` |
| **2** | Database | `prisma/schema.prisma` (core tables + soft delete patterns), initial migration via `prisma migrate dev`, seed script |
| **3** | Auth & Security | Register, login, logout, JWT & CSRF middlewares, refresh token rotation |
| **4** | User Management | User CRUD, role assignment, app permission toggles (`/admin/users`) |
| **5** | App Shell | React Router v6, lazy-loaded routes, sidebar from `APPS` registry, permission guards |
| **6** | App 1 — CMS | Block editor UI, public homepage render, image upload, input validation on all block content |
| **7** | App 2 — Forms | Drag-and-drop builder, submission inbox, CSV export, schema validation |
| **8** | App 3 — Email | Template builder, mailing lists, campaign scheduler, send logs, HTML sanitization on send |
| **9** | Azure Deploy | GitHub Actions CI/CD, `prisma migrate deploy` step, env secrets on Azure App Service |

---

## Environment Variables

```bash
# .env (local dev — never commit this file)
DATABASE_URL="sqlserver://houstonservice-test.database.windows.net;database=free-test-servicehub;user=servicehub_dev;password=<DB_PASSWORD>;encrypt=true;trustServerCertificate=false;"
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

> **If a real password was ever committed to this file or its history, rotate the `servicehub_dev` credential in Azure SQL now** — treat any credential that touched version control as compromised, regardless of whether the repo is private.

Production env vars are set directly on the Azure App Service (not in any committed file).

---

## Database Migrations

Use Prisma's migration workflow, not `db push`, once there's any data worth preserving (i.e. from Phase 2 onward):

- **Local dev:** `npx prisma migrate dev --name <change-description>` — generates a migration file, applies it to `free-test-servicehub`, and regenerates the client. Commit the generated migration under `prisma/migrations/`.
- **CI/CD:** the `azure-deploy.yml` workflow runs `npx prisma migrate deploy` against `free-production-servicehub` as a discrete step before the app restarts — this applies pending migrations without ever diffing/dropping columns to match the schema.
- **Never run `prisma db push` against `free-production-servicehub`.** `db push` has no migration history and can silently drop or alter columns to match the schema file — fine for early throwaway scaffolding, not fine once production has real rows in it.
- If a migration needs a manual data backfill (e.g. populating a new required column), write it as a two-step migration: add the column as optional, backfill, then a follow-up migration to make it required.

---

## Azure Deployment

| Azure Resource | Purpose |
|----------------|---------|
| App Service `houstonservicehub` | Hosts Express server + built React frontend (Windows, iisnode) |
| Azure SQL `free-test-servicehub` | Development database |
| Azure SQL `free-production-servicehub` | Production database |
| GitHub Actions `azure-deploy.yml` | CI/CD: builds, migrates, assembles self-contained package, deploys via Kudu ZIP API |

**Deploy flow on push to `main`:**
1. Install all dependencies (`npm ci`)
2. Build React frontend (`npm run build`)
3. Generate Prisma client with Windows + Linux binaries (`npx prisma generate`)
4. Run `npx prisma migrate deploy` against production
5. Assemble a self-contained `deploy/` folder (no workspace symlinks — Windows compatible)
6. Upload via Kudu ZIP Deploy API using `AZURE_DEPLOY_USER` / `AZURE_DEPLOY_PWD` secrets

**iisnode note:** The entry point is `server/app.cjs` (a CJS shim that dynamically imports the ESM `src/index.js`). The `web.config` at root configures IIS to route all traffic through iisnode.

---

## Adding a New Sub-App (Checklist)

When you're ready to add App 4, 5, etc.:

- [ ] Add entry to `client/src/layouts/AppShell.jsx` (`APPS` array)
- [ ] Add entry to `shared/constants.js`
- [ ] Create `client/src/pages/<appname>/` (copy from `_template/`)
- [ ] Create `server/src/routes/<appname>.js`
- [ ] Register route in `server/src/routes/index.js`
- [ ] Add Prisma models to `schema.prisma`, run `npx prisma migrate dev --name add-<appname>`
- [ ] Add Zod validators for any new JSON-serialized fields in `server/src/validators/`
- [ ] Decide soft-delete vs. hard-delete for new models per the convention above
- [ ] Seed default `AppPermission` rows for existing users

That's it. Auth, permissions, sidebar, and nav update automatically.

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
- **State:** Zustand for global state (auth, permissions) instead of React Context providers. Local `useState` for component state.
- **API calls:** centralized `client/src/utils/api.js` (axios instance with base URL + interceptors, handles CSRF header attachment automatically).
- **Styling:** Tailwind utility classes only, using semantic token names from `THEME.md`. No raw color values.
- **Backend:** async/await throughout. No callbacks. Errors bubble to a global Express error handler.
- **ORM:** Prisma for all DB access. No raw SQL except for complex reports.
- **Validation:** every write path validated with a Zod schema before it reaches Prisma — see "Input Validation."
- **Commits:** conventional commits (`feat:`, `fix:`, `chore:`) on feature branches. PRs to `main`.

---

## References

- See `.env.example` for all required environment variable keys.
- See `.env.production.example` for production-specific variable reference.
- See `prisma/seed.js` to understand the default roles and admin user.