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

### Step 2.5: Download UI/UX Pro Max skill

Download the UI/UX Pro Max skill for advanced design guidance:

```bash
# Download the skill to .devin/skills/
curl -o .devin/skills/ui-ux-pro-max.md https://raw.githubusercontent.com/your-repo/ui-ux-pro-max/main/skill.md
```

This skill provides accessibility best practices, interaction patterns, animation guidelines, and UX validation for UI components.

### Step 3: Configure environment variables
if you dont have a .env file, copy the example file:

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

### Step 4: Apply migrations & seed the database

The test database (`free-test-servicehub`) already has migrations applied and seed data. You only need to run these commands if:
- Setting up a **fresh** database
- The schema has changed (after pulling new Prisma model changes)

```bash
# Apply all pending migrations to the dev database
npx prisma migrate deploy

# Seed roles and default admin user
npx prisma db seed
```

> **Schema changes:** Always run `npx prisma migrate deploy` after pulling changes that include `prisma/schema.prisma` modifications. To create a new migration after editing the schema, run `npx prisma migrate dev --name describe_your_change` locally first.

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

Deployment is fully automated with **zero-downtime** using Azure App Service deployment slots. Push to `main` and GitHub Actions handles the rest:

| Stage | Job | What happens |
|-------|-----|-------------|
| 1 | `build` | Install deps, compile React frontend, generate Prisma client, assemble & zip deployment package |
| 2 | `deploy-staging` | Apply staging DB migrations, push zip to the `staging` slot via Kudu, poll until complete |
| 3 | `smoke-tests` | Hit `/`, `/api/health`, and `/login` on the staging URL — pipeline halts if any return non-200 |
| 4 | `swap-production` | Apply production DB migrations, swap staging → production via Azure CLI, verify production health |

**Production URL:** `https://houstonservicehub.azurewebsites.net`  
**Staging URL:** `https://houstonservicehub-staging.azurewebsites.net`

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

### How zero-downtime works

1. The new build is deployed to the **staging slot** — production is untouched.
2. Smoke tests run against staging. If they fail, production is never touched.
3. Once tests pass, Azure performs an instant **slot swap** (staging ↔ production). The old production becomes the new staging slot, enabling instant rollback.

### Emergency rollback

If production behaves unexpectedly after a swap, swap back immediately:

```bash
az webapp deployment slot swap \
  --resource-group App-Services-And-Related \
  --name houstonservicehub \
  --slot staging \
  --target-slot production
```

### Promoting database changes to production

Code deploys automatically via GitHub Actions, and **database migrations now run automatically** via `npx prisma migrate deploy`:
- Staging migrations run before deploying to the staging slot.
- Production migrations run after smoke tests pass, right before the slot swap.

You do not need to apply migrations manually.

> **Important:** `prisma migrate deploy` only applies new migrations — it never drops or recreates tables. It is safe to run against a live production database.

#### Creating a new schema change

> **Important:** Azure SQL does not support shadow databases, so `prisma migrate dev` will fail locally. Use the two-step workaround below instead. **Never use `prisma db push`** — it skips the migrations system and will break production.

**Every schema change requires two steps before pushing:**

**Step 1 — Create the migration file.**
Replace `describe_your_change` with a short description (e.g. `add_directory_table`):

```bash
# Create the migration folder
mkdir -p "prisma/migrations/$(date +%Y%m%d)_describe_your_change"

# Generate the SQL diff and write it to the migration file
npx prisma migrate diff \
  --from-schema-datasource prisma/schema.prisma \
  --to-schema-datamodel prisma/schema.prisma \
  --script > "prisma/migrations/$(date +%Y%m%d)_describe_your_change/migration.sql"
```

**Step 2 — Mark the migration as already applied on your local dev DB**
(because the test DB was already updated when you edited the schema):

```bash
npx prisma migrate resolve --applied "$(date +%Y%m%d)_describe_your_change"
```

**Step 3 — Commit and push:**

```bash
git add prisma/
git commit -m "feat: describe your change"
git push
```

CI will automatically apply the migration to staging, run smoke tests, then apply to production before the slot swap.

> **Never skip Step 1.** If you push without a migration file, CI reports "No pending migrations" and production breaks — exactly what happened with the `WebSection` incident on 2026-06-25.

#### Required GitHub secrets

> **Already configured** — all secrets were set on 2026-06-25. No action needed unless credentials change.

| Secret | Description | Status |
|--------|-------------|--------|
| `DATABASE_URL_PROD` | Production Azure SQL connection string | ✓ Set |
| `DATABASE_URL_STAGING` | Staging Azure SQL (`free-test-servicehub`) | ✓ Set |
| `AZURE_DEPLOY_USER` | Kudu publishing username (production slot) | ✓ Set |
| `AZURE_DEPLOY_PWD` | Kudu publishing password (production slot) | ✓ Set |
| `AZURE_DEPLOY_USER_STAGING` | Kudu publishing username (staging slot) | ✓ Set |
| `AZURE_DEPLOY_PWD_STAGING` | Kudu publishing password (staging slot) | ✓ Set |

> **Note:** No `AZURE_CREDENTIALS` service principal is needed. The slot swap is handled by Azure's **auto-swap** feature (configured on the staging slot). The `swap-production` job applies DB migrations then polls `/api/health` to confirm production is live.

To rotate Kudu credentials (e.g. after a publish profile reset):
```bash
# Get fresh staging publish profile
SUB_ID=$(az account show --query id -o tsv)
ACCESS_TOKEN=$(az account get-access-token --resource https://management.azure.com/ --query accessToken -o tsv)
curl -s -o /tmp/pubprofile_staging.xml -X POST \
  -H "Authorization: Bearer $ACCESS_TOKEN" -H "Content-Length: 0" \
  "https://management.azure.com/subscriptions/$SUB_ID/resourceGroups/App-Services-And-Related/providers/Microsoft.Web/sites/houstonservicehub/slots/staging/publishxml?api-version=2022-03-01"
# Then extract ZipDeploy userName/userPWD and update the GitHub secrets
```

### One-time Azure CLI setup (staging slot)

> **Already completed on 2026-06-25.** The staging slot is live and fully configured. These steps are documented here for reference only — do not run them again.

| Step | What was done | Verified |
|------|--------------|---------|
| 1 | Created `staging` slot cloned from production | `az webapp deployment slot list` shows `staging` in `Running` state |
| 2 | Auto-swap enabled (`staging` → `production`) | `autoSwapSlotName: production` confirmed on the slot config |
| 3 | `DATABASE_URL` on staging set to `free-test-servicehub` (dev DB) | `database=free-test-servicehub` confirmed in staging app settings |
| 4 | `DATABASE_URL` and `NODE_ENV` marked slot-sticky on both slots | Both show `slotSetting: true` on production and staging |

To verify current state at any time:
```bash
# Confirm slot exists and auto-swap target
az webapp deployment slot list \
  --resource-group App-Services-And-Related \
  --name houstonservicehub \
  --query "[].{name:name, state:state, autoSwap:siteConfig.autoSwapSlotName}" \
  -o table

# Confirm slot-sticky settings on production
az webapp config appsettings list \
  --resource-group App-Services-And-Related \
  --name houstonservicehub \
  --query "[?slotSetting==\`true\`].name" -o tsv

# Confirm staging DATABASE_URL points at the test DB
az webapp config appsettings list \
  --resource-group App-Services-And-Related \
  --name houstonservicehub \
  --slot staging \
  --query "[?name=='DATABASE_URL'].value" -o tsv
```

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
npx prisma migrate reset
npx prisma db seed
```

> This only affects the test database (per your `DATABASE_URL` in `.env`). `migrate reset` drops and recreates tables then re-runs all migrations — **never run this against production**.

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
| `npx prisma migrate dev --name <name>` | Create a new migration from schema changes (dev only) |
| `npx prisma migrate deploy` | Apply pending migrations to the database (safe for prod) |
| `npx prisma db seed` | Seed roles and admin user |
| `npx prisma studio` | Open Prisma's visual DB browser |
| `npx prisma generate` | Regenerate Prisma client after schema changes |

---

Please refer to `SKILL.md` for full architectural guidelines and patterns.

---

## Known Limitations / Future Work

### ⚠️ Before going live — set up App Service backups

> **Reminder:** Do this when the app is ready for real users.

Azure SQL database backups are automatic and already active. App Service backups are **not configured**.

To enable:
1. Create an Azure Storage Account (or reuse one when Blob Storage is set up for uploads)
2. In Azure Portal → App Service (`houstonservicehub`) → Backups → Configure
3. Set a daily schedule and 30-day retention

**Cost:** Free on S1. You only pay for the Storage Account space used (~$0.018/GB/month).

What gets backed up: deployed code, app settings, `/uploads` folder.
What doesn't need backing up: database (Azure SQL handles it), code (Git).

---

### Uploaded images are stored on local disk (not shared across slots)

**Current behavior:** Uploaded images (web builder assets, etc.) are saved to an `/uploads` folder on the App Service instance's local disk via `multer`. Each deployment slot has its own separate disk, so:

- Images uploaded to production are not visible on staging
- Images uploaded to staging are not carried over during a slot swap — only code moves
- If the App Service is restarted or redeployed, files in `/uploads` **may be wiped**

**Correct fix (not yet implemented):** Migrate file storage to **Azure Blob Storage**.

Files affected:
- `server/src/routes/web.js` — multer `diskStorage` config
- `server/src/controllers/webAssets.js` — upload/delete logic
- `server/src/index.js` — `/uploads` static file serving

Implementation plan when ready:
1. Create an Azure Storage Account and a `uploads` container (public blob access)
2. Add `AZURE_STORAGE_CONNECTION_STRING` and `AZURE_STORAGE_CONTAINER` to App Service app settings (both slots) and GitHub secrets
3. Replace `multer.diskStorage` with [`multer-azure-blob-storage`](https://www.npmjs.com/package/multer-azure-blob-storage) or upload manually via `@azure/storage-blob`
4. Update `uploadAsset` controller to store the blob URL instead of `/uploads/<filename>`
5. Remove the `app.use('/uploads', express.static(...))` line from `index.js` — files are served directly from Azure CDN URLs
6. Run a one-time migration script to move existing `/uploads` files to the blob container

**Cost:** ~$0.018/GB/month (Hot tier, LRS). Negligible for typical image usage.
