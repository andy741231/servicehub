# Form Builder Editor Redesign — Implementation Plan

## Goal
Replace the current 3-pane Form Builder layout (field palette / canvas / properties)
with the VS Code-style **Outline + Inspector** layout from
`mockup/builder-outline.html`. Keep ALL existing functionality — only the layout
changes.

## Reference
- **Mockup**: `mockup/builder-outline.html` (Direction E)
- **Current layout**: `mockup/builder-current.html` (baseline)
- **Mockup index**: `mockup/index.html`

---

## Layout Mapping (current → new)

| Current | New | What changes |
|---|---|---|
| Left: FieldPalette (w-60/w-12, collapsible rail) | Left: **OutlineTree** (w-64, always visible on desktop) | New component. Structure tree, not field-adding. |
| Center: FormCanvas | Center: FormCanvas + **breadcrumb** above | Same component. Breadcrumb added. |
| Right: PropertiesPanel/Preview/Code (w-80/w-12, collapsible rail) | Right: **Inspector** (w-80, always visible on desktop) | Same PropertiesPanel. No collapse-to-rail. |
| (none) | Bottom: **Status bar** (h-8) | NEW. Save status, field count, undo/redo, device preview. |
| Top bar: everything | Top bar: **simplified** | Back, title, save status, share, save, more menu. Undo/redo + device preview move to status bar. |

## Features Kept (ALL of them)
- [x] Drag-and-drop (in FormCanvas — untouched)
- [x] Undo/redo (keyboard shortcuts + status bar buttons)
- [x] Autosave (2s debounce — same logic)
- [x] Version history (More menu → panel, same)
- [x] Command palette (/ key — same)
- [x] Field modal (clicking + in canvas or outline — same)
- [x] Preview mode with device toggle (right panel segmented control)
- [x] Code mode (right panel segmented control)
- [x] Share, export, publish (top bar — same)
- [x] Conditional logic editing (PropertiesPanel — untouched)
- [x] Theme settings, access schedule (PropertiesPanel — untouched)
- [x] Computed fields, repeating groups (FormCanvas + PropertiesPanel — untouched)

---

## Progress So Far

### Done
1. **`components/OutlineTree.jsx`** — NEW file created (286 lines)
   - VS Code-style collapsible tree of sections → fields
   - Click a node to select + smooth-scroll to it in the canvas
   - Search/filter fields
   - "Add section" button at bottom + per-section "Add field" button
   - Uses `id="section-{rowId}"` and `id="field-{fieldId}"` for scroll-to

2. **`components/FormCanvas.jsx`** — small modification done
   - Added `id="section-${row.id}"` to the section card wrapper (line ~798)
   - Added `id="field-${field.id}"` to the field card wrapper (line ~937)
   - These IDs let OutlineTree scroll to the right element on click

### Not Started
3. **`FormsBuilder.jsx`** — the main layout refactor (1,326 lines)
4. Build verification
5. Smoke test + checklist

---

## Implementation Parts

### Part 1 — Core Layout Swap (Desktop)

**Scope**: Restructure `FormsBuilder.jsx` JSX to the new layout. Get it building.
Desktop-only responsive (panels visible at full width). Mobile can be rough.

**Changes to `FormsBuilder.jsx`**:

1. **Imports**: Add `OutlineTree` import. Remove unused `FieldPalette` import
   (keep `FIELD_TYPES`, `accentFor`, `CATEGORY_ACCENT`, `CATEGORY_ORDER` — still
   used by field modal + command palette).

2. **State changes**:
   - Remove: `isLeftCollapsed`, `leftDrawerOpen` (outline is always visible on desktop)
   - Remove: `isRightCollapsed`, `rightDrawerOpen` (inspector is always visible)
   - Keep: `rightMode`, `deviceWidth`, `showHistory`, `showFieldModal`,
     `showCommandPalette`, `paletteQuery`, `paletteHighlight`, `showMoreMenu`,
     `fieldModalCategory`, `recentFieldTypes`, `ariaAnnouncement`, all save state
   - Add: `leftDrawerOpen` (mobile only), `rightDrawerOpen` (mobile only) —
     keep these for Part 2 responsive, but Part 1 can default them to false
   - Add: `breadcrumb` derived state (computed from selectedField/selectedSection)

3. **Left panel**: Replace the entire `<aside>` FieldPalette section (lines 517-627)
   with:
   ```jsx
   <aside className="w-64 flex-shrink-0 border-r border-border bg-surface flex flex-col">
     <OutlineTree
       fields={fields}
       rows={rows}
       selectedField={selectedField}
       selectedSection={selectedSection}
       onSelectField={handleSelectField}
       onSelectSection={handleSelectSection}
       onAddSection={() => addRow('1')}
       onAddField={(rowId) => { setTargetRowId(rowId); setShowFieldModal(true); }}
     />
   </aside>
   ```

4. **Top bar**: Simplify (lines 632-804):
   - Keep: back arrow, form title + status badge, save status (center), share,
     more menu, save, publish
   - Remove from top bar: undo/redo buttons (move to status bar), PanelLeft/
     PanelRight toggle buttons (no more collapsible rails)
   - Keep the More menu (Export, Version history)

5. **Breadcrumb**: Add above the canvas (inside `<main>`, before the canvas
   scroll container):
   ```jsx
   <div className="h-9 border-b border-border bg-surface px-4 flex items-center gap-1.5 text-xs text-muted">
     <span>{formTitle}</span>
     <ChevronRight className="h-3 w-3" />
     <span>{selectedSection ? sectionLabel : '...'}</span>
     {selectedField && (<>
       <ChevronRight className="h-3 w-3" />
       <span className="text-base font-medium">{fieldLabel}</span>
     </>)}
   </div>
   ```
   - Computed: form title → section name (if section selected or field's parent
     section) → field name (if field selected)
   - Clicking a breadcrumb crumb navigates to that level (deselect)

6. **Right panel**: Keep the existing inspector (lines 894-1101) but:
   - Remove the collapsed rail mode (rightCollapsed branch, lines 906-942)
   - Remove the collapse/expand button (ChevronRight at line 984-991)
   - Always render the Design/Preview/Code segmented control + content
   - Keep VersionHistoryPanel rendering when `showHistory` is true
   - Width stays w-80, always visible

7. **Status bar**: Add at the bottom of the main container (after `</main>` or
   as a sibling):
   ```jsx
   <footer className="h-8 border-t border-border bg-surface-raised flex items-center justify-between px-3 text-xs text-muted">
     {/* Left: save status + counts */}
     <div className="flex items-center gap-3">
       <span className="flex items-center gap-1.5">
         {saveStatus === 'saving' ? <Loader2 className="h-3 w-3 animate-spin" /> :
          saveStatus === 'saved' ? <Check className="h-3 w-3 text-success" /> :
          saveStatus === 'error' ? <X className="h-3 w-3 text-danger" /> :
          <span className="h-2 w-2 rounded-full bg-success" />}
         {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' :
          saveStatus === 'error' ? 'Save error' : 'Saved'}
       </span>
       <span>{fields.length} fields, {rows.length} sections</span>
     </div>
     {/* Right: undo/redo + device preview + mode label */}
     <div className="flex items-center gap-2">
       <button onClick={undo} disabled={!_history.length} title="Undo (Ctrl+Z)">
         <Undo2 className="h-3.5 w-3.5" />
       </button>
       <button onClick={redo} disabled={!_future.length} title="Redo (Ctrl+Y)">
         <Redo2 className="h-3.5 w-3.5" />
       </button>
       <div className="h-3 w-px bg-border" />
       {/* Device preview icons (affect right panel preview) */}
       <button onClick={() => setDeviceWidth('mobile')} ...>
         <Smartphone className="h-3.5 w-3.5" />
       </button>
       <button onClick={() => setDeviceWidth('tablet')} ...>
         <Tablet className="h-3.5 w-3.5" />
       </button>
       <button onClick={() => setDeviceWidth('desktop')} ...>
         <Monitor className="h-3.5 w-3.5" />
       </button>
       <div className="h-3 w-px bg-border" />
       <span>Form Schema</span>
     </div>
   </footer>
   ```

8. **Layout container**: Change the outer `<div className="flex h-screen ...">` to
   a flex column:
   ```jsx
   <div className="flex flex-col h-screen bg-background">
     {/* top bar + body + status bar */}
     <div className="flex flex-1 overflow-hidden">
       {/* outline | main | inspector */}
     </div>
     <footer> {/* status bar */} </footer>
   </div>
   ```

9. **Remove dead code**: `CATEGORY_ICON` constant (line 15-21), `openRightPanel`
   helper (lines 95-103), `openRightHistory` (lines 104-111) — no longer needed
   since there's no collapsed rail. The right panel is always visible; mode
   switching is via the segmented control.

**Verification for Part 1**:
- `npx vite build` passes with no errors
- Dev server starts
- Desktop layout shows: outline (w-64) | canvas+breadcrumb (flex-1) | inspector (w-80) | status bar (h-8)
- Clicking a field in the outline selects it + scrolls to it
- All existing features still work (add field, edit properties, undo, save, preview)

---

### Part 2 — Responsive + Polish

**Scope**: Mobile drawers, responsive status bar, edge cases, smoke test.

**Changes**:

1. **Mobile outline drawer** (< 768px):
   - Outline panel becomes `fixed left-0 top-0 bottom-0 z-40 w-64` with
     `-translate-x-full` when closed
   - Backdrop overlay when open
   - Hamburger button in top bar (only on mobile) toggles `leftDrawerOpen`

2. **Mobile inspector drawer** (< 768px):
   - Inspector panel becomes `fixed right-0 top-0 bottom-0 z-40 w-80` with
     `translate-x-full` when closed
   - Backdrop overlay when open
   - Button in top bar (only on mobile) toggles `rightDrawerOpen`

3. **Responsive status bar**:
   - On mobile (< 768px): hide field count + "Form Schema" label, keep save
     status + undo/redo
   - On tablet (768-1023px): show everything but compact

4. **Responsive top bar**:
   - On mobile: show hamburger (left) + title + share + save (right). Hide more
     menu, publish button (move to more menu on mobile)
   - On desktop: full top bar

5. **Breadcrumb edge cases**:
   - No selection → show just form title
   - Field selected but section not → derive section from field's rowId
   - Section selected → show form title > section name
   - Click form title crumb → deselect all
   - Click section crumb → deselect field, keep section

6. **Outline tree edge cases**:
   - Empty form (no rows) → show "Add first section" CTA
   - Section with no fields → show "Add field" button
   - Repeating group children → show as nested children (if groupId exists)

7. **Smoke test checklist** (write to AGENTS.md or this file):
   - [ ] Create new form → outline shows empty state
   - [ ] Add section → appears in outline
   - [ ] Add field via canvas "+" → appears in outline under correct section
   - [ ] Add field via outline "Add field" → field modal opens, field appears
   - [ ] Add field via "/" command palette → works, appears in outline
   - [ ] Click field in outline → selected in canvas + properties panel + breadcrumb
   - [ ] Click section in outline → selected + properties shows section props
   - [ ] Drag field to reorder → outline updates
   - [ ] Drag section to reorder → outline updates
   - [ ] Delete field → removed from outline
   - [ ] Duplicate field → appears in outline
   - [ ] Undo/redo → outline reflects changes
   - [ ] Autosave → status bar shows "Saving…" → "Saved"
   - [ ] Manual save (Ctrl+S) → works
   - [ ] Preview mode (right panel) → renders form with device toggle
   - [ ] Code mode (right panel) → shows JSON schema
   - [ ] Version history → opens, can restore
   - [ ] Share → copies URL
   - [ ] Export → downloads JSON
   - [ ] Publish/unpublish → status badge updates
   - [ ] Mobile (< 768px): outline + inspector are drawers
   - [ ] Tablet (768-1023px): layout works
   - [ ] Desktop (≥ 1024px): full 3-column + status bar

**Verification for Part 2**:
- `npx vite build` passes
- All smoke test items pass
- No console errors

---

## Files Touched

| File | Part | Action |
|---|---|---|
| `components/OutlineTree.jsx` | Done | NEW — created |
| `components/FormCanvas.jsx` | Done | Added 2 `id` attributes |
| `FormsBuilder.jsx` | 1 | Major JSX restructure |
| `FormsBuilder.jsx` | 2 | Responsive additions + polish |
| `AGENTS.md` (optional) | 2 | Add smoke test checklist |

## Risk Assessment
- **Low risk**: OutlineTree is new and isolated. FormCanvas change is 2 attributes.
- **Medium risk**: FormsBuilder.jsx restructure — large file, but state/effects/
  handlers stay the same. Only JSX layout changes.
- **Mitigation**: Build after Part 1. If it breaks, the diff is reviewable.

---

## Smoke Test Checklist

### Desktop (≥ 1024px)
- [ ] Create new form → outline shows empty state ("No sections yet" + "Add first section")
- [ ] Add section → appears in outline
- [ ] Add field via canvas "+" → appears in outline under correct section
- [ ] Add field via outline "Add field" → field modal opens, field appears
- [ ] Add field via "/" command palette → works, appears in outline
- [ ] Click field in outline → selected in canvas + properties panel + breadcrumb updates
- [ ] Click section in outline → selected + properties shows section props + breadcrumb updates
- [ ] Click form title in breadcrumb → deselects all
- [ ] Click section in breadcrumb → deselects field, keeps section
- [ ] Drag field to reorder → outline updates
- [ ] Drag section to reorder → outline updates
- [ ] Delete field → removed from outline
- [ ] Duplicate field → appears in outline
- [ ] Undo/redo (status bar buttons) → outline reflects changes
- [ ] Undo/redo (Ctrl+Z / Ctrl+Y) → works
- [ ] Autosave → status bar shows "Saving…" → "Saved"
- [ ] Manual save (Ctrl+S) → works
- [ ] Preview mode (right panel) → renders form with device toggle
- [ ] Code mode (right panel) → shows JSON schema
- [ ] Version history → opens in right panel, can restore
- [ ] Share → copies URL
- [ ] Export → downloads JSON
- [ ] Publish/unpublish → status badge updates
- [ ] Repeating group field → children show nested in outline
- [ ] Empty section → shows "No fields" + "Add field" button
- [ ] Outline search → filters fields, auto-expands matching sections

### Mobile (< 768px)
- [ ] Hamburger button shows in top bar
- [ ] Click hamburger → outline drawer slides in from left
- [ ] Backdrop appears, clicking it closes drawer
- [ ] Click field in outline drawer → drawer closes, field selected
- [ ] Properties button shows in top bar
- [ ] Click properties button → inspector drawer slides in from right
- [ ] Backdrop appears, clicking it closes drawer
- [ ] Inspector close button works
- [ ] Share/Save/Publish buttons show icon only (no text label)
- [ ] Autosave status hidden in top bar (status bar still shows it)
- [ ] Status bar shows save status + undo/redo (field count hidden)
- [ ] Breadcrumb truncates to smaller widths

### Tablet (768-1023px)
- [ ] Layout works — outline + canvas + inspector all visible
- [ ] No hamburger/properties buttons (they're for mobile only)
- [ ] All features work as on desktop
