# Service Hub — Design System

This file is the **single source of truth** for all visual design decisions.

**For AI assistants:** Read this file at the start of every session. Every UI component must use the semantic token names defined here — never raw Tailwind values like `bg-blue-600` or `text-gray-400`. To change the theme, update this file and regenerate `tailwind.config.js`.

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

### Brand / Accent
| Token | Value | Usage |
|-------|-------|-------|
| `primary` | `#2563EB` (blue-600) | Buttons, links, active states, focus rings |
| `primary-hover` | `#1D4ED8` (blue-700) | Button hover |
| `primary-light` | `#EFF6FF` (blue-50) | Tinted backgrounds, pill badges |
| `primary-foreground` | `#FFFFFF` | Text on primary backgrounds |

### Neutrals (base UI)
| Token | Value | Usage |
|-------|-------|-------|
| `background` | `#F9FAFB` (gray-50) | Page / app background |
| `surface` | `#FFFFFF` | Cards, panels, modals |
| `surface-raised` | `#F3F4F6` (gray-100) | Hover rows, subtle insets |
| `border` | `#E5E7EB` (gray-200) | Card borders, dividers |
| `border-strong` | `#D1D5DB` (gray-300) | Input borders (default) |

### Text
| Token | Value | Usage |
|-------|-------|-------|
| `text-base` | `#111827` (gray-900) | Body copy, headings |
| `text-muted` | `#6B7280` (gray-500) | Secondary labels, metadata |
| `text-subtle` | `#9CA3AF` (gray-400) | Placeholder text, disabled |
| `text-inverse` | `#FFFFFF` | Text on dark/colored backgrounds |

### Semantic States
| Token | Value | Usage |
|-------|-------|-------|
| `success` | `#16A34A` (green-600) | Success messages, active badges |
| `success-light` | `#F0FDF4` (green-50) | Success backgrounds |
| `warning` | `#D97706` (amber-600) | Warnings, pending states |
| `warning-light` | `#FFFBEB` (amber-50) | Warning backgrounds |
| `danger` | `#DC2626` (red-600) | Errors, destructive actions |
| `danger-light` | `#FEF2F2` (red-50) | Error backgrounds |
| `info` | `#0891B2` (cyan-600) | Informational callouts |
| `info-light` | `#ECFEFF` (cyan-50) | Info backgrounds |

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

Base unit: `4px`. All spacing uses multiples of 4.

| Token | Value | Usage |
|-------|-------|-------|
| `spacing-page` | `32px` (p-8) | Page outer padding |
| `spacing-section` | `24px` (p-6) | Between major sections |
| `spacing-card` | `20px` (p-5) | Card internal padding |
| `spacing-compact` | `12px` (p-3) | Tight areas, table cells |

---

## Borders & Radius

| Token | Value | Usage |
|-------|-------|-------|
| `rounded-sm` | `4px` | Badges, tags, small elements |
| `rounded-base` | `6px` | Inputs, buttons |
| `rounded-card` | `8px` | Cards, panels, modals |
| `rounded-lg` | `12px` | Large modals, drawers |
| `rounded-full` | `9999px` | Avatars, pill buttons |

---

## Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `shadow-card` | `0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)` | Cards (subtle) |
| `shadow-dropdown` | `0 4px 6px -1px rgba(0,0,0,0.08), 0 2px 4px -1px rgba(0,0,0,0.04)` | Dropdowns, popovers |
| `shadow-modal` | `0 20px 25px -5px rgba(0,0,0,0.10), 0 10px 10px -5px rgba(0,0,0,0.04)` | Modals |

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
- `sm`: `h-7 px-3 text-small`
- `md` (default): `h-9 px-4 text-body`
- `lg`: `h-11 px-6 text-subheading`

All buttons: `rounded-base font-medium transition-colors duration-150`

### Inputs / Form Fields

- Height: `h-9` (36px)
- Border: `border border-strong rounded-base`
- Background: `surface`
- Focus ring: `outline-none ring-2 ring-primary ring-offset-1`
- Placeholder: `text-subtle`
- Label: `text-label text-muted mb-1` (above the input)
- Error state: `border-danger` + error message in `text-small text-danger` below

### Cards

```
bg-surface border border-border rounded-card shadow-card p-5
```

Card header (when present): `pb-4 mb-4 border-b border-border`

### Tables

- Container: `bg-surface border border-border rounded-card overflow-hidden`
- Header row: `bg-surface-raised text-label text-muted uppercase tracking-wide`
- Body rows: `border-t border-border hover:bg-surface-raised transition-colors`
- Cell padding: `px-4 py-3`

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

---

## Dark Mode

Not implemented in initial build. When added:
- All tokens get a dark variant in CSS variables
- `THEME.md` will be updated with dark palette
- No component changes needed (tokens handle it)

---

## Changing the Theme

To change colors, fonts, spacing, or any token:

1. Edit the relevant section in this file (`THEME.md`)
2. Tell the AI: *"Update the theme per THEME.md"*
3. The AI updates `tailwind.config.js` and `client/src/styles/globals.css`
4. All components update automatically because they use token names, not raw values

> **Rule:** Never use raw Tailwind color classes (`blue-600`, `gray-200`, etc.) in components. Always use the semantic token names defined here.
