# Azure SQL Database Rename Plan

## Goal
Rename the two Azure SQL databases to shorter, more accurate names:

| Current Name | New Name |
|-------------|----------|
| `free-test-servicehub` | `test-servicehub` |
| `free-production-servicehub` | `production-servicehub` |

Both databases live on the Azure SQL server `houstonservice-test.database.windows.net`.

## Why
The `free-` prefix is no longer accurate (only 1 database is actually free tier). The names are unnecessarily long.

## Cost Impact
**Zero cost.** Azure SQL databases can be renamed in-place using T-SQL `ALTER DATABASE ... MODIFY NAME`. No need to create new databases or migrate data.

## Prerequisites / Tools Available
- `az` CLI (Azure CLI 2.88.0) — installed and available
- `gh` CLI (GitHub CLI 2.96.0) — installed and available
- `sqlcmd` — NOT installed. Use `az sql db` CLI or Azure Portal Query Editor instead.

## Steps

### Step 1: Rename databases in Azure

Use Azure CLI to rename both databases. Ensure no active connections before renaming.

```bash
# Rename test database
az sql db rename --server houstonservice-test --resource-group <RESOURCE_GROUP_NAME> --name free-test-servicehub --new-name test-servicehub

# Rename production database
az sql db rename --server houstonservice-test --resource-group <RESOURCE_GROUP_NAME> --name free-production-servicehub --new-name production-servicehub
```

> If `az sql db rename` is not supported, use Azure Portal Query Editor (connect to `master` database) and run:
> ```sql
> ALTER DATABASE [free-test-servicehub] MODIFY NAME = [test-servicehub];
> ALTER DATABASE [free-production-servicehub] MODIFY NAME = [production-servicehub];
> ```

### Step 2: Update local code files

Replace all references to `free-test-servicehub` → `test-servicehub` and `free-production-servicehub` → `production-servicehub` in these files:

| File | Lines with references |
|------|-----------------------|
| `.env` | `DATABASE_URL` and `DATABASE_URL_PROD` connection strings (`database=` parameter) |
| `.env.example` | Lines 4, 6, 9 (comments + connection strings) |
| `.env.production.example` | Lines 2, 3 (comment + connection string) |
| `agent.md` | Lines 21, 22, 450, 474, 475 |
| `startup.md` | Lines 458, 476, 483, 492, 595, 596, 730, 757, 944, 1001 |

**Note:** `.env` is gitignored. Update it locally but it won't be committed.

### Step 3: Update GitHub repo Secrets

Use `gh` CLI or GitHub UI (Settings → Secrets and variables → Actions):

```bash
# Get current secret values is not possible via CLI (secrets are write-only).
# You need the actual connection string values. Update with new database names:

gh secret set DATABASE_URL_STAGING --body "sqlserver://houstonservice-test.database.windows.net:1433;database=test-servicehub;user=servicehub_dev;password=<ask_team>;encrypt=true;trustServerCertificate=false;connectionTimeout=30"

gh secret set DATABASE_URL_PROD --body "sqlserver://houstonservice-test.database.windows.net:1433;database=production-servicehub;user=servicehub_prod;password=<ask_team>;encrypt=true;trustServerCertificate=false;connectionTimeout=30"
```

> Replace `<ask_team>` with the actual passwords. The GitHub Action workflow (`.github/workflows/azure-deploy.yml`) does NOT need editing — it references secrets by name, not database names directly.

### Step 4: Update Azure App Service staging slot setting

Update the `DATABASE_URL` app setting on the staging slot to point to the new `test-servicehub` database name:

```bash
az webapp config appsettings set --name houstonservicehub --resource-group <RESOURCE_GROUP_NAME> --slot staging --settings DATABASE_URL="sqlserver://houstonservice-test.database.windows.net:1433;database=test-servicehub;user=servicehub_dev;password=<ask_team>;encrypt=true;trustServerCertificate=false;connectionTimeout=30"
```

> Also verify the production slot's `DATABASE_URL` setting points to `production-servicehub`. It may already be set via GitHub Actions deployment or may need manual update.

## Order of Execution
1. **Step 1** (Azure rename) — must be first
2. **Step 2** (code files) — can be done immediately after Step 1
3. **Step 3** (GitHub secrets) — after Step 1
4. **Step 4** (Azure App Service settings) — after Step 1

Steps 2, 3, and 4 can be done in parallel after Step 1 completes.

## Verification
After all steps are complete, verify:
- [ ] `az sql db list --server houstonservice-test --resource-group <RESOURCE_GROUP_NAME>` shows `test-servicehub` and `production-servicehub`
- [ ] Local app can connect to the database (run `npx prisma db push` or `npx prisma studio`)
- [ ] GitHub Actions deploy succeeds on next push to `main`
- [ ] Production app is accessible and can query the database
