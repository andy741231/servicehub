# Web Builder Editor — UX Review v2 (Designer's Perspective)

**Reviewed:** 2026-09-27
**Target:** `http://localhost:3000/hub-admin/web/editor/home` (Fluid Engine)
**Method:** Code audit + hands-on browser walkthrough (Playwright, no saves) + Squarespace Fluid Engine benchmark
**Scope:** Review and plan only — no implementation in this round. Supersedes `ux-improve-web.md` (now in `scratch/md-archive/`) findings where they overlap.

## Executive summary

The editor is now *visually honest* — the canvas looks like the site, the inspector edits real content, and save/publish/undo work. But it is **not yet a design tool**. It is a gallery of 16 pre-composed section widgets. A designer cannot compose freely because the palette has almost no **elemental blocks** — most critically, **no Button block**, so a CTA can only exist where a preset happened to embed one. Layered on that are four verified interaction blockers and theme leakage that makes the chrome look inconsistent.

## What works (keep)

- Canvas fidelity: structured blocks render real markup; site fonts/tokens apply in edit mode
- Right-side inspector with live updates (pinned via portal); hero split-layout controls reachable
- Save/publish/unpublish/revert, undo/redo, dirty-exit guard, version history
- Section presets + site-palette swatches; page-check lint popover
- 24-col drag/resize grid, z-index controls, dual desktop/mobile grids
- Zero console errors across the full walkthrough

## Findings — Blocking (a designer hits a wall)

| # | Finding | Evidence |
|---|---------|----------|
| B1 | **No atomic Button block** — buttons exist only inside hero/split-banner/intro presets. Cannot add a CTA to an arbitrary section (`BLOCK_TYPES` in `editorUtils.js`; `BaseEditableButton` is a component, not a block) | code + live |
| B2 | **No atomic blocks at all** — no standalone image, divider, spacer, icon, social links, embed, shape, or heading block. Palette is all composites | code |
| B3 | **"+ ADD BLOCK" pill unclickable** in 4/5 sections — block drag overlays paint over it and intercept the click | verified live |
| B4 | **Palette clicks intercepted** — block overlays render above the palette panel (z-60); clicking a block type hit an overlay instead | verified live |
| B5 | **"Layers" button on section chrome doesn't open Layers** — it only selects the section. A real `LayersPanel` exists on the toolbar but isn't wired here (`FluidSection.jsx`) | code + live |
| B6 | **Plain click in mobile view moved a block** — trust bar jumped to cols 3–6 on tap; no select-vs-move distinction | verified live (observed once) |

## Findings — High (works, but fights the designer)

- **H1. Live/Edit mode split is an extra concept.** Entry defaults to `live`; the designer must discover "Edit". Squarespace enters edit directly.
- **H2. Two inconsistent editing models.** 6 types use the inspector; the rest use inline editing or block-specific forms (`INSPECTOR_TYPES` in `BlockContent.jsx`). No unified mental model.
- **H3. Mobile editing exposes raw grid coordinates** — col start/span, row start/span, z-index (`MobileLayoutInspector.jsx`). Squarespace gives mobile its own drag canvas with auto-arrange first; coordinates belong behind an "Advanced" disclosure.
- **H4. Icon-only block toolbar** — pencil/gear/z-index glyphs need tooltips to parse; nothing is labeled.
- **H5. No element-level style system.** Squarespace has Site Styles → button tiers (primary/secondary/tertiary) + H1–4/P1–3 type styles. Our Styles page sets color tokens only; blocks don't reference style tiers.
- **H6. No insertion affordance** — can't "add here" between blocks or drag from palette onto the canvas with drop indicators (Squarespace supports both).
- **H7. Flat palette** — 16 items, one column, no categories, no search.
- **H8. Theme leakage into chrome** — section settings button teal, drag handle teal, Add Section navy, primary purple: `.light-scope.public-site` tokens bleed into editor UI. Verified live.

## Findings — Medium / polish

- **M1. No autosave + session-expiry risk** — `beforeunload` guard exists, but a reload produced `401` on `/api/auth/me` while dirty; an expired session could lose unsaved work. Needs draft persistence or session-safe save.
- **M2. Inline-text editing discovery** — floating toolbar requires a specific click sequence; first-time users won't find it.
- **M3. Section settings are technical** (padding/grid numbers) rather than visual outcomes (spacing presets, theme, background media).
- **M4. Footer ~23px vs reference; mobile bands ~5–10% taller** — fidelity polish, not blocking.
- **M5. Tailwind v4 linter warnings** in IDE — cosmetic; build is clean.

## Recommended block architecture

Three layers instead of today's flat list:

```
BASICS     Text · Heading · Button · Image · Icon · Divider · Spacer
MEDIA      Video · Gallery · Map · Embed · Logo · Social Links
LAYOUT     Grid/Columns · Shape · (reusable) Group
SECTIONS   Hero · Trust Bar · Features · Split Banner · Events ·
           Quote · Testimonials · Contact · Highlights
           — presets that expand into blocks or ship as composites
```

Every block gets the same contract: canvas visual + inspector schema + public renderer + defaults. Composites remain as *starting points* — and any button inside them should be the Button block, not a bespoke field, so styling stays consistent.

## Target interaction model (Squarespace-fluent)

1. **Palette:** categorized + searchable; drag a block onto the canvas with drop-line indicators, or click to append.
2. **Select → labeled toolbar** (Edit · Design · Duplicate · Delete · more), not icons-only.
3. **One inspector for everything**, two tabs: *Content* (fields) and *Design* (spacing, colors, style tier).
4. **Mobile = second canvas** with auto-arrange default and a "Custom layout" toggle that reveals coordinates.
5. **Layers:** every Layers affordance opens the same panel, scoped to the section.
6. **Site Styles:** button tiers + type styles that blocks reference, so restyling a tier updates the whole site.

## Phased plan

| Phase | Scope | Goal |
|-------|-------|------|
| **1 — Elemental palette** | Button, Image, Divider, Spacer, Icon, Social Links, Embed, Heading; palette categories + search; refactor nested CTAs to Button block | Designer can add a button to **any** section — the acceptance test |
| **2 — Interaction blockers** | Fix B3–B6 (hit-targets/z-index, Layers wiring, mobile tap-vs-move); isolate chrome tokens from site theme (H8) | Nothing on screen is unclickable or mislabeled |
| **3 — Unified editing** | Inspector for all types w/ Content+Design tabs; Site Styles button tiers + type styles; insertion affordances + drag-from-palette; empty states | Consistent mental model, per-element styling |
| **4 — Responsive + safety** | Mobile auto-layout w/ Custom disclosure; autosave/draft recovery; keyboard & focus pass; skippable first-run hints | Designers trust mobile output and don't lose work |
| **5 — Polish** | Footer/mobile rhythm, bundle split, toast consistency | — |

## Acceptance criteria for "done"

Scripted designer test, clicks only, zero API: *add a section → add Heading + Text + Button + Divider + Image → set the Button to secondary style → reorder in Layers → check mobile auto-layout → publish.* Every step must be discoverable without documentation, and the public page must match the canvas.

**Fix now:** B1–B6 (Phase 1 + 2). **Next:** unified inspector + style tiers (Phase 3). **Later:** responsive/safety + polish (4–5).

## Caveats

- Z-index interceptions (B3, B4) and the mobile move (B6) are verified live but may be coordinate-dependent rather than universal — worth a second pass before implementation.
- All other findings are code-confirmed.
- The Harbor-page rebuild exercise that motivated this review assembled page data via the document API, but every block type/field/content format used was exercised through the UI; this review confirmed the UI itself still lacks the elemental blocks needed to compose that page freely.
