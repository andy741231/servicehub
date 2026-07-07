# Pushpay ChMS Mockups — Master Design System

> Agent-facing source of truth. To apply any of these looks to a new page:
> 1. Read this file for shared layout/component rules.
> 2. Read the target site's `THEME.md` for its tokens.
> 3. Link the site's `theme.css` and use the standard Tailwind CDN config snippet below.
>
> Derived from `md files/PUSHPAY_CHMS_DESIGN_REF.md`.

---

## Sites

| Folder | Theme | Mode | Personality |
|---|---|---|---|
| `site-1-classic/` | Classic Pushpay | Light | Deep purple/navy brand, white cards on `#F7F8FA` gray, enterprise SaaS |
| `site-2-modern-teal/` | Modern Teal | Light | Airy modern light UI, teal accents (CCB heritage), softer and friendlier |
| `site-3-dark/` | Dark Violet | Dark | Dark-mode admin, violet accents, subtle glows, high contrast |

Every site contains the same 5 pages so styles can be compared 1:1:

| Page | File | Pattern |
|---|---|---|
| Dashboard | `index.html` | Bento grid of stat cards + widgets ("People to Follow Up", "Upcoming Events", attendance chart) + quick actions |
| People | `people.html` | Full-width sortable table, sticky search + filter bar, bulk-select checkboxes, status badges |
| Person Profile | `profile.html` | Two-column: left identity card (avatar, contact badges, quick actions) / right tabbed pane (About, Involvement, Notes, Family) |
| Groups | `groups.html` | Group dashboard hub with tabs (Messages, Needs, Files, Events) + member roster with role badges |
| Process Queues | `queues.html` | Workflow queue list: people, due dates, assignee, "Mark as Done" primary action |

---

## Shared Layout Rules (all themes)

- **App shell:** fixed left sidebar (16rem, collapsible feel) + fixed top bar (global search center, avatar right) + scrollable main content, max-w-screen-2xl.
- **Sidebar nav order:** Dashboard, People, Groups, Processes, Schedules, Events, Check-In, Giving, Communications, Reports, Settings. Active item = filled pill in primary color tint.
- **Cards:** rounded (`rounded-xl`), subtle layered shadow, 1px border in `--border`, white/surface background, `p-5`/`p-6` padding. Modules breathe — not ERP-dense.
- **Two-column detail:** left summary column ~320px, right tabbed pane fills remainder; stacks on mobile.
- **Tables:** sortable headers, header-row bulk checkbox, row hover reveals secondary actions, toolbar with Export button, pagination footer.
- **Icons:** inline SVG (Lucide-style outlined, rounded, `stroke-width: 2`, 20px). Never emojis.
- **Avatars:** circular, initials fallback with tinted background derived from name.
- **Status badges:** small rounded-full chips — Active / Inactive / Pending / Done / Verified / Confirmed / Declined / Needed. Semantic colors: green=positive, amber=pending, red=negative, gray=neutral.
- **Action chips:** Call / Text / Email / Add to Group / Add to Queue — outlined pill buttons with icon.
- **Empty states:** centered icon + one line of copy + primary CTA.
- **Forms:** sectioned (not one long column), inline validation styling, save-per-section buttons.
- **Motion:** 150–300ms transitions on hover/focus; respect `prefers-reduced-motion`.
- **Accessibility:** 4.5:1 text contrast minimum, visible focus rings (`--ring`), `cursor-pointer` on all interactive elements, 44px touch targets on primary actions.

---

## Standard Token Contract

Every site's `theme.css` defines the SAME variable names, so swapping looks = swapping one CSS file:

```css
:root {
  --primary: ...;        /* brand color — sidebar active, primary buttons */
  --primary-hover: ...;
  --on-primary: ...;     /* text on primary */
  --accent: ...;         /* secondary highlight (charts, links, chips) */
  --bg: ...;             /* page background */
  --surface: ...;        /* card background */
  --surface-2: ...;      /* muted panels, table header rows */
  --text: ...;           /* primary text */
  --text-muted: ...;     /* secondary text */
  --border: ...;
  --ring: ...;           /* focus ring */
  --positive: ...;  --warning: ...;  --negative: ...;
  --font-sans: ...;
  --radius: ...;         /* base card radius */
  --shadow-card: ...;    /* layered card shadow */
}
```

## Standard Tailwind CDN Setup (paste in `<head>`)

```html
<script src="https://cdn.tailwindcss.com"></script>
<link rel="stylesheet" href="theme.css" />
<script>
  tailwind.config = {
    theme: {
      extend: {
        colors: {
          primary: 'var(--primary)',
          'primary-hover': 'var(--primary-hover)',
          'on-primary': 'var(--on-primary)',
          accent: 'var(--accent)',
          bg: 'var(--bg)',
          surface: 'var(--surface)',
          'surface-2': 'var(--surface-2)',
          body: 'var(--text)',
          muted: 'var(--text-muted)',
          line: 'var(--border)',
          positive: 'var(--positive)',
          warning: 'var(--warning)',
          negative: 'var(--negative)',
        },
        fontFamily: { sans: ['var(--font-sans)'] },
        borderRadius: { card: 'var(--radius)' },
        boxShadow: { card: 'var(--shadow-card)' },
      },
    },
  };
</script>
```

Then style with `bg-surface text-body border-line rounded-card shadow-card`, etc.

---

## How an agent applies a look to NEW work

```
1. Pick a site (e.g. site-1-classic). Read pushpay/DESIGN_SYSTEM.md then site-1-classic/THEME.md.
2. Copy that site's theme.css + the Tailwind config snippet above into the new page/app.
3. Use only the token-mapped Tailwind classes (bg-surface, text-body, border-line, bg-primary...)
   — never hardcode hex values.
4. Follow the Shared Layout Rules section for shell, cards, tables, badges, and forms.
```

For a React/Vite app, the same `theme.css` variables drop into `tailwind.config.js` `extend.colors` identically.

---

## Anti-patterns (from the design ref)

- Don't mix admin and member-facing UX in one surface.
- Don't dump all profile fields on one page — use tabs.
- Don't use modal-heavy flows for complex/multi-step data; use dedicated pages.
- Mark permission-restricted data (pastoral notes, giving) with a visible lock indicator.
