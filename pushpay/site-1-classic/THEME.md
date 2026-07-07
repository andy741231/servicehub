# Site 1 — Classic Pushpay (Light)

**Personality:** clean, utilitarian, conservative, enterprise SaaS. Faithful to the Pushpay
ChMS design ref §6: white cards on a light-gray page, deep purple brand, dark-navy chart/link
accent, moderately rounded corners, subtle layered shadows, comfortable padding.

## Token table

| Variable | Value | Usage |
|---|---|---|
| `--primary` | `#4C2A85` | Sidebar active pill, primary buttons, brand marks |
| `--primary-hover` | `#3D2169` | Primary button hover |
| `--on-primary` | `#FFFFFF` | Text/icons on primary |
| `--accent` | `#1E3A5F` | Chart bars/lines, links, secondary chips |
| `--bg` | `#F7F8FA` | Page background |
| `--surface` | `#FFFFFF` | Card / panel / sidebar / topbar background |
| `--surface-2` | `#F1F2F6` | Muted panels, table header rows, hover fills |
| `--text` | `#1F2430` | Primary text |
| `--text-muted` | `#6B7280` | Secondary text, labels, placeholders |
| `--border` | `#E4E6EB` | 1px card & table borders, dividers |
| `--ring` | `#4C2A85` | `:focus-visible` outline |
| `--positive` | `#16A34A` | Success badges, up-trends, "Done" |
| `--warning` | `#D97706` | Pending / due-soon chips |
| `--negative` | `#DC2626` | Overdue chips, at-risk, destructive |
| `--font-sans` | `'Inter', system-ui, sans-serif` | All text (imported in theme.css) |
| `--radius` | `12px` | Base card radius (`rounded-card`) |
| `--shadow-card` | `0 1px 2px rgba(16,24,40,.06), 0 1px 3px rgba(16,24,40,.10)` | Layered card shadow |

## Badge recipes (classes defined in theme.css)

| Class | Look | Use for |
|---|---|---|
| `.badge-positive` | green text on green tint | Active, Done, Confirmed, Verified |
| `.badge-warning` | amber text on amber tint | Pending, Due soon, Unconfirmed |
| `.badge-negative` | red text on red tint | Overdue, At risk, Declined, Inactive |
| `.badge-neutral` | muted text on `--surface-2` | Visitor, Archived, counts |
| `.badge-primary` | purple text on purple tint | Member, Leader, selected states |
| `.badge-accent` | navy text on navy tint | Co-Leader, links-as-chips |

Markup: `<span class="badge-positive inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium">Active</span>`

## Button recipes

- **Primary:** `bg-primary text-on-primary hover:bg-primary-hover rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition-colors duration-200 cursor-pointer`
- **Secondary (outlined):** `bg-surface border border-line text-body hover:bg-surface-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200 cursor-pointer`
- **Ghost:** `text-muted hover:text-body hover:bg-surface-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 cursor-pointer`
- **Action chip (Call/Text/Email…):** secondary recipe at `rounded-full px-3 py-1.5 text-xs` with a 16px inline SVG icon.

Active sidebar item uses `.nav-active` (10% primary tint pill + primary text).
Avatars use `.av-purple/.av-navy/.av-green/.av-amber/.av-rose/.av-teal` initial tints.

## How to apply this look

1. Read `../DESIGN_SYSTEM.md` for the shared app shell, card, table, and badge layout rules.
2. Link `theme.css` and paste the standard Tailwind CDN config snippet from that file verbatim.
3. Style only with token-mapped classes (`bg-surface`, `text-body`, `border-line`,
   `bg-primary`, `rounded-card`, `shadow-card`) — never hardcode hex values in pages.
4. Icons are inline Lucide-style SVGs (20px, `stroke-width="2"`), never emojis.
