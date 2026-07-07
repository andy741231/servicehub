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

### Step 1.5: Install CLI tools

This step covers the CLIs the team uses day-to-day. The **GitHub CLI** and **Azure CLI** are recommended for all developers (needed for pushing changes and any Azure infrastructure work). The **AI coding CLIs** (Claude Code, ChatGPT/Codex, Antigravity) are **optional** — install only the ones you want to use.

> **🤖 AI agent note:** Before installing any of the optional AI coding CLIs below, **ask the user first** which ones (if any) they want. Do not install them unprompted. The GitHub and Azure CLIs are safe to install without asking since they're part of the standard dev setup.

#### GitHub CLI (recommended for pushing)

If you plan to push changes, you need to authenticate first. The easiest method is using the GitHub CLI.

**Install GitHub CLI:**

- **Windows:** Download and install from https://cli.github.com/ or use winget:
  ```bash
  winget install --id GitHub.cli
  ```

- **macOS:** Use Homebrew:
  ```bash
  brew install gh
  ```

- **Linux:** Use package manager or download from https://cli.github.com/

**Verify installation:**
```bash
gh --version
```

**Authenticate with GitHub:**
```bash
gh auth login
gh auth setup-git
```

**Alternative methods:**
- **Personal Access Token:** Create a token at https://github.com/settings/tokens with `repo` scope, then push with: `git push https://<TOKEN>@github.com/andy741231/servicehub.git <branch>`
- **SSH Keys:** Generate SSH keys and add the public key to your GitHub account, then change remote URL: `git remote set-url origin git@github.com:andy741231/servicehub.git`

#### Azure CLI (recommended for infra tasks)

Needed for managing Azure SQL firewall rules, viewing App Service logs, and other infrastructure tasks. Not required for day-to-day feature work.

- **macOS:** `brew install azure-cli`
- **Windows:** `winget install Microsoft.AzureCLI`
- **Linux:** See https://learn.microsoft.com/cli/azure/install-azure-cli

**Verify:**
```bash
az --version
az login
```

#### Claude Code CLI (optional — ask user before installing)

Anthropic's terminal-based AI coding agent. Requires a Claude Pro, Max, Teams, Enterprise, or Console (API) account.

- **All platforms (npm):**
  ```bash
  npm install -g @anthropic-ai/claude-code
  ```
- **macOS (Homebrew):** `brew install --cask claude-code`

**Verify:**
```bash
claude --version
```

Docs: https://code.claude.com/docs/en/quickstart

#### ChatGPT / Codex CLI (optional — ask user before installing)

OpenAI's official terminal coding agent is the **Codex CLI** (the modern successor to the older `chatgpt` npm package). Requires an OpenAI account with API access or a ChatGPT Plus/Pro/Team subscription.

- **All platforms (npm):**
  ```bash
  npm install -g @openai/codex
  ```

**Verify:**
```bash
codex --version
```

Docs: https://developers.openai.com/codex/cli

#### Google Antigravity CLI (optional — ask user before installing)

Google's terminal AI agent (`agy`), Gemini-powered. Requires a Google account.

- **macOS / Linux:**
  ```bash
  curl -fsSL https://antigravity.google/cli/install.sh | bash
  ```
- **Windows (PowerShell):**
  ```powershell
  irm https://antigravity.google/cli/install.ps1 | iex
  ```
- **Windows (CMD):**
  ```cmd
  curl -fsSL https://antigravity.google/cli/install.cmd -o install.cmd && install.cmd && del install.cmd
  ```

> **PATH note:** If the installer reports that `~/.local/bin` is not in your PATH, add it manually:
> ```bash
> echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc && source ~/.zshrc
> ```

**Verify:**
```bash
agy --version
```

Update later with `agy update`. Docs: https://antigravity.google/docs/home

### Step 2: Install dependencies

This project uses npm Workspaces + Turborepo. Run once from the project root:

```bash
npm install
```

This installs dependencies for all packages: `client/`, `server/`, and `shared/`. The `dev` script uses `concurrently` (included as a dev dependency) to start both apps in one terminal — works on both Windows and macOS.

### Step 2.5: Install the UI/UX Pro Max skill

The [UI/UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) skill provides design intelligence — accessibility rules, interaction patterns, animation guidelines, color/typography/style recommendations, and UX validation — for UI work.

Install it via the official CLI directly into `.devin/skills/` (Devin's canonical skill directory — no `.windsurf/` copy needed):

```bash
# 1. Install the CLI globally
npm install -g ui-ux-pro-max-cli

# 2. Generate the skill bundle directly into .devin/skills/ui-ux-pro-max/
uipro init --ai windsurf --force

# 3. Move the generated bundle from .windsurf/ to .devin/ (the CLI writes to .windsurf/ by default)
#    (bash / macOS / Linux)
rm -rf .devin/skills/ui-ux-pro-max && mv .windsurf/skills/ui-ux-pro-max .devin/skills/ui-ux-pro-max
#    (PowerShell)
Remove-Item -Recurse -Force .devin\skills\ui-ux-pro-max; Move-Item .windsurf\skills\ui-ux-pro-max .devin\skills\ui-ux-pro-max
```

> **Why not keep it in `.windsurf/`?** Devin is now Windsurf, and per the project rules in `AGENT.md`, new configuration should live in `.devin/`. Keeping the skill in one place avoids duplicate files and confusion about which copy is authoritative.


> **Windows note:** If `uipro` fails with a PowerShell execution-policy error, invoke the `.cmd` shim directly:
> `& "$env:APPDATA\npm\uipro.cmd" init --ai windsurf --force`

> **Python (optional — ask user before installing):** The skill ships Python scripts (`scripts/search.py`, `scripts/design_system.py`) that power the searchable design database. Python is **not required** for the skill to function, but it unlocks the core feature.
>
> **What works without Python:**
> - Reading `SKILL.md` for the 4-step workflow and static guidance tables
> - The pre-delivery checklist (accessibility, contrast, hover states, focus states)
> - General design principles and the available domains/stacks reference
>
> **What requires Python 3:**
> - The `--design-system` command that generates tailored recommendations (pattern, style, colors, typography, effects, anti-patterns)
> - Domain searches (`--domain style`, `--domain color`, `--domain typography`, `--domain ux`, `--domain chart`, etc.)
> - Querying the CSV databases (67 styles, 161 color palettes, 57 font pairings, 99 UX guidelines, 25 chart types — ~1.4MB of structured data in `data/`)
> - The `--persist` flag that saves a `design-system/MASTER.md` source of truth
>
> **Recommendation:** Install Python 3 to get the full value of the skill. Without it, the agent can only read the markdown guidance and cannot run the search scripts that produce specific, tailored design recommendations.
>
> **Install Python 3 (if the user opts in):**
> - **macOS:** `brew install python3`
> - **Ubuntu/Debian:** `sudo apt update && sudo apt install python3`
> - **Windows:** `winget install Python.Python.3.12` (then use `python` instead of `python3` to run scripts)
>
> **Verify:**
> ```bash
> python3 --version   # should print 3.x
> ```
>
> **Test the skill after install:**
> ```bash
> python3 .devin/skills/ui-ux-pro-max/scripts/search.py "form builder dashboard" --design-system -p "Test"
> ```
> A successful run prints a boxed design-system recommendation (pattern, style, colors, typography, effects, avoid list, checklist).

**Updating later:**
```bash
uipro update                       # update the global CLI
uipro init --ai windsurf --force   # regenerate the bundle into .windsurf/
rm -rf .devin/skills/ui-ux-pro-max && mv .windsurf/skills/ui-ux-pro-max .devin/skills/ui-ux-pro-max  # move into place
```

### Step 2.6: Enable MCP Servers (Agent-Run Setup)

> **⚠️ This step is performed by the AI agent, not the developer.** When you reach this step during setup, the agent should automatically configure all 5 MCP servers listed below using the `devin mcp add` commands (or by writing the config file directly). The developer does not need to run these commands manually unless they prefer to.
>
> **Why:** A fresh Devin CLI install ships with **zero** MCP servers. None of the servers below are built-in or enabled by default — they must all be added explicitly. An agent can fully set up all 5 using only shell/file tools (no MCP tool calls, no human intervention required), because none of these 5 require OAuth or API tokens.

The following **5 MCP servers** are part of the standard Service Hub dev environment:

| # | Server | Purpose | Prerequisite |
|---|--------|---------|--------------|
| 1 | `filesystem` | File & directory operations (read, write, edit, search, tree) | Node.js / npx |
| 2 | `memory` | Persistent knowledge graph across sessions | Node.js / npx |
| 3 | `sequential-thinking` | Structured step-by-step reasoning for complex debugging | Node.js / npx |
| 4 | `puppeteer` | Headless Chrome automation (screenshots, E2E tests, UX audits) | Node.js / npx |
| 5 | `playwright` | Modern browser automation (E2E tests, screenshots, accessibility snapshots) — Microsoft-maintained | Node.js / npx |

> **Puppeteer vs. Playwright:** Both are browser-automation MCP servers. Puppeteer is the legacy Windsurf-native option; Playwright is the newer Microsoft-maintained alternative with richer accessibility snapshots and multi-browser support. We configure both so the agent can pick the right tool for the job — use Playwright for new E2E test work and accessibility audits, Puppeteer for quick screenshots and the Windsurf-native integration.

> **Config file locations:**
> - **Devin CLI (user-level):** `~/.config/devin/config.json` (macOS/Linux) · `%APPDATA%\devin\config.json` (Windows)
> - **Devin CLI (project-level, shared):** `.devin/config.json`
> - **Devin CLI (local, gitignored):** `.devin/config.local.json`
> - **Windsurf (legacy/global):** `~/.codeium/windsurf/mcp_config.json`
>
> The `devin mcp add` commands below default to **local** scope (`.devin/config.local.json`, gitignored). Use `-s project` to share with the team via `.devin/config.json`, or `-s user` for global user-level config.

#### Agent setup script (macOS / Linux)

The agent should run this block during setup. It adds all 5 servers and verifies the result:

```bash
# ── Step 2.6: MCP server setup (run by the agent) ──────────────────────────
# All 5 servers are stdio-based and need no OAuth or API tokens.
# Prerequisites: Node.js/npx (required for all 5 servers).

PROJECT_ROOT="$(pwd)"   # adjust if not run from the project root

# 1. filesystem — file & directory operations
devin mcp add filesystem -- npx -y @modelcontextprotocol/server-filesystem "$PROJECT_ROOT"

# 2. memory — persistent knowledge graph
devin mcp add memory -- npx -y @modelcontextprotocol/server-memory

# 3. sequential-thinking — structured reasoning
devin mcp add sequential-thinking -- npx -y @modelcontextprotocol/server-sequential-thinking

# 4. puppeteer — headless Chrome automation
devin mcp add puppeteer -- npx -y @modelcontextprotocol/server-puppeteer

# 5. playwright — modern browser automation (Microsoft-maintained)
devin mcp add playwright -- npx -y @playwright/mcp@latest

# ── Verify ─────────────────────────────────────────────────────────────────
devin mcp list
```

#### Agent setup script (Windows PowerShell)

```powershell
# ── Step 2.6: MCP server setup (run by the agent) ──────────────────────────
$PROJECT_ROOT = (Get-Location).Path

# 1. filesystem
devin mcp add filesystem -- npx -y @modelcontextprotocol/server-filesystem $PROJECT_ROOT

# 2. memory
devin mcp add memory -- npx -y @modelcontextprotocol/server-memory

# 3. sequential-thinking
devin mcp add sequential-thinking -- npx -y @modelcontextprotocol/server-sequential-thinking

# 4. puppeteer
devin mcp add puppeteer -- npx -y @modelcontextprotocol/server-puppeteer

# 5. playwright — modern browser automation (Microsoft-maintained)
devin mcp add playwright -- npx -y @playwright/mcp@latest

# ── Verify ─────────────────────────────────────────────────────────────────
devin mcp list
```

> **After adding servers, fully restart Windsurf/Devin** for the servers to be picked up and launched on first use.

#### Alternative: config file approach

If `devin mcp add` is unavailable or the agent prefers to write the config directly, write this to `~/.config/devin/config.json` (user-level) or `.devin/config.json` (project-level, shared with team):

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/absolute/path/to/servicehub"],
      "env": {}
    },
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"],
      "env": {}
    },
    "sequential-thinking": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"],
      "env": {}
    },
    "puppeteer": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-puppeteer"],
      "env": {}
    },
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"],
      "env": {}
    }
  }
}
```

> **Replace `/absolute/path/to/servicehub`** with the actual project root path. On Windows, use the Windows path format (e.g. `C:\\Users\\yourname\\projects\\servicehub`) and `python` instead of `python3`.

#### Server reference

##### 1. `filesystem` — File System Access

Direct file and directory operations: read, write, edit, search, move, tree views, and metadata.

| Capability | Key Tools |
|------------|-----------|
| Read/write files | `read_text_file`, `write_file`, `edit_file`, `read_multiple_files` |
| Directory ops | `list_directory`, `directory_tree`, `create_directory`, `move_file` |
| Search | `search_files` (glob patterns) |
| Media | `read_media_file` (images/audio as base64) |
| Metadata | `get_file_info`, `list_directory_with_sizes` |

**Setup:** `devin mcp add filesystem -- npx -y @modelcontextprotocol/server-filesystem /path/to/project`. The last arg is the allowed directory — set it to the project root.

##### 2. `memory` — Knowledge Graph (Persistent Memory)

Stores entities, relations, and observations in a persistent knowledge graph. Survives across conversations and sessions.

| Capability | Key Tools |
|------------|-----------|
| Create entities/relations | `create_entities`, `create_relations` |
| Query | `read_graph`, `search_nodes`, `open_nodes` |
| Update | `add_observations` |
| Delete | `delete_entities`, `delete_relations`, `delete_observations` |

**Use cases:** Remember architectural decisions, track sub-app ownership, store onboarding context for new developers, persist bug patterns and resolutions across sessions.

**Setup:** `devin mcp add memory -- npx -y @modelcontextprotocol/server-memory`. Data is stored locally in a JSON file — no external service required.

##### 3. `sequential-thinking` — Structured Reasoning

A dynamic, reflective problem-solving tool that breaks complex problems into sequential thought steps with branching and revision support.

| Capability | Key Tool |
|------------|----------|
| Step-by-step reasoning | `sequentialthinking` (with `thoughtNumber`, `totalThoughts`, `branchId`, `isRevision`) |

**Use cases:** Debugging complex multi-layer issues (e.g., Prisma + Azure SQL + Express middleware chains), planning sub-app architecture, designing database schema changes, root-cause analysis for production incidents.

**Setup:** `devin mcp add sequential-thinking -- npx -y @modelcontextprotocol/server-sequential-thinking`. No external dependencies.

##### 4. `puppeteer` — Browser Automation

Headless Chrome control for navigating, clicking, filling forms, taking screenshots, and executing JavaScript in the browser.

| Capability | Key Tools |
|------------|-----------|
| Navigation | `puppeteer_navigate` |
| Interaction | `puppeteer_click`, `puppeteer_fill`, `puppeteer_select`, `puppeteer_hover` |
| Inspection | `puppeteer_screenshot`, `puppeteer_evaluate` |

**Use cases:** End-to-end visual testing of the React frontend, capturing screenshots for UX audits, verifying login flows, debugging client-side rendering issues.

**Setup:** `devin mcp add puppeteer -- npx -y @modelcontextprotocol/server-puppeteer`. Ensure Puppeteer's Chromium can launch on your OS (it should on macOS and Windows; on Linux you may need `--no-sandbox`).

##### 5. `playwright` — Modern Browser Automation (Microsoft-maintained)

Microsoft's Playwright-based browser automation MCP server. Supports Chromium, Firefox, and WebKit. Richer than Puppeteer — includes accessibility snapshots, multi-browser support, and auto-waiting. The browser downloads automatically on first use.

| Capability | Key Tools |
|------------|-----------|
| Navigation | `browser_navigate`, `browser_navigate_back`, `browser_navigate_forward` |
| Interaction | `browser_click`, `browser_type`, `browser_select_option`, `browser_hover` |
| Inspection | `browser_snapshot` (accessibility tree), `browser_take_screenshot` |
| Tab/Session | `browser_tab_list`, `browser_tab_new`, `browser_tab_select`, `browser_tab_close` |
| Files | `browser_file_upload`, `browser_pdf_save` |

**Use cases:** Modern E2E testing of the React frontend, accessibility audits via the accessibility snapshot, cross-browser verification, PDF export of pages, filling and submitting forms for testing.

**Setup:** `devin mcp add playwright -- npx -y @playwright/mcp@latest`. The Playwright browser binaries download automatically on first use — no manual install needed.

> **Puppeteer vs. Playwright:** Both are browser-automation MCP servers. Puppeteer is the legacy Windsurf-native option; Playwright is newer with better accessibility support and multi-browser coverage. Use Playwright for new E2E test work and accessibility audits; use Puppeteer for quick screenshots and the Windsurf-native integration.

#### Verification checklist

After the agent runs the setup script, it should verify each server is active by performing a simple operation:

| Server | Verification prompt |
|--------|-------------------|
| `filesystem` | "List the files in the project root" |
| `memory` | "Create an entity called 'ServiceHub' with type 'Project'" |
| `sequential-thinking` | "Use sequential thinking to plan a 3-step database migration" |
| `puppeteer` | "Navigate to http://localhost:3000 and take a screenshot" |
| `playwright` | "Use Playwright to navigate to http://localhost:3000 and take an accessibility snapshot" |

> **💡 Tip:** If a server is not responding, check Windsurf Settings → MCP Servers (or run `devin mcp list`) for error indicators. Restart Windsurf/Devin after adding a new server configuration.
>
> **Enabling/disabling without removing:** Use `devin mcp enable <name>` / `devin mcp disable <name>` to toggle a server without losing its config or credentials.

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

> **⚠️ First-time setup?** If `npm run dev` fails or the server crashes on startup, see the [Known Issues](#known-issues-first-time-setup) section below — it covers the Azure SQL cold start, firewall IP whitelist, and a Windows-specific `npm run dev` bug.

---

## Known Issues (First-Time Setup)

If this is your first time running the app, you will likely encounter one or more of the following issues. All are expected and have straightforward fixes.

### 1. Azure SQL server cold start (connection timeout)

> **Note:** This is not a first-time-only issue — it can happen anytime the database has been idle. First-timers should be aware of it so it doesn't block initial setup.

**Symptom:** The server crashes on startup with a Prisma error:
```
PrismaClientInitializationError: Timed out fetching a new connection from the connection pool.
(P2024)
```

You may also see this surfaced in the UI at login time. If a user sees any of the following:

- `Server error during login` (toast / error message on the login page)
- `POST http://localhost:3000/api/auth/login` returning `[HTTP/1.1 500 Internal Server Error 10018ms]` (note the ~10s timeout in the duration)

…this is the same cold-start issue. The login request hits the database before Azure SQL has finished waking up, so the Prisma query times out and the `/api/auth/login` route returns a 500.

**Cause:** The Azure SQL server (`houstonservice-test.database.windows.net`) is a serverless/paused instance. After a period of inactivity it goes to sleep and takes **~60 seconds** to wake up on the first connection. The default Prisma connection pool timeout (10s) is shorter than the cold start time.

**Fix:** Simply restart the server after waiting ~1 minute. The first connection attempt wakes the server; subsequent connections will be fast. Then retry the login — it should succeed within a normal response time.

```bash
# If the server crashed, just re-run it:
node --watch server/src/index.js
```

### 2. Your IP is not in the Azure SQL firewall whitelist

**Symptom:** The server crashes with:
```
PrismaClientInitializationError: Client with IP address 'xxx.xxx.xxx.xxx' is not allowed to access the server.
```

**Cause:** Azure SQL has a firewall that blocks all incoming connections by default. Each developer must add their public IP address to the whitelist.

**Fix:** See the [Adding your IP to Azure SQL Firewall](#adding-your-ip-to-azure-sql-firewall) section below. You will need the Azure CLI (`az`) installed and authenticated.

> **Note:** If your ISP uses dynamic IPs or you switch networks (home/office/VPN), you may need to re-add your IP each time it changes. Firewall rule changes can take up to 5 minutes to take effect.

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

> **Note:** If http://localhost:3000/ shows "page not found" on first startup, wait up to a minute — the app uses a remote Azure SQL database which may need time to cold-start. This could  happen if the database has been inactive for an hour.

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

> **✨ NEW: Automatic migration generation with pre-commit hooks**
> 
> A pre-commit hook now automatically generates migration files when you commit schema changes. No manual steps required!

**Simply edit `prisma/schema.prisma` and commit:**

```bash
git add prisma/schema.prisma
git commit -m "feat: add new field to User model"
git push
```

The pre-commit hook will:
1. Detect that `prisma/schema.prisma` was modified
2. Auto-generate the migration file using `prisma migrate diff`
3. Name it with the current date and your commit message
4. Mark it as applied locally (since your dev DB already has the schema)
5. Add the migration file to your commit automatically

**Your commit will include:**
- `prisma/schema.prisma` (your schema change)
- `prisma/migrations/20240626_add_new_field_to_user_model/migration.sql` (auto-generated)

CI will automatically apply the migration to staging, run smoke tests, then apply to production before the slot swap.

> **Never use `prisma db push`** — it skips the migrations system and will break production. The pre-commit hook ensures migrations are always created.

> **Manual migration creation (fallback):** If the pre-commit hook fails or you need to create a migration manually, see the legacy steps below.

**Legacy manual steps (only if pre-commit hook fails):**

```bash
# Create the migration folder
mkdir -p "prisma/migrations/$(date +%Y%m%d)_describe_your_change"

# Generate the SQL diff
npx prisma migrate diff \
  --from-schema-datasource prisma/schema.prisma \
  --to-schema-datamodel prisma/schema.prisma \
  --script > "prisma/migrations/$(date +%Y%m%d)_describe_your_change/migration.sql"

# Mark as applied locally
npx prisma migrate resolve --applied "$(date +%Y%m%d)_describe_your_change"

# Add and commit
git add prisma/
git commit -m "feat: describe your change"
```

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

See the `Adding a New Sub-App` checklist in `AGENT.md` (the master blueprint).

### Inspecting the database

Use Azure Data Studio or the Azure portal query editor to connect to either database.

### Adding your IP to Azure SQL Firewall

If you see database connection errors like "Client with IP address is not allowed to access the server", you need to add your IP to the Azure SQL firewall:

```bash
# Get your current public IPv4 address
MY_IP=$(curl -s -4 ifconfig.me)

# Add your IP to the SQL Server firewall
az sql server firewall-rule create \
  --resource-group App-Services-And-Related \
  --server houstonservice-test \
  --name local-dev \
  --start-ip-address $MY_IP \
  --end-ip-address $MY_IP
```

**Alternative: Allow all Azure services (less secure but easier)**
```bash
az sql server firewall-rule create \
  --resource-group App-Services-And-Related \
  --server houstonservice-test \
  --name allow-azure-services \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

> **Note:** Firewall rule changes can take up to 5 minutes to take effect.

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

Please refer to `AGENT.md` for full architectural guidelines and patterns.

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


# View Azure SQL Database / prisma studio IN PRODUCTION
```bash
DATABASE_URL='sqlserver://houstonservice-test.database.windows.net:1433;database=free-production-servicehub;user=servicehub_prod;password=zM8@nL3wP6!qS9;encrypt=true;trustServerCertificate=false;connectionTimeout=30' npx prisma studio
```


**Cost:** ~$0.018/GB/month (Hot tier, LRS). Negligible for typical image usage.