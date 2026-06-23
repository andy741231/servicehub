# Service Hub: Developer Setup Guide

Welcome to **Service Hub**! This guide covers everything a new developer needs to get the app running locally and connected to Azure SQL.

---

## Architecture Overview

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | React + Vite | Runs on `localhost:3000` in dev |
| Backend | Node.js + Express | Runs on `localhost:4000` in dev |
| Database | Azure SQL (SQL Server) | Cloud-hosted — no local DB needed |
| ORM | Prisma | Schema at `prisma/schema.prisma` |
| Monorepo | npm Workspaces + Turborepo | Single `npm install` at root |
| Production | Azure App Service | `houstonservicehub.azurewebsites.net` |
| CI/CD | GitHub Actions | Auto-deploys on push to `main` |

> **No Docker required.** The database runs on Azure SQL and is accessed directly over the internet. Both local dev and production share the same Azure SQL server but use separate databases.

---

## Prerequisites

Before starting, ensure you have installed:

1. **Node.js v20+** — [nodejs.org](https://nodejs.org)
2. **npm v9+** — bundled with Node.js
3. **Git** — [git-scm.com](https://git-scm.com)
4. **Azure CLI** (`az`) — only needed for infrastructure tasks, not day-to-day dev

Verify with:
```bash
node -v   # should print v20.x or higher
npm -v    # should print 9.x or higher
```

---

## Step-by-Step Local Setup

### Step 1: Clone the repository

```bash
git clone https://github.com/andy741231/servicehub.git
cd servicehub
```

### Step 2: Install dependencies

This project uses npm Workspaces + Turborepo. Run once from the project root:

```bash
npm install
```

This installs dependencies for all packages: `client/`, `server/`, and `shared/`.

### Step 3: Configure environment variables

Copy the example file:

```bash
cp .env.example .env
```

Then open `.env` and fill in the values. Ask a team member for the `DATABASE_URL`, `JWT_SECRET`, and `JWT_REFRESH_SECRET` values, or see the section below.

**Required variables:**

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Azure SQL connection string for `free-test-servicehub` (dev DB) |
| `JWT_SECRET` | Secret for signing access tokens |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens |
| `CLIENT_URL` | `http://localhost:3000` (for local dev CORS) |

The `DATABASE_URL` format for Azure SQL (SQL Server via Prisma):
```
sqlserver://houstonservice-test.database.windows.net:1433;database=free-test-servicehub;user=servicehub_dev;password=<ask team>;encrypt=true;trustServerCertificate=false;connectionTimeout=30
```

> **Note:** The `.env` file is gitignored — never commit it.

### Step 4: Push schema & seed the database

The test database (`free-test-servicehub`) already has the schema applied and seed data. You only need to run these commands if:
- Setting up a **fresh** database
- The schema has changed (after pulling new Prisma model changes)

```bash
# Apply schema to the database
npx prisma db push

# Seed roles and default admin user
npx prisma db seed
```

> **Schema changes:** Always run `npx prisma db push` after pulling changes that include `prisma/schema.prisma` modifications.

### Step 5: Start the development server

```bash
npm run dev
```

Turborepo starts both apps in parallel:
- **Frontend (React/Vite):** `http://localhost:3000`
- **Backend (Express API):** `http://localhost:4000`

---

## Login Credentials

### Default Admin Account
| Field | Value |
|-------|-------|
| Email | `admin@servicehub.com` |
| Password | `Admin@2024!` |
| Role | `admin` (access to all apps) |

> This account exists in **both** the test and production databases.

---

## Database Overview

| Database | Purpose | User |
|----------|---------|------|
| `free-test-servicehub` | Local development | `servicehub_dev` |
| `free-production-servicehub` | Live production | `servicehub_prod` |

Both databases live on the Azure SQL server `houstonservice-test.database.windows.net`.

**To re-seed after database changes:**
```bash
# Seed test DB (uses DATABASE_URL from .env)
npx prisma db seed

# Seed prod DB (for admins only — ensure DATABASE_URL_PROD is set in .env)
export $(grep DATABASE_URL_PROD .env | xargs) && DATABASE_URL="$DATABASE_URL_PROD" npx prisma db seed
```

---

## Deployment

Deployment is fully automated. Push to `main` and GitHub Actions handles the rest:

1. Installs all dependencies
2. Builds the React frontend (`client/dist/`)
3. Generates Prisma client with Windows + Linux binaries
4. Assembles a self-contained deployment package
5. Deploys to Azure App Service via Kudu ZIP API

**Production URL:** `https://houstonservicehub.azurewebsites.net`

### Deploy code changes

After committing your local changes, push to `main` to trigger the deploy:

```bash
git add .
git commit -m "describe your update"
git push origin main
```

Then watch the deployment progress at **GitHub → Actions → "Build and Deploy to Azure"**.

To trigger a manual deploy without a code change:
```bash
# Go to GitHub → Actions → "Build and Deploy to Azure" → Run workflow
```

### Promoting database changes to production

Code deploys automatically, but **database schema changes do not**. The project uses Prisma `db push` rather than migrations, so you must apply the schema to the production database separately after deploying the code.

1. **Back up production first** (recommended before any schema change).
2. **Ensure `DATABASE_URL_PROD` is set in your `.env`** (see `.env.example` for the format).
3. **Apply the schema to the production database** from the project root:

```bash
# Prisma's dotenv loader overrides inline env vars, so source .env first
export $(grep DATABASE_URL_PROD .env | xargs) && DATABASE_URL="$DATABASE_URL_PROD" npx prisma db push
```

4. **Verify the change** by checking the app logs or running a quick smoke test.

> **Important:** The deploy workflow builds a new Prisma client with the updated schema, so the production database must be updated before or immediately after the new code is live. Always test schema changes on `free-test-servicehub` first.

### Production environment variables

Production env vars are set on the Azure App Service directly (not in any file). To view or change them:
```bash
az webapp config appsettings list \
  --name houstonservicehub \
  --resource-group App-Services-And-Related \
  -o table
```

---

## Project Structure

```
servicehub/
├── client/          # React + Vite frontend
├── server/          # Express backend
│   ├── src/
│   │   ├── routes/      # API route handlers
│   │   ├── controllers/ # Business logic
│   │   ├── middleware/  # Auth, permissions
│   │   └── db/          # Prisma client singleton
│   └── app.cjs      # CJS entry-point for iisnode (Azure)
├── shared/          # Shared constants (app IDs, etc.)
├── prisma/
│   ├── schema.prisma    # Database schema
│   └── seed.js          # Seed script
├── .github/
│   └── workflows/
│       └── azure-deploy.yml  # CI/CD pipeline
├── web.config       # IIS config for Azure App Service
├── .env             # Local secrets — DO NOT COMMIT
└── .env.example     # Template — safe to commit
```

---

## Common Tasks

### Adding a new sub-app

See the `Adding a New Sub-App` checklist in `SKILL.md`.

### Inspecting the database

Use Azure Data Studio or the Azure portal query editor to connect to either database.

### Resetting your local dev database schema

```bash
npx prisma db push --force-reset
npx prisma db seed
```

> This only affects the test database (per your `DATABASE_URL` in `.env`).

### Checking production logs

```bash
az webapp log tail \
  --name houstonservicehub \
  --resource-group App-Services-And-Related
```

---

## Useful Commands Reference

| Command | Description |
|---------|-------------|
| `npm install` | Install all workspace dependencies |
| `npm run dev` | Start frontend + backend in development mode |
| `npm run build` | Build the React frontend for production |
| `npx prisma db push` | Apply schema changes to the database |
| `npx prisma db seed` | Seed roles and admin user |
| `npx prisma studio` | Open Prisma's visual DB browser |
| `npx prisma generate` | Regenerate Prisma client after schema changes |

---

Please refer to `SKILL.md` for full architectural guidelines and patterns.
