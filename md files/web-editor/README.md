# Web Editor — UX Docs Index

Reviews and plans for the Web Builder's Fluid Engine editor (`client/src/pages/web/editor/`).
The canonical architecture lives in `.devin/skills/web/SKILL.md` and `agent.md`.

| Doc | Date | What it is | Status (code-checked 2026-10-25 on `main`) |
|-----|------|-----------|-------------------------------------------|
| `ux-test-plan-web.md` | 2026-09-26 | Reusable click-through test plan (Passes 0–11 + designer checklist) | Reusable. Run it again for each future audit |
| `ux-improve-web-v2.md` | 2026-09-27 | Designer-perspective review + 5-phase roadmap (elemental blocks, interaction blockers, unified inspector…) | **Open.** `BLOCK_TYPES` in `editorUtils.js` still has no Button/Heading/Divider/Spacer/Image block, so Phase 1 is not on `main` |
| `ux-review-web-v3.md` | 2026-09-26 | Click-through audit F1–F14 + "fix pass results" table | **Fix pass not found on `main`.** Markers from the claimed fixes (`selectPendingClick`, "Adding to Section", "Unpublished changes" diff popover, "Restore vN?" confirm) are missing from `client/src`. The fixes were likely never committed, so treat F1–F14 as open until re-verified |
| `ux-parity-web.md` | 2026-09-27 | Editor ↔ public render parity audit + fix (`fluidConfig` persistence) | Fix appears to have landed: `fluidConfig` is present in `client/src` |
| `ux-editor-spike.md` | 2026-09-27 | Craft.js vs Puck spike. Recommends Puck | **Undecided.** The lab files in `pages/web/editor-lab/` are **untracked and not routed** in `App.jsx`. `@craftjs/core` and `@measured/puck` exist only in local `node_modules` and are not declared in any `package.json` |

Superseded docs live in `scratch/md-archive/`. For example, `ux-improve-web.md` (2026-07-21) was replaced by v2.
