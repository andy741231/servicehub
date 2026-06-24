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
│   │   │   ├── AppShell.jsx        # Sidebar + topbar wrapper
│   │   │   └── AuthLayout.jsx      # Login/register pages
│   │   ├── pages/
│   │   │   ├── auth/               # Login, Register
│   │   │   ├── admin/              # User Management
│   │   │   ├── home/               # App 1 - Homepage CMS
│   │   │   ├── forms/              # App 2 - Form Builder
│   │   │   ├── email/              # App 3 - Email Sender
│   │   │   └── _template/          # Copy this folder for new sub-apps
│   │   ├── store/                  # Zustand global stores
│   │   │   ├── authStore.js        # JWT + user state
│   │   │   └── permissionsStore.js
│   │   ├── hooks/                  # useAuth, usePermissions, useApi
│   │   ├── utils/                  # api.js (axios instance), helpers
│   │   └── config/
│   │       └── apps.js             # ← APP REGISTRY (see below)
│   └── public/
│
├── server/                         # Node.js + Express backend
│   ├── src/
│   │   ├── routes/
│   │   │   ├── index.js            # ← ROUTE REGISTRY (plug new routes here)
│   │   │   ├── auth.js
│   │   │   ├── users.js
│   │   │   ├── home.js
│   │   │   ├── forms.js
│   │   │   └── email.js
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

Every sub-app is registered in **one place**. Permissions, sidebar nav, and route guards all derive from this file.

**`client/src/config/apps.js`**
```js
export const APPS = [
  {
    id: 'home',
    label: 'Homepage CMS',
    path: '/',
    icon: 'Globe',
    description: 'Public-facing website editor',
  },
  {
    id: 'forms',
    label: 'Form Builder',
    path: '/forms',
    icon: 'ClipboardList',
    description: 'Build and manage forms',
  },
  {
    id: 'email',
    label: 'Email Sender',
    path: '/email',
    icon: 'Mail',
    description: 'Email campaigns and mailing lists',
  },
  // ← Add new sub-apps here. Everything else auto-updates.
];
```

**`shared/constants.js`** mirrors these IDs for the backend permission guard.

---

## Database Schema (Prisma)

### Core (shared across all apps)
```prisma
model User {
  id          String   @id @default(uuid())
  email       String   @unique
  password    String
  name        String
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  roles       UserRole[]
  permissions AppPermission[]
}

model Role {
  id    String     @id @default(uuid())
  name  String     @unique   // "admin" | "editor" | "viewer"
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
  id     String  @id @default(uuid())
  userId String
  appId  String  // matches APPS[].id
  canAccess Boolean @default(false)
  user   User @relation(fields: [userId], references: [id])
  @@unique([userId, appId])
}
```

### App 1 — Homepage CMS
```prisma
model CmsPage {
  id        String     @id @default(uuid())
  slug      String     @unique
  title     String
  blocks    CmsBlock[]
  updatedAt DateTime   @updatedAt
}

model CmsBlock {
  id       String  @id @default(uuid())
  pageId   String
  type     String  // "hero" | "text" | "image" | "features"
  order    Int
  content  Json
  page     CmsPage @relation(fields: [pageId], references: [id])
}
```

### App 2 — Form Builder
```prisma
model Form {
  id          String       @id @default(uuid())
  title       String
  schema      Json         // field definitions
  createdAt   DateTime     @default(now())
  deletedAt   DateTime?    // Soft delete support
  submissions FormSubmission[]
}

model FormSubmission {
  id        String   @id @default(uuid())
  formId    String
  data      Json
  createdAt DateTime @default(now())
  form      Form @relation(fields: [formId], references: [id])
}
```

### App 3 — Email Sender
```prisma
model EmailCampaign {
  id          String       @id @default(uuid())
  name        String
  subject     String
  bodyHtml    String
  status      String       // "draft" | "scheduled" | "sent"
  scheduledAt DateTime?
  createdAt   DateTime     @default(now())
  deletedAt   DateTime?    // Soft delete support
  logs        EmailLog[]
}

model MailingList {
  id         String      @id @default(uuid())
  name       String
  recipients Recipient[]
}

model Recipient {
  id           String      @id @default(uuid())
  email        String
  name         String?
  mailingListId String
  list         MailingList @relation(fields: [mailingListId], references: [id])
}

model EmailLog {
  id         String        @id @default(uuid())
  campaignId String
  recipient  String
  status     String        // "sent" | "failed" | "opened"
  sentAt     DateTime      @default(now())
  campaign   EmailCampaign @relation(fields: [campaignId], references: [id])
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
| **5** | App Shell | React Router v6, lazy-loaded routes, sidebar from `APPS` registry, permission guards |
| **6** | App 1 — CMS | Block editor UI, public homepage render, image upload |
| **7** | App 2 — Forms | Drag-and-drop builder, submission inbox, CSV export |
| **8** | App 3 — Email | Template builder, mailing lists, campaign scheduler, send logs |
| **9** | Azure Deploy | GitHub Actions CI/CD, env secrets on Azure App Service |

---

## Environment Variables

```bash
# .env (local dev — never commit this file)
DATABASE_URL="sqlserver://houstonservice-test.database.windows.net;database=free-test-servicehub;user=servicehub_dev;password=Sh@Dev2024!;encrypt=true;trustServerCertificate=false;"
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
| Azure SQL `free-test-servicehub` | Development database |
| Azure SQL `free-production-servicehub` | Production database |
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

- [ ] Add entry to `client/src/config/apps.js` (`APPS` array)
- [ ] Add entry to `shared/constants.js`
- [ ] Create `client/src/pages/<appname>/` (copy from `_template/`)
- [ ] Create `server/src/routes/<appname>.js`
- [ ] Register route in `server/src/routes/index.js`
- [ ] Add Prisma models to `schema.prisma`, run `npx prisma db push`
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
- **Commits:** conventional commits (`feat:`, `fix:`, `chore:`) on feature branches. PRs to `main`.

---

## References

- See `.env.example` for all required environment variable keys.
- See `.env.production.example` for production-specific variable reference.
- See `prisma/seed.js` to understand the default roles and admin user.
