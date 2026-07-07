# Site 3 — Dark Violet

> Dark-mode enterprise admin with violet accents and subtle depth. Sleek, focused, modern.
> Violet active states carry a faint glow (`.glow-primary` utility in `theme.css`).
> All text meets 4.5:1 contrast on dark surfaces.

## Personality

- Deep near-black backgrounds with layered dark surfaces (bg → surface → surface-2).
- Violet (`#8B5CF6`) for primary actions and the active-nav pill, with a soft box-shadow glow.
- Cyan (`#22D3EE`) as the secondary accent for links, chart lines, and highlights.
- Badges use translucent tinted backgrounds — never solid saturated fills.
- Shadows are heavier/darker than the light themes to create depth on dark surfaces.

## Token Table

| Variable | Value | Usage |
|---|---|---|
| `--primary` | `#8B5CF6` | Primary buttons, active nav pill, active tab underline |
| `--primary-hover` | `#7C3AED` | Primary button hover |
| `--on-primary` | `#FFFFFF` | Text/icon on primary backgrounds |
| `--accent` | `#22D3EE` | Links, chart strokes, secondary highlights |
| `--bg` | `#0F1117` | Page background |
| `--surface` | `#171A23` | Cards, sidebar, top bar |
| `--surface-2` | `#1F2330` | Table header rows, muted panels, inputs |
| `--text` | `#E5E7EB` | Primary text |
| `--text-muted` | `#9CA3AF` | Secondary text, labels, timestamps |
| `--border` | `#2A2F3E` | 1px card/table/input borders |
| `--ring` | `#8B5CF6` | `:focus-visible` outline |
| `--positive` | `#34D399` | Success badges, up-trends |
| `--warning` | `#FBBF24` | Pending badges, due-soon chips |
| `--negative` | `#F87171` | Error badges, overdue chips |
| `--font-sans` | `'Inter', system-ui, sans-serif` | All text (Google Fonts import in theme.css) |
| `--radius` | `12px` | Base card radius (`rounded-card`) |
| `--shadow-card` | `0 1px 2px rgba(0,0,0,.4), 0 4px 16px rgba(0,0,0,.3)` | Card shadow (`shadow-card`) |

## Badge Recipes (translucent tint technique)

Background = semantic color at ~15% alpha; text = full-strength semantic color. This keeps
contrast high on dark surfaces while reading as a soft chip.

```html
<!-- Positive / Active / Done -->
<span class="rounded-full px-2.5 py-0.5 text-xs font-medium text-positive"
      style="background: rgba(52,211,153,.15)">Active</span>

<!-- Warning / Pending / Due soon -->
<span class="rounded-full px-2.5 py-0.5 text-xs font-medium text-warning"
      style="background: rgba(251,191,36,.15)">Pending</span>

<!-- Negative / Overdue / Declined -->
<span class="rounded-full px-2.5 py-0.5 text-xs font-medium text-negative"
      style="background: rgba(248,113,113,.15)">Overdue</span>

<!-- Neutral / Inactive -->
<span class="rounded-full px-2.5 py-0.5 text-xs font-medium text-muted bg-surface-2 border border-line">Inactive</span>

<!-- Primary tint (membership, role badges) -->
<span class="rounded-full px-2.5 py-0.5 text-xs font-medium text-primary"
      style="background: rgba(139,92,246,.15)">Member</span>
```

## Button Recipes

```html
<!-- Primary: violet fill + faint glow -->
<button class="glow-primary cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-semibold
               text-on-primary transition-colors duration-200 hover:bg-primary-hover">Add Person</button>

<!-- Secondary: surface-2 fill, bordered -->
<button class="cursor-pointer rounded-lg border border-line bg-surface-2 px-4 py-2 text-sm
               font-medium text-body transition-colors duration-200 hover:border-primary">Export CSV</button>

<!-- Ghost: transparent, tint on hover -->
<button class="cursor-pointer rounded-lg px-4 py-2 text-sm font-medium text-muted
               transition-colors duration-200 hover:bg-surface-2 hover:text-body">Cancel</button>

<!-- Action chip (Call / Text / Email...) -->
<button class="cursor-pointer inline-flex items-center gap-1.5 rounded-full border border-line
               bg-surface-2 px-3 py-1.5 text-xs font-medium text-body transition-colors
               duration-200 hover:border-primary hover:text-primary">[svg] Call</button>
```

## Active Nav Pill

```html
<a class="glow-primary flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold
          text-primary" style="background: rgba(139,92,246,.15)">[svg] Dashboard</a>
```

## How to Apply This Look

1. Read `../DESIGN_SYSTEM.md` for the shared app shell, table, form, and badge layout rules.
2. Link this folder's `theme.css` and paste the standard Tailwind CDN config snippet from
   `../DESIGN_SYSTEM.md` verbatim into the page `<head>`.
3. Style only with token-mapped classes (`bg-surface`, `text-body`, `border-line`,
   `bg-primary`, `text-muted`, `rounded-card`, `shadow-card`) — never hardcode hex values.
4. Use the translucent-tint badge recipes above and add `.glow-primary` to primary
   buttons and the active nav item for the signature violet glow.
