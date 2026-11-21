# Editor Engine Spike — Craft.js vs Puck

**Date:** 2026-09-27
**Purpose:** Evaluate replacing the bespoke Fluid Engine canvas machinery with a maintained editor framework.
**Routes:** `/hub-admin/web/editor-lab/craft` · `/hub-admin/web/editor-lab/puck`
**Files:** `client/src/pages/web/editor-lab/` — `labBlocks.jsx` (shared `public-*` renderers + `BLOCK_FIELDS` field specs), `CraftLab.jsx`, `PuckLab.jsx`.

## What was verified live in the browser

| Capability | Craft.js | Puck |
|---|---|---|
| Click → select block | ✓ outline | ✓ outline + actionbar (duplicate/delete) |
| Live prop editing | ✓ custom settings panel | ✓ auto-generated fields sidebar |
| Drag new block from palette | ✓ mouse-DnD into canvas | ✓ dnd-kit, lands at exact index |
| Nested sections ("drop blocks here") | ✓ `<Element canvas>` | ✓ `<DropZone zone>` in render |
| Move existing block across sections | ✓ HTML5 drag | ✓ (same dnd-kit path) |
| Undo / redo | ✓ `actions.history` | ✓ built-in toolbar buttons |
| Preview mode | ✓ `enabled` toggle | ✓ viewport switcher (desktop/tablet/phone) |
| Serialize / publish | ✓ `query.serialize()` → lz-string | ✓ `onPublish`/`onChange` → `{content:[{type,props}]}` |
| Layers / outline tree | — build yourself | ✓ built-in, syncs with selection |
| Same `public-*` markup as live site | ✓ (shared labBlocks) | ✓ (shared labBlocks) |

## Chrome comparison

- **Craft.js (~250 lines of lab code):** you build all UI chrome — toolbox, settings panel, top bar, delete. The engine supplies node tree, DnD, selection, history, serialization. Flexible; more surface to maintain.
- **Puck (~120 lines, mostly block config):** ships the whole editor — component drawer, outline, auto-generated fields from a `fields` spec, viewport preview, undo/redo, publish button, breadcrumbs. You only write `{ fields, defaultProps, render }` per block type. This is very close to Squarespace UX out of the box.

## Data-model fit

- **Puck:** `content: [{ type, props: {id, ...} }]` + `zones` for nesting — nearly identical to `WebBlock.type` + `WebBlock.content` JSON. A publish adapter would be a thin map.
- **Craft.js:** lz-string node tree with `resolvedName`, `isCanvas`, `linkedNodes` — needs a translation layer and names aliased to our block types.

## Spike bugs found and fixed (worth knowing)

- Craft `<Frame>` requires a single root child → added a `CraftRoot` canvas node.
- Craft settings must key fields by `displayName`, not component fn name.
- Craft create-drag is mousedown-based; node move-drag is HTML5 — Playwright `dragTo` only works for moves.
- Puck items require `props.id` — without it, seed content rendered as the wrong type.
- Puck renders canvas in an iframe; app dark `body` styles leaked in → `iframe={{ enabled: false }}` renders inline and inherits `light-scope`.
- Component keys can't contain spaces (`'Trust Bar'` → `TrustBar` + `label`).

## Recommendation

**Puck.** It removes exactly the part that keeps breaking — bespoke canvas/DnD/inspector chrome — and its data model is closest to ours. Craft.js would be the pick only if we need pixel-level positioning freedom (it supports any layout via custom canvases); for a section/block builder, Puck's opinionated model is a feature.

## If we proceed (next steps)

1. Map all 25 block types to Puck config (`fields` + `render` reusing `BlockContent`/`public-*`).
2. Data adapter: `WebSection[]/WebBlock[]` ⇄ Puck `content/zones`.
3. Save draft → serialize Puck data; publish → same pipeline as now.
4. Mobile editing story: Puck viewport switcher + our `mobileAuto` equivalent (column stack is natural in Puck's model).
5. Inline text editing: keep fields in sidebar (Puck `textarea`/`text` fields), or custom field with TipTap later.
6. Keep Fluid Engine behind a flag while validating; migrate page-by-page.
