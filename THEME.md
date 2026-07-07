# Service Hub — Design System

This file is the **single source of truth** for all visual design decisions.

**For AI assistants:** Read this file at the start of every session. Every UI component must use the semantic token names defined here — never raw Tailwind values like `bg-blue-600` or `text-gray-400`. To change the theme, update this file and regenerate `tailwind.config.js`.

**For advanced UI/UX guidance:** Invoke the `ui-ux-pro-max` skill for additional design intelligence, including accessibility best practices, interaction patterns, animation guidelines, and UX validation when building or reviewing UI components.

**Priority:** When there are conflicts between this file and UI/UX Pro Max guidelines, UI/UX Pro Max takes precedence for accessibility, touch targets, and usability standards.

---

## Design Personality

**Style:** Modern Teal (light) + Dark Violet (dark) — friendly, airy SaaS by
day; sleek, focused enterprise admin by night.  
**Reference apps:** Linear, Vercel, Notion  
**Inspiration:** `.sample/pushpay/site-2-modern-teal` (light) and
`.sample/pushpay/site-3-dark` (dark).  
**Principles:**
- Spacious layouts — breathing room builds trust
- **Light mode:** teal-tinted surfaces, pill-shaped/rounder corners (16px cards),
  generous whitespace, a single confident teal accent with amber highlights
- **Dark mode:** deep near-black layered surfaces, violet primary with a soft
  glow, cyan secondary accent, heavier shadows for depth
- Subtle borders and shadows — nothing garish
- Typography does the heavy lifting, not decoration

---

## Color Palette

**Light theme:** Modern Teal — teal-600 primary, amber-500 accent, emerald/amber/
rose semantic set on a faint teal-tinted off-white canvas with teal-tinted
surfaces.  
**Dark theme:** Dark Violet — violet primary with a soft glow, cyan accent,
emerald/amber/rose semantic set on deep near-black layered surfaces.

Colors are stored as **HSL triplets** (`H S% L%`) in CSS variables in
`client/src/index.css` `:root` (light) and `.dark` (dark), then exposed as
Tailwind tokens via the `@theme` block and `tailwind.config.js`. The HSL values
below are the source of truth and must match `:root` / `.dark` exactly.

### Brand / Accent
| Token | HSL (`:root`) | Hex | Usage |
|-------|---------------|-----|-------|
| `primary` | `175 84% 32%` | `#0D9488` (teal-600) | Buttons, links, active states, focus rings |
| `primary-hover` | `175 77% 26%` | `#0F766E` (teal-700) | Button hover |
| `primary-light` | `166 76% 97%` | `#F0FDFA` (teal-50) | Tinted backgrounds, pill badges |
| `primary-foreground` | `0 0% 100%` | `#FFFFFF` | Text/icons on primary backgrounds |

### Neutrals (base UI)
| Token | HSL (`:root`) | Hex | Usage |
|-------|---------------|-----|-------|
| `background` | `160 43% 99%` | `#FAFDFC` | Page / app background (faint teal-tinted off-white) |
| `surface` | `0 0% 100%` | `#FFFFFF` | Cards, panels, modals |
| `surface-raised` | `166 76% 97%` | `#F0FDFA` (teal-50) | Hover rows, subtle insets, table headers, secondary buttons |
| `surface-tertiary` | `167 85% 89%` | `#CCFBF1` (teal-100) | QuickAction hover, nested insets |
| `border` | `214 32% 91%` | `#E2E8F0` (slate-200) | Card borders, dividers |
| `border-soft` | `160 82% 98%` | `#F5FEFB` | Subtle dividers inside cards, bento tile borders |
| `border-strong` | `213 27% 84%` | `#CBD5E1` (slate-300) | Input borders (default) |

### Text
| Token | HSL (`:root`) | Hex | Usage |
|-------|---------------|-----|-------|
| `text-base` | `176 21% 14%` | `#1C2B2A` | Body copy, headings — dark teal-slate (utility class `text-text-base`) |
| `text-muted` | `215 16% 47%` | `#64748B` (slate-500) | Secondary labels, metadata (utility class `text-muted`) |
| `text-subtle` | `215 20% 65%` | `#94A3B8` (slate-400) | Placeholder text, disabled (utility class `text-subtle`) |
| `text-inverse` | `0 0% 100%` | `#FFFFFF` | Text on dark/colored backgrounds (`text-inverse`) |

### Semantic States
| Token | HSL (`:root`) | Hex | Usage |
|-------|---------------|-----|-------|
| `success` | `161 94% 30%` | `#059669` (emerald-600) | Success messages, active badges |
| `success-light` | `138 76% 97%` | `#F0FDF4` (emerald-50) | Success backgrounds |
| `warning` | `32 95% 44%` | `#D97706` (amber-600) | Warnings, pending states |
| `warning-light` | `48 100% 96%` | `#FFFBEB` (amber-50) | Warning backgrounds |
| `danger` | `347 77% 50%` | `#E11D48` (rose-600) | Errors, destructive actions |
| `danger-light` | `356 100% 97%` | `#FFF1F2` (rose-50) | Error backgrounds |
| `info` | `192 91% 36%` | `#0891B2` (cyan-600) | Informational callouts |
| `info-light` | `183 100% 96%` | `#ECFEFF` (cyan-50) | Info backgrounds |

### Chart / Data Visualization
Charts render to SVG where CSS `var()` does not resolve inside `stroke`/`fill`
presentation attributes. Read these tokens at runtime with the
`useChartColors()` hook (`client/src/components/charts/useChartColors.js`), which
resolves the CSS variables to concrete `hsl(...)` strings and re-reads on every
theme change so charts follow light/dark automatically. Never hardcode hex in
chart components.

| Token | HSL (`:root`) | Hex | Usage |
|-------|---------------|-----|-------|
| `chart-primary` | `175 84% 32%` | `#0D9488` | Primary series (teal) |
| `chart-success` | `161 94% 30%` | `#059669` | Positive series |
| `chart-warning` | `32 95% 44%` | `#D97706` | Caution series |
| `chart-danger` | `347 77% 50%` | `#E11D48` | Negative series |
| `chart-info` | `192 91% 36%` | `#0891B2` | Info series |
| `chart-muted` | `215 20% 65%` | `#94A3B8` | Neutral / "other" series |
| `chart-grid` | `214 32% 91%` | `#E2E8F0` | Cartesian grid lines |
| `chart-axis` | `215 20% 65%` | `#94A3B8` | Axis + tick lines |
| `chart-axis-tick` | `215 16% 47%` | `#64748B` | Axis tick labels |

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

Light mode uses rounder, friendlier corners (site-2 Modern Teal); dark mode uses
sleeker corners (site-3 Dark Violet). Radius values are redefined per theme in
`index.css` (`:root` for light, `.dark` for dark).

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `rounded-sm` | `6px` | `4px` | Badges, tags, small elements |
| `rounded-base` | `10px` | `8px` | Inputs, buttons |
| `rounded-card` | `16px` | `12px` | Cards, panels, modals |
| `rounded-lg` | `20px` | `16px` | Large modals, drawers |
| `rounded-2xl` | `24px` | `20px` | Bento tiles, hero cards |
| `rounded-full` | `9999px` | `9999px` | Avatars, pill buttons |

---

## Shadows

Light-mode shadows are teal-tinged and soft (site-2); dark-mode shadows are
heavier/darker to create depth on dark surfaces (site-3).

| Token | Light value | Dark value | Usage |
|-------|-------------|------------|-------|
| `shadow-card` | `0 1px 3px rgba(13,148,136,0.08), 0 4px 12px rgba(15,23,42,0.05)` | `0 1px 2px rgba(0,0,0,0.40), 0 4px 16px rgba(0,0,0,0.30)` | Cards |
| `shadow-card-sm` | `0 1px 2px rgba(13,148,136,0.06)` | `0 1px 2px rgba(0,0,0,0.35)` | Card hover, bento tiles |
| `shadow-dropdown` | `0 4px 6px -1px rgba(13,148,136,0.08), 0 2px 4px -1px rgba(15,23,42,0.04)` | `0 4px 6px -1px rgba(0,0,0,0.45), 0 2px 4px -1px rgba(0,0,0,0.35)` | Dropdowns, popovers |
| `shadow-modal` | `0 20px 25px -5px rgba(13,148,136,0.10), 0 10px 10px -5px rgba(15,23,42,0.04)` | `0 20px 25px -5px rgba(0,0,0,0.55), 0 10px 10px -5px rgba(0,0,0,0.40)` | Modals |

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

### Sidebar Navigation (Conditional)

The sidebar renders differently based on how many sub-apps the user can access:

- **Single app** → **Accordion sidebar** (`AccordionSidebar`): the one app is a
  parent row with a `ChevronDown` that rotates 180° when expanded. Clicking
  toggles expand/collapse inline (children render indented below, no level
  navigation). Auto-expanded if the current route belongs to that app.
- **Multiple apps** → **Drill-down sidebar** (`DrilldownSidebar`): clicking a
  sub-app parent navigates *into* that level — the app list is replaced by the
  app's section children, and a Back button appears to return to the parent
  level. Stack-based navigation (like iOS Settings), not an accordion. The
  active app auto-drills on route change.

Both variants share:
- Width: `240px` fixed
- Background: `surface` with right `border-r border-border`
- Apps and children defined in the `APPS` registry in `AppShell.jsx`
- Brand row (`h-14`, `border-b border-border`): "Service Hub" link + mobile
  close button
- "Users & Roles" admin link (super_admin only) below a divider

**Drill-down specific:**
- Context bar (`border-b border-border-soft`): at root shows an "Applications"
  label; when drilled in shows a Back button (`ArrowLeft` + "Back") and the
  current app label as a title.
- Parent row: `flex items-center gap-3 px-3 min-h-[44px] text-body font-medium
  rounded-base` button — click drills in. Trailing `ChevronRight` icon.
  Active parent: `text-primary font-semibold`.
- Child row: `NavLink` with active state `bg-primary-light text-primary
  font-semibold`, inactive `text-muted hover:bg-surface-raised
  hover:text-base`.
- Slide animation: nav list re-mounts on level change (React `key`) and plays
  `.drill-enter-forward` (slide from right, 220ms) when drilling in or
  `.drill-enter-back` (slide from left, 180ms) when going back. Keyframes
  `drillIn` / `drillBack` defined in `index.css`.

**Accordion specific:**
- Parent row: same styling as drill-down parent but with `ChevronDown` (rotates
  180° when open). Uses `aria-expanded` / `aria-controls` for accessibility.
- Child row: `NavLink` with `pl-11` indent, `min-h-[36px]`, active state
  `bg-primary-light text-primary font-medium`, inactive `text-muted
  hover:bg-surface-raised hover:text-base`.

- Section label: `text-label text-subtle uppercase tracking-widest px-3 mb-1 mt-4`

### Welcome Page

Shown after login for all users with at least one accessible sub-app
(`/hub-admin/welcome`). Users with zero apps fall back to the login page.

- **User greeting:** "Welcome back, {name}" (`text-display`) + role badge
  (`bg-primary-light text-primary rounded-full` pill) + email
- **App cards grid:** `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`. Each
  card (`bg-surface border border-border rounded-card shadow-card p-6`,
  `hover:shadow-card-sm hover:border-border-strong transition-all cursor-pointer`)
  shows the app icon, label, description, and navigates to the app's dashboard
  on click.
- **Quick stats:** `grid-cols-2 lg:grid-cols-4 gap-4` bento row showing
  platform-wide counts (Total Pages, Total Forms, Total Campaigns, Mailing
  Lists). Always renders the numeric count (shows "0" when empty). Data fetched
  via `Promise.allSettled` so one failing endpoint doesn't break the page.
- **Recent activity:** merged list of latest items across apps (pages, forms,
  campaigns), sorted by date desc, top 8. Empty state: centered "No recent
  activity".

### Page Layout

```
background min-h-screen
├── Sidebar (240px fixed left, drill-down parents + children)
└── Main content area
    ├── Top bar (h-14, border-b border-border bg-surface)
    └── Page body (p-8)
        ├── Page header (mb-6)
        │   ├── Title: text-display
        │   └── Subtitle: text-muted text-body
        └── Content
```

### TopBar

The TopBar no longer hosts sub-app section tabs — those moved into the sidebar
drill-down. The TopBar layout is: **left** (hamburger on mobile + sub-app title),
**center** (global search bar, hidden on mobile), **right** (sub-app actions +
shared user menu with theme toggle + logout).

### Global Search

A global search bar lives in the TopBar center, always visible on `sm+`
screens. It searches across app content scoped to the user's accessible apps.

- **Search bar** (`GlobalSearch.jsx`): `pl-9 pr-4 py-2 min-h-[36px] text-sm
  bg-surface-raised border border-border rounded-base` with a `Search` icon on
  the left. Debounced 200ms after last keystroke. Dropdown panel appears below
  with live results grouped by app, keyboard-navigable (ArrowUp/Down to move,
  Enter to open result or go to full search page, Escape to close).
- **Dropdown panel**: `bg-surface border border-border rounded-base
  shadow-dropdown max-h-[400px] overflow-y-auto`. Results grouped by app with
  sticky group headers. Active item: `bg-primary-light text-primary`.
- **Full search page** (`/hub-admin/search?q=...`): `max-w-3xl` centered layout
  with a large search input, results grouped by app in cards.
- **Search registry** (`client/src/search/registry.js`): scalable provider
  pattern. Each app registers a provider with `{ appId, label, Icon, search(query)
  }`. The registry filters providers by the user's accessible app IDs at query
  time and runs them in parallel via `Promise.allSettled`. To add a new app to
  search scope, add a provider object to the `PROVIDERS` array — no changes
  needed to the search bar or search page.

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
- The theme toggle lives inside the **user dropdown menu** (top-right avatar) in
  `client/src/components/TopBar.jsx`. It renders as a switch row ("Dark mode" with
  a Sun/Moon icon and an animated track/knob) and calls `toggleTheme`. The
  dropdown closes on Escape and outside-click; the toggle is a
  `role="menuitemcheckbox"` with `aria-checked` reflecting the current theme.

**Dark palette** (`.dark` block in `index.css`, HSL `H S% L%`) — Dark Violet
(site-3): violet primary with a soft glow, cyan accent, deep near-black layered
surfaces. All text meets 4.5:1 contrast on dark surfaces.

| Token | Dark HSL | Hex | Notes |
|-------|----------|-----|-------|
| `primary` | `258 90% 66%` | `#8B5CF6` | Violet — primary buttons, active nav pill, active tab underline |
| `primary-hover` | `262 83% 58%` | `#7C3AED` | Primary button hover |
| `primary-light` | `259 38% 16%` | `#241A3A` | Dark violet tint for pill/badge backgrounds |
| `primary-foreground` | `0 0% 100%` | `#FFFFFF` | White text/icons on violet |
| `background` | `225 21% 7%` | `#0F1117` | Page background — near-black |
| `surface` | `225 21% 11%` | `#171A23` | Cards, sidebar, top bar |
| `surface-raised` | `226 22% 15%` | `#1F2330` | Table headers, muted panels, inputs |
| `surface-tertiary` | `225 19% 20%` | `#2A2F3E` | Nested insets, quick-action hover |
| `border` | `225 19% 20%` | `#2A2F3E` | Card/table/input borders |
| `border-soft` | `225 19% 16%` | `#222632` | Subtle dividers |
| `border-strong` | `221 16% 27%` | `#3A4150` | Input borders (default) |
| `text-base` | `220 13% 91%` | `#E5E7EB` | Primary text |
| `text-muted` | `218 11% 65%` | `#9CA3AF` | Secondary labels, metadata |
| `text-subtle` | `220 9% 46%` | `#6B7280` | Placeholder, disabled |
| `text-inverse` | `225 21% 7%` | `#0F1117` | Text on light/colored fills |
| `success` / `success-light` | `158 64% 52%` / `156 47% 11%` | `#34D399` / dark tint | State hue kept, lightness raised; `-light` becomes a dark tint |
| `warning` / `warning-light` | `43 96% 56%` / `46 45% 11%` | `#FBBF24` / dark tint | |
| `danger` / `danger-light` | `0 91% 71%` / `351 33% 12%` | `#F87171` / dark tint | |
| `info` / `info-light` | `188 86% 53%` / `191 52% 12%` | `#22D3EE` (cyan) / dark tint | Cyan doubles as the secondary accent |
| `chart-primary` | `258 90% 66%` | `#8B5CF6` | Violet |
| `chart-success` | `158 64% 52%` | `#34D399` | |
| `chart-warning` | `43 96% 56%` | `#FBBF24` | |
| `chart-danger` | `0 91% 71%` | `#F87171` | |
| `chart-info` | `188 86% 53%` | `#22D3EE` | Cyan accent |
| `chart-muted` | `218 11% 45%` | — | |
| `chart-grid` | `225 19% 20%` | — | Subtle grid on dark |
| `chart-axis` | `225 19% 30%` | — | |
| `chart-axis-tick` | `218 11% 65%` | — | |

Shadows in dark mode use a darker base color with higher alpha for depth. Radius
values are also redefined in `.dark` (sleeker 12px cards vs. light mode's 16px).

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
- [x] **`scrollbar-none`** — Utility class defined in `index.css` (`@layer utilities`). Documented in Ready-made Utility Classes section. (Formerly used for TopBar tab scroll; tabs moved to sidebar drill-down.)
- [x] **Text token naming** — Standardized: `text-text-base` (kept — `text-base` conflicts with Tailwind's font-size utility), `text-subtle` (short form, alias of `--color-subtle`), `text-inverse` (short form, alias of `--color-inverse`), `text-muted` (already short). All `text-text-subtle` → `text-subtle` and `text-text-inverse` → `text-inverse` migrations complete.
- [x] **`bg-muted`** — Works correctly. `--color-muted` is defined in `index.css` as `hsl(var(--text-muted))`, so `bg-muted` produces a medium-gray background that adapts to dark mode. Used in FormsList for "closed" status dots and InlineEditor for unpublished indicator.
- [x] **Opacity variants** — `bg-primary-light/30`, `bg-primary-light/50`, `bg-primary-foreground/20`, `bg-primary/20` documented as acceptable opacity modifiers. See Opacity Modifiers section in Component Patterns.
- [x] **Touch target standardization** — All interactive elements now use `min-w-[44px] min-h-[44px]`. All `min-h-[32px]`, `min-h-[36px]`, `min-h-[40px]`, `min-w-[32px]`, `min-w-[36px]`, `min-w-[40px]` replaced with 44px across all files except OldWebBuilder.
- [x] **Icon button pattern** — Documented in Icon Buttons section. 44×44px minimum for interactive buttons; `.icon-btn-sm` (28×28) for decorative icons only.
- [x] **Batch action bar** — Documented in Batch Action Bar section.
- [x] **Empty state** — `.empty-state` utility class documented in Ready-made Utility Classes. Pattern documented in Empty State section (including ChartCard `empty` prop for charts).
- [x] **Folder sidebar** — Documented in Folder Sidebar section.
- [x] **Tab bar (TopBar)** — Replaced by conditional sidebar (drill-down for multi-app, accordion for single-app). TopBar now hosts title + global search + actions + user menu. See Sidebar Navigation (Conditional) and Global Search sections.
- [x] **Recharts tooltip styling** — Custom `ChartTooltip.jsx` component created. Uses semantic tokens (surface, border, text, shadow-dropdown). All 4 chart components (SimpleAreaChart, SimpleBarChart, SimpleLineChart, SimplePieChart) updated to use it.
- [x] **Chart axis & grid colors** — All chart components use `useChartColors()` for axis (`c.axis`), tick labels (`c.axisTick`), and grid lines (`c.grid`). These resolve from `--chart-axis`, `--chart-axis-tick`, `--chart-grid` CSS variables and adapt to dark mode.
- [x] **Empty chart state** — `ChartCard` now supports `empty` and `emptyMessage` props. When `empty={true}`, renders a centered "No data yet" message with a chart icon instead of children.
- [x] **Removed page headers** — Documented in Dashboard Patterns section: "Dashboards omit an `h1` page title (the sidebar/topbar already identifies the app)."
- [x] **Standard dashboard wrapper** — Documented in Dashboard Patterns section: `bg-background min-h-screen` > `max-w-7xl mx-auto p-6 lg:p-8`.
- [x] **Dashboard section order** — Documented in Dashboard Patterns section: "(1) bento stats grid → (2) CTA bar → (3) charts row."
- [x] **Conditional sidebar (drill-down / accordion)** — Single-app users get an accordion sidebar; multi-app users get a stack-based drill-down with Back button and slide animations. Documented in Sidebar Navigation (Conditional) section.
- [x] **Welcome page** — Post-login landing at `/hub-admin/welcome` with user greeting, app cards, access-scoped quick stats, and recent activity. Documented in Welcome Page section.
- [x] **Global search** — Always-visible search bar in TopBar with dropdown results + full search page at `/hub-admin/search`. Pluggable provider registry at `client/src/search/registry.js`, scoped to user's accessible apps. Documented in Global Search section.
- [x] **Drill-down animations** — `@keyframes drillIn` / `drillBack` and `.drill-enter-forward` / `.drill-enter-back` utility classes defined in `index.css`.

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
