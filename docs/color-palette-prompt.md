# Prompt: theme color palette + preset swatches in the color picker

Copy everything below the line into a new agent session at the repo root.

---

Add a **site color palette** to the Web theme and surface it as **preset swatches** inside the
shared color picker, while keeping free-form color picking. Target page:
`http://localhost:3000/hub-admin/web/styles`.

## Context you need

- Read `THEME.md`, `AGENT.md`, and `docs/web-editor-plan.md` for conventions.
- A shared picker already exists: `client/src/components/ColorPicker.jsx` — react-colorful
  popover, hex input, optional alpha. Used by `pages/web/Styles.jsx` (6 theme tokens) and
  `pages/web/HeaderFooter.jsx` (`ColorRow`). **It has no presets today.**
- `pages/web/editor/EditorInspector.jsx` `ColorField` still uses a **native**
  `<input type="color">` + hex field — used for section Background and the block Design tab
  (background, text color).
- Theme tokens live in `WebSiteStyle.tokens` (JSON string). `GET/PUT /api/web/styles`
  (`server/src/controllers/webStyles.js`) stores the object **verbatim** — a `palette` key
  rides along with zero server or schema changes. Verify this; don't add an endpoint.
- The editor already receives the theme: `loadSiteContext()` in `controllers/web.js` attaches
  `siteStyle` (parsed tokens) to the admin page response → `pageData.siteStyle.tokens` in
  `WebEditor.jsx`. Same for public pages — no new plumbing for reads.
- Defaults are defined twice: `Styles.jsx` `DEFAULT_TOKENS` and
  `client/src/site/siteTheme.js` `DEFAULT_SITE_TOKENS` (plus the server-side default in
  `webStyles.js`). Keep all three in sync.
- `resolveSiteTokens`/`siteThemeStyle` (`siteTheme.js`) map tokens → CSS vars. The palette is
  picker metadata — it does **not** need CSS variables.

## Safety rules (mandatory)

1. **Never open, edit or publish real site pages.** Verify only on temp pages from
   `createFixturePage()` in `e2e/helpers.mjs`; delete them at the end.
2. **Intercept image uploads** (`POST /api/web/assets`) — they hit real Azure blob storage.
3. Never run `npm ci`.
4. **Do not push.** Commit on a new branch.
5. Auth: `E2E_USERNAME` = local admin (ask if unknown).

## Feature 1 — `tokens.palette` data model

```ts
tokens.palette: Array<{ name: string, value: '#rrggbb' }>
```

- No DB/schema change: it lives inside the existing `tokens` JSON. Keep the entry shape strict
  (`name` non-empty, `value` valid 6-digit hex — normalise `#rgb`/`rgb()` on save).
- **Seed a default palette** in all three default locations (server `webStyles.js`,
  `DEFAULT_SITE_TOKENS`, `DEFAULT_TOKENS`): ~8 named, brand-useful colors (e.g. White, Ink,
  Navy, Gold, Sage, Slate, Warm Gray, Soft Blue) chosen to work with the seeded theme. The 6
  semantic tokens are *already* shown as presets, so don't just duplicate them in the palette.
- `resolveSiteTokens` should merge `palette` too (`{ ...defaults.palette, …}` — array: prefer
  the stored one when present) so consumers always get a defined value.
- Stored usages are literal hex (blocks/sections save the color, not a palette reference), so
  deleting a palette entry never breaks existing content — say so in the UI if space allows.

## Feature 2 — Styles page: palette management (`pages/web/Styles.jsx`)

New "Color palette" section under the existing Colors card:

- Rows: swatch (opens `ColorPicker`), editable name field, hex field, delete button.
- "Add color" button appends a new entry (suggest next unused name like "Color 9", last used
  color or a default).
- Reuse the existing dirty-check / Save / Reset flow — palette changes are part of `tokens`,
  so `isDirty` must include them (it will, via JSON compare).
- Keep the existing live preview row; add palette swatches to it.
- Empty state (all deleted): "No palette colors. Add your brand colors — they'll appear as
  presets everywhere you pick a color."

## Feature 3 — ColorPicker presets (`components/ColorPicker.jsx`)

Add an optional prop:

```ts
presets?: Array<{ name: string, value: string }>
```

- Popover gains a **"Site colors"** swatch grid between the react-colorful picker and the hex
  input: small square/round swatches, one per preset, `title`/`aria-label` = `"<name> <hex>"`.
- Clicking a preset commits that color immediately (same as picking it on the wheel).
- Current value gets a ring/check on the matching preset.
- Presets hidden entirely when the prop is absent/empty — existing callers unchanged.
- Keep everything else: alpha support, hex input, viewport flip, Esc/click-outside, Done.

## Feature 4 — wire presets into every site color field

Build one helper — e.g. `siteColorPresets(tokens)` in `siteTheme.js` (or a small client util) —
returning semantic colors first (`Primary`, `Secondary`, `Accent`, `Background`, `Body Text`,
`Muted Text`) then the palette entries. Use it in:

- **`EditorInspector.jsx` `ColorField`** — replace the native `<input type="color">` + text
  field with `ColorPicker` + presets (keep the hex text field and the "Default"/checker
  state and Reset). Thread `pageData.siteStyle.tokens` down: `WebEditor` → `EditorInspector`
  prop → `ColorField`. Covers section Background + block Design colors in one move.
- **`Styles.jsx`** — token rows and palette rows both get presets (lets people pull palette
  colors into semantic slots).
- **`HeaderFooter.jsx` `ColorRow`** — header/footer colors are site chrome; fetch
  `GET /web/styles` there (or reuse a shared hook) for presets.
- **Optional:** `EmailBuilder.jsx` uses three native `type="color"` inputs — swapping them to
  the shared picker *without* presets is a consistency win but out of scope; do it only if
  trivial, and say you did.

### Commit semantics (important)

`ColorField` today commits once per pick (native `change` = on close), which keeps one undo
step and one autosave per change. `ColorPicker.onChange` fires on every drag tick. Preserve
the one-step semantics: preset clicks commit immediately; wheel/hex changes may live-preview
but must **commit once when the popover closes / Done** — not on every mouse move. Reuse the
existing `CommitInput` pattern or wrap the picker's `onChange`/`onClose` accordingly.

## Hard rules

- No server or Prisma changes — `palette` rides in `tokens` JSON; verify the PUT round-trips
  it untouched.
- No new dependencies (react-colorful is installed).
- Keep `ColorPicker` backward compatible (all props optional).
- a11y: preset swatches are real buttons with labels; popover stays a `role="dialog"`.
- Design tokens for all new chrome (`--surface`, `--border`, `--primary`…), 44px targets.

## Verify

1. Styles page: add/rename/recolor/delete palette colors → Save → reload → persisted; check
   `GET /web/styles` response contains `palette`.
2. Editor (temp page): inspector color fields show the Site colors grid incl. palette; click a
   preset → applies → one undo step reverts it; custom wheel + hex still work; Reset/"Default"
   states intact.
3. Header & Footer page: color rows show presets.
4. A public temp page renders unchanged (palette affects only pickers).
5. `npm run e2e`, `npm -w client run build`, `npm -w server test` — clean.
6. Commit on a new branch. **Do not push.**

## Report back

- Screenshots: palette section, picker popover with Site colors grid, inspector color field
- The seeded default palette (names + hex) and where you put `siteColorPresets`
- Any place you found colors being picked that isn't listed here
- Test results and branch name
