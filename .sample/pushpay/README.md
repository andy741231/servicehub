# Pushpay ChMS — Mockup Sites

Three standalone, frontend-only mockups of a Pushpay ChMS-style admin, based on
`md files/PUSHPAY_CHMS_DESIGN_REF.md`. No build step — open any `.html` file directly
in a browser (Tailwind via CDN).

## Sites

| Site | Theme | Start here |
|---|---|---|
| `site-1-classic/` | Classic Pushpay — deep purple/navy, light gray background | `site-1-classic/index.html` |
| `site-2-modern-teal/` | Modern Teal — airy light UI with teal accents | `site-2-modern-teal/index.html` |
| `site-3-dark/` | Dark Violet — dark-mode admin with violet accents | `site-3-dark/index.html` |

Each site has the same 5 pages: Dashboard (`index.html`), People (`people.html`),
Person Profile (`profile.html`), Groups (`groups.html`), Process Queues (`queues.html`).

## Reusing a look (for agents & humans)

The design language is captured in markdown + one CSS file per site:

- **`DESIGN_SYSTEM.md`** — master rules shared by all themes (layout, components, token contract, Tailwind setup)
- **`<site>/THEME.md`** — that site's tokens and personality
- **`<site>/theme.css`** — the actual CSS variables (single file to copy)

To apply a look elsewhere: read `DESIGN_SYSTEM.md` + the site's `THEME.md`, copy its
`theme.css`, and use the standard Tailwind config snippet from `DESIGN_SYSTEM.md`.
All three sites share the same variable names, so themes are hot-swappable.
