# Theme: Modern Teal (site-2-modern-teal)

> Light mode. Airy, friendly, modern SaaS with a nod to CCB's teal heritage.
> Softer and rounder than the classic theme — more whitespace, gentle teal-tinted
> surfaces (`--surface-2`), pill-shaped buttons and nav items, 16px card radius.
> Shared layout/component rules live in `../DESIGN_SYSTEM.md` (read that first).

---

## Token Table

| Variable | Value | Usage |
|---|---|---|
| `--primary` | `#0D9488` (teal-600) | Sidebar active pill, primary buttons, links, active tab underline |
| `--primary-hover` | `#0F766E` (teal-700) | Hover state of primary buttons/links |
| `--on-primary` | `#FFFFFF` | Text/icons on primary backgrounds |
| `--accent` | `#F59E0B` (amber-500) | Chart highlights, secondary chips, attention accents |
| `--bg` | `#FAFDFC` | Page background — faint teal-tinted off-white |
| `--surface` | `#FFFFFF` | Card / panel / table backgrounds |
| `--surface-2` | `#F0FDFA` (teal-50) | Muted panels, table header rows, tinted wells, avatar fallbacks |
| `--text` | `#1C2B2A` | Primary text — dark teal-slate |
| `--text-muted` | `#64748B` (slate-500) | Secondary text, labels, meta rows |
| `--border` | `#E2E8F0` (slate-200) | 1px card & divider borders |
| `--ring` | `#0D9488` | `:focus-visible` outline |
| `--positive` | `#059669` (emerald-600) | Success badges, positive deltas, "Done" |
| `--warning` | `#D97706` (amber-600) | Pending / due-soon chips |
| `--negative` | `#E11D48` (rose-600) | Overdue chips, declined, at-risk |
| `--font-sans` | `'Plus Jakarta Sans', system-ui, sans-serif` | All text (Google Fonts import in theme.css) |
| `--radius` | `16px` | Base card radius (`rounded-card`) |
| `--shadow-card` | `0 1px 3px rgba(13,148,136,.08), 0 4px 12px rgba(15,23,42,.05)` | Layered, teal-tinged card shadow |

Tailwind class mapping (from the standard CDN config): `bg-primary`, `bg-surface`,
`bg-surface-2`, `text-body`, `text-muted`, `border-line`, `text-positive`,
`text-warning`, `text-negative`, `rounded-card`, `shadow-card`, `ring-…var(--ring)`.

---

## Badge Recipes (rounded-full chips, text-xs font-semibold, px-2.5 py-0.5)

| Badge | Recipe |
|---|---|
| Active / Member / Done / Confirmed | `bg-emerald-50 text-positive` (+ optional `border border-emerald-100`) |
| Pending / Due Soon / Regular Attender | `bg-amber-50 text-warning border border-amber-100` |
| Overdue / Declined / At-Risk / Inactive | `bg-rose-50 text-negative border border-rose-100` |
| Neutral / Guest / Visitor | `bg-surface-2 text-muted border border-line` |
| Brand / Leader / Primary tag | `bg-primary/10 text-primary border border-primary/20` |
| Accent / Co-Leader / highlight | `bg-amber-50 text-accent border border-amber-100` |

---

## Button Recipes (pill-shaped — `rounded-full` is on-brand for this theme)

**Primary**
```html
<button class="cursor-pointer inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5
  text-sm font-semibold text-on-primary shadow-sm transition-colors duration-200
  hover:bg-primary-hover">…</button>
```

**Secondary (outlined)**
```html
<button class="cursor-pointer inline-flex items-center gap-2 rounded-full border border-line
  bg-surface px-4 py-2.5 text-sm font-semibold text-body transition-colors duration-200
  hover:border-primary/40 hover:bg-surface-2">…</button>
```

**Ghost**
```html
<button class="cursor-pointer inline-flex items-center gap-2 rounded-full px-3 py-2
  text-sm font-semibold text-muted transition-colors duration-200
  hover:bg-surface-2 hover:text-primary">…</button>
```

**Action chip** (Call / Text / Email / Add to Group): secondary recipe at
`px-3 py-1.5 text-xs` with a 16px leading icon.

---

## How to apply this look

1. Read `../DESIGN_SYSTEM.md` for the shared app shell, table, badge and form rules
   plus the standard Tailwind CDN config snippet (paste verbatim in `<head>`).
2. Link this folder's `theme.css` after the Tailwind CDN script.
3. Style only with token-mapped classes (`bg-surface`, `text-body`, `border-line`,
   `bg-primary`…) — never hardcode hex values.
4. Personality knobs for this theme: generous whitespace (`p-6`, `gap-6`),
   `rounded-full` buttons/chips, `rounded-card` (16px) cards, `bg-surface-2` teal
   tints for wells and hovers, 150–300ms transitions, friendly copy.
