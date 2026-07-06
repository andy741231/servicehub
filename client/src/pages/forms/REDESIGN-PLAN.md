# Form Builder — UX/Design Evaluation & Redesign Plan

Evaluated against `ui-ux-pro-max` recommendations for a **Productivity Tool / SaaS**:
**Flat Design + Micro-interactions**, clear hierarchy, functional colors, WCAG AA+,
soft shadows, 8–12px radius, 200–300ms animations.

The project token system (`client/src/index.css`) already matches the recommended
SaaS palette (trust blue `#2563EB`, neutral greys, semantic states, 6/8/12px radius,
soft multi-layer shadows). The redesign therefore focuses on **layout hierarchy,
visual noise, micro-interactions, and consistency** — not a re-theme.

---

## Evaluation (current state)

### Strengths
- Solid 3-pane builder layout (palette / canvas / properties+preview).
- Good a11y baseline: `aria-label`s, focus-visible rings, 44px touch targets on
  primary buttons, `sr-only` labels, `prefers-reduced-motion` support.
- Autosave status indicator with `aria-live` is well done.
- Design tokens are centralized and consistently referenced.

### Issues found (by impact)

1. **Toolbar is cramped & flat in hierarchy.** Right side stacks 4 equal-weight
   text buttons (Preview, Share, Export, History) + Save. No primary/secondary
   distinction; Save (the key action) competes with Export. Icon-only buttons
   (back/undo/redo) are 36px — below the 44px standard used elsewhere.

2. **No form status in the builder.** Draft/Published only appears on dashboard
   cards. The builder gives no sense of state.

3. **Empty canvas state is weak.** A dashed "Add row" button under a bare
   title/description. No inviting hero, no quick-start, no template nudge.

4. **Form header is uncontained.** Title is a raw `text-3xl` input floating above
   the canvas with no card, no description affordance, no character guidance.

5. **Field cards are noisy.** Duplicate/Delete buttons are always visible on every
   field, competing with field content. (Content blocks already do hover-reveal —
   regular fields don't.)

6. **Section header is busy.** Grip + collapse + name + duplicate + delete crammed
   into a ~40px bar with two tiny adjacent targets (grip & chevron).

7. **Radius scale is inconsistent.** Mix of `rounded-base` (6px) on inputs/field
   cards, `rounded-lg`/`rounded-xl` on sections, `rounded-2xl` on modal. The skill
   recommends 8–12px for productivity tools.

8. **Palette is monochrome.** All 20 field types use the same grey icon chip.
   Productivity guidance calls for **functional colors** — category-tinted icons
   would dramatically improve scannability across Basic/Choice/Advanced/Personal/Layout.

9. **`/` shortcut hint is buried** at the bottom of the palette; the search
   placeholder doesn't mention it.

10. **Micro-interactions are minimal.** Only hover color shifts. No entrance
    animations on add, no smooth collapse transitions, no press feedback on
    builder buttons (login already uses `active:scale-95`).

11. **Properties panel header is static.** Switching selection just swaps title
    text — no clear "back to form properties" affordance or selection breadcrumb.

---

## Redesign Plan

### Phase A — Toolbar & chrome refinement  (`FormsBuilder.jsx`)
- Left cluster: Back (40px) → divider → Undo/Redo (40px, disabled states) → divider
  → **form title breadcrumb** (truncated) + **status badge** (Draft/Published).
- Center: autosave status (moved out of the left cluster so it doesn't crowd Save).
- Right cluster: Preview (icon+label) + Share (icon+label) → **overflow "More" menu**
  (Export, History) → primary **Save** (blue, always last/prominent).
- All icon-only buttons → 40px min; add keyboard-shortcut hints to `title`s
  (Save `Ctrl+S`, Undo `Ctrl+Z`, Redo `Ctrl+Y`, Preview `Ctrl+P`-ish).
- Press feedback: `active:scale-95` on all toolbar buttons.

### Phase B — Canvas header & empty state  (`FormsBuilder.jsx`, `FormCanvas.jsx`)
- Wrap title + description in a subtle **header card** (`bg-surface` + border +
  `rounded-xl`) with a small "Form details" label and a description placeholder
  that reads "Add a description…" when empty.
- Redesign empty state (no rows): centered hero — large icon circle, headline
  "Start building your form", subtext, primary **"Add your first field"** button
  (opens field modal directly) + secondary "Browse templates" link.
- Entrance animation: new fields/sections fade+slide in (`animate-in`).

### Phase C — Section & field card polish  (`FormCanvas.jsx`)
- **Hover-reveal** regular field action buttons (duplicate/delete) — match the
  content-block pattern; reduces constant visual noise.
- Section header: collapse chevron + name + field-count chip; grip + actions
  hover-revealed. Slightly taller (44px) for easier targeting.
- Unify radius: field cards → `rounded-lg` (was `rounded-base`); inputs stay
  `rounded-base`; sections stay `rounded-xl`. Modal stays `rounded-2xl`.
- Selected field: clearer ring (`ring-2 ring-primary/30`) + subtle left accent bar.

### Phase D — Palette upgrade  (`FieldPalette.jsx`)
- **Category-tinted icon chips**: Basic=blue, Choice=violet, Advanced=amber,
  Personal=teal, Layout=slate (tinted bg + tinted icon, still subtle).
- Move the `/` hint into the search placeholder ("Search fields or press /").
- Keep click-to-add (drag-from-palette is a larger DnD refactor, out of scope).

### Phase E — Right panel & micro-interactions  (`FormsPanel`, `PropertiesPanel.jsx`)
- Properties header: when a field/section is selected, show a small
  "**← Form properties**" back link + the selection name; clicking returns to
  form-level properties (deselects).
- Smooth section collapse: `transition-all` + animated chevron rotation.
- Press feedback + 200ms transitions on toggles.

### Out of scope (kept for a later pass)
- Drag-from-palette into canvas (DnD refactor).
- Repeating-group child-field data model (tracked bug #1 in forms SKILL.md).
- Command-palette arrow navigation (tracked #4).

### Verification
- `cd client && npx vite build` must pass with no errors.
- Re-run Playwright screenshot script to confirm visual changes.
