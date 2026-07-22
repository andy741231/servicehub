# Web Editor Code, UX, and UI Review

**Reviewed:** 2026-07-21  
**Target:** `/hub-admin/web/editor/:slug` (active Fluid Engine)  
**Requested URL:** `http://localhost:3000/hub-admin/web/editor`

## Review scope and method

This review covers the active React editor path only:

- `client/src/pages/web/editor/WebEditor.jsx`
- `client/src/pages/web/editor/fluid/FluidSection.jsx`
- `client/src/pages/web/editor/fluid/FluidBlock.jsx`
- `client/src/pages/web/editor/InlineTextEditor.jsx`
- `client/src/pages/web/editor/BlockContent.jsx`
- Shared builder controls, the public renderer, editor API routes, and persistence boundary

The Craft.js and legacy drag-and-drop implementations were excluded except where their imports or retained code affect the active editor.

### Runtime limitation

The supplied URL does not match the router; `App.jsx` defines `editor/:slug`. Opening `/hub-admin/web/editor` produced a blank route and `No routes matched location` warnings. The valid home-page editor URL is `/hub-admin/web/editor/home`. A clean browser session redirected that URL to sign-in, so an authenticated canvas could not be visually exercised without credentials. Runtime findings below are therefore split between **observed** behavior (routing/auth) and **code-inferred** behavior (authenticated editor UI). An authenticated usability pass at 375, 768, 1024, and 1440 px remains required before implementation sign-off.

## Executive assessment

The Fluid Engine has a strong technical foundation: editor and public renderer share grid coordinates, desktop and mobile layouts are stored separately, alignment guides are provided, keyboard nudging exists, and the public rich-text path is sanitized. The main risk is not visual polish; it is **trust and interaction reliability**. The editor currently communicates “Saved” when changes are unsaved, publishes only the last server-saved draft, exposes destructive actions without confirmation, renders several nonfunctional controls as if they work, and relies heavily on hover/mouse interaction.

| Area | Assessment | Main reason |
|---|---|---|
| Code architecture | Needs improvement | 891-line orchestrator, dead-branch imports, unbounded snapshot history, unstable client IDs |
| Editing UX | High-risk | Save/publish ambiguity, no dirty-exit protection, destructive actions are immediate |
| Accessibility | High-risk | Canvas operations are largely mouse-only; dialogs lack complete focus management |
| Responsive UX | Needs improvement | “Edit layout” and “preview width” are two independent device concepts with conflicting combinations |
| UI consistency | Promising but unfinished | Strong canvas chrome direction, but dense hover overlays, tiny controls, mixed token/hard-coded styling, and placeholders |

## What is working well

1. **Editor/public parity is built into the model.** Grid coordinates are used in both `FluidBlock` and `Home.jsx`, reducing preview drift.
2. **Responsive authoring is explicit.** `fluid` and `fluidMobile` allow intentional mobile composition rather than relying only on automatic stacking.
3. **Useful power-user interactions exist.** Undo/redo, keyboard nudging, multi-select, grid toggling, alignment guides, and reduced-motion checks are a good base.
4. **The public rich-text rendering path uses DOMPurify.** This is important because contentEditable HTML is persisted and rendered publicly.
5. **The empty states are action-oriented.** Both live and edit modes provide a clear first action.
6. **The global design system provides focus rings and reduced-motion overrides.** Shared builder controls also expose labels and pressed states.

# Prioritized findings and recommendations

## P0 — Fix before expanding editor features

### 1. Make save and publish state truthful

**Evidence**

- `BuilderSaveStatus` maps `idle` to “Saved,” but edits never set `saveStatus` to `unsaved`.
- `lastChangeTime` is written but never used.
- `handlePublish` calls `POST /web/:slug/publish` without first saving current React state.
- The server publishes a snapshot of the database draft, so unsaved canvas changes are not included.
- Exiting edit mode has no dirty-state prompt or draft preservation.

**User impact**

A user can edit, see “Saved,” press Publish, and publish an older version. This breaks the editor’s core trust contract and can cause content loss.

**Recommendation**

- Derive a real dirty state from the current document revision versus the last successfully saved revision.
- State model: `clean | dirty | saving | saved | error`; never label initial/dirty state as “Saved.”
- Make Publish transactional from the user’s perspective: save the current draft, await success, then publish that exact revision.
- Disable or queue Publish while saving; show “Save failed — not published” on failure.
- Add dirty-exit protection for editor Exit, browser navigation, and refresh.
- Prefer debounced autosave after interaction commits, while retaining explicit Save and `Cmd/Ctrl+S`.
- Show a persistent timestamp such as “Saved 10:42 AM,” not a success message that disappears after two seconds.

**Acceptance criteria**

- Editing immediately changes status to “Unsaved changes.”
- Publish always contains the visible canvas state.
- Failed saves remain visibly actionable and offer Retry.
- Users cannot accidentally exit with unsaved changes.

### 2. Give every new and duplicated entity a stable client ID

**Evidence**

- `addBlockToSection` creates a block without an `id`.
- Duplicating blocks and sections explicitly deletes the copied ID.
- Selection is keyed by `block.id`; unsaved blocks therefore share `undefined`.
- Rendering falls back to array indexes, which are unstable after insert/reorder.

**User impact**

Selecting one new block can select multiple unsaved blocks, multi-select becomes unreliable, and React can reuse the wrong component state after reorder.

**Recommendation**

- Add a `clientId` using `crypto.randomUUID()` in the block/section factory.
- Use `id ?? clientId` for React keys, selection, guides, and commands.
- Preserve `clientId` through local history and map server IDs after save without remounting the editor.
- Centralize creation/duplication in factories; do not construct entities ad hoc in `WebEditor`.

### 3. Remove or clearly disable controls that do not work

**Evidence**

The active toolbar contains TODO handlers for Text style, Pin, and Add adjacent block. “Ask Beacon” is a clickable coming-soon placeholder. “View Layouts” opens the add-section flow rather than editing the selected section’s layout. The section icon using `Save` actually toggles section height.

**User impact**

Controls appear actionable but do nothing or perform a different action. This creates repeated failure and makes the editor feel unfinished.

**Recommendation**

- Hide unfinished actions from production, or render them disabled with a visible “Coming soon” label—not only a title tooltip.
- Rename “View Layouts” to match its actual behavior or implement a layout replacement workflow.
- Replace the misleading Save icon with an explicit height icon and label.
- Keep one discoverable layering control; remove the low-opacity duplicate cluster.

### 4. Protect destructive operations

**Evidence**

Delete block, Delete/Backspace, and Remove section execute immediately. There is no confirmation, undo toast, or accessible announcement. A section may contain many blocks.

**Recommendation**

- For block deletion, use an undo toast with a short recovery window.
- For section deletion, show a confirmation describing the number of affected blocks, then provide Undo.
- Ignore Delete/Backspace when focus is in any editable/form control, including custom widgets.
- Announce deletion and restoration via an `aria-live` region.

## P1 — Core usability and accessibility

### 5. Redesign canvas interaction for keyboard and touch

**Evidence**

- Fluid block/section selection is attached to non-focusable `div` mouse handlers.
- Drag/resize is pointer-driven through `react-rnd`; resize handles are 9×9 px visually.
- Section chrome appears only on hover/selection, and the fluid files expose no ARIA labels, roles, or tab stops for canvas entities.
- Several toolbar buttons are 28–36 px, below the recommended 44×44 touch target.

**Recommendation**

- Make each section and block keyboard-selectable with a meaningful accessible name, for example “Text block, section 2, position column 1 row 3.”
- Add a persistent Layers panel as the accessible alternate to direct manipulation. It should support selection, reorder, rename, hide/lock, duplicate, and delete.
- Support keyboard move and resize modes with visible instructions and announcements.
- Increase touch targets to at least 44×44 px while retaining compact visual icons via padding.
- Do not depend on hover to reveal the only route to essential actions.
- In mobile layout editing, use inspector controls and stepper inputs as the primary layout mechanism; drag can remain an enhancement.

### 6. Replace custom modal behavior with an accessible dialog primitive

**Evidence**

The Add Section, Add Block, and Keyboard Shortcuts overlays declare `role="dialog"`, but do not move focus into the dialog, trap focus, restore focus to the opener, or make the backdrop itself focusable. Their local `onKeyDown` Escape handler is therefore unreliable; a document listener closes only some dialogs. Add Section’s close icon has no accessible name.

**Recommendation**

Use the existing Radix/react-aria stack (or shadcn Dialog) for:

- focus trap and initial focus;
- Escape handling;
- focus restoration;
- labelled title and description;
- scroll locking;
- responsive bottom-sheet presentation on small screens.

Use a searchable Command/Combobox pattern for Add Block once the library grows.

### 7. Unify device controls into one responsive authoring model

**Evidence**

The toolbar exposes:

1. `viewport`: Desktop/Mobile, which chooses the coordinates being edited; and
2. `previewDevice`: Desktop/Tablet/Mobile, which only changes frame width.

These controls can conflict—for example, edit desktop coordinates inside a mobile-width frame. Tablet has a preview but no tablet layout model. At narrower application widths, the fixed 52 px toolbar has multiple non-wrapping groups plus an absolutely centered title, making collision/overflow likely.

**Recommendation**

- Present one segmented control: Desktop, Tablet preview, Mobile.
- Clearly label whether a breakpoint is editable or preview-only. Example: “Tablet — previews desktop layout.”
- Automatically select mobile coordinates when Mobile is chosen.
- Move secondary actions into an overflow menu below 1200 px.
- At small widths, use a two-row toolbar or bottom action bar; do not compress icon targets.
- Add a breakpoint indicator and canvas width in pixels.

### 8. Simplify section chrome and reduce visual obstruction

**Evidence**

A selected/hovered section can simultaneously show top and bottom Add Section pills, Layers, Add Block, a 168 px action panel, Ask Beacon, a height toggle, a settings panel, block toolbars, outlines, resize handles, grid lines, and alignment guides. Much of this overlays page content.

**Recommendation**

- Keep canvas chrome minimal: section label/handle, Add Block, and a single More menu.
- Put section settings in a persistent right inspector instead of an overlay inside the section.
- Show Add Section only between sections, not both above and below every section.
- Use semantic labels and tooltips; avoid two simultaneous icon clusters.
- Apply chrome based on selection rather than hover to reduce flashing while moving across the canvas.

### 9. Improve inline rich-text editing

**Evidence**

- The contentEditable removes its focus outline and disables spellcheck.
- The formatting toolbar appears only for a non-collapsed selection, making formatting hard to discover.
- It uses deprecated `document.execCommand` despite TipTap already being installed.
- Link/image insertion uses blocking `window.prompt` and does not validate protocols.
- Each InlineTextEditor instance installs document `selectionchange` and global scroll/resize listeners.

**Recommendation**

- Add an intentional editing focus treatment distinct from block selection.
- Enable spellcheck by default.
- Show a compact formatting bar on focus, with selection-sensitive controls as needed.
- Reuse the installed TipTap stack or create one shared formatting service; avoid adding another editor dependency.
- Replace prompts with accessible popovers containing URL validation, “open in new tab,” link removal, alt text, and asset-library image selection.
- Sanitize/normalize HTML at the persistence boundary as defense in depth.

### 10. Improve error, loading, and empty-route handling

**Evidence**

- Fetch failure logs to console and then leaves an empty editor state, visually resembling a valid blank page.
- The requested slugless URL renders no route at all.
- Publish and template-save failures are console-only.

**Recommendation**

- Add `/hub-admin/web/editor` behavior: redirect to Pages or the home editor; never show a blank app.
- Render an error state with Retry and Back to Pages when page loading fails.
- Use inline/toast errors for save, publish, template, and version restore operations.
- Differentiate 401, 403, 404, offline, and server errors.
- Use a canvas skeleton that mirrors the toolbar and section structure rather than a generic pulsing circle.

## P2 — Maintainability, performance, and polish

### 11. Split the editor orchestrator and remove dead active-path code

`WebEditor.jsx` is 891 lines and mixes data fetching, save/publish, history, keyboard commands, document mutation, live preview, toolbar, three modals, and legacy operations. It also imports the disabled legacy drag-and-drop system and many components unused by the Fluid branch.

**Recommendation**

Extract:

- `useWebDocument(slug)` — fetch, normalize, dirty state, save, publish;
- `useEditorHistory()` — bounded transactions;
- `useEditorCommands()` — keyboard command registry;
- `EditorTopBar`;
- `EditorCanvas`;
- `BlockPickerDialog` and `KeyboardHelpDialog`;
- pure block/section command functions with unit tests.

Move rollback-only implementations outside the active bundle or load them dynamically behind an explicit feature flag. Remove `USE_CRAFT = false` branches and unused imports from the production path.

### 12. Make history transactional and bounded

Every contentEditable input calls `onChange`, which clones sections and appends a full document snapshot. Long typing sessions can produce hundreds of large snapshots, excessive rerenders, and one-character undo steps.

**Recommendation**

- Group typing into one history transaction per focus session or idle interval.
- Commit drag/resize only on stop, not during movement.
- Cap history by operation count and/or memory estimate.
- Use Immer patches (already installed) or command deltas instead of full snapshots.
- Clear or remap selection after undo/redo when entities no longer exist.

### 13. Validate layout constraints and prevent invisible content

Numeric section controls accept unrestricted values. Layering can set `zIndex` to `-1000`, potentially placing blocks behind the section; right-edge drag clamping can shrink/misplace a block because only the end coordinate is clamped. Mobile fallback can reuse 24-column desktop coordinates in the 6-column public grid when no mobile coordinates exist.

**Recommendation**

- Add Zod schemas for section config and block coordinates.
- Clamp gap, row height, padding, margins, row/column bounds, minimum spans, and z-index.
- Preserve span when clamping movement at both edges.
- Generate a deterministic 6-column mobile fallback instead of directly reusing desktop coordinates.
- Detect overlaps/out-of-bounds content and offer “Auto arrange.”

### 14. Standardize visual tokens and component states

The editor mixes semantic tokens with hard-coded `#181b22`, `#8a90a0`, `#7ee08a`, white surfaces, pink guides, custom shadows, and multiple radii. White floating chrome may fail in dark mode, while the global app supports themes.

**Recommendation**

- Define editor-specific semantic tokens: `--editor-chrome`, `--editor-chrome-text`, `--editor-selection`, `--editor-guide`, `--editor-handle`, `--editor-canvas`.
- Verify WCAG AA contrast in both themes.
- Use one target-size scale, one toolbar radius, one elevation, and one selection color.
- Add visible `focus-visible`, hover, pressed, selected, disabled, loading, success, and error states to every editor control.
- Keep animation in the 150–250 ms range and continue honoring reduced motion.

### 15. Add automated coverage for the active editor

No focused tests were found for WebEditor, FluidSection, FluidBlock, or InlineTextEditor.

**Minimum test plan**

- Unit: coordinate clamping, mobile fallback, create/duplicate IDs, document normalization.
- Unit: dirty/save/publish state machine and failed-save behavior.
- Component: keyboard selection, nudge, resize mode, delete/undo, dialog focus restoration.
- Component: grouped rich-text history and safe link handling.
- Integration: edit → save → publish exact visible revision.
- E2E: desktop and mobile layout persistence, refresh recovery, authenticated 401/403/404 handling.
- Accessibility: axe checks plus manual keyboard and screen-reader flows.
- Visual regression: 375, 768, 1024, and 1440 px in light and dark themes.

# Recommended target UX

## Information architecture

- **Top bar:** Back/Exit, page title, save state, breakpoint selector, Undo/Redo, Preview, Publish, More.
- **Left panel:** Add and Layers tabs. Add contains searchable blocks and reusable sections; Layers is the keyboard-accessible document tree.
- **Center:** Canvas with restrained selection outlines and between-section insertion controls.
- **Right panel:** Contextual inspector for Page, Section, or Block. Advanced spacing/layout controls live here rather than over the content.
- **Bottom/status area:** zoom, canvas width, grid/snap controls, and concise keyboard hints.

## Primary workflow

1. Open directly in edit mode from Pages; use Preview as an explicit mode.
2. Add a section from a between-section control or reusable layout library.
3. Add/search/drag a block from the left panel.
4. Select content and edit inline; configure structure and styling in the right inspector.
5. See “Unsaved changes,” then autosave or Save.
6. Preview desktop/tablet/mobile through one breakpoint control.
7. Publish the exact saved revision and receive a timestamped confirmation with a public-page link.

# Suggested implementation sequence

## Phase 1 — Trust and correctness

1. Stable client IDs.
2. Dirty/save/publish state machine and save-before-publish.
3. Dirty-exit protection and visible error recovery.
4. Delete confirmation/undo.
5. Remove or disable placeholder actions.
6. Route redirect/error boundary for the slugless URL.

## Phase 2 — Accessibility and responsive workflow

1. Accessible Dialog primitives.
2. Focusable canvas entities and a Layers panel.
3. Unified breakpoint selector and responsive top bar.
4. 44 px targets, labelled controls, focus management, and announcements.
5. Mobile inspector-based positioning.

## Phase 3 — Architecture and polish

1. Split `WebEditor` into document, history, command, toolbar, canvas, and dialog modules.
2. Transactional bounded history.
3. Shared rich-text editor using the installed TipTap stack.
4. Editor semantic tokens and dark-mode audit.
5. Unit, integration, E2E, accessibility, and visual regression coverage.

# Success metrics

Track these after implementation:

- Zero cases where published content differs from the visible revision.
- Save failure recovery rate and unsaved-exit prevention rate.
- Time to add and edit the first block.
- Undo success rate after delete, drag, and text editing.
- Percentage of core tasks completable with keyboard only.
- Mobile overflow defects at supported breakpoints.
- Editor interaction latency and history memory growth on a large page.

# Final recommendation

Do not prioritize additional block types or AI assistance yet. First make save/publish behavior trustworthy, assign stable IDs, remove false affordances, and provide accessible non-drag alternatives. Those changes will improve perceived quality more than cosmetic restyling. After the P0 work, consolidate the interface into a three-pane editor with a restrained canvas, searchable Add/Layers panel, contextual inspector, and one coherent responsive control.