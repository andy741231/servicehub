# End-to-end tests

Browser tests for the web editor, run with [Playwright](https://playwright.dev) against your **local**
dev stack.

## Run

```bash
npm run dev                         # client :3000 + server :4000 + database
npx playwright install chromium     # once
E2E_USERNAME=<your admin username> npm run e2e
```

(PowerShell: `$env:E2E_USERNAME="<username>"; npm run e2e`)

- `E2E_USERNAME` — a local account with admin/super_admin access. The tests mint a short-lived
  session for it using `JWT_SECRET` from `.env`, so this only works against a local/dev database.
- `E2E_BASE_URL` — defaults to `http://localhost:3000`.

## What they touch

Each run creates a temporary page (`e2e-editor-<timestamp>`, **unpublished and hidden from the
nav**), resets it to fixed content before every test, and deletes it afterwards. Real site pages are
never opened or saved. Saves are real, so persistence is checked through the API.

Failures keep a trace and screenshot in `e2e/test-results/` (`npx playwright show-trace <file>`).

These tests are not run in CI (they need the app, a database and an admin account).
