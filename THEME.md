# Service Hub — Design System

This file is the **single source of truth** for all visual design decisions.

**For AI assistants:** Read this file at the start of every session. Every UI component must use the semantic token names defined here — never raw Tailwind values like `bg-blue-600` or `text-gray-400`. To change the theme, update this file and regenerate `tailwind.config.js`.

**For advanced UI/UX guidance:** Invoke the `ui-ux-pro-max` skill for additional design intelligence, including accessibility best practices, interaction patterns, animation guidelines, and UX validation when building or reviewing UI components.

**Priority:** When there are conflicts between this file and UI/UX Pro Max guidelines, UI/UX Pro Max takes precedence for accessibility, touch targets, and usability standards.

---

## Design Personality

**Style:** Clean, professional B2B SaaS  
**Reference apps:** Linear, Vercel, Notion  
**Principles:**
- Spacious layouts — breathing room builds trust
- Neutral base with a single confident accent color
- Subtle borders and shadows — nothing garish
- Typography does the heavy lifting, not decoration

---

## Color Palette

**Theme:** Professional navy with an emerald/amber semantic set on a cool-slate
neutral canvas. Colors are stored as **HSL triplets** (`H S% L%`) in CSS
variables in `client/src/index.css` `:root`, then exposed as Tailwind tokens via
the `@theme` block and `tailwind.config.js`. The HSL values below are the source
of truth and must match `:root` exactly.

### Brand / Accent
| Token | HSL (`:root`) | Hex | Usage |
|-------|---------------|-----|-------|
| `primary` | `213 53% 25%` | `#1E3A5F` (navy) | Buttons, links, active states, focus rings |
| `primary-hover` | `213 53% 18%` | `#152A45` | Button hover |
| `primary-light` | `213 52% 94%` | `#E2EBF5` | Tinted backgrounds, pill badges |
| `primary-foreground` | `0 0% 100%` | `#FFFFFF` | Text/icons on primary backgrounds |

### Neutrals (base UI)
| Token | HSL (`:root`) | Hex | Usage |
|-------|---------------|-----|-------|
| `background` | `210 40% 98%` | `#F8FAFC` | Page / app background |
| `surface` | `0 0% 100%` | `#FFFFFF` | Cards, panels, modals |
| `surface-raised` | `214 32% 95%` | `#E9EEF5` | Hover rows, subtle insets, secondary buttons |
| `surface-tertiary` | `214 24% 90%` | `#D9E0EA` | QuickAction hover, nested insets |
| `border` | `215 20% 82%` | `#CBD5E1` | Card borders, dividers |
| `border-soft` | `215 24% 90%` | `#DDE4ED` | Subtle dividers inside cards, bento tile borders |
| `border-strong` | `215 16% 72%` | `#A4B1C2` | Input borders (default) |

### Text
| Token | HSL (`:root`) | Hex | Usage |
|-------|---------------|-----|-------|
| `text-base` | `222 47% 11%` | `#0F172A` | Body copy, headings (utility class `text-text-base`) |
| `text-muted` | `215 16% 45%` | `#475569` | Secondary labels, metadata (utility class `text-muted`) |
| `text-subtle` | `215 12% 60%` | `#64748B` | Placeholder text, disabled (utility class `text-text-subtle`) |
| `text-inverse` | `0 0% 100%` | `#FFFFFF` | Text on dark/colored backgrounds (`text-text-inverse`) |

### Semantic States
| Token | HSL (`:root`) | Hex | Usage |
|-------|---------------|-----|-------|
| `success` | `142 72% 37%` | `#16A34A` | Success messages, active badges |
| `success-light` | `138 76% 97%` | `#F0FDF4` | Success backgrounds |
| `warning` | `32 95% 44%` | `#D97706` | Warnings, pending states |
| `warning-light` | `48 100% 96%` | `#FFFBEB` | Warning backgrounds |
| `danger` | `0 72% 51%` | `#DC2626` | Errors, destructive actions |
| `danger-light` | `0 86% 97%` | `#FEF2F2` | Error backgrounds |
| `info` | `192 91% 37%` | `#0891B2` | Informational callouts |
| `info-light` | `183 100% 96%` | `#ECFEFF` | Info backgrounds |

### Chart / Data Visualization
Charts render to SVG where CSS `var()` does not resolve inside `stroke`/`fill`
presentation attributes. Read these tokens at runtime with the
`useChartColors()` hook (`client/src/components/charts/useChartColors.js`), which
resolves the CSS variables to concrete `hsl(...)` strings and re-reads on every
theme change so charts follow light/dark automatically. Never hardcode hex in
chart components.

| Token | HSL (`:root`) | Hex | Usage |
|-------|---------------|-----|-------|
| `chart-primary` | `213 53% 25%` | `#1E3A5F` | Primary series (navy) |
| `chart-success` | `142 72% 37%` | `#16A34A` | Positive series |
| `chart-warning` | `32 95% 44%` | `#D97706` | Caution series |
| `chart-danger` | `0 72% 51%` | `#DC2626` | Negative series |
| `chart-info` | `192 91% 37%` | `#0891B2` | Info series |
| `chart-muted` | `215 20% 65%` | `#94A3B8` | Neutral / "other" series |
| `chart-grid` | `214 32% 91%` | `#E2E8F0` | Cartesian grid lines |
| `chart-axis` | `215 20% 65%` | `#94A3B8` | Axis + tick lines |
| `chart-axis-tick` | `215 16% 45%` | `#475569` | Axis tick labels |

The `useChartColors()` hook also exposes `onPrimary` (`--primary-foreground`,
for sparklines on the primary hero card), `surface`, `border`, and `text` (for
custom Recharts tooltip styling), plus a `series` array in the canonical order
`[primary, success, warning, danger, info, muted]` for multi-series charts.

---

## Typography

**Font family:** System font stack — no external font dependency  
```
-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif
```

### Scale
| Token | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| `text-display` | 30px / 1.875rem | 700 | 1.2 | Page titles |
| `text-heading` | 20px / 1.25rem | 600 | 1.3 | Section headings, card titles |
| `text-subheading` | 16px / 1rem | 600 | 1.4 | Sub-section labels |
| `text-body` | 14px / 0.875rem | 400 | 1.5 | All body copy (default) |
| `text-small` | 12px / 0.75rem | 400 | 1.4 | Metadata, timestamps, captions |
| `text-label` | 12px / 0.75rem | 500 | 1 | Form labels, table headers |
| `text-code` | 13px / 0.8125rem | 400 | 1.5 | Code, IDs, monospace values |

---

## Spacing

Base unit: `8px`. All spacing uses multiples of 8.

| Token | Value | Usage |
|-------|-------|-------|
| `spacing-page` | `32px` (p-8) | Page outer padding |
| `spacing-section` | `24px` (p-6) | Between major sections |
| `spacing-card` | `24px` (p-6) | Card internal padding |
| `spacing-compact` | `16px` (p-4) | Tight areas, table cells |

---

## Borders & Radius

| Token | Value | Usage |
|-------|-------|-------|
| `rounded-sm` | `4px` | Badges, tags, small elements |
| `rounded-base` | `8px` | Inputs, buttons |
| `rounded-card` | `12px` | Cards, panels, modals |
| `rounded-lg` | `16px` | Large modals, drawers |
| `rounded-2xl` | `20px` | Bento tiles, hero cards |
| `rounded-full` | `9999px` | Avatars, pill buttons |

---

## Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `shadow-card` | `0 1px 2px rgba(30,58,95,0.05), 0 1px 3px rgba(30,58,95,0.04)` | Cards (subtle) |
| `shadow-card-sm` | `0 1px 2px rgba(30,58,95,0.04)` | Card hover, bento tiles |
| `shadow-dropdown` | `0 4px 6px -1px rgba(30,58,95,0.06), 0 2px 4px -1px rgba(30,58,95,0.03)` | Dropdowns, popovers |
| `shadow-modal` | `0 20px 25px -5px rgba(30,58,95,0.08), 0 10px 10px -5px rgba(30,58,95,0.03)` | Modals |

---

## Component Patterns

### Buttons

| Variant | Background | Text | Border | Use when |
|---------|-----------|------|--------|----------|
| `primary` | `primary` | `text-inverse` | none | Main CTA, one per screen |
| `secondary` | `surface` | `text-base` | `border` | Supporting actions |
| `ghost` | transparent | `text-base` | none | Tertiary, icon buttons |
| `danger` | `danger` | `text-inverse` | none | Destructive confirm |
| `danger-ghost` | transparent | `danger` | none | Destructive option in menu |

**Button sizes:**
- `sm`: `h-11 px-4 text-body` (minimum touch target)
- `md` (default): `h-12 px-5 text-body`
- `lg`: `h-14 px-6 text-subheading`

All buttons: `rounded-base font-medium transition-colors duration-150`

### Inputs / Form Fields

- Height: `h-11` (44px, minimum touch target)
- Border: `border border-strong rounded-base`
- Background: `surface`
- Focus ring: `outline-none ring-2 ring-primary ring-offset-1`
- Placeholder: `text-subtle`
- Label: `text-label text-muted mb-2` (above the input)
- Error state: `border-danger` + error message in `text-small text-danger` below

### Cards

```
bg-surface border border-border rounded-card shadow-card p-6
```

Card header (when present): `pb-4 mb-4 border-b border-border`

### Tables

- Container: `bg-surface border border-border rounded-card overflow-hidden`
- Header row: `bg-surface-raised text-label text-muted uppercase tracking-wide`
- Body rows: `border-t border-border hover:bg-surface-raised transition-colors`
- Cell padding: `px-4 py-4`

### Badges / Status Pills

```
inline-flex items-center px-2 py-0.5 rounded-sm text-small font-medium
```

| State | Classes |
|-------|---------|
| Active/Success | `bg-success-light text-success` |
| Warning/Pending | `bg-warning-light text-warning` |
| Error/Inactive | `bg-danger-light text-danger` |
| Neutral/Draft | `bg-surface-raised text-muted` |
| Info | `bg-primary-light text-primary` |

### Sidebar Navigation

- Width: `240px` fixed
- Background: `surface` with right `border-r border-border`
- Nav item: `flex items-center gap-3 px-3 py-2 rounded-base text-body text-muted hover:bg-surface-raised hover:text-base transition-colors`
- Active item: `bg-primary-light text-primary font-medium`
- Section label: `text-label text-subtle uppercase tracking-widest px-3 mb-1 mt-4`

### Page Layout

```
background min-h-screen
├── Sidebar (240px fixed left)
└── Main content area
    ├── Top bar (h-14, border-b border-border bg-surface)
    └── Page body (p-8)
        ├── Page header (mb-6)
        │   ├── Title: text-display
        │   └── Subtitle: text-muted text-body
        └── Content
```

### Tab Bar (TopBar)

Sub-app tabs in the TopBar. Uses `NavLink` with a bottom-border active state
and horizontal scroll on overflow.

```
<nav className="flex items-center gap-0 min-w-0 h-full overflow-x-auto scrollbar-none -mb-px">
  <NavLink
    className="flex items-center gap-1.5 px-3 h-full text-sm font-medium text-muted
               hover:text-text-base border-b-2 border-transparent transition-colors
               whitespace-nowrap [&.active]:text-primary [&.active]:border-primary"
  />
</nav>
```

- `.scrollbar-none` utility hides the scrollbar on the horizontal scroll container.
- Active state is detected via NavLink's `.active` class (Tailwind v4 arbitrary
  variant: `[&.active]:`).

### Icon Buttons

All icon-only buttons must meet the **44×44px minimum touch target**. Use
`min-w-[44px] min-h-[44px]` on the button element. The `.icon-btn-sm` utility
class (28×28) is for **non-interactive** decorative icons only.

```
<!-- Correct: 44px touch target -->
<button className="p-2 min-w-[44px] min-h-[44px] rounded-base text-subtle
                   hover:text-muted hover:bg-surface-raised transition-colors
                   focus:outline-none focus:ring-2 focus:ring-primary">
  <Icon className="h-4 w-4" />
</button>
```

### Batch Action Bar

Used in FormsList when one or more items are selected.

```
<div className="flex items-center justify-between p-3 rounded-xl
                bg-primary-light border border-primary/20">
  <span className="text-sm font-medium text-primary">{count} selected</span>
  <div className="flex items-center gap-2">
    <button className="btn-secondary text-sm">Export</button>
    <button className="btn-danger text-sm">Delete</button>
    <button className="text-muted hover:text-text-base text-sm">Clear</button>
  </div>
</div>
```

### Empty State

Used when a list, dashboard, or chart has no data. The `.empty-state` utility
class provides the centered layout.

```
<div className="empty-state">
  <Icon className="h-12 w-12 text-subtle mx-auto mb-3" />
  <h3 className="text-heading font-semibold text-text-base">No items yet</h3>
  <p className="text-body text-muted mt-1">Get started by creating your first item.</p>
  <button className="btn-primary mt-4">Create item</button>
</div>
```

For charts, use `ChartCard`'s `empty` prop:
```
<ChartCard title="Submissions over time" empty={data.length === 0} emptyMessage="No submissions yet">
  <SimpleAreaChart data={data} dataKeys={['count']} />
</ChartCard>
```

### Folder Sidebar

Used in FormsList list view for organizing forms into folders.

```
<aside className="w-56 flex-shrink-0 border-r border-border-soft p-3 overflow-y-auto">
  <div className="flex items-center justify-between mb-2">
    <span className="text-xs font-semibold uppercase tracking-wider text-subtle">Folders</span>
    <button className="p-1 text-subtle hover:text-primary hover:bg-primary-light rounded">
      <FolderPlus className="h-4 w-4" />
    </button>
  </div>
  <!-- Folder button (active) -->
  <button className="w-full flex items-center gap-2 px-3 py-2 rounded-base text-sm
                     bg-primary-light text-primary font-medium">
    <Folder className="h-4 w-4" />
    <span className="flex-1 text-left truncate">All Forms</span>
    <span className="text-xs text-subtle tabular-nums">{count}</span>
  </button>
  <!-- Folder button (inactive) -->
  <button className="w-full flex items-center gap-2 px-3 py-2 rounded-base text-sm
                     text-muted hover:bg-surface-raised hover:text-text-base">
    <Folder className="h-4 w-4" />
    <span className="flex-1 text-left truncate">Folder name</span>
    <span className="text-xs text-subtle tabular-nums">{count}</span>
  </button>
</aside>
```

- Inline rename/delete actions appear on hover via `opacity-0 group-hover:opacity-100`.
- Drag-drop targets use `onDragOver` / `onDrop` handlers with visual feedback
  (`bg-primary-light/30` when dragging over).

### Opacity Modifiers

Opacity modifiers on semantic tokens are **acceptable** for subtle visual states:

| Modifier | Use case |
|----------|----------|
| `bg-primary-light/30` | Drag-over highlight, subtle selection background |
| `bg-primary-light/50` | Hover highlight on dashed drop zones, code highlighting |
| `bg-primary-foreground/20` | Icon badge on hero stat cards |
| `bg-primary/20` | Subtle border tint on selected items |

These are preferred over creating dedicated tokens for each opacity level.

---

## Ready-made Utility Classes

These component classes are defined in `client/src/index.css` (`@layer utilities`).
Prefer them over re-implementing the same styles inline. All are token-based and
adapt to dark mode automatically.

**Typography:** `.text-display` · `.text-heading` · `.text-subheading` ·
`.text-body` · `.text-small` · `.text-label` · `.text-code`

**Containers & chrome:** `.card` · `.page-container` · `.page-title` ·
`.page-subtitle` · `.section-header` · `.section-title` · `.empty-state`

**Buttons:** `.btn-primary` · `.btn-secondary` · `.btn-ghost` · `.btn-danger`
(all include hover/active/disabled states)

**Form controls:** `.input-field` · `.textarea-field` · `.field-label` ·
`.field-hint`

**Badges / pills:** `.badge` plus `.badge-success` · `.badge-warning` ·
`.badge-danger` · `.badge-info` · `.badge-neutral` · `.badge-primary`

**Icon buttons:** `.icon-btn-sm` (28×28 hover-reveal action button)

**Elevation:** `.elevation-0` (flat) · `.elevation-1` (raised) ·
`.elevation-2` (elevated/hover) · `.elevation-3` (floating: modals, dropdowns)

**Loading:** `.skeleton` · `.skeleton-line` (shimmer via `@keyframes shimmer`)

**Surfaces & motion:** `.canvas-grid` (dotted spatial grid) ·
`.sidebar-transition` · `.scrollbar-none` (hide scrollbar) · `.animate-page-in`

**Safe areas (notched phones):** `.safe-top` · `.safe-bottom` · `.safe-left` ·
`.safe-right`

---

## Dashboard Patterns

All five sub-app dashboards (Web, Forms, Email, Directory, Portal) share one
layout language. Section order: **(1) bento stats grid → (2) CTA bar → (3) charts
row**. Dashboards omit an `h1` page title (the sidebar/topbar already identifies
the app).

- **Dashboard wrapper:** `bg-background min-h-screen` > `max-w-7xl mx-auto p-6 lg:p-8`.
- **Bento stats grid:** `grid grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-fr`;
  tiles are `min-h-[132px] rounded-2xl p-5 bg-surface border border-border-soft shadow-card-sm`.
- **Hero stat card:** first tile, `col-span-2 … rounded-2xl p-5 text-primary-foreground bg-primary relative overflow-hidden shadow-card flex flex-col`
  with an absolute icon badge (`bg-primary-foreground/20`) top-right, a big
  number, a `Sparkline` (color = `useChartColors().onPrimary`), and a trend footer.
- **Stat tile with sparkline:** icon badge top-right (semantic `bg-*-light text-*`),
  big number, `Sparkline` in a `flex-1` area, footer text. Sparkline color matches
  the tile's semantic token (`useChartColors().success` / `.warning` / `.info` / …).
- **QuickAction card:** `flex flex-col gap-2 p-3.5 rounded-xl bg-surface-raised hover:bg-surface-tertiary`
  with a colored icon badge and label/description stack.
- **ChartCard:** titled `.card` wrapper (title + subtitle) around a Recharts
  visualization; used for the charts row.
- **Dashboard skeleton:** mirrors the bento grid with the same grid/`col-span`
  classes, using `.skeleton` blocks and `Skeleton variant="line"` placeholders.
- **CTA bar:** `flex items-center justify-between p-4 rounded-xl bg-surface border border-border-soft`
  with title/subtitle on the left and a `.btn-primary`-style action on the right.

All chart colors come from the `useChartColors()` hook — never hardcode hex.

---

## Dark Mode

Dark mode is **implemented** and class-based (Tailwind v4). It is an **internal
(admin) preference** — the public-facing site (`/`, `/form/:slug`, `/:slug`)
always renders light regardless of the user's toggle.

**How it works**
- `client/src/index.css` declares the variant: `@custom-variant dark (&:where(.dark, .dark *));`
  (the v3 `darkMode: 'class'` config does **not** apply in v4).
- A `.dark { … }` block in `index.css` redefines every `--*` CSS variable with
  dark values, so all token-based components adapt automatically — no per-component
  changes required.
- `client/src/store/themeStore.js` (Zustand, same pattern as `authStore.js`)
  holds `theme: 'light' | 'dark'`, with `setTheme`, `toggleTheme`, `initTheme`,
  `applyUserTheme`, and `syncThemeForPath`. It reads `localStorage.getItem('theme')`,
  falling back to `prefers-color-scheme`, and toggles `.dark` / `.light` on `<html>`.
  It follows OS changes only until the user makes an explicit choice, and syncs
  across tabs.
- **Public-site scoping** — `applyTheme` takes the current path into account:
  public routes force `light`, admin routes (`/hub-admin/*`, `/login`) respect
  the user's preference. A `ThemeRouteSync` component in `App.jsx` re-applies
  the theme on every SPA route change so client-side nav between public and
  admin switches correctly without a page reload.
- **Per-user preference (DB-backed)** — The theme is persisted to the user's
  account, not just `localStorage`. The `User` model has a `preferences` JSON
  column (`@db.NVarChar(Max)`). `setTheme` fire-and-forgets a
  `PUT /auth/preferences { theme }` to persist; after `checkAuth`/`login`
  resolve, `applyUserTheme(user.preferences)` applies the saved theme so it
  follows the user across devices/browsers. The `preferences` column is
  future-proof — other per-user settings can be added without a migration.
- An inline script in `client/index.html` applies the stored/OS theme **before
  first paint** to avoid a flash of the wrong theme (FOUC). It checks
  `window.location.pathname` and only applies `.dark` on admin routes.
- The topbar toggle (Sun/Moon) lives in `client/src/components/TopBar.jsx`
  (`min-w-[44px] min-h-[44px]` touch target) and calls `toggleTheme`.

**Dark palette** (`.dark` block in `index.css`, HSL `H S% L%`)

| Token | Dark HSL | Notes |
|-------|----------|-------|
| `primary` | `213 53% 65%` | Lifted navy so it reads on dark surfaces |
| `primary-hover` | `213 53% 72%` | |
| `primary-light` | `213 52% 20%` | Dark navy tint for pill/badge backgrounds |
| `primary-foreground` | `222 47% 11%` | Dark text on the light-navy accent |
| `background` | `222 47% 7%` | Near-black slate canvas |
| `surface` | `222 40% 11%` | Cards, panels, modals |
| `surface-raised` | `217 33% 17%` | Hover rows, subtle insets |
| `surface-tertiary` | `215 25% 22%` | Nested insets, quick-action hover |
| `border` | `215 25% 22%` | |
| `border-soft` | `215 20% 18%` | |
| `border-strong` | `215 25% 30%` | |
| `text-base` | `210 20% 92%` | |
| `text-muted` | `215 16% 65%` | |
| `text-subtle` | `215 12% 55%` | |
| `text-inverse` | `222 47% 11%` | |
| `success` / `success-light` | `142 60% 52%` / `142 50% 14%` | State hue kept, lightness raised; `-light` becomes a dark tint |
| `warning` / `warning-light` | `32 90% 58%` / `32 60% 15%` | |
| `danger` / `danger-light` | `0 72% 62%` / `0 50% 16%` | |
| `info` / `info-light` | `192 80% 52%` / `192 60% 14%` | |
| `chart-primary` | `213 60% 68%` | |
| `chart-success` | `142 60% 52%` | |
| `chart-warning` | `32 90% 58%` | |
| `chart-danger` | `0 72% 62%` | |
| `chart-info` | `192 80% 52%` | |
| `chart-muted` | `215 15% 45%` | |
| `chart-grid` | `215 25% 22%` | |
| `chart-axis` | `215 20% 35%` | |
| `chart-axis-tick` | `215 16% 65%` | |

Shadows in dark mode use a darker base color with higher alpha for depth.

---

## Changing the Theme

To change colors, fonts, spacing, or any token:

1. Edit the relevant section in this file (`THEME.md`)
2. Tell the AI: *"Update the theme per THEME.md"*
3. The AI updates `tailwind.config.js` and `client/src/styles/globals.css`
4. All components update automatically because they use token names, not raw values

> **Rule:** Never use raw Tailwind color classes (`blue-600`, `gray-200`, etc.) in components. Always use the semantic token names defined here.

---

## Theme Tasks & Known Gaps

### Completed

- [x] **Dark mode** — Implemented. `@custom-variant dark` + `.dark` HSL variable block in `index.css`. `themeStore.js` manages state, `index.html` has no-FOUC script, TopBar has toggle.
- [x] **Chart color tokens** — `chart-primary`, `chart-success`, `chart-warning`, `chart-danger`, `chart-info`, `chart-muted`, `chart-grid`, `chart-axis`, `chart-axis-tick` defined in `index.css` and `tailwind.config.js`. `useChartColors` hook provides theme-aware colors.
- [x] **Sparkline color consistency** — All dashboards use `useChartColors` hook. Hero sparkline = `primary-foreground`, stat tiles = semantic color.
- [x] **Raw color class migration** — All raw Tailwind color classes (`bg-red-100`, `text-gray-500`, etc.) replaced with semantic tokens across all files except `OldWebBuilder.jsx` (deprecated). `text-white` → `text-primary-foreground` on all colored backgrounds (except `ColorPicker.jsx` mix-blend-difference and `Assets.jsx` image overlays, which are intentional).
- [x] **Modal/Dialog** — `Dialog.jsx` is now a shared component with token-based styling.
- [x] **Dashboard patterns** — Bento stats grid, hero stat card, stat tile with sparkline, QuickAction card, ChartCard, dashboard skeleton loading, and CTA bar are all implemented and documented in the Dashboard Patterns section above.
- [x] **Hex cleanup (theme tokens)** — `FormAnalytics.jsx` SVG grid/point strokes now use `var(--chart-grid)` / `var(--surface)`. `FormRenderer.jsx` star rating fallback uses `var(--text-subtle)`.
- [x] **`badge-*` classes** — `.badge-success`, `.badge-warning`, `.badge-danger`, `.badge-info`, `.badge-neutral` defined in `index.css` (`@layer utilities`). Documented in Badges / Status Pills section and Ready-made Utility Classes section.
- [x] **`scrollbar-none`** — Utility class defined in `index.css` (`@layer utilities`). Documented in Ready-made Utility Classes section and Tab Bar pattern.
- [x] **Text token naming** — Standardized: `text-text-base` (kept — `text-base` conflicts with Tailwind's font-size utility), `text-subtle` (short form, alias of `--color-subtle`), `text-inverse` (short form, alias of `--color-inverse`), `text-muted` (already short). All `text-text-subtle` → `text-subtle` and `text-text-inverse` → `text-inverse` migrations complete.
- [x] **`bg-muted`** — Works correctly. `--color-muted` is defined in `index.css` as `hsl(var(--text-muted))`, so `bg-muted` produces a medium-gray background that adapts to dark mode. Used in FormsList for "closed" status dots and InlineEditor for unpublished indicator.
- [x] **Opacity variants** — `bg-primary-light/30`, `bg-primary-light/50`, `bg-primary-foreground/20`, `bg-primary/20` documented as acceptable opacity modifiers. See Opacity Modifiers section in Component Patterns.
- [x] **Touch target standardization** — All interactive elements now use `min-w-[44px] min-h-[44px]`. All `min-h-[32px]`, `min-h-[36px]`, `min-h-[40px]`, `min-w-[32px]`, `min-w-[36px]`, `min-w-[40px]` replaced with 44px across all files except OldWebBuilder.
- [x] **Icon button pattern** — Documented in Icon Buttons section. 44×44px minimum for interactive buttons; `.icon-btn-sm` (28×28) for decorative icons only.
- [x] **Batch action bar** — Documented in Batch Action Bar section.
- [x] **Empty state** — `.empty-state` utility class documented in Ready-made Utility Classes. Pattern documented in Empty State section (including ChartCard `empty` prop for charts).
- [x] **Folder sidebar** — Documented in Folder Sidebar section.
- [x] **Tab bar (TopBar)** — Documented in Tab Bar section.
- [x] **Recharts tooltip styling** — Custom `ChartTooltip.jsx` component created. Uses semantic tokens (surface, border, text, shadow-dropdown). All 4 chart components (SimpleAreaChart, SimpleBarChart, SimpleLineChart, SimplePieChart) updated to use it.
- [x] **Chart axis & grid colors** — All chart components use `useChartColors()` for axis (`c.axis`), tick labels (`c.axisTick`), and grid lines (`c.grid`). These resolve from `--chart-axis`, `--chart-axis-tick`, `--chart-grid` CSS variables and adapt to dark mode.
- [x] **Empty chart state** — `ChartCard` now supports `empty` and `emptyMessage` props. When `empty={true}`, renders a centered "No data yet" message with a chart icon instead of children.
- [x] **Removed page headers** — Documented in Dashboard Patterns section: "Dashboards omit an `h1` page title (the sidebar/topbar already identifies the app)."
- [x] **Standard dashboard wrapper** — Documented in Dashboard Patterns section: `bg-background min-h-screen` > `max-w-7xl mx-auto p-6 lg:p-8`.
- [x] **Dashboard section order** — Documented in Dashboard Patterns section: "(1) bento stats grid → (2) CTA bar → (3) charts row."

### Intentional hex / raw color exceptions (user-content, not theme tokens)

These hex values and raw colors are **intentionally kept** because they represent user-facing content, not UI chrome:

- **`ColorPicker.jsx`** — Hex preset palette and `text-white mix-blend-difference` are the component's core functionality.
- **`PropertiesPanel.jsx`** lines 30–55 — Form theme presets (primaryColor, buttonColor, backgroundColor, textColor, buttonTextColor). Users select these as their form's visual identity.
- **`formStore.js`** lines 38–42 — Default form theme colors (user-facing form styling).
- **`InlineEditor.jsx`** — Web builder color input defaults (`#ffffff`, `#000000`, `#e5e7eb`) for block/section backgrounds, text colors, and border colors. These are user content — the web builder lets users pick custom colors.
- **`DraftTemplates.jsx`** — Default template colors (bgColor, textColor, accentColor) for website draft templates.
- **`Styles.jsx`** — Default website style tokens (primary, secondary, accent, background, text, muted) for the user's website.
- **`FormTemplates.jsx`** — Decorative gradient classes (`from-blue-500 to-indigo-500`, etc.) for template preview cards. Each template has a unique visual identity.
- **`Assets.jsx`** — `text-white` on image overlay buttons and filenames. Always white regardless of theme (images are typically dark).
- **`FormAnalytics.jsx`** line 143, **`FormRenderer.jsx`** line 241 — `form?.theme?.primaryColor` fallback `#2563eb` is user content (the form's chosen primary color).

### Still open

All previously tracked items are now resolved. The theme system is complete.
