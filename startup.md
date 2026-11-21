# Service Hub: Developer Setup Guide

Welcome to **Service Hub**! This guide covers everything a new developer needs to get the app running locally, with a SQL Server database in Docker.

---

## Architecture Overview

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | React + Vite | Runs on `localhost:3000` in dev |
| Backend | Node.js + Express | Runs on `localhost:4000` in dev |
| Database | SQL Server | Local dev: SQL Server 2022 in **Docker** (`docker-compose.yml`, DB `servicehub_dev`). Staging slot: Azure SQL `stage`. Production: Azure SQL `production-servicehub` |
| ORM | Prisma | Schema at `prisma/schema.prisma` |
| Monorepo | npm Workspaces + Turborepo | Single `npm install` at root |
| Production | Azure App Service | `houstonservicehub.azurewebsites.net` |
| CI/CD | GitHub Actions | Push to `main` deploys to `staging`, runs smoke tests, then automatically deploys the verified zip to `production` (see [Deployment](#deployment)) |

> **Local dev uses Docker.** Since 2026-10-25, each developer runs their own SQL Server container. The free Azure test databases needed about 30 s to wake up and had usage limits. Use `npm run db:pull` to fill your local DB with a copy of the shared Azure `stage` database. `stage` now exists only for the cloud staging slot. `test-servicehub` is retired: it is paused, not deleted.

### UX Libraries & MCPs

Installed July 2026:

| Library | Scope | Role |
|---------|-------|------|
| `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` | Shared | Drag-and-drop for non-canvas surfaces (page reordering, asset sorting) |
| `react-hook-form`, `zod`, `@hookform/resolvers` | Shared | Form validation (zod schemas in `formValidation.js`) |
| `react-aria`, `react-aria-components` | Shared | Accessibility primitives (focus traps, keyboard nav) |
| `radix-ui`, `class-variance-authority`, `clsx`, `tailwind-merge` | Shared | shadcn/ui primitives — accordion, toggle, toggle-group, separator in `client/src/components/ui/`; `cn()` helper in `client/src/lib/utils.js` |
| `immer` | Shared | Immutable state updates |
| `react-colorful` | Shared | Color picker engine (replaces custom `ColorPicker.jsx` internals) |
| `use-debounce` | Shared | Debounced inline text edits |
| `@react-email/components`, `@react-email/render` | Email | React Email rendering (replaces hand-rolled HTML in `emailBlocks.js`) |
| `mjml`, `mjml-react` | Email | MJML escape hatch for complex email layouts |
| `@azure/communication-email` | Server | Azure Communication Services Email SDK |
| `react-confetti-canvas` | Forms | Confetti animation on form submission success screen |
| `react-rnd` | Web | Drag/resize with snap-to-grid for Fluid Engine blocks |
| `@craftjs/core`, `@measured/puck` | Web (lab only) | Used only by the experimental `editor-lab/` spike, which is untracked and not routed. Installed locally but **not declared** in `package.json` |

**MCPs configured** in `.devin/mcp_config.json`: `shadcn`, `azure` (plus standard agent MCPs — see [Enable MCP Servers](#3-enable-mcp-servers-agent-run-setup)).

**Key migrations:**
- Email builder: `compileEmailHtml` now uses `@react-email/render` with React Email components in `emailComponents/`
- Forms: validation delegated to zod via `formValidation.js`; confetti on success screen
- Web: `InlineEditor.jsx` was split into `editor/WebEditor.jsx` + `editorComponents.jsx` + utils. The active canvas is the **Fluid Engine** (`editor/fluid/`, react-rnd + a 24-column CSS Grid). The earlier Craft.js migration (`USE_CRAFT`, `craftSerializer`) was dropped. See `agent.md`.

---

## Prerequisites

Before starting, ensure you have installed:

1. **Node.js v22 LTS+** (v20+ works; v22+ matches Azure App Service) — [nodejs.org](https://nodejs.org)
2. **npm v10+** — bundled with Node.js
3. **Git** — [git-scm.com](https://git-scm.com)
4. **Docker** (Docker Desktop on Windows/macOS, Docker Engine on Linux). Runs the local SQL Server. Install steps are in [Step 3](#step-3-install-docker-and-start-the-local-database)
5. **Azure CLI** (`az`) — only needed for infrastructure tasks / firewall rules, not day-to-day dev

Verify with:
```bash
node -v            # should print v22.x (or v20.x+)
npm -v             # should print 10.x (or 9.x+)
docker --version   # any recent version; `docker info` must succeed (engine running)
```

---

## Step-by-Step Local Setup

Follow Steps 1–6 in order to get the app running locally in ~5 minutes. Team CLI tools, skills, and MCP servers live in [AI Agent & Team Tooling Setup](#ai-agent--team-tooling-setup) below.

### Step 1: Clone the repository

```bash
git clone https://github.com/andy741231/servicehub.git
cd servicehub
```

### Step 2: Configure environment variables (`.env`)

> **Why before Docker?** `docker-compose.yml` reads `MSSQL_SA_PASSWORD` from `.env` when initializing the SQL Server container on first boot. Creating `.env` first prevents a broken container volume.

> **🤖 AI agent note — assume present, only ask if missing:** The `.env` file is gitignored and never lives in the repo, so a returning developer may already have it. **Check if `.env` exists first.** Verify it is gitignored, contains all required keys, and that `DATABASE_URL` points at the local Docker DB (`localhost`, `database=servicehub_dev`), not an Azure database. Only prompt the developer if something is missing or misconfigured.

#### A. `.env` already exists (returning developer)

Verify without printing secret values:

```bash
# 1. Confirm the file exists and is gitignored
test -f .env && git check-ignore .env   # macOS / Linux / Git Bash
# Windows (PowerShell):
Test-Path .env; git check-ignore .env

# 2. Confirm required keys are present
grep -oE '^(DATABASE_URL|MSSQL_SA_PASSWORD|JWT_SECRET|JWT_REFRESH_SECRET|CLIENT_URL)=' .env   # macOS / Linux / Git Bash
# Windows (PowerShell):
Select-String -Path .env -Pattern '^(DATABASE_URL|MSSQL_SA_PASSWORD|JWT_SECRET|JWT_REFRESH_SECRET|CLIENT_URL)=' | ForEach-Object { $_.Line.Split('=')[0] }
```

If all keys are present and `DATABASE_URL` points at `localhost` with `database=servicehub_dev`, move on to Step 3. (`DATABASE_URL_STAGE` is only needed if you plan to run `npm run db:pull`.)

**Older `.env` that still points at Azure** (contains `database=stage` or `database=test-servicehub`): with the developer's permission, migrate it like this:
1. Rename the old `DATABASE_URL` key to `DATABASE_URL_STAGE`, and change `database=test-servicehub` to `database=stage` if needed.
2. Generate a random `MSSQL_SA_PASSWORD` meeting the SQL Server rules below.
3. Add `DATABASE_URL="sqlserver://localhost:1433;database=servicehub_dev;user=sa;password=<that password>;encrypt=true;trustServerCertificate=true"`.

#### B. Fresh clone — create `.env`

Start from the template:

```bash
cp .env.example .env
```

Fill in the local-only values (no teammate needed to boot localhost):
- **`MSSQL_SA_PASSWORD`** — generate any local password: at least 8 characters mixing uppercase, lowercase, digits, and a symbol. **Use only `! * + - _ ^ ~`** as symbols (other special characters break Prisma's SQL Server connection string). Put the exact same password in `DATABASE_URL`.
- **`JWT_SECRET`** & **`JWT_REFRESH_SECRET`** — any two distinct random strings for local dev (e.g. `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`). These only sign local session cookies on `localhost:4000`.
- **`CLIENT_URL`** — keep `http://localhost:3000`.
- **`DATABASE_URL_STAGE`** *(optional)* — ask a teammate only if you want to pull shared `stage` data via `npm run db:pull` (Step 5 A). Skip it if starting with an empty seeded DB (Step 5 B).

> **AI agent rule:** An agent may generate local-only values (`MSSQL_SA_PASSWORD`, local `JWT_SECRET`, local `JWT_REFRESH_SECRET`), but must **never** guess or fabricate Azure credentials (`DATABASE_URL_STAGE`, `DATABASE_URL_PROD`, ACS, or Blob Storage keys).

**Variables reference:**

| Variable | Required for localhost? | Description |
|----------|------------------------|-------------|
| `DATABASE_URL` | Yes | `sqlserver://localhost:1433;database=servicehub_dev;user=sa;password=<MSSQL_SA_PASSWORD>;encrypt=true;trustServerCertificate=true` |
| `MSSQL_SA_PASSWORD` | Yes | `sa` password for the Docker SQL Server container (read by `docker-compose.yml`) |
| `JWT_SECRET` | Yes | Any random string locally (signs access tokens) |
| `JWT_REFRESH_SECRET` | Yes | Any different random string locally (signs refresh tokens) |
| `CLIENT_URL` | Yes | `http://localhost:3000` (local dev CORS & magic links) |
| `DATABASE_URL_STAGE` | Only for `db:pull` | Azure `stage` connection string (ask a teammate) |

> **Note:** `.env` is gitignored — never commit it.

### Step 3: Install Docker and start the local database

> **🤖 AI agent note:** First check whether Docker is already installed (`docker --version`) and running (`docker info`). Only install it if missing, and **ask the user before installing** (requires admin/UAC or `sudo` and may need a reboot). When a UAC or license prompt appears, tell the user what to click, then keep polling `docker info`.

#### A. Install Docker (skip if `docker --version` works)

- **Windows 10/11** (uses the WSL 2 backend):
  ```powershell
  # 1. WSL 2 (skip if `wsl --status` already shows Default Version: 2). May require a reboot.
  wsl --install --no-distribution
  # 2. Docker Desktop
  winget install -e --id Docker.DockerDesktop --accept-package-agreements --accept-source-agreements
  # 3. Start it (first launch shows the Docker subscription agreement — click Accept)
  Start-Process "$Env:ProgramFiles\Docker\Docker\Docker Desktop.exe"
  ```
- **macOS:**
  ```bash
  brew install --cask docker
  open -a Docker   # first launch asks for your password and to accept the agreement
  ```
  On Apple Silicon the SQL Server image is amd64-only. Enable Docker Desktop → Settings → General → **"Use Rosetta for x86_64/amd64 emulation"**.
- **Linux (Ubuntu/Debian):**
  ```bash
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER"   # then log out/in (or `newgrp docker`)
  ```

Wait until the engine is up before continuing:
```bash
until docker info >/dev/null 2>&1; do echo "waiting for Docker..."; sleep 5; done
```

#### B. Start SQL Server

`docker-compose.yml` at the repo root defines a SQL Server 2022 Developer container named `servicehub-mssql`. It listens on port `1433`, reads `MSSQL_SA_PASSWORD` from `.env` (Step 2), and stores data in the `servicehub-mssql-data` volume.

```bash
docker compose up -d                     # first run downloads the image (~1.5 GB)
docker compose ps                        # wait for STATUS "healthy"
```

The container restarts automatically with Docker (`restart: unless-stopped`). Use `docker compose stop` to stop it. `docker compose down -v` **deletes the local database** (you will need to run Step 5 again afterwards).

### Step 4: Install dependencies

This project uses npm Workspaces + Turborepo. Run once from the project root:

```bash
npm install
```

This installs dependencies for all packages (`client/`, `server/`, `shared/`) and automatically runs `npx prisma generate` via `postinstall`.

### Step 5: Load data into the local database

> **🤖 AI agent note:** `npm run db:pull` **drops and re-imports** the local `servicehub_dev`, so confirm with the user before running it on a machine that already has local data. `npx prisma migrate deploy` is safe to run without asking.

Choose the path that matches your situation:

#### A. Copy the shared `stage` database (recommended: real data, matches the staging slot)

```bash
npm run db:pull -- --yes      # Azure stage → BACPAC in scratch/ → local servicehub_dev
npx prisma migrate deploy     # apply any migrations newer than stage (usually none)
```

`server/scripts/db-pull-stage.mjs` exports `stage` with **SqlPackage**, drops the local `servicehub_dev`, and imports the copy, then prints a row-count check for every table (every row should say `OK`). Requirements:
- **SqlPackage** installed (if missing, `db:pull` prints platform-specific install commands):
  - **Cross-platform (with .NET SDK):** `dotnet tool install -g microsoft.sqlpackage`
  - **Windows standalone (Git Bash, no .NET needed):**
    ```bash
    curl -L https://aka.ms/sqlpackage-windows -o /tmp/sqlpackage.zip && mkdir -p "$LOCALAPPDATA/SqlPackage" && unzip -q /tmp/sqlpackage.zip -d "$LOCALAPPDATA/SqlPackage"
    ```
  - **macOS standalone:** `curl -L https://aka.ms/sqlpackage-macos -o /tmp/sqlpackage.zip && unzip -q /tmp/sqlpackage.zip -d ~/sqlpackage && chmod +x ~/sqlpackage/sqlpackage` (add `~/sqlpackage` to `PATH`)
  - **Linux standalone:** `curl -L https://aka.ms/sqlpackage-linux -o /tmp/sqlpackage.zip && unzip -q /tmp/sqlpackage.zip -d ~/sqlpackage && chmod +x ~/sqlpackage/sqlpackage` (add `~/sqlpackage` to `PATH`)
- `DATABASE_URL_STAGE` set in `.env`, and your IP allowed through the Azure SQL firewall (see [Adding your IP to Azure SQL Firewall](#adding-your-ip-to-azure-sql-firewall)).
- `stage` is a free serverless DB that auto-pauses. If the export fails with *"database … is not currently available"*, wait ~60 s and run it again.
- Safety: the script refuses to run if `DATABASE_URL` is not `localhost`, or if the source is `production-servicehub`.

> **Privacy:** `stage` contains real directory member data (names, phones, addresses). The BACPAC lands in the gitignored `scratch/`. Don't copy it anywhere else, and delete old `scratch/stage-*.bacpac` files when no longer needed.

> **Schema changes:** Always run `npx prisma migrate deploy` after pulling commits that touch `prisma/schema.prisma`. To make your own schema change, follow [Creating a new schema change](#creating-a-new-schema-change). Do not use `prisma migrate dev` (Azure SQL has no shadow database).

#### B. Empty database (no Azure access needed)

Use this path if you don't have `DATABASE_URL_STAGE` or Azure SQL firewall access. Works identically in macOS, Linux, Git Bash, and Windows PowerShell:

```bash
# 0. Create the empty database inside the container
echo "IF DB_ID(N'servicehub_dev') IS NULL CREATE DATABASE servicehub_dev" | docker exec -i servicehub-mssql bash -c '/opt/mssql-tools18/bin/sqlcmd -C -S localhost -U sa -P "$MSSQL_SA_PASSWORD"'

# 1. Apply all migrations
npx prisma migrate deploy

# 2. Seed roles and default super-admin account (idempotent via upsert)
npx prisma db seed
```

### Step 6: Start the development server

```bash
npm run dev
```

`concurrently` starts both apps in one terminal:
- **Frontend (React/Vite):** `http://localhost:3000`
- **Backend (Express API):** `http://localhost:4000` (health check: `http://localhost:4000/api/health` → `{"status":"ok",...}`)

Log in at `http://localhost:3000/login` using the [Default Admin Account](#default-admin-account) below.

> **⚠️ First-time setup?** If `npm run dev` fails or the server crashes on startup, see [Known Issues](#known-issues-first-time-setup) below.

---

## AI Agent & Team Tooling Setup

The steps below are **not required** to run `localhost:3000` — complete them when setting up a full team workstation or onboarding an AI coding agent (Devin / Windsurf).

### 1. Install CLI tools

These are the CLIs the team uses for GitHub, Azure infra, and AI-assisted reviews: **GitHub CLI (`gh`)**, **Azure CLI (`az`)**, **ChatGPT/Codex (`codex`)**, and **Google Antigravity (`agy`)**.

> **🤖 AI agent note — ask before installing:** When running full workstation onboarding, present the full list of CLIs to the user (`ask_user_question` multi-select) and ask which ones they want installed. Respect any denials; do **not** install CLIs unprompted.

#### GitHub CLI (recommended for pushing & PRs)

- **Windows:** `winget install --id GitHub.cli` (or https://cli.github.com/)
- **macOS:** `brew install gh`
- **Linux:** Use your package manager or https://cli.github.com/

```bash
gh --version
gh auth login
gh auth setup-git
```

**Alternatives:** Personal Access Token (`repo` scope) or SSH keys (`git remote set-url origin git@github.com:andy741231/servicehub.git`).

#### Azure CLI (recommended for infra tasks)

Needed for Azure SQL firewall rules, App Service logs, and slot operations. Not required for day-to-day feature work.

- **macOS:** `brew install azure-cli`
- **Windows:** `winget install Microsoft.AzureCLI`
- **Linux:** See https://learn.microsoft.com/cli/azure/install-azure-cli

```bash
az --version
az login
```

#### ChatGPT / Codex CLI (optional — ask user before installing)

OpenAI's terminal coding agent (requires an OpenAI account with API access or ChatGPT Plus/Pro/Team):

```bash
npm install -g @openai/codex
codex --version
```

First run prompts for OpenAI login. Docs: https://developers.openai.com/codex/cli

#### Google Antigravity CLI (optional — ask user before installing)

Google's terminal AI agent (`agy`, requires a Google account):

- **macOS / Linux:** `curl -fsSL https://antigravity.google/cli/install.sh | bash`
- **Windows (PowerShell):** `irm https://antigravity.google/cli/install.ps1 | iex`
- **Windows (CMD):** `curl -fsSL https://antigravity.google/cli/install.cmd -o install.cmd && install.cmd && del install.cmd`

> **PATH note:** If `~/.local/bin` is not on PATH, add `export PATH="$HOME/.local/bin:$PATH"` to your shell profile.

```bash
agy --version
```

> **Windows + PowerShell note:** npm-installed CLIs (`codex`, `uipro`) generate `.ps1` shims that PowerShell blocks under the default execution policy. Either run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once, or use **Git Bash / Command Prompt**.

### 2. Install the UI/UX Pro Max skill

The [UI/UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) skill provides design intelligence — accessibility rules, interaction patterns, animation guidelines, color/typography/style recommendations, and UX validation — for UI work. Note that `.devin/skills/ui-ux-pro-max` is tracked as a gitlink, so on a fresh clone the folder starts empty until installed below.

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

#### Install Python 3

**This affects how the agent can use the UI/UX Pro Max skill.** With Python installed, the agent can run the skill's `search.py` and `design_system.py` scripts to generate tailored design-system recommendations. Without Python, the agent can only read the static `SKILL.md` guidance and cannot run the search scripts.

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

### 3. Enable MCP Servers (Agent-Run Setup)

> **⚠️ This step is performed by the AI agent, not the developer.** Before configuring any user-level MCP server, the agent **MUST** present the full list of 5 MCP servers to the user and ask which ones they want enabled (`ask_user_question` multi-select). Respect any denials; do **not** configure any server unprompted.
>
> **Project-level MCPs (already in `.devin/mcp_config.json`):** `shadcn` (`@jpisnice/shadcn-ui-mcp-server`) and `azure` (`@azure/mcp@latest`) are committed at the repo level and require no extra user-level setup.
>
> **Why user-level MCPs need setup:** A fresh Devin install ships with **zero** user-level MCP servers. None of the 5 servers below require OAuth or API tokens, so the agent can configure any approved subset directly by writing a `mcpServers` block into **two** config files — the Devin user-level config (so the Devin agent can call the servers) **and** the Windsurf MCP config (so the servers show up in the Windsurf UI: Settings → MCP Servers panel). See [Write the config files](#write-the-config-files) below.

The following **5 MCP servers** are part of the standard Service Hub dev environment:

| # | Server | Purpose | Prerequisite |
|---|--------|---------|--------------|
| 1 | `filesystem` | File & directory operations (read, write, edit, search, tree) | Node.js / npx |
| 2 | `memory` | Persistent knowledge graph across sessions | Node.js / npx |
| 3 | `sequential-thinking` | Structured step-by-step reasoning for complex debugging | Node.js / npx |
| 4 | `puppeteer` | Headless Chrome automation (screenshots, E2E tests, UX audits) | Node.js / npx |
| 5 | `playwright` | Modern browser automation (E2E tests, screenshots, accessibility snapshots) — Microsoft-maintained | Node.js / npx |

> **Puppeteer vs. Playwright:** Both are browser-automation MCP servers. Puppeteer is the legacy Windsurf-native option; Playwright is the newer Microsoft-maintained alternative with richer accessibility snapshots and multi-browser support. We configure both so the agent can pick the right tool for the job — use Playwright for new E2E test work and accessibility audits, Puppeteer for quick screenshots and the Windsurf-native integration.

> **Config file locations (where the `mcpServers` block can be written):**
> - **Devin user-level (required for the agent):** `~/.config/devin/config.json` (macOS/Linux) · `%APPDATA%\devin\config.json` (Windows)
> - **Windsurf MCP config (required for the UI panel & Marketplace):** `~/.codeium/windsurf/mcp_config.json` (all platforms)
> - **Devin project-level (shared, committed):** `.devin/config.json`
> - **Devin project-local (gitignored):** `.devin/config.local.json`
>
> The setup below writes to **both** the Devin user-level config **and** the Windsurf MCP config. Both files must contain the `mcpServers` block — the Devin config powers the agent's tool calls, and the Windsurf config powers the visual UI (Settings → MCP Servers status indicators and the MCP Marketplace connect buttons). Writing to only one of them results in either a UI that shows nothing or an agent that can't call the servers. Use the Devin project-level files (`.devin/config.json` or `.devin/config.local.json`) as an alternative to the user-level Devin config if you want team-shared or personal-scoped config, but the Windsurf file is still required separately for UI visibility.

#### Write the config files

Write the `mcpServers` block to **two** files. **Only include the servers the user approved** in the ask-first step; omit any denied servers.

**File 1 — Devin user-level config (powers the agent's tool calls):**

| Platform | Devin user-level config path |
|----------|------------------------------|
| macOS / Linux | `~/.config/devin/config.json` |
| **Windows** | **`%APPDATA%\devin\config.json`** (typically `C:\Users\<you>\AppData\Roaming\devin\config.json`) — **not** `~/.config/devin/config.json` |

**File 2 — Windsurf MCP config (powers the UI panel & Marketplace):**

| Platform | Windsurf MCP config path |
|----------|--------------------------|
| All platforms | `~/.codeium/windsurf/mcp_config.json` (typically `C:\Users\<you>\.codeium\windsurf\mcp_config.json` on Windows) |

> **Path note for the agent:** On Windows the Devin user-level config is `%APPDATA%\devin\config.json`. The `~/.config/devin/config.json` path is macOS/Linux only. Getting this wrong is a common failure — the file gets written to a location Devin never reads, and the servers won't be picked up. The Windsurf path (`~/.codeium/windsurf/mcp_config.json`) is the same on all platforms.

If you prefer a Devin project-scoped (team-shared, committed) config instead of user-level, write to `.devin/config.json` at the project root. For a personal, gitignored config, write to `.devin/config.local.json`. The JSON shape is identical across all Devin config locations. **The Windsurf MCP config file is still required separately** regardless of which Devin config location you choose — there is no project-scoped alternative for the Windsurf file.

Both files may already exist with other content (e.g. `{"version": 1}` for Devin, or empty for Windsurf). **Merge** the `mcpServers` key in — do not overwrite the whole file. Read each file first, parse the JSON, add/replace the `mcpServers` object, and write it back.

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

> **Replace `/absolute/path/to/servicehub`** with the actual project root path. On Windows, use the Windows path format with double backslashes (e.g. `"C:\\Users\\yourname\\CascadeProjects\\servicehub"`).
>
> **Windows `npx` note:** On Windows, `npx` resolves to `npx.cmd`. The `command: "npx"` value works because Devin shells out through `cmd.exe`, but if a server fails to launch on Windows, try `"command": "npx.cmd"` for that entry.

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

**Config entry:** add a `"filesystem"` key to `mcpServers` with `"command": "npx"` and `"args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/project"]`. The last arg is the allowed directory — set it to the project root.

##### 2. `memory` — Knowledge Graph (Persistent Memory)

Stores entities, relations, and observations in a persistent knowledge graph. Survives across conversations and sessions.

| Capability | Key Tools |
|------------|-----------|
| Create entities/relations | `create_entities`, `create_relations` |
| Query | `read_graph`, `search_nodes`, `open_nodes` |
| Update | `add_observations` |
| Delete | `delete_entities`, `delete_relations`, `delete_observations` |

**Use cases:** Remember architectural decisions, track sub-app ownership, store onboarding context for new developers, persist bug patterns and resolutions across sessions.

**Config entry:** add a `"memory"` key to `mcpServers` with `"command": "npx"` and `"args": ["-y", "@modelcontextprotocol/server-memory"]`. Data is stored locally in a JSON file — no external service required.

##### 3. `sequential-thinking` — Structured Reasoning

A dynamic, reflective problem-solving tool that breaks complex problems into sequential thought steps with branching and revision support.

| Capability | Key Tool |
|------------|----------|
| Step-by-step reasoning | `sequentialthinking` (with `thoughtNumber`, `totalThoughts`, `branchId`, `isRevision`) |

**Use cases:** Debugging complex multi-layer issues (e.g., Prisma + Azure SQL + Express middleware chains), planning sub-app architecture, designing database schema changes, root-cause analysis for production incidents.

**Config entry:** add a `"sequential-thinking"` key to `mcpServers` with `"command": "npx"` and `"args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]`. No external dependencies.

##### 4. `puppeteer` — Browser Automation

Headless Chrome control for navigating, clicking, filling forms, taking screenshots, and executing JavaScript in the browser.

| Capability | Key Tools |
|------------|-----------|
| Navigation | `puppeteer_navigate` |
| Interaction | `puppeteer_click`, `puppeteer_fill`, `puppeteer_select`, `puppeteer_hover` |
| Inspection | `puppeteer_screenshot`, `puppeteer_evaluate` |

**Use cases:** End-to-end visual testing of the React frontend, capturing screenshots for UX audits, verifying login flows, debugging client-side rendering issues.

**Config entry:** add a `"puppeteer"` key to `mcpServers` with `"command": "npx"` and `"args": ["-y", "@modelcontextprotocol/server-puppeteer"]`. Ensure Puppeteer's Chromium can launch on your OS (it should on macOS and Windows; on Linux you may need `--no-sandbox`).

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

**Config entry:** add a `"playwright"` key to `mcpServers` with `"command": "npx"` and `"args": ["-y", "@playwright/mcp@latest"]`. The Playwright browser binaries download automatically on first use — no manual install needed.

> **Puppeteer vs. Playwright:** Both are browser-automation MCP servers. Puppeteer is the legacy Windsurf-native option; Playwright is newer with better accessibility support and multi-browser coverage. Use Playwright for new E2E test work and accessibility audits; use Puppeteer for quick screenshots and the Windsurf-native integration.

#### Verification checklist

After the agent writes the config file, it must verify the servers are actually registered before declaring success. **Do not assume the setup worked — verify.**

**A. Verify registration (do this first):**

Read **both** config files back and confirm each contains the `mcpServers` block with every approved server:

```bash
# macOS / Linux — Devin user-level config
cat ~/.config/devin/config.json
# macOS / Linux — Windsurf MCP config
cat ~/.codeium/windsurf/mcp_config.json

# Windows (PowerShell) — Devin user-level config
Get-Content "$env:APPDATA\devin\config.json"
# Windows (PowerShell) — Windsurf MCP config
Get-Content "$HOME\.codeium\windsurf\mcp_config.json"

# (or whichever Devin config file was written: .devin/config.json / .devin/config.local.json)
```

Both files must contain a `"mcpServers"` object with one entry per approved server. If a server the user approved is missing from either file, add it; if a denied server is present in either file, remove it. **Both files must be in sync** — a server present in only one file will either be invisible to the agent or invisible in the UI.

**B. Verify each server is active** by performing a simple operation (only after registration is confirmed and Windsurf/Devin has been restarted so the servers are picked up):

| Server | Verification prompt |
|--------|-------------------|
| `filesystem` | "List the files in the project root" |
| `memory` | "Create an entity called 'ServiceHub' with type 'Project'" |
| `sequential-thinking` | "Use sequential thinking to plan a 3-step database migration" |
| `puppeteer` | "Navigate to http://localhost:3000 and take a screenshot" |
| `playwright` | "Use Playwright to navigate to http://localhost:3000 and take an accessibility snapshot" |

> **💡 Tip:** If a server is not responding, check Windsurf Settings → MCP Servers for error indicators. Restart Windsurf/Devin after writing a new server configuration so the servers are picked up.
>
> **Enabling/disabling without removing:** Set `"disabled": true` on the server entry in the config file to toggle a server without losing its config.

---

## Known Issues (First-Time Setup)

If this is your first time running the app, you may encounter one of the following:

### 1. Can't reach the local database (Docker not running)

**Symptom:** `PrismaClientInitializationError: Can't reach database server at localhost:1433`, `P1001`, or `Server error during login`.

**Cause:** Docker Desktop isn't running, or the `servicehub-mssql` container is stopped or still starting.

**Fix:**
```bash
docker info >/dev/null 2>&1 || echo "start Docker Desktop first"
docker compose up -d && docker compose ps   # wait for "healthy", then restart npm run dev
```

If the container keeps restarting, run `docker compose logs mssql`. The most common cause is `MSSQL_SA_PASSWORD` missing from `.env` or failing SQL Server's complexity rules (see Step 2).

### 2. `Login failed for user 'sa'` / `Cannot open database "servicehub_dev"`

- **Login failed:** the password in `DATABASE_URL` doesn't match `MSSQL_SA_PASSWORD`, or the password was changed after the Docker volume was initialized. SQL Server only reads `MSSQL_SA_PASSWORD` on first start. Fix the mismatch, or reset the volume with `docker compose down -v && docker compose up -d` and re-run Step 5.
- **Cannot open database:** the container is fresh and empty. Run Step 5 (A or B).

### 3. `npm run db:pull` can't reach Azure `stage`

- `Client with IP address '…' is not allowed`: add your IP (see [Adding your IP to Azure SQL Firewall](#adding-your-ip-to-azure-sql-firewall)). Rules can take up to 5 minutes to take effect.
- `Database 'stage' … is not currently available`: the free serverless DB is waking from auto-pause. Wait ~60 s and retry.

---

## Login Credentials

### Default Admin Account
| Field | Value |
|-------|-------|
| Username | `admin` |
| Email | `admin@servicehub.com` |
| Password | `Admin@2024!` |
| Role | `super_admin` (access to all apps) |

> This account is created by `npx prisma db seed` and exists in the `stage` and production databases (and therefore in any local copy made with `npm run db:pull`).

---

## Database Overview

| Database | Where | Purpose | User |
|----------|-------|---------|------|
| `servicehub_dev` | Docker on your machine (`localhost:1433`) | Local development (your own copy) | `sa` |
| `stage` | Azure SQL, free serverless (auto-pauses) | Cloud **staging slot** + source for `npm run db:pull` | `servicehub_dev` |
| `production-servicehub` | Azure SQL, Basic (always on) | Live production | `servicehub_prod` |
| `test-servicehub` | Azure SQL, free serverless | **Retired 2026-10-25**: paused, not deleted, nothing uses it | — |

All Azure databases live on the server `houstonservice-test.database.windows.net`.

**To re-seed roles/default admin (idempotent via `upsert`):**
```bash
# Seed your local DB (uses DATABASE_URL from .env)
npx prisma db seed

# Seed prod DB (admins only — ensure DATABASE_URL_PROD is set in .env)
node -e "const fs=require('fs'),{execSync}=require('child_process');const m=fs.readFileSync('.env','utf8').match(/^DATABASE_URL_PROD=[\"']?([^\"'\r\n]+)/m);if(!m)throw new Error('DATABASE_URL_PROD missing');execSync('npx prisma db seed',{stdio:'inherit',env:{...process.env,DATABASE_URL:m[1]}})"
```

---

## Deployment

Deployment uses a **staging-gated** pipeline on Azure App Service. A push to `main` deploys to the `staging` slot first; only after staging passes all smoke tests (including commit-SHA verification) does CI migrate and deploy the exact same verified package to `production`. Auto-swap stays **OFF** (since 2026-10-18) so broken builds can never bypass smoke tests.

| Stage | Job | What happens |
|-------|-----|-------------|
| 1 | `build` | Install deps, compile React frontend, generate Prisma client, run server unit tests + schema/column drift check, stamp `build-info.json`, assemble + verify imports in the standalone bundle, and zip it |
| 2 | `deploy-staging` | Apply staging DB migrations (with auto-pause retry), push the zip to the `staging` slot via Kudu, poll the exact deployment URL until complete |
| 3 | `smoke-tests` | Wait for staging `/api/health` to return HTTP 200 with the **new commit SHA**, then verify `/`, `/login`, DB-backed page API, and Directory SMS/auth guards. The pipeline halts if any check fails |
| 4 | `deploy-production` | Apply production DB migrations, push the exact same verified zip to `production` via Kudu, and verify `/api/health` reports the new commit SHA + DB + Directory guards |

Both slots run `WEBSITE_RUN_FROM_PACKAGE=1` (slot-sticky), so `wwwroot` is read-only and deploys mount in seconds (~15–30s brief restart on production while the new package mounts). Staging stays live after every deploy (unlike a slot swap under RFP, which leaves staging returning 503 until the next deploy). See the CI/CD note in `agent.md` for logging under run-from-package.

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

### How staging-gated promotion works

1. The new build is tested in CI (unit tests, drift check, standalone import check) and deployed to the **staging slot**. Production is not touched.
2. Smoke tests verify staging is running the **exact commit SHA**, serves DB-backed pages, and enforces Directory SMS/auth guards. If anything fails, the pipeline stops.
3. Only then does CI apply production DB migrations, push the verified `deploy.zip` to `production`, and verify production reports the new commit SHA.

### Emergency rollback / future zero-downtime OIDC swap

To roll back a bad release, revert the commit on `main` and push (CI deploys the revert in ~4–5 min), or use a manual slot swap if staging still holds a known-good build:

```bash
az webapp deployment slot swap \
  --resource-group App-Services-And-Related \
  --name houstonservicehub \
  --slot staging \
  --target-slot production
```

> **Future upgrade (zero-downtime CI slot swap via OIDC):** The Entra ID app `github-servicehub-deploy` (client ID `a3070650-42d6-44ad-be84-62e69653b768`, SP object ID `0b7e6826-fb49-431c-871d-81d56b8e3fd9`) is already registered with a GitHub OIDC federated credential for `main`. Whenever an Azure Owner grants it `Website Contributor` on `houstonservicehub`, `deploy-production` can switch from Kudu zipdeploy to `az webapp deployment slot swap` for zero-downtime swaps:
> ```bash
> az role assignment create \
>   --assignee-object-id "0b7e6826-fb49-431c-871d-81d56b8e3fd9" \
>   --assignee-principal-type ServicePrincipal \
>   --role "Website Contributor" \
>   --scope "/subscriptions/e66e4de3-b754-4ec5-8e17-23a849af0356/resourceGroups/App-Services-And-Related/providers/Microsoft.Web/sites/houstonservicehub"
> ```

### Promoting database changes to production

Code deploys automatically via GitHub Actions, and **database migrations now run automatically** via `npx prisma migrate deploy`:
- Staging migrations run before deploying to the staging slot.
- Production migrations run after smoke tests pass, right before `deploy-production` pushes the new zip to production. Keep migrations backward-compatible with the currently running production code during the brief deploy window.

You do not need to apply migrations manually.

> **Important:** `prisma migrate deploy` only applies new migrations — it never drops or recreates tables. It is safe to run against a live production database.

#### Creating a new schema change

Follow the **Schema Change Workflow** in `agent.md`, which is the canonical version. In short:

1. Edit `prisma/schema.prisma`.
2. Run `npx prisma db push` to sync your local Docker DB (`servicehub_dev`).
3. **Hand-write** `prisma/migrations/<YYYYMMDD_descriptive_name>/migration.sql` with `IF NOT EXISTS` guards so it is idempotent. `db push` does not create this file, and production only runs migration files.
4. Run `npx prisma migrate deploy` to record the migration locally, then commit the schema and the migration together.
5. **Do not** run `prisma migrate resolve --applied` on new migrations. That command marks a migration as applied without executing the SQL.

The Husky pre-commit hook (`.husky/pre-commit`) and the CI drift check **block** commits where a model has no `CREATE TABLE` in any migration. They do **not** generate migrations for you.

#### Required GitHub secrets

> **Already configured** — all secrets were set on 2026-06-25. No action needed unless credentials change.

| Secret | Description | Status |
|--------|-------------|--------|
| `DATABASE_URL_PROD` | Production Azure SQL connection string | ✓ Set |
| `DATABASE_URL_STAGING` | Staging Azure SQL (`stage`) | ✓ Set |
| `DATABASE_URL_DEV` | `test-servicehub`, **unused** since 2026-10-25 (its CI sync step was removed). Safe to delete | Unused |
| `AZURE_DEPLOY_USER` | Kudu publishing username (production slot) | ✓ Set |
| `AZURE_DEPLOY_PWD` | Kudu publishing password (production slot) | ✓ Set |
| `AZURE_DEPLOY_USER_STAGING` | Kudu publishing username (staging slot) | ✓ Set |
| `AZURE_DEPLOY_PWD_STAGING` | Kudu publishing password (staging slot) | ✓ Set |

> **Note:** No `AZURE_CREDENTIALS` service principal is needed yet. Auto-swap is **off** (2026-10-18); after staging smoke tests pass, `deploy-production` pushes the verified zip to production via the production Kudu credentials (`AZURE_DEPLOY_USER` / `AZURE_DEPLOY_PWD`). See the OIDC note above to upgrade to zero-downtime CI slot swaps later.

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
| 2 | Auto-swap enabled (`staging` → `production`). **Disabled again on 2026-10-18**: production now deploys via the staging-gated `deploy-production` job in CI | `autoSwapSlotName` should be empty on the slot config |
| 3 | `DATABASE_URL` on staging set to a free test DB (now `stage`) | `database=stage` confirmed in staging app settings (2026-10-25) |
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

# Confirm staging DATABASE_URL points at stage (prints the full string — contains a password)
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

- **Local:** `npx prisma studio`, or any SQL client (Azure Data Studio, SSMS, VS Code mssql) connected to `localhost,1433` as `sa` (trust the server certificate).
- **Shell inside the container:** `docker exec -it servicehub-mssql bash -c '/opt/mssql-tools18/bin/sqlcmd -C -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -d servicehub_dev'`
- **Azure (`stage` / production):** Azure Data Studio or the Azure portal query editor.

### Adding your IP to Azure SQL Firewall

You only need this for `npm run db:pull` and other direct access to the Azure databases. Local dev on Docker never needs it. If you see "Client with IP address is not allowed to access the server", add your IP to the Azure SQL firewall:

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
npm run db:pull -- --yes      # back to a fresh copy of stage (recommended)
# or wipe the container completely:
docker compose down -v && docker compose up -d   # then Step 5 A or B
```

> Your local DB is yours alone, so resetting it affects nobody else. Do **not** run `npx prisma migrate reset` (or `db push --force-reset`) with `DATABASE_URL` pointing at Azure: `stage` backs the staging slot, and production is production.

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
| `docker compose up -d` / `stop` | Start / stop the local SQL Server container |
| `npm run db:pull -- --yes` | Replace local `servicehub_dev` with a fresh copy of Azure `stage` |
| `npx prisma db push` | Sync schema to the local DB (then hand-write a migration; see agent.md) |
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

> **✅ Resolved:** File uploads now use Azure Blob Storage. See [Azure Blob Storage & Email Setup](#azure-blob-storage--email-setup) below for details.

Previously, uploaded images were saved to a local `/uploads` folder on the App Service instance. This caused issues across deployment slots. Files are now uploaded to Azure Blob Storage and served via blob URLs.

**Cost:** ~$0.018/GB/month (Hot tier, LRS). Negligible for typical image usage.


# View Azure SQL Database / prisma studio IN PRODUCTION
```bash
DATABASE_URL='sqlserver://houstonservice-test.database.windows.net:1433;database=production-servicehub;user=servicehub_prod;password=<ask_team>;encrypt=true;trustServerCertificate=false;connectionTimeout=30' npx prisma studio
```

---

## Azure Blob Storage & Email Setup

> **Note:** These services are **not required** for first-time setup. A new developer can run the app without blob storage or email sending configured. This section documents how to set up these services when needed (e.g. for testing file uploads or sending emails).

### Overview

| Service | Purpose | Azure Resource | Code |
|---------|---------|----------------|------|
| Azure Blob Storage | File uploads (web builder assets, images) | Storage Account `cihwebsitebackups`, container `servicehub-upload` | `server/src/services/blobStorage.js` |
| Azure Communication Services (ACS) Email | Transactional & campaign email sending | ACS `servicehub-email` + Email Communication Service `servicehub-email-service` | `server/src/services/emailService.js` |

### Environment Variables

Add these to `.env` (local dev) or Azure App Service Application Settings (production):

```env
# Azure Blob Storage
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=<account>;AccountKey=<key>;EndpointSuffix=core.windows.net
AZURE_STORAGE_CONTAINER_NAME=servicehub-upload

# Azure Communication Services — Email
AZURE_COMMUNICATION_CONNECTION_STRING=endpoint=https://<acs-name>.<region>.communication.azure.com/;accesskey=<key>
AZURE_COMMUNICATION_SENDER_EMAIL=donotreply@<domain>.azurecomm.net
```

### 1. Azure Blob Storage Setup

#### Via Azure CLI

```bash
# 1. Create a storage account (or use existing)
az storage account create \
  --name <storage-account-name> \
  --resource-group App-Services-And-Related \
  --location eastus \
  --sku Standard_LRS

# 2. Create a blob container
az storage container create \
  --name servicehub-upload \
  --account-name <storage-account-name> \
  --public-access blob

# 3. Get the connection string
az storage account show-connection-string \
  --name <storage-account-name> \
  --resource-group App-Services-And-Related \
  --query connectionString -o tsv
```

Add the connection string to `.env` as `AZURE_STORAGE_CONNECTION_STRING`.

#### How it works in the app

- `server/src/routes/web.js` uses `multer.memoryStorage()` — files are held in memory, not written to disk
- `server/src/controllers/webAssets.js` calls `uploadBlob()` from `server/src/services/blobStorage.js` to upload the file buffer to Azure
- The blob URL is stored in the `WebAsset` table and served directly from Azure
- Deleting an asset calls `deleteBlob()` to remove it from Azure

### 2. Azure Communication Services Email Setup

#### Via Azure CLI

```bash
# 1. Create ACS resource
az communication create \
  --name <acs-name> \
  --resource-group App-Services-And-Related \
  --location global \
  --data-location unitedstates

# 2. Create Email Communication Service
az communication email create \
  --name <email-service-name> \
  --resource-group App-Services-And-Related \
  --location global \
  --data-location unitedstates

# 3. Add an Azure-managed domain (for testing — auto-generated sender domain)
az communication email domain create \
  --email-service-name <email-service-name> \
  --resource-group App-Services-And-Related \
  --name AzureManagedDomain \
  --location global \
  --domain-management AzureManaged

# 4. Link the email domain to the ACS resource
az rest --method put \
  --url 'https://management.azure.com/subscriptions/<subscription-id>/resourceGroups/App-Services-And-Related/providers/Microsoft.Communication/CommunicationServices/<acs-name>?api-version=2023-04-01' \
  --body '{"location":"global","properties":{"dataLocation":"United States","linkedDomains":["/subscriptions/<subscription-id>/resourceGroups/App-Services-And-Related/providers/Microsoft.Communication/emailServices/<email-service-name>/domains/AzureManagedDomain"]}}'

# 5. Get the ACS connection string
az communication list-key \
  --name <acs-name> \
  --resource-group App-Services-And-Related \
  --query primaryConnectionString -o tsv
```

The Azure-managed domain generates a sender address like `donotreply@<random-guid>.azurecomm.net`. Use this as `AZURE_COMMUNICATION_SENDER_EMAIL`.

> **Azure-managed domain limits:** 100 emails/day, 30 emails/min. Cannot be increased. For production, add a custom domain with verified SPF/DKIM/DMARC records to get higher limits and a branded sender address.

> **Custom domain (for production):** Replace step 3 with `--domain-management CustomerManaged --domain <your-domain>.com`. Azure will output DNS verification records (TXT, CNAME for DKIM) that you must add to your domain's DNS provider. Once verified, link it to the ACS resource the same way.

#### How it works in the app

- `server/src/services/emailService.js` uses `@azure/communication-email` `EmailClient` to send emails
- `POST /api/email/test` — sends a single test email (`sendTestEmailController`)
- `POST /api/email/campaigns/:id/send` — sends a campaign to all active recipients in the linked mailing list, creates `EmailLog` entries, and updates `CampaignMetrics`
- Campaign emails support mail-merge placeholders: `{{firstName}}`, `{{lastName}}`, `{{email}}`

#### Testing email sending

```bash
# Send a test email
curl -X POST http://localhost:4000/api/email/test \
  -H "Content-Type: application/json" \
  -d '{"to":"your@email.com","subject":"Test","html":"<p>Hello from ServiceHub</p>"}'
```

### Current Azure Resources

These resources are already provisioned in the `App-Services-And-Related` resource group:

| Resource | Type | Name |
|----------|------|------|
| Storage Account | `Microsoft.Storage/storageAccounts` | `cihwebsitebackups` |
| Blob Container | — | `servicehub-upload` |
| ACS Resource | `Microsoft.Communication/CommunicationServices` | `servicehub-email` |
| Email Communication Service | `Microsoft.Communication/emailServices` | `servicehub-email-service` |
| Email Domain | `Microsoft.Communication/emailServices/domains` | `AzureManagedDomain` |
| Sender Address (current) | — | `donotreply@c2eaf531-3f8a-48d4-a172-64301e315c6b.azurecomm.net` |
| Custom Domain (pending DNS) | `Microsoft.Communication/emailServices/domains` | `churchinhouston.org` |

### Custom Domain Setup — In Progress

> **Status:** Domain resource created in Azure. **Waiting on DNS records to be added by domain owner.**
> **Current sender:** Azure-managed domain (works, but emails may go to junk — no custom DKIM/SPF reputation).
> **Target sender:** `serviceoffice@churchinhouston.org`

The custom domain `churchinhouston.org` has been created in ACS but is **not yet verified**. The following DNS records must be added at the domain's DNS provider (registrar / Cloudflare / etc.) before the domain can be used.

#### DNS Records to Add

**1. Domain Verification (TXT)**
| Field | Value |
|-------|-------|
| Type | TXT |
| Name/Host | `churchinhouston.org` (or `@`) |
| Value | `ms-domain-verification=c1c24933-bed9-46b1-8aa2-43e4154cebad` |
| TTL | 3600 |

**2. SPF (TXT)**
| Field | Value |
|-------|-------|
| Type | TXT |
| Name/Host | `churchinhouston.org` (or `@`) |
| Value | `v=spf1 include:spf.protection.outlook.com -all` |
| TTL | 3600 |

> **Important:** `churchinhouston.org` uses Google Workspace, so it already has an SPF record (`v=spf1 include:_spf.google.com ~all`). **Replace** the existing SPF record with a merged version that includes both Google and Azure:
> ```
> v=spf1 include:_spf.google.com include:spf.protection.outlook.com -all
> ```
> Do **not** add a second SPF record — having two will cause SPF to fail.

**3. DKIM 1 (CNAME)**
| Field | Value |
|-------|-------|
| Type | CNAME |
| Name/Host | `selector1-azurecomm-prod-net._domainkey` |
| Value | `selector1-azurecomm-prod-net._domainkey.azurecomm.net` |
| TTL | 3600 |

**4. DKIM 2 (CNAME)**
| Field | Value |
|-------|-------|
| Type | CNAME |
| Name/Host | `selector2-azurecomm-prod-net._domainkey` |
| Value | `selector2-azurecomm-prod-net._domainkey.azurecomm.net` |
| TTL | 3600 |

#### After DNS Records Are Added

Once the DNS records are in place, run these commands to verify and link the domain:

```bash
# 1. Check verification status
az communication email domain show \
  --email-service-name servicehub-email-service \
  --resource-group App-Services-And-Related \
  --name churchinhouston.org \
  --query "verificationStates" -o json

# 2. Once all statuses show "Verified", link the domain to the ACS resource
az rest --method put \
  --url 'https://management.azure.com/subscriptions/e66e4de3-b754-4ec5-8e17-23a849af0356/resourceGroups/App-Services-And-Related/providers/Microsoft.Communication/CommunicationServices/servicehub-email?api-version=2023-04-01' \
  --body '{"location":"global","properties":{"dataLocation":"United States","linkedDomains":["/subscriptions/e66e4de3-b754-4ec5-8e17-23a849af0356/resourceGroups/App-Services-And-Related/providers/Microsoft.Communication/emailServices/servicehub-email-service/domains/churchinhouston.org"]}}'

# 3. Update .env sender email
# AZURE_COMMUNICATION_SENDER_EMAIL=serviceoffice@churchinhouston.org
```

> **Note:** DNS propagation can take 15 minutes to a few hours. You can check with `nslookup -type=TXT churchinhouston.org` to see if the records have propagated.

---

## Final Verification Checklist (Agent-Run)

> **🤖 AI agent note — REQUIRED, do not skip:** After walking the developer through Steps 1–6 (and any approved items in AI Agent & Team Tooling Setup), the agent **MUST** run this verification pass before declaring setup complete. Verify the actual state of the system (run commands and read output) and tick each box only when confirmed.

### ✅ Step 1 — Repository cloned

- [ ] `git rev-parse --is-inside-work-tree` succeeds (inside the `servicehub` repo)
- [ ] `git remote -v` shows `origin` → `github.com/andy741231/servicehub.git`
- [ ] Current working directory is the project root (contains `client/`, `server/`, `shared/`, `prisma/`)

### ✅ Step 2 — Environment variables configured (`.env`)

- [ ] `.env` exists at the project root and is gitignored (`git check-ignore .env` returns `.env`)
- [ ] `.env` contains `DATABASE_URL`, `MSSQL_SA_PASSWORD`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, and `CLIENT_URL`
- [ ] `CLIENT_URL` is `http://localhost:3000`
- [ ] `DATABASE_URL` points at `localhost:1433` / `servicehub_dev` (Docker), not an Azure database
- [ ] `MSSQL_SA_PASSWORD` matches the password in `DATABASE_URL`

### ✅ Step 3 — Docker and local SQL Server

- [ ] `docker info` succeeds (engine running)
- [ ] `docker compose ps` shows `servicehub-mssql` as `healthy`

### ✅ Step 4 — Dependencies installed

- [ ] `node -v` prints v22+ (or v20+) and `npm -v` prints v10+ (or v9+)
- [ ] `node_modules/` exists at the project root and Prisma client is generated

### ✅ Step 5 — Local DB loaded & migrations applied

- [ ] Path A: `npm run db:pull` finished with `mismatches: 0` and `migrations match: true`
- [ ] Path B: `servicehub_dev` created, `npx prisma migrate deploy` succeeded, and `npx prisma db seed` ran
- [ ] `npx prisma migrate status` reports no pending migrations

### ✅ Step 6 — Development server running

- [ ] `npm run dev` is running (both Vite frontend and Express backend started without fatal errors)
- [ ] `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000` returns `200`
- [ ] `curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/api/health` returns `200`
- [ ] Login at `http://localhost:3000/login` with `admin@servicehub.com` / `Admin@2024!` succeeds

### ✅ AI Agent & Team Tooling (only items the user approved)

- [ ] **CLIs:** Asked user (multi-select) before installing; verified each approved CLI (`gh`, `az`, `codex`, `agy`); skipped denied ones
- [ ] **UI/UX Pro Max skill:** `.devin/skills/ui-ux-pro-max/SKILL.md` exists (and if Python approved, `search.py` runs)
- [ ] **MCP servers:** Asked user (multi-select) before configuring; approved servers written to **both** Devin config (`%APPDATA%\devin\config.json` on Windows / `~/.config/devin/config.json` on macOS/Linux) and Windsurf MCP config (`~/.codeium/windsurf/mcp_config.json`); denied servers omitted; reminded user to restart Devin/Windsurf so new MCP servers load

### 🎯 Sign-off

- [ ] Every applicable checkbox above is ticked. Summarize what was set up (DB path A vs B, approved/denied CLIs & MCPs) and confirm the developer is ready to build.