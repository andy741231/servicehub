---
name: service-hub-forms-page
description: Guide for building the drag-and-drop Form Builder and submission management dashboard.
---

# Form Builder (`client/src/pages/forms`)

## Overview
Allows building custom forms using a drag-and-drop interface, sharing them via unique endpoints, and analyzing incoming user submissions.

## Features
- **Form Editor:** 3-pane builder (left field palette, center canvas, right properties/preview) with drag-and-drop sections, 20 field types, conditional logic, version history, autosave, and a `/` command palette.
- **Form Submissions Inbox:** View submissions in a clean table format with search, filter, and sort.
- **CSV Exporter:** Download submission entries locally.
- **Form Analytics:** Submission trends (SVG line chart), field completion rates, date-range filters.
- **Templates Gallery:** 6 prebuilt forms (Contact, Feedback, Event RSVP, Job App, Support, Lead Capture) at `/hub-admin/forms/templates`.
- **Theme System:** 6 one-click theme presets, custom colors, font picker, progress bar/steps, conversational (one-question-per-screen) layout mode.

## Architecture
- `FormsShell.jsx` — tab navigation shell (Dashboard, Forms, Templates, Analytics)
- `FormsDashboard.jsx` — form cards grid with status badges, stats, filters, sort, overflow menu
- `FormsList.jsx` — list view of all forms with management actions
- `FormsBuilder.jsx` — 3-pane editor: left `FieldPalette`, center `FormCanvas`, right `PropertiesPanel` / live `FormRenderer` preview
- `FormAnalytics.jsx` — analytics view with submission trends and field completion rates
- `FormTemplates.jsx` — template gallery that clones rows+fields into a new form
- `Submissions.jsx` — submission inbox table with search, filter, CSV export
- `FormCanvas.jsx` — sections (rows) with 1-4 column layouts, drag-and-drop via `@hello-pangea/dnd`, collapsible sections, `FieldCard` rendering
- `FormRenderer.jsx` — public form with theming, validation, multi-page, conditional logic, access-schedule gating, computed-field auto-evaluation, repeating groups
- `PropertiesPanel.jsx` — field/section/form properties with General/Advanced/Logic tabs; dedicated panels for content blocks, image blocks, computed fields, repeating groups
- `AccessSchedulePanel.jsx` — form access-schedule editor (date ranges, weekly hours)
- `VersionHistoryPanel.jsx` — form version history with restore
- `FieldPalette.jsx` — categorized (Basic/Choice/Advanced/Personal/Layout) searchable field registry
- `store/formStore.js` — Zustand store with undo/redo (50 snapshots), API + localStorage fallback, form/submission CRUD
- `utils/formula.js` — safe formula evaluation for computed fields (`${Field Label}` references, sanitized math)
- `utils/conditionalLogic.js` — conditional show/hide evaluation
- `utils/schedule.js` — access-schedule evaluation (date ranges, weekly hours)
- `utils/slug.js` — slug generation and duplicate-name detection

## Field Types (20)
text, textarea, number, email, phone, date, url, select, checkbox, rating, slider, file, content, image, signature, computed, repeatingGroup, name, address, pageBreak

## Design Tokens
Uses the project's token system (`bg-surface`, `border-border`, `rounded-base`, `text-body`, etc.) defined in `client/src/index.css`. Badge classes: `badge-success`, `badge-warning`, `badge-danger`, `badge-info`, `badge-neutral`, `badge-primary`.

---

## Known Issues & Remaining Work

The following items were identified after the Phase 1-4 overhaul. They are tracked here so a future session can pick them up. **Work through them top-to-bottom** — item 1 is a real bug, the rest are polish.

### 1. BUG: Repeating Group data model is incomplete
**Problem:** `FormRenderer.jsx` finds "child" fields of a repeating group by matching `field.rowId === repeatingGroup.rowId`. But in the builder, fields in the same row are *siblings*, not children of the repeating group. There is no way to designate which fields belong inside a repeating group, and no canvas UI to add fields *into* a group.

**Fix required:**
- Add a `parentFieldId` property to fields (or a nested `childFields: []` array on the repeatingGroup field).
- Update `formStore.js`:
  - `addField` should accept a `parentFieldId` and set it on the new field.
  - Add a `moveFieldToGroup(fieldId, groupId)` action.
- Update `FormCanvas.jsx`:
  - When a `repeatingGroup` field is rendered, render its child fields (those with `parentFieldId === field.id`) *inside* the group card, with their own add/drag controls.
  - Add a "Add field to group" button inside the repeating group card that opens the field modal with `parentFieldId` preset.
- Update `FormRenderer.jsx`:
  - Change the `repeatingGroup` renderer to find children via `parentFieldId === field.id` instead of `rowId`.
- Update `PropertiesPanel.jsx`:
  - The `RepeatingGroupSettings` component is fine as-is (min/max/button label).
- Update `FormsBuilder.jsx` `handleAddField` to pass `parentFieldId` when adding into a group.

**Files to touch:** `store/formStore.js`, `components/FormCanvas.jsx`, `components/FormRenderer.jsx`, `FormsBuilder.jsx`

### 2. Computed field double-render on first load
**Problem:** Computed fields initialize as `''`, the auto-compute `useEffect` produces `'0'` (or `'0.00'`), which differs → triggers a second render. Stabilizes after one cycle. Not a crash, just a wasted render.

**Fix:** In the form-load `useEffect` (around line 704 of `FormRenderer.jsx`), initialize computed fields with their evaluated value (using zeros for all inputs) instead of `''`.

### 3. Dashboard "Duplicate" bypasses store history
**Problem:** `FormsDashboard.jsx` `handleDuplicate` calls `useFormStore.setState({...})` directly to inject fields/rows. This bypasses undo/redo history tracking and could race with the `createNewForm` API call.

**Fix:** Add a proper `duplicateForm(formId)` action to `formStore.js` that:
- Calls `createNewForm()`
- Copies the source form's fields (with new IDs) and rows into the new form
- Calls `saveCurrentForm` with `${title} (copy)`
- Returns the new form ID
Then `handleDuplicate` just calls `duplicateForm(formId)` and navigates.

### 4. Command palette lacks keyboard arrow navigation
**Problem:** The `/` command palette in `FormsBuilder.jsx` supports typing to filter but has no Up/Down/Enter to select without a mouse.

**Fix:** Add a `highlightedIndex` state. On `ArrowDown`/`ArrowUp`, move the highlight. On `Enter`, call `handleAddField` with the highlighted field type. Reset index to 0 when `paletteQuery` changes.

### 5. Runtime testing not yet done
The build compiles and the dev server starts, but no click-through testing has been performed. Before shipping, manually verify:
- Dashboard: create, edit, share, delete, duplicate, filter, sort, templates gallery
- Builder: add each of the 20 field types, drag-reorder, section collapse/duplicate/delete, undo/redo, autosave indicator, split preview (mobile/tablet/desktop), command palette, version history restore
- Properties: each field type's General/Advanced/Logic tabs, theme presets, conversational mode toggle, access schedule
- Public form (`/form/:slug`): submit each field type, validation messages, multi-page navigation, conditional logic show/hide, computed field auto-calc, repeating group add/remove instances, access-schedule closed screen
- Analytics: chart renders, date-range toggle, field completion rates
- Submissions: table, search, filter, CSV export, detail view, delete

## Build & Verify
```powershell
cd client
npx vite build          # production build (must pass with no errors)
npx vite --port 3000    # dev server
```
ESLint is not configured (no `.eslintrc`), so the build is the primary gate.

## Git Commit Style
Recent commits use `feat(forms):` / `fix(forms):` prefixes. See `git log --oneline -10` for current style.
