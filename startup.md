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

This step covers the CLIs the team uses day-to-day. All of the CLIs below — **GitHub CLI**, **Azure CLI**, **Claude Code**, **ChatGPT/Codex**, and **Google Antigravity** — are **required** parts of the standard Service Hub dev environment.

> **🤖 AI agent note — REQUIRED, do not skip:** This step is **required**, not optional. Before installing any CLI, you **MUST** present the full list of CLIs to the user and ask which ones they want installed. The user may deny any or all of them — denial is allowed and should be respected — but you must ask before proceeding, and you must not skip the ask. Use the `ask_user_question` tool (or an equivalent prompt) with the CLIs as selectable choices (multi-select, so the user can pick any subset or none). Do **not** install any CLI unprompted, and do **not** proceed past this step until the user has answered. Install only the CLIs the user explicitly approves; record any denials and continue to the next step.

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

#### Claude Code CLI (required — ask user before installing)

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

First run prompts for Anthropic login (OAuth or API key) — follow the on-screen instructions.

Docs: https://code.claude.com/docs/en/quickstart

#### ChatGPT / Codex CLI (required — ask user before installing)

OpenAI's official terminal coding agent is the **Codex CLI** (the modern successor to the older `chatgpt` npm package). Requires an OpenAI account with API access or a ChatGPT Plus/Pro/Team subscription.

- **All platforms (npm):**
  ```bash
  npm install -g @openai/codex
  ```

**Verify:**
```bash
codex --version
```

First run prompts for OpenAI login — follow the on-screen instructions.

Docs: https://developers.openai.com/codex/cli

#### Google Antigravity CLI (required — ask user before installing)

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

First run prompts for Google account login — follow the on-screen instructions.

Update later with `agy update`. Docs: https://antigravity.google/docs/home

> **Windows + PowerShell note:** The npm-installed CLIs (`claude`, `codex`)
> generate `.ps1` shims that PowerShell blocks under the default execution
> policy, producing `running scripts is disabled on this system`. Either run
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once, or simply use
> **Command Prompt / Git Bash** — both run the `.cmd` shims without issue.
> `agy` is unaffected (native `.exe`, not a PS script).

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

> **⚠️ This step is performed by the AI agent, not the developer.** This step is **required**, not optional. Before configuring any MCP server, the agent **MUST** present the full list of 5 MCP servers to the user and ask which ones they want enabled. The user may deny any or all of them — denial is allowed and should be respected — but the agent must ask before configuring anything, and must not skip the ask. Use the `ask_user_question` tool (or an equivalent prompt) with the 5 servers as selectable choices (multi-select, so the user can pick any subset or none). Do **not** configure any server unprompted, and do **not** proceed past this step until the user has answered. Configure only the servers the user explicitly approves; record any denials and continue to the next step.
>
> **Why:** A fresh Devin install ships with **zero** MCP servers. None of the servers below are built-in or enabled by default — they must all be added explicitly. An agent can fully set up any approved subset using only shell/file tools (no MCP tool calls, no human intervention required), because none of these 5 require OAuth or API tokens.
>
> **How:** MCP servers are configured by writing a `mcpServers` block into **two** config files — the Devin user-level config (so the Devin agent can call the servers) **and** the Windsurf MCP config (so the servers show up in the Windsurf UI: Settings → MCP Servers panel and the MCP Marketplace connect buttons). No `devin` CLI binary is required — this method works on every platform (including Windows boxes where the `devin` CLI is not on PATH). See [Write the config files](#write-the-config-files) below.

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

### Step 3: Configure environment variables

> **🤖 AI agent note — assume present, only ask if missing:** The `.env` file is gitignored and never lives in the repo, so the realistic way a developer gets it is from a teammate or a previous machine — not by typing secret values into a fresh file during setup. **Assume the developer already has a `.env` file.** Do **not** prompt them to fill in secret values or ask a teammate for `DATABASE_URL` / `JWT_SECRET` / `JWT_REFRESH_SECRET` unless `.env` is actually missing or malformed. "Assume present" still means **verify** — check that `.env` exists, is gitignored, contains all required keys, and that `DATABASE_URL` points at the dev DB (`test-servicehub`), not production. Only if a check fails should the agent surface it to the developer and ask how they want to proceed. Do not silently skip this step.

#### A. `.env` already exists (the common case)

The agent should verify, not prompt:

```bash
# 1. Confirm the file exists and is gitignored
test -f .env && git check-ignore .env   # macOS/Linux
# Windows (PowerShell):
Test-Path .env; git check-ignore .env

# 2. Confirm all required keys are present (without printing their values)
grep -E '^(DATABASE_URL|JWT_SECRET|JWT_REFRESH_SECRET|CLIENT_URL)=' .env   # macOS/Linux
# Windows (PowerShell):
Select-String -Path .env -Pattern '^(DATABASE_URL|JWT_SECRET|JWT_REFRESH_SECRET|CLIENT_URL)='
```

If all four keys are present and `DATABASE_URL` contains `database=test-servicehub` (dev) and **not** `production-servicehub`, this step is done — move on to Step 4. Do not ask the developer for values.

If `.env` exists but is missing a key or points at the production DB, surface the specific problem to the developer and ask how they want to fix it (e.g. get the missing value from a teammate). Do not write secret values into the file yourself unless the developer explicitly provides them.

#### B. `.env` is missing (only then — ask the developer)

Only if `.env` does not exist at the project root should the agent guide the developer to create one. Start from the example file:

```bash
cp .env.example .env
```

Then the developer fills in the values. They should ask a team member for the `DATABASE_URL`, `JWT_SECRET`, and `JWT_REFRESH_SECRET` values, or use the reference below. **The agent should not generate or guess secret values** — it should tell the developer which keys to fill in and where to get them.

**Required variables:**

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Azure SQL connection string for `test-servicehub` (dev DB) |
| `JWT_SECRET` | Secret for signing access tokens |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens |
| `CLIENT_URL` | `http://localhost:3000` (for local dev CORS) |

The `DATABASE_URL` format for Azure SQL (SQL Server via Prisma):
```
sqlserver://houstonservice-test.database.windows.net:1433;database=test-servicehub;user=servicehub_dev;password=<ask team>;encrypt=true;trustServerCertificate=false;connectionTimeout=30
```

> **Note:** The `.env` file is gitignored — never commit it.

### Step 4: Apply migrations & seed the database

> **🤖 AI agent note:** Before running `npx prisma db seed`, **ask the user first** whether the target database is brand-new and empty. Seeding an already-set-up database can create duplicate roles or fail on unique constraints. `npx prisma migrate deploy` is safe to run without asking — it only applies pending migrations and never drops or recreates tables.

The test database (`test-servicehub`) is shared and already has migrations applied and seed data. **Do not run the seed command against an existing database** — it will fail or duplicate data. Follow the path below that matches your situation.

#### A. Existing database (most developers — DB already set up)

Only apply pending migrations. **Do not seed.**

```bash
# Apply any pending migrations to the dev database (safe — never drops/recreates tables)
npx prisma migrate deploy
```

> **Schema changes:** Always run `npx prisma migrate deploy` after pulling changes that include `prisma/schema.prisma` modifications. To create a new migration after editing the schema, run `npx prisma migrate dev --name describe_your_change` locally first.

#### B. Fresh / empty database (new DB only)

Run migrations **and** seed — only if the database has no tables or seed data yet.

```bash
# 1. Apply all pending migrations to the dev database
npx prisma migrate deploy

# 2. Seed roles and default admin user (ONLY for a brand-new database)
npx prisma db seed
```

> **Warning:** `npx prisma db seed` should only be run against a fresh database. Running it against an already-seeded database can create duplicate roles or fail on unique constraints. If you are unsure whether the DB has been seeded, check with the team or query the `Role` table first.

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
| `test-servicehub` | Local development | `servicehub_dev` |
| `production-servicehub` | Live production | `servicehub_prod` |

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
| `DATABASE_URL_STAGING` | Staging Azure SQL (`test-servicehub`) | ✓ Set |
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
| 3 | `DATABASE_URL` on staging set to `test-servicehub` (dev DB) | `database=test-servicehub` confirmed in staging app settings |
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
DATABASE_URL='sqlserver://houstonservice-test.database.windows.net:1433;database=production-servicehub;user=servicehub_prod;password=<ask_team>;encrypt=true;trustServerCertificate=false;connectionTimeout=30' npx prisma studio
```


**Cost:** ~$0.018/GB/month (Hot tier, LRS). Negligible for typical image usage.

---

## Final Verification Checklist (Agent-Run)

> **🤖 AI agent note — REQUIRED, do not skip:** After walking the developer through Steps 1–5, the agent **MUST** run this final verification pass before declaring setup complete. Go through every step in order, verify the actual state of the system (do not assume — run the commands and read the output), and tick each box only when the verification command succeeds. If any check fails, stop, surface the failure to the developer with the exact error, and remediate before moving on. Do **not** mark setup complete until every checkbox below is confirmed.

### ✅ Step 1 — Repository cloned

- [ ] `git rev-parse --is-inside-work-tree` succeeds (inside the `servicehub` repo)
- [ ] `git remote -v` shows `origin` → `github.com/andy741231/servicehub.git`
- [ ] Current working directory is the project root (contains `client/`, `server/`, `shared/`, `prisma/`)

### ✅ Step 1.5 — CLI tools installed (only those the user approved)

- [ ] `node -v` prints v20+ and `npm -v` prints v9+
- [ ] For each CLI the user approved, the verify command succeeds:
  - GitHub CLI: `gh --version` (and `gh auth status` is authenticated)
  - Azure CLI: `az --version` (and `az account show` returns a subscription)
  - Claude Code: `claude --version`
  - Codex CLI: `codex --version`
  - Google Antigravity: `agy --version`
- [ ] Any CLI the user denied is recorded as denied and skipped — not re-prompted

### ✅ Step 2 — Dependencies installed

- [ ] `node_modules/` exists at the project root
- [ ] `npm ls --depth=0 2>&1 | head` shows no `UNMET DEPENDENCY` errors for the workspace root
- [ ] `client/node_modules/`, `server/node_modules/`, and `shared/` resolve via npm workspaces

### ✅ Step 2.5 — UI/UX Pro Max skill installed

- [ ] `.devin/skills/ui-ux-pro-max/SKILL.md` exists
- [ ] (If the user approved Python) `python --version` or `python3 --version` prints 3.x
- [ ] (If Python installed) `uipro --design-system` (or the `.cmd` shim on Windows) runs without error

### ✅ Step 2.6 — MCP servers enabled (only those the user approved)

- [ ] The agent asked the user which of the 5 MCP servers to enable (multi-select) and recorded approvals/denials
- [ ] Any server the user denied is recorded as denied and skipped — not re-prompted
- [ ] The `mcpServers` block was written/merged into the **Devin config file** (`%APPDATA%\devin\config.json` on Windows, `~/.config/devin/config.json` on macOS/Linux, or `.devin/config.json` / `.devin/config.local.json`)
- [ ] The `mcpServers` block was **also** written/merged into the **Windsurf MCP config file** (`~/.codeium/windsurf/mcp_config.json` on all platforms) — required for UI panel & Marketplace visibility
- [ ] For each approved server (`filesystem`, `memory`, `sequential-thinking`, `puppeteer`, `playwright`), it appears in **both** config files' `mcpServers` object
- [ ] No denied server is present in either config file's `mcpServers` object
- [ ] Windsurf/Devin has been restarted so the servers are picked up
- [ ] After restart, the servers appear in Windsurf Settings → MCP Servers with active status

### ✅ Step 3 — Environment variables configured

- [ ] `.env` exists at the project root (and is **not** tracked by git — `git check-ignore .env` returns the path)
- [ ] `.env` contains `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, and `CLIENT_URL`
- [ ] `CLIENT_URL` is `http://localhost:3000`
- [ ] `DATABASE_URL` points at `test-servicehub` (dev DB), not the production DB
- [ ] If `.env` was already present and valid, the agent verified it and did **not** prompt the developer for secret values
- [ ] If `.env` was missing or malformed, the agent surfaced the specific problem and guided the developer to fix it (without generating or guessing secret values itself)

### ✅ Step 4 — Migrations applied (and seeded only if the DB was fresh)

- [ ] `npx prisma migrate status` reports no pending migrations
- [ ] If the database was brand-new and the user confirmed seeding: `Role` and `User` tables are populated (verify with `npx prisma studio` or a quick query)
- [ ] If the database was already set up: `npx prisma db seed` was **not** run

### ✅ Step 5 — Development server running

- [ ] `npm run dev` is running (both Vite frontend and Express backend started without fatal errors)
- [ ] `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000` returns `200`
- [ ] `curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/api/health` returns `200`
- [ ] The developer can load `http://localhost:3000` in a browser and reach the login page
- [ ] Login with `admin@servicehub.com` / `Admin@2024!` succeeds and lands on the Welcome page

### 🎯 Sign-off

- [ ] Every checkbox above is ticked. If any cannot be ticked, list the failure(s) and the remediation taken.
- [ ] Summarize for the developer: which CLIs were installed, which were denied, which MCP servers were enabled, and whether the DB was seeded.
- [ ] If any MCP servers were enabled, remind the developer to **restart Devin/Windsurf** so the new MCP config is picked up — MCP servers do not appear until the editor is restarted.
- [ ] Only after every box is ticked, announce that local setup is complete and the developer is ready to build.