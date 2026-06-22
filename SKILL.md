---
name: service-hub
description: >
  Master blueprint for building Service Hub — a multi-purpose web platform with pluggable sub-apps.
  Use this skill whenever working on any part of the Service Hub project: scaffolding, adding a new
  sub-app, wiring permissions, setting up auth, building UI shells, writing API routes, configuring
  Docker, or preparing for Azure deployment. Trigger this skill at the start of every Service Hub coding
  session to stay consistent with the architecture.
---

# Service Hub — Multi-App Platform

## Project Overview

Service Hub is a **monorepo, single-backend, multi-frontend** web platform. All sub-apps share one auth system, one database, and one shell UI. New sub-apps plug in with minimal changes.

**Stack:** Node.js · React · PostgreSQL · Tailwind CSS  
**Local:** Docker Compose (localhost)  
**Deploy:** Azure (future)  
**Version Control:** GitHub

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
│   │       ├── client.js           # Prisma client singleton
│   │       └── migrations/
│   └── index.js                    # Express entry point
│
├── shared/                         # Shared constants (app IDs, roles, etc.)
│   └── constants.js
│
├── prisma/
│   └── schema.prisma               # Single source of truth for DB schema
│
├── .github/
│   └── workflows/
│       └── deploy.yml              # CI/CD (GitHub Actions → Azure)
│
├── docker-compose.yml              # Local Postgres + optional services
├── .env.example                    # Template — never commit real .env
└── README.md
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
| **1** | Monorepo scaffold | Folder structure, `package.json` workspaces, Turborepo setup, `.env.example`, `docker-compose.yml` |
| **2** | Database | `prisma/schema.prisma` (core tables + soft delete patterns), migrations, seed script |
| **3** | Auth & Security | Register, login, logout, JWT & CSRF middlewares, refresh token |
| **4** | User Management | User CRUD, role assignment, app permission toggles (`/admin/users`) |
| **5** | App Shell | React Router v6, lazy-loaded routes, sidebar from `APPS` registry, permission guards |
| **6** | App 1 — CMS | Block editor UI, public homepage render, image upload |
| **7** | App 2 — Forms | Drag-and-drop builder, submission inbox, CSV export |
| **8** | App 3 — Email | Template builder, mailing lists, campaign scheduler, send logs |
| **9** | Azure Deploy | Dockerfile, GitHub Actions CI/CD, env secrets in Azure Key Vault |

---

## Docker Compose (Local Dev)

```yaml
# docker-compose.yml
version: '3.9'
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: service_hub
      POSTGRES_USER: service_hub_user
      POSTGRES_PASSWORD: service_hub_pass
    ports:
      - '5432:5432'
    volumes:
      - pgdata:/var/lib/postgresql/data

  server:
    build: ./server
    ports:
      - '4000:4000'
    env_file: .env
    depends_on:
      - db
    volumes:
      - ./server:/app

  client:
    build: ./client
    ports:
      - '3000:3000'
    volumes:
      - ./client:/app

volumes:
  pgdata:
```

---

## Environment Variables

```bash
# .env.example
DATABASE_URL=postgresql://service_hub_user:service_hub_pass@localhost:5432/service_hub
JWT_SECRET=change_me_in_production
JWT_REFRESH_SECRET=change_me_too
PORT=4000
CLIENT_URL=http://localhost:3000

# Email (App 3)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=

# Azure (future)
AZURE_STORAGE_CONNECTION_STRING=
```

---

## Adding a New Sub-App (Checklist)

When you're ready to add App 4, 5, etc.:

- [ ] Add entry to `client/src/config/apps.js` (`APPS` array)
- [ ] Add entry to `shared/constants.js`
- [ ] Create `client/src/pages/<appname>/` (copy from `_template/`)
- [ ] Create `server/src/routes/<appname>.js`
- [ ] Register route in `server/src/routes/index.js`
- [ ] Add Prisma models to `schema.prisma`, run migration
- [ ] Seed default `AppPermission` rows for existing users

That's it. Auth, permissions, sidebar, and nav update automatically.

---

## Azure Deployment (Future Reference)

| Azure Service | Maps To |
|---------------|---------|
| App Service (Linux) | Node.js Express server |
| Static Web Apps | React frontend (Vite build) |
| Azure Database for PostgreSQL Flexible Server | Postgres |
| Azure Blob Storage | File/image uploads |
| Azure Communication Services | Email sending (App 3) |
| Azure Key Vault | Secrets (replaces `.env`) |
| GitHub Actions | CI/CD on push to `main` |

---

## Coding Conventions

- **React:** functional components + hooks only. No class components.
- **State:** Zustand for global state (auth, permissions) instead of React Context providers. Local `useState` for component state.
- **API calls:** centralized `client/src/utils/api.js` (axios instance with base URL + interceptors, handles CSRF header attachment automatically).
- **Styling:** Tailwind utility classes only. No custom CSS files unless unavoidable.
- **Backend:** async/await throughout. No callbacks. Errors bubble to a global Express error handler.
- **ORM:** Prisma for all DB access. No raw SQL except for complex reports.
- **Commits:** conventional commits (`feat:`, `fix:`, `chore:`) on feature branches. PRs to `main`.

---

## References

- See `references/azure.md` (create when starting Phase 9) for Azure-specific deployment steps.
- See `references/app-template.md` (create when starting Phase 5) for the boilerplate new sub-app pages.
