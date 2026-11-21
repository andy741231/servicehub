# Web Builder Editor — UX Test & Review Plan

**Purpose:** a click-by-click audit of the page editor from a *web designer's* point of view.
The question for every surface is not "does it work?" but **"would a designer
expect this, find it without docs, and enjoy using it?"** — benchmarked loosely
against Squarespace / Wix / Webflow conventions.

**Method**

- Clicks only. No API calls, no DevTools edits, no DB edits. (`browser_evaluate`
  reads are allowed for verification, not for input.)
- Persona: a competent web designer who has never seen this editor.
- Environments: local editor `http://localhost:3000/hub-admin/web/editor/home`,
  public renderer `http://localhost:3000/`.
- Viewports: Desktop (full width), Tablet (768 px, preview), Mobile (375 px, editable).
- Use a **scratch page**, not `home` — or clean up test sections afterward.
- Browser console open the whole time; log every error.

**Recording format** — every issue gets an entry:

```
ID:          SURFACE-## (e.g. PALETTE-03)
Severity:    Blocker | High | Medium | Polish
Surface:     where it lives (toolbar / inspector / canvas / …)
Clicked:     the exact steps taken
Expected:    what a designer would expect
Actual:      what happened
Need:        the underlying designer need
Suggestion:  candidate fix (UI, copy, or behavior)
```

Severity guide — **Blocker**: can't complete a basic task without it.
**High**: works but confuses or fights the designer. **Medium**: friction or
inconsistency. **Polish**: spacing, rhythm, copy, animation.

---

## Pass 0 — Entry & orientation (before touching anything)

| # | Action | Watch for |
|---|--------|-----------|
| 0.1 | Land on `/hub-admin/web/editor/home` fresh | Does it open in **edit** mode (not live preview)? Is the current draft/published state obvious at a glance? |
| 0.2 | Look at the page for 5 seconds, don't click | Can you tell *where to click first*? Is the canvas visually the site, or editor chrome? Is the Quick-tour hint obvious and dismissible? |
| 0.3 | Read the top bar left→right | Save status wording ("Saved", "Unsaved changes"), Publish/Unpublish state, Exit, page title |
| 0.4 | Hover every top-bar control | Tooltips present? Labels readable? Icons self-explanatory? |
| 0.5 | Press `?` or open keyboard help | Does a help sheet exist? Are the shortcuts discoverable? |
| 0.6 | Check the URL / breadcrumb | Can a designer get back to Pages without Exit losing state? |

Designer needs: immediate edit-ability, confidence about what's saved/live,
and an obvious first action.

---

## Pass 1 — Top toolbar (every button)

| # | Control | Test |
|---|---------|------|
| 1.1 | SAVE | Dirty → Save → "Saved · time" appears; button state; Cmd/Ctrl+S parity |
| 1.2 | Exit | With dirty state → accessible confirm dialog (not browser `confirm`); with clean state → exits silently |
| 1.3 | Desktop / Tablet / Mobile radios | Each switches canvas width; Mobile is editable, Tablet preview-only — is that communicated? |
| 1.4 | Editable / width chip | Click it — does it do anything, or is it passive info? |
| 1.5 | Undo / Redo | After add, move, delete, text edit — does each step undo separately? Redo stack clear on new action? |
| 1.6 | Layers toggle | Opens global panel; toggles closed; stays in sync with section Layers buttons |
| 1.7 | Grid overlay (G) | Toggle shows 24-col grid + row lines; useful or noisy? |
| 1.8 | Page-check / lint popover | Run it on a page with issues — are findings clickable to the block? Understandable wording? |
| 1.9 | Version history | Open, preview an old version, restore — confirm dialog, state restored |
| 1.10 | Publish / Unpublish | Confirm dialog copy clear about consequences; unpublish offered when published |

Designer needs: one obvious save story, undo they trust, device preview that
matches reality.

---

## Pass 2 — Section chrome (hover a section)

Hover a section and exercise every control. Repeat for **first**, **middle**,
and **last** section, plus an **empty** section.

| # | Control | Test |
|---|---------|------|
| 2.1 | Hover reveal | Do controls appear on hover only? Is hover reachable on touch/tablet? Do they flicker when moving across the section? |
| 2.2 | "+ ADD SECTION" pill (top edge) | Clickable? Opens modal positioned sensibly? Not covered by the section above's blocks? |
| 2.3 | Layers icon (top-left) | Opens Layers **scoped to this section** with "Show all" escape hatch |
| 2.4 | "+ ADD BLOCK" pill | Clickable even when blocks near the top edge overlap it (z-order)? Opens palette targeting this section? |
| 2.5 | Edit Section menu (top-right) | Every item: Edit Section → settings panel; Add Section Below; Duplicate; Fill-screen toggle; Move up/down (disabled at ends?); Remove → confirm dialog with undo toast |
| 2.6 | Bottom-right height handle | Drag — does section height respond? Snap? Accessible alternative? |
| 2.7 | Bottom "+ ADD SECTION" | Same as top pill |
| 2.8 | Section Settings panel | Gap H/V, Row Height, Fill Screen, Min Height, Vertical Alignment (top/center/bottom), Background Color — each applies live; values persist after save/reload |
| 2.9 | Empty section state | "Empty section — add a block" + Add Block button clickable; dashed drop area accepts palette drops |
| 2.10 | Section spacing inputs | paddingTop/Bottom vs content — does the designer understand the difference between rowHeight and padding? Is spacing expressed in px, presets, or visual handles? |

Designer needs: section chrome that's clickable **every time**, spacing that
means something visual (not just numbers), and zero accidental destructive
actions.

---

## Pass 3 — Block palette

| # | Test |
|---|------|
| 3.1 | Open via "+ ADD BLOCK" — palette slides in, search auto-focused |
| 3.2 | Category tabs: Basics / Media / Layout / Sections — correct grouping, "All" default |
| 3.3 | Search "but" → Button only; search nonsense → empty state with reset |
| 3.4 | Click-add appends to the **right** section at a sensible spot, selects the new block |
| 3.5 | Palette stays open for multi-adds; X / Escape / backdrop all close |
| 3.6 | Drag a card onto the canvas → drop indicator shows target cell; drop lands where indicated |
| 3.7 | Drag over an empty section → full-area drop hint; drop appends |
| 3.8 | Drag in mobile-auto section → "drops append in order" hint path |
| 3.9 | Drag a card out and back without dropping — no ghost state, paletteDragType cleared |
| 3.10 | Palette scrolls on short viewports; z-order above all canvas overlays |

Designer needs: find the block in <5s, put it where the cursor is, never lose
the palette unexpectedly.

---

## Pass 4 — Every block type (the big matrix)

For **each** of the 25 types, run the same battery:

```
1. Add it         — is the default content sensible, not lorem junk?
2. Canvas         — does it look like the real site (fonts, colors, spacing)?
3. Select         — one click selects; outline + labeled toolbar appear
4. Edit content   — inspector Content tab (or inline edit) covers every field
                    the public renderer shows — nothing editable on the site
                    that's missing in the editor, and vice versa
5. Design tab     — spacing/colors/border controls apply live and persist
6. Move/resize    — drag handle moves; resize handles snap to grid;
                    arrow keys nudge; Shift+arrow = bigger step
7. Duplicate      — lands beside the original, new ids, independent content
8. Delete         — confirm or toast undo; Ctrl+Z restores
9. Mobile         — sane default in auto stack; custom mode editable
10. Public        — after save+publish, public output matches canvas 1:1
```

| Block | Specific things to probe |
|---|---|
| Text | Inline edit start/stop; floating toolbar options (bold/italic/link/lists); markdown vs rich text consistency |
| Heading | Level picker (H1–H4); default level sane; inline italic → serif accent on public |
| Button | Label, link, style tier (primary/secondary/tertiary + legacy gold/outline/navy), open-in-new-tab; tier restyle from Site Styles propagates; alignment |
| Image | Click-to-add → file picker / URL; alt text field; fit modes; caption; link; broken-src state |
| Icon | Icon picker coverage; size; color; alignment |
| Divider | Thickness/style fields? Or fixed? Enough control? |
| Spacer | Visible on canvas but invisible on public; resize affordance obvious |
| Video | YouTube/Vimeo URL → embed; invalid URL error state; aspect ratio |
| Gallery | Multiple images, grid cols, gap, lightbox on public? |
| Map | Address or embed code; zoom; pin |
| Social Links | Add/remove platforms; brand icons render; link URLs; ordering |
| Embed | iframe src; height; sandbox; invalid input |
| Logo | Text/image mode; size; link |
| Grid | Columns; per-cell content? Can it host other blocks? |
| Shape | Shape types, colors, layering (z-index makes sense) |
| Hero | Layout (default/split), eyebrow, title with italic, lead, dual CTAs, note, visual/image, min-height |
| Introduction | All text fields, CTA |
| Trust Bar | Item add/remove/reorder; multiline labels; numbers |
| Split Banner | Left/right content, both eyebrows, CTAs, image side |
| Features | Card count, icons, numbered variant, card style, per-item edit |
| Highlights | Cards, images, links |
| Events | Event rows: date, title, time, description formatting |
| Quote | Quote text, attribution, size |
| Testimonials | Multiple quotes, avatars, layout |
| Contact | Fields, map integration, phone/email linkify |

For every field found missing or confusing → log as a finding with the
designer-need ("designer must be able to X without touching code").

---

## Pass 5 — Inspector (right panel)

| # | Test |
|---|------|
| 5.1 | Opens via toolbar "Edit" (Content tab) and "Design" (Design tab); title shows block type |
| 5.2 | Stays pinned while canvas scrolls; closes via X, Escape, block deselect |
| 5.3 | Content tab covers **all** visible content of the block; every field labeled |
| 5.4 | Design tab: padding, margin, background, text color, border, radius — live preview, persists |
| 5.5 | Field types fit the data: textarea for multiline, color swatches for colors, selects for enums, steppers for numbers |
| 5.6 | No field accepts raw HTML without a markdown alternative — designer-safe |
| 5.7 | At 375 px viewport the inspector doesn't swallow the whole screen — or it's clearly dismissible |
| 5.8 | Switching block selection while open → inspector follows, correct tab preserved |
| 5.9 | Undo inside inspector fields (Ctrl+Z while focused vs global undo) — no conflict surprises |

Designer needs: one inspector mental model for *everything*, no dead-end forms.

---

## Pass 6 — Layers panel

| # | Test |
|---|------|
| 6.1 | Toolbar Layers → all sections + blocks listed, indented |
| 6.2 | Section-chrome Layers → scoped list ("Section N layers"), "Show all" returns to global |
| 6.3 | Click item → selects + scrolls canvas to it |
| 6.4 | Move up/down buttons reorder; canvas + mobile-auto order follow |
| 6.5 | Hide/show toggle → block hidden on canvas, state obvious, persists |
| 6.6 | Duplicate / delete from the row |
| 6.7 | Block names are friendly ("Button block 2") — would renaming help? (note as finding) |
| 6.8 | Panel coexists with inspector without z-fights |

---

## Pass 7 — Mobile editing (375 px editor viewport)

| # | Test |
|---|------|
| 7.1 | Switch to Mobile → existing sections show their mode (auto banner vs custom grid) |
| 7.2 | Auto section: blocks stacked in order; tap selects (no accidental move!); MobileLayoutInspector shows friendly summary + Move up/down |
| 7.3 | "Switch to custom mobile layout" → seeds coords from the stack, single undo step, drag handles appear |
| 7.4 | Custom section: coordinate steppers, quick presets (full/half/third width), "Back to auto layout" |
| 7.5 | Add a block in mobile view → appends to stack (auto) or sensible coords (custom) |
| 7.6 | Public page at 375 px — order/layout matches what the editor showed |
| 7.7 | Tablet 768 px — what's editable vs preview; is that clear? |

---

## Pass 8 — Drafts, publish & safety

| # | Test |
|---|------|
| 8.1 | Make edits → wait → autosave writes draft (check network/localStorage quietly) |
| 8.2 | Reload with unsaved edits → beforeunload fires; on return, recovery banner offers Restore / Discard |
| 8.3 | Restore → identical state; Discard → saved state, no banner again |
| 8.4 | Save → draft clears; Publish → confirm dialog → live; Unpublish → confirm → draft retained |
| 8.5 | Session expiry mid-edit → 401 behavior: does UI say something, does draft survive? |
| 8.6 | Revert-to-published — where is it, is copy clear? |
| 8.7 | Two tabs open same page → last-save-wins or warning? (note as finding either way) |

Designer needs: never lose work, always know what's live.

---

## Pass 9 — Site Styles → editor ↔ public consistency

| # | Test |
|---|------|
| 9.1 | Change a site color token → editor canvas updates; public updates after publish |
| 9.2 | Restyle Button tier (e.g. secondary bg) → every `public-button--secondary` restyles on canvas AND public |
| 9.3 | Type styles (heading font/size) → headings update everywhere |
| 9.4 | Editor chrome is NOT recolored by site tokens (`.editor-chrome` isolation) |
| 9.5 | Legacy variants (gold/outline/navy) still render correctly |

---

## Pass 10 — Accessibility & input

| # | Test |
|---|------|
| 10.1 | Tab through: section chrome → block → toolbar → inspector — logical focus order, visible focus rings |
| 10.2 | Select/move/delete a block keyboard-only |
| 10.3 | All icon buttons have aria-labels; block groups announce type + position |
| 10.4 | Modals: focus trap, Escape, focus returns to opener |
| 10.5 | Hit targets ≥ 44 px (mobile especially); no icon-only ambiguity without tooltip |
| 10.6 | Color contrast of chrome text vs backgrounds |
| 10.7 | Screen-reader announcements (aria-live) on select/delete/undo — listen or check markup |

---

## Pass 11 — Edge cases & error states

| # | Test |
|---|------|
| 11.1 | Image with broken URL; embed with garbage input; video with non-video URL |
| 11.2 | Very long heading / 500-word text block — canvas doesn't explode |
| 11.3 | 20 blocks in one section — performance, overlay z-fights |
| 11.4 | Overlapping blocks (zIndex) — can you still select the one underneath? (Layers path) |
| 11.5 | Rapid click-spam on Add Block, Save, Publish — no double-creates |
| 11.6 | Resize window mid-drag — drag doesn't corrupt coords |
| 11.7 | Remove section → undo toast → Ctrl+Z — identical restore |

---

## What a web designer needs (checklist to score against)

Score each **Yes / Partial / No + finding ID**:

- [ ] Add any element (button, image, divider…) to any section without code
- [ ] See the real site while editing (fonts, colors, spacing) — WYSIWYG
- [ ] Restyle a button everywhere by changing one tier
- [ ] Two-line and italicized headings without HTML
- [ ] Know instantly what's draft vs live, and recover unsaved work
- [ ] Trust that mobile won't look broken — auto-stack first, custom second
- [ ] Find every tool by looking, not guessing (labels > icons)
- [ ] Reorder and inspect structure from one Layers view
- [ ] Never click something unclickable or mystery-meat a control
- [ ] Go from blank page to publishable section in < 10 minutes, zero docs

---

## Output artifacts

1. `ux-review-web-v3.md` — findings log (ID / severity / expected vs actual /
   designer need / suggestion), grouped by surface.
2. Prioritized fix list: **Blockers first**, then High, grouped into phases like
   v2 (palette → interaction → unified editing → responsive/safety → polish).
3. Screenshot each Blocker/High finding while it's on screen.

**Done when:** every table row has been clicked at least once, the checklist is
scored, and every finding has a written entry — no silent "meh" moments.
