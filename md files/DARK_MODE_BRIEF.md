# Dark Mode + Theme Sync — COMPLETE

> **Status: ALL WORK COMPLETE.** Build passes. All Known Gaps resolved.
> This file is kept as a reference of what was done across 4 sessions.

## Goal

1. Implement dark mode (class-based, Tailwind v4) across all sub-apps.
2. Eliminate raw Tailwind color classes and hardcoded hex values in favor of semantic design tokens.
3. Rewrite `THEME.md` so the documentation matches the actual implementation.

## Stack notes

- **Tailwind CSS v4** — class-based dark mode requires `@custom-variant dark (&:where(.dark, .dark *));` in `index.css`.
- Theme tokens are HSL CSS variables in `index.css` (light block + `.dark` override block).
- State management: Zustand (`themeStore.js`).

---

## Everything Done

### Session 1 (Opus) — Foundation
- `client/src/index.css` — `@custom-variant dark`, `.dark` HSL variable block, chart color tokens
- `client/tailwind.config.js` — chart color groups
- `client/src/store/themeStore.js` — Zustand store (theme state, toggleTheme, initTheme)
- `client/src/main.jsx` — theme init on boot
- `client/index.html` — no-FOUC inline script
- `client/src/components/TopBar.jsx` — theme toggle button
- `client/src/components/charts/useChartColors.js` — theme-aware chart color hook
- All 5 chart components refactored to semantic tokens
- `client/src/utils/charts.js` — `chartColors` uses semantic tokens
- All 5 dashboards' Sparkline/chart hex props → `useChartColors`
- `client/src/components/Dialog.jsx` — raw colors fixed
- `THEME.md` — color palette, tokens, component patterns, dashboard patterns, dark palette sections rewritten

### Session 2 — Raw Color + Hex Migration
- **14 files** raw color class cleanup: Toast, LoggedOutBanner, Register (modernized), Users (21 replacements), FormTemplates, Submissions, FieldPalette, VersionHistoryPanel, FormCanvas, AccessSchedulePanel, NewsletterBuilder, FormRenderer (58 replacements), PropertiesPanel
- **8 files** `text-white` → `text-primary-foreground` (FormsList, FormsBuilder, Pages, InlineEditor, DraftTemplates, Styles, directory/index, FormAnalytics)
- **InlineEditor.jsx** gradient colors → primary tokens
- **FormAnalytics.jsx** SVG hex → CSS variables (`var(--chart-grid)`, `var(--surface)`, `fill-muted`)
- **FormRenderer.jsx** star rating fallback → `var(--text-subtle)`
- **THEME.md** Known Gaps section cleaned up

### Session 3 — Polish & Documentation
- **Text token standardization** — `text-text-subtle` → `text-subtle` (100 replacements), `text-text-inverse` → `text-inverse` (12 replacements) across 15 files. `text-text-base` kept (conflicts with Tailwind font-size `text-base`).
- **Touch target standardization** — All `min-h/w-[32px]`, `[36px]`, `[40px]` → `[44px]` across 18 files (89 replacements). Zero sub-44px interactive elements remain.
- **ChartTooltip.jsx** — New custom Recharts tooltip component with semantic tokens (surface, border, text, shadow-dropdown). All 4 chart components updated to use it. (Import lines were missing initially — fixed in Session 4.)
- **ChartCard.jsx** — Added `empty` and `emptyMessage` props for "No data yet" pattern.
- **THEME.md** — Added 6 new component pattern sections: Tab Bar, Icon Buttons, Batch Action Bar, Empty State, Folder Sidebar, Opacity Modifiers. Updated Known Gaps: all 17 items marked completed.

### Session 4 — Scoping & Per-User Preference
- **ChartTooltip import fix** — The 4 chart components (`SimpleAreaChart`, `SimpleBarChart`, `SimpleLineChart`, `SimplePieChart`) were using `<ChartTooltip />` in JSX but never imported it. Added `import ChartTooltip from './ChartTooltip';` to all 4 files. Resolved the `ReferenceError: ChartTooltip is not defined` runtime error.
- **Public site light-mode scoping** — Dark mode is an internal (admin) preference only. Public routes (`/`, `/form/:slug`, `/:slug`) always render light regardless of the user's toggle.
  - `client/index.html` — no-FOUC script checks `window.location.pathname`; only applies `.dark` when path starts with `/hub-admin` or is `/login`.
  - `client/src/store/themeStore.js` — `applyTheme` takes the current path into account; public routes force `light`. New `syncThemeForPath(path)` action.
  - `client/src/App.jsx` — new `ThemeRouteSync` component inside the router re-applies the theme on every SPA route change (so client-side nav between public and admin switches correctly without a page reload).
- **Per-user theme preference (DB-backed)** — Preference is now stored in the user's account, not just `localStorage`. Follows the user across devices/browsers.
  - `prisma/schema.prisma` — Added `preferences String? @db.NVarChar(Max)` (JSON) to `User` model. Migration applied via `prisma db push` (Azure SQL doesn't support shadow databases). Tracking SQL at `prisma/migrations/20260707_add_user_preferences/migration.sql`.
  - `server/src/controllers/auth.js` — `login` and `me` now return `preferences` (parsed from JSON). New `updatePreferences` controller merges partial updates.
  - `server/src/routes/auth.js` — Added `PUT /auth/preferences` (authenticated).
  - `client/src/store/themeStore.js` — `setTheme` now fire-and-forgets a `PUT /auth/preferences` to persist to the user's account (silently no-ops if not authenticated). New `applyUserTheme(preferences)` action applies a theme from DB-stored preferences.
  - `client/src/store/authStore.js` — After `checkAuth` and `login` resolve, calls `applyUserTheme(user.preferences)` so the user's saved theme overrides the localStorage/OS default.
  - The `preferences` JSON column is future-proof — other per-user settings (sidebar collapsed, density, etc.) can be added without another migration.

---

## Verification Results (all pass)

| Check | Result |
|---|---|
| Raw color classes (excl OldWebBuilder) | 6 (FormTemplates decorative gradients — intentional) |
| `text-white` (excl OldWebBuilder, ColorPicker, Assets) | 0 |
| `text-text-subtle` / `text-text-inverse` | 0 |
| Touch targets under 44px | 0 |
| Theme-token hex (excl user-content files) | 0 |
| `npm run build` | PASS (2.88s) |

---

## Intentional exceptions (user-content, NOT theme tokens)

| File | What | Why |
|---|---|---|
| `ColorPicker.jsx` | Hex preset palette, `text-white mix-blend-difference` | Core component functionality |
| `PropertiesPanel.jsx` L30–55 | Form theme presets | User's form visual identity |
| `formStore.js` L38–42 | Default form theme colors | User-facing form styling |
| `InlineEditor.jsx` | Color input defaults (`#ffffff`, `#000000`, `#e5e7eb`) | Web builder user content |
| `DraftTemplates.jsx` | Template colors | Website draft template defaults |
| `Styles.jsx` | Website style tokens | User's website configuration |
| `FormTemplates.jsx` | Decorative gradients (`from-blue-500 to-indigo-500`, etc.) | Template visual identity |
| `Assets.jsx` | `text-white` on image overlays | Always white on images |
| `FormAnalytics.jsx` L143 | `form?.theme?.primaryColor \|\| '#2563eb'` | User's form color fallback |
| `FormRenderer.jsx` L241 | `theme?.primaryColor` (star color) | User's form color |
| `OldWebBuilder.jsx` | All raw colors (155 matches) | Deprecated — being replaced by InlineEditor |

---

## Files touched (all 3 sessions combined)

**Session 1:** `THEME.md`, `client/index.html`, `client/src/index.css`, `client/tailwind.config.js`, `client/src/main.jsx`, `client/src/store/themeStore.js` (new), `client/src/components/Dialog.jsx`, `client/src/components/TopBar.jsx`, `client/src/components/charts/*` (5 components + index.js + useChartColors.js), `client/src/utils/charts.js`, all 5 dashboard pages

**Session 2:** `Toast.jsx`, `LoggedOutBanner.jsx`, `Register.jsx`, `Users.jsx`, `FormTemplates.jsx`, `Submissions.jsx`, `FieldPalette.jsx`, `VersionHistoryPanel.jsx`, `FormCanvas.jsx`, `AccessSchedulePanel.jsx`, `NewsletterBuilder.jsx`, `FormRenderer.jsx`, `PropertiesPanel.jsx`, `FormAnalytics.jsx`, `FormsList.jsx`, `FormsBuilder.jsx`, `Pages.jsx`, `InlineEditor.jsx`, `DraftTemplates.jsx`, `Styles.jsx`, `directory/index.jsx`, `THEME.md`

**Session 3:** `Dialog.jsx`, `Toast.jsx`, `TopBar.jsx`, `Breadcrumbs.jsx`, `App.jsx`, `FormRenderer.jsx`, `FormCanvas.jsx`, `FormsList.jsx`, `Login.jsx`, `Register.jsx`, `Users.jsx`, `FormView.jsx`, `Home.jsx`, `MailingLists.jsx`, `CampaignComposer.jsx`, `PortalDashboard.jsx`, `Submissions.jsx`, `FormAnalytics.jsx`, `FormsDashboard.jsx`, `PropertiesPanel.jsx`, `AccessSchedulePanel.jsx`, `FormsBuilder.jsx`, `WebDashboard.jsx`, `InlineEditor.jsx`, `WebShell.jsx`, `DirectoryDashboard.jsx`, `NewsletterBuilder.jsx`, `EmailDashboard.jsx`, `Pagination.jsx`, `ChartTooltip.jsx` (new), `ChartCard.jsx` (updated), `SimpleAreaChart.jsx`, `SimpleBarChart.jsx`, `SimpleLineChart.jsx`, `SimplePieChart.jsx`, `charts/index.js`, `THEME.md`

**Session 4:** `SimpleAreaChart.jsx`, `SimpleBarChart.jsx`, `SimpleLineChart.jsx`, `SimplePieChart.jsx` (ChartTooltip import fix), `client/index.html` (public-site scoping in no-FOUC script), `client/src/store/themeStore.js` (isAdminPath, syncThemeForPath, applyUserTheme, persistThemeToServer), `client/src/App.jsx` (ThemeRouteSync component), `prisma/schema.prisma` (preferences column), `prisma/migrations/20260707_add_user_preferences/migration.sql` (new), `server/src/controllers/auth.js` (preferences in login/me + updatePreferences controller), `server/src/routes/auth.js` (PUT /preferences route), `client/src/store/authStore.js` (applyUserTheme after checkAuth/login)
