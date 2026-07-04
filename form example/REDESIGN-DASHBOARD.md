# Forms Dashboard — Redesign Spec

> **Scope:** `FormsDashboard.jsx` — the admin listing/overview page at `/hub-admin/forms`.
> This complements the existing `REDESIGN-PLAN.md` (which covers the *Builder*).
>
> **Inspiration:** `form example/3-bento-grid.html` (stats area) + `form example/4-card-gallery.html` (forms grid).
> Open those two HTML files in a browser to see the target look.

---

## 1. Current State

**File:** `client/src/pages/forms/FormsDashboard.jsx` (~557 lines)

**Layout today:**
- Header: title "Forms" + subtitle, right-aligned `Templates` + `Create Form` buttons
- Stats row: 4 equal `StatCard`s in a flat `grid-cols-4` (Total / Published / Drafts / Submissions-7d)
- Toolbar: search input + 3 status filter chips (All/Published/Drafts) + sort dropdown, all in one flex row
- Forms grid: `grid-cols-3` of `FormCard`s — each card has a gradient cover stripe (h-20), centered FileText icon, status badge top-right, title + overflow menu, 2-line description, meta row (fields / submissions / updated)
- Empty state: hero icon + headline + 2 CTAs
- Modals: rename, delete confirm

**What works:** a11y baseline (aria-labels, 44px targets, focus rings), deterministic cover colors, overflow menu, search + filter + sort logic.

**What's weak:**
1. Stats are flat and uniform — no visual hierarchy, no "hero" metric, no trend deltas
2. Cards are visually heavy (full-bleed gradient stripe + centered icon reads as decoration, not information)
3. No mini form preview inside the card — just a colored bar with a generic icon
4. No view toggle (grid/list) — only grid
5. Status filter is a thin segmented control buried between search and sort; counts per status are not shown
6. No quick-action affordance on hover — actions are hidden behind the 3-dot menu
7. The "Create Form" CTA is a button in the header; there's no in-grid "create new" card
8. No frosted-glass top bar / breadcrumb context (relies entirely on the global AppShell sidebar)

---

## 2. Target Design

Blend **two** reference examples:

| Region | Inspiration | Why |
|--------|-------------|-----|
| Stats area (top) | `3-bento-grid.html` | Modular tiles of varying size, one accent "hero" tile, progress ring for completion, quick-actions tile |
| Forms grid (main) | `4-card-gallery.html` | Card gallery with mini form previews, status pills, meta stats, hover-reveal actions, in-grid "create new" card, tabbed status filter with counts, grid/list view toggle |

### 2.1 Page shell

Keep the global `AppShell` sidebar (240px). Inside the forms content area, add a **frosted sub-header bar** pinned to the top of the content region (not the whole viewport — the AppShell already owns the viewport top):

```
┌─ AppShell sidebar (240px) ─┬─ Forms content ─────────────────────────┐
│                            │ ┌─ sub-header (sticky, frosted) ───────┐│
│  Website                   │ │ FormHub  ›  Forms      [search] [🔔][avatar]│
│  Form Builder ●            │ └──────────────────────────────────────┘│
│  Email                     │ ┌─ Bento stats row ────────────────────┐│
│  Directory                 │ │ [Hero submissions w2] [Active w1]    ││
│  Portal                    │ │ [Completion ring w1] [Avg time w1]   ││
│  Users & Roles             │ └──────────────────────────────────────┘│
│                            │ ┌─ Toolbar ────────────────────────────┐│
│                            │ │ [All 24][Live 18][Drafts 4][Closed 2]│
│                            │ │ [search] [sort]      [grid|list]     ││
│                            │ └──────────────────────────────────────┘│
│                            │ ┌─ Forms card grid ────────────────────┐│
│                            │ │ [card][card][card][+ new]            ││
│                            │ │ [card][card][card]                   ││
│                            │ └──────────────────────────────────────┘│
└────────────────────────────┴────────────────────────────────────────┘
```

### 2.2 Sub-header bar (new)

From `3-bento-grid.html` lines 49-60. A 56px sticky bar with `backdrop-filter: blur(20px)` and semi-transparent white background.

```jsx
// New: FormsSubHeader (inline or extracted)
<div className="sticky top-0 z-30 h-14 flex items-center gap-4 px-6
                bg-surface/70 backdrop-blur-xl border-b border-border-soft">
  <span className="text-muted">Workspace</span>
  <span className="text-subtle">/</span>
  <span className="font-medium text-base">Forms</span>
  <div className="ml-auto flex items-center gap-2">
    <input className="..." placeholder="Search…" />   // 260px, ghost style
    <button className="icon-btn"><Bell /><dot/></button>
    <Avatar />
  </div>
</div>
```

**Why:** gives the forms page its own context strip (breadcrumb + search + notifications) without touching the global AppShell. The frosted glass is a modern, low-cost visual upgrade.

**Tailwind tokens:** `bg-surface/70` (surface at 70% opacity), `backdrop-blur-xl`, `border-border-soft` (add `--border-soft: #E5E5EA` to `index.css` if not present).

---

## 3. Bento Stats Row

Replace the flat 4-card `StatCard` grid with a **bento grid** of varying tile sizes. Inspired by `3-bento-grid.html` lines 195-260.

### 3.1 Grid spec

```
grid-template-columns: repeat(4, 1fr)
grid-auto-rows: 132px
gap: 16px
```

Tile classes: `.w1` (1 col), `.w2` (2 col), `.h1` (1 row).

### 3.2 Tile layout (5 tiles)

| # | Tile | Span | Style | Content |
|---|------|------|-------|---------|
| 1 | **Hero: Total Submissions** | `w2 h1` | accent gradient (primary blue → indigo) | Large 36-48px number, trend delta, icon top-right |
| 2 | Active Forms | `w1 h1` | white tile | 36px number, "X new this month" |
| 3 | Completion Rate | `w1 h1` | white tile | SVG progress ring (stroke-dasharray) + % center |
| 4 | Avg Response Time | `w1 h1` | dark tile (`bg-base text-white`) | 36px number, "Xs faster" |
| 5 | Quick Actions | `w2 h1` | white tile | 4 mini action buttons in a 2×2 grid |

> **Note:** The current dashboard only has 4 stats (Total/Published/Drafts/Subs-7d). The bento replaces these with 5 tiles that are more informative. "Published" and "Drafts" counts move into the **status filter tabs** (see §4.1) where they're more actionable.

### 3.3 Hero tile JSX (accent gradient)

```jsx
<div className="col-span-2 row-span-1 rounded-2xl p-6 text-white
                bg-gradient-to-br from-primary to-indigo-600
                relative overflow-hidden shadow-card">
  <div className="absolute top-5 right-5 w-9 h-9 rounded-lg
                  bg-white/20 flex items-center justify-center">
    <Inbox className="h-5 w-5" />
  </div>
  <div className="text-sm text-white/75 mb-1.5">Total Submissions</div>
  <div className="text-4xl font-bold tracking-tight">{stats.totalSubs}</div>
  <div className="mt-auto flex items-center gap-1.5 text-sm font-semibold">
    <TrendingUp className="h-3.5 w-3.5" />
    {stats.subsTrend}% <span className="text-white/60 font-normal">vs last week</span>
  </div>
</div>
```

### 3.4 Completion ring tile

From `3-bento-grid.html` lines 230-245. SVG ring with `stroke-dasharray` + `stroke-dashoffset`:

```jsx
<div className="rounded-2xl p-5 bg-surface border border-border-soft shadow-card-sm">
  <div className="text-sm font-semibold mb-2">Completion</div>
  <div className="flex items-center gap-4">
    <svg width="100" height="100" className="-rotate-90">
      <circle cx="50" cy="50" r="42" fill="none" stroke="var(--surface-raised)" strokeWidth="7" />
      <circle cx="50" cy="50" r="42" fill="none" stroke="var(--success)" strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 42}
              strokeDashoffset={2 * Math.PI * 42 * (1 - completionRate / 100)} />
    </svg>
    <div>
      <div className="text-2xl font-bold">{completionRate}%</div>
      <div className="text-xs text-muted">avg completion</div>
    </div>
  </div>
</div>
```

### 3.5 Quick Actions tile (new)

From `3-bento-grid.html` lines 280-310. A 2×2 grid of mini action buttons:

```jsx
<div className="col-span-2 rounded-2xl p-5 bg-surface border border-border-soft shadow-card-sm">
  <div className="text-sm font-semibold mb-2.5">Quick Actions</div>
  <div className="grid grid-cols-2 gap-2.5">
    <QuickAction icon={Plus} label="Blank Form" desc="Start from scratch" color="primary"
                 onClick={handleCreateForm} />
    <QuickAction icon={LayoutTemplate} label="Template" desc="Pick a starting point" color="purple"
                 onClick={() => navigate('/hub-admin/forms/templates')} />
    <QuickAction icon={Upload} label="Import" desc="Upload a CSV" color="success" />
    <QuickAction icon={Plug} label="Integrate" desc="Connect an app" color="warning" />
  </div>
</div>
```

Each `QuickAction` is a small button: icon in a colored rounded square + label + description.

```jsx
function QuickAction({ icon: Icon, label, desc, color, onClick }) {
  const colorMap = {
    primary: 'bg-primary text-white',
    purple:  'bg-purple-500 text-white',
    success: 'bg-success text-white',
    warning: 'bg-warning text-white',
  };
  return (
    <button onClick={onClick}
      className="flex flex-col gap-2 p-3.5 rounded-xl bg-surface-raised
                 hover:bg-tertiary transition-colors text-left">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="text-sm font-semibold">{label}</div>
        <div className="text-xs text-muted">{desc}</div>
      </div>
    </button>
  );
}
```

---

## 4. Toolbar (redesigned)

### 4.1 Status filter tabs with counts

Replace the thin 3-button segmented control with **tab pills that include counts**. From `4-card-gallery.html` lines 130-140.

```jsx
<div className="inline-flex gap-0.5 bg-surface border border-border rounded-xl p-1">
  {[
    { id: 'all',       label: 'All',      count: stats.total },
    { id: 'published', label: 'Live',     count: stats.published },
    { id: 'draft',     label: 'Drafts',   count: stats.draft },
    { id: 'closed',    label: 'Closed',   count: stats.closed },
  ].map(({ id, label, count }) => (
    <button key={id} onClick={() => setStatusFilter(id)}
      className={`px-4 py-1.5 rounded-lg text-sm font-semibold inline-flex items-center gap-1.5
                  transition-colors ${statusFilter === id
                    ? 'bg-base text-white'
                    : 'text-muted hover:bg-surface-raised'}`}
      aria-pressed={statusFilter === id}>
      {label}
      <span className={`text-xs ${statusFilter === id ? 'text-white/70' : 'text-subtle'}`}>{count}</span>
    </button>
  ))}
</div>
```

**Changes from current:**
- "Published" → "Live" (clearer, matches example 4)
- Add "Closed" tab (requires adding `closed` to `deriveStatus` — see §7)
- Each tab shows its count inline

### 4.2 View toggle (grid / list)

From `4-card-gallery.html` lines 150-156. Add a grid/list toggle on the right side of the toolbar:

```jsx
const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

<div className="inline-flex gap-0.5 bg-surface border border-border rounded-xl p-1 ml-auto">
  <button onClick={() => setViewMode('grid')}
    className={`w-8 h-8 rounded-lg flex items-center justify-center
                ${viewMode === 'grid' ? 'bg-base text-white' : 'text-muted hover:bg-surface-raised'}`}
    aria-label="Grid view" aria-pressed={viewMode === 'grid'}>
    <LayoutGrid className="h-4 w-4" />
  </button>
  <button onClick={() => setViewMode('list')}
    className={`w-8 h-8 rounded-lg flex items-center justify-center
                ${viewMode === 'list' ? 'bg-base text-white' : 'text-muted hover:bg-surface-raised'}`}
    aria-label="List view" aria-pressed={viewMode === 'list'}>
    <List className="h-4 w-4" />
  </button>
</div>
```

### 4.3 Full toolbar layout

```
[ All 24 | Live 18 | Drafts 4 | Closed 2 ]   [search]   [sort]    [grid|list]
```

- Tabs on the left (primary navigation affordance)
- Search in the middle (flex-1, max-w-sm)
- Sort dropdown
- View toggle on the far right

---

## 5. Forms Grid (card gallery)

Inspired by `4-card-gallery.html` lines 165-260. Major changes to the existing `FormCard`:

### 5.1 Card structure (grid mode)

```
┌──────────────────────────────┐
│  ┌─ mini preview ─────────┐  │   ← 140px tall, tinted background
│  │ ▎▎▎▎ short line        │  │      with abstract form-field shapes
│  │ ▎▎▎▎▎▎▎ medium line    │  │      (NOT a gradient bar + icon)
│  │ ▎▎▎▎▎▎▎▎▎▎ input box   │  │
│  │ ▎▎▎▎▎▎▎ medium line    │  │
│  │ ▎▎▎ [submit btn]       │  │
│  │              [● Live]  │  │   ← status pill, top-right, frosted
│  └────────────────────────┘  │
│  Customer Survey Q3          │   ← title, 16px bold
│  12-question multi-step...   │   ← description, 13px, 2 lines
│  ──────────────────────────  │
│  842        78%       12     │   ← 3 meta stats in a row
│  Submits    Completion Q's   │      (serif numbers, uppercase labels)
│  ──────────────────────────  │
│  Updated 2h ago   [👁][✏][⋮]│   ← hover-reveal action icons
└──────────────────────────────┘
```

### 5.2 Mini form preview (replaces gradient stripe)

The current card uses a `h-20` gradient bar with a centered `FileText` icon. Replace with an **abstract form preview** — tinted background matching the form's cover color, with placeholder lines/boxes that suggest a form layout. From `4-card-gallery.html` lines 167-185.

```jsx
function FormPreview({ form, coverClass }) {
  const fieldCount = form.fields?.length || 0;
  return (
    <div className={`h-32 relative p-4 overflow-hidden ${coverClass}`}>
      {/* status pill */}
      <span className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-semibold
                        inline-flex items-center gap-1.5 bg-white/85 backdrop-blur
                        ${statusColor}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
        {statusLabel}
      </span>
      {/* abstract form shapes */}
      <div className="flex flex-col gap-2">
        <div className="h-2 w-3/5 rounded bg-base/15" />          {/* title line */}
        <div className="h-5 w-full rounded bg-base/10" />         {/* input box */}
        <div className="h-2 w-4/5 rounded bg-base/15" />          {/* label */}
        <div className="h-5 w-full rounded bg-base/10" />         {/* input box */}
        {fieldCount > 4 && <div className="h-5 w-full rounded bg-base/10" />}
        <div className="h-6 w-20 rounded bg-base/25 mt-auto" />   {/* submit btn */}
      </div>
    </div>
  );
}
```

**Cover tint classes** (replace the current `COVER_COLORS` gradients with softer tints):

```js
const COVER_TINTS = [
  'bg-blue-50',      // was from-blue-500 to-indigo-500
  'bg-emerald-50',
  'bg-rose-50',
  'bg-amber-50',
  'bg-violet-50',
  'bg-cyan-50',
];
```

The preview shapes use `bg-base/15` (base color at 15% alpha) so they read as "form fields" against the tint. This is far more informative than a decorative gradient.

### 5.3 Meta stats row (3 metrics)

From `4-card-gallery.html` lines 200-206. Replace the current single meta line with a **3-column stat row** separated by a divider:

```jsx
<div className="flex gap-4 py-3 border-t border-border-soft">
  <div className="flex flex-col">
    <div className="text-base font-bold tabular-nums">{subCount}</div>
    <div className="text-[10px] uppercase tracking-wider text-subtle font-semibold">Submits</div>
  </div>
  <div className="flex flex-col">
    <div className="text-base font-bold tabular-nums">{completionPct}%</div>
    <div className="text-[10px] uppercase tracking-wider text-subtle font-semibold">Completion</div>
  </div>
  <div className="flex flex-col">
    <div className="text-base font-bold tabular-nums">{fieldCount}</div>
    <div className="text-[10px] uppercase tracking-wider text-subtle font-semibold">Questions</div>
  </div>
</div>
```

> **Completion %** is not currently tracked per form. Either compute it from submissions (completed / started) or omit this metric and show "Created" date instead. See §7.

### 5.4 Hover-reveal actions

From `4-card-gallery.html` lines 215-220. Keep the 3-dot overflow menu but **also** show quick action icons on hover:

```jsx
<div className="flex items-center justify-between pt-3 border-t border-border-soft">
  <span className="text-xs text-subtle">Updated {timeAgo(form.updatedAt)}</span>
  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
    <button className="icon-btn-sm" onClick={() => handleViewSubmissions(form.id)} aria-label="View submissions">
      <Eye className="h-4 w-4" />
    </button>
    <button className="icon-btn-sm" onClick={() => handleEditForm(form.id)} aria-label="Edit form">
      <Pencil className="h-4 w-4" />
    </button>
    <button className="icon-btn-sm" onClick={() => setMenuOpenId(form.id)} aria-label="More actions">
      <MoreHorizontal className="h-4 w-4" />
    </button>
  </div>
</div>
```

```css
/* Add to index.css */
.icon-btn-sm {
  @apply w-7 h-7 rounded-lg flex items-center justify-center text-muted
         hover:bg-surface-raised hover:text-base transition-colors;
}
```

### 5.5 "Create new form" card (in-grid)

From `4-card-gallery.html` lines 510-525. Add a dashed-border card at the end of the grid:

```jsx
<button onClick={handleCreateForm}
  className="min-h-[280px] rounded-2xl border-2 border-dashed border-border
             hover:border-primary hover:bg-primary-light/50 hover:text-primary
             text-muted transition-all flex flex-col items-center justify-center gap-3">
  <div className="w-12 h-12 rounded-xl bg-primary-light text-primary flex items-center justify-center">
    <Plus className="h-6 w-6" />
  </div>
  <div className="text-center">
    <div className="text-base font-bold">Create new form</div>
    <div className="text-sm text-muted">Start from scratch or a template</div>
  </div>
</button>
```

### 5.6 List mode (alternate view)

When `viewMode === 'list'`, render a compact horizontal card row instead of the grid:

```jsx
{viewMode === 'list' ? (
  <div className="flex flex-col gap-2">
    {filteredForms.map(form => (
      <div key={form.id}
        className="group flex items-center gap-4 p-3 rounded-xl bg-surface
                   border border-border hover:border-border-strong hover:shadow-card-sm
                   transition-all">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-bold ${coverSolidFor(form.id)}`}>
          {initials(form.title)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate">{form.title}</div>
          <div className="text-xs text-muted truncate">{form.description}</div>
        </div>
        <span className={`badge ${meta.badge}`}>{meta.label}</span>
        <span className="text-sm tabular-nums w-16 text-right">{subCount}</span>
        <span className="text-xs text-subtle w-20 text-right">{timeAgo(form.updatedAt)}</span>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* same 3 action icons */}
        </div>
      </div>
    ))}
    {/* compact create row */}
    <button onClick={handleCreateForm}
      className="flex items-center gap-3 p-3 rounded-xl border-2 border-dashed border-border
                 hover:border-primary hover:text-primary text-muted transition-all">
      <Plus className="h-5 w-5" /> <span className="text-sm font-medium">Create new form</span>
    </button>
  </div>
) : (
  /* grid mode from §5.1 */
)}
```

---

## 6. Design Token Additions

Add these to `client/src/index.css` (alongside existing tokens):

```css
:root {
  /* existing tokens unchanged */

  /* New: softer border for tiles/sub-header */
  --border-soft: #E5E5EA;

  /* New: tertiary surface (one step darker than surface-raised) */
  --surface-tertiary: #E8E8ED;

  /* New: bento tile shadow (lighter than card shadow) */
  --shadow-card-sm: 0 1px 3px rgba(0,0,0,0.04);

  /* New: radius for bento tiles (larger than rounded-card) */
  --rounded-tile: 16px;   /* use as rounded-2xl in Tailwind */
}
```

**Tailwind config** (`tailwind.config.js`) — extend if not present:

```js
borderColor: {
  'border-soft': 'var(--border-soft)',
},
backgroundColor: {
  'tertiary': 'var(--surface-tertiary)',
},
borderRadius: {
  '2xl': 'var(--rounded-tile)',
},
```

---

## 7. Data Model Changes

### 7.1 Add "closed" status

Currently `deriveStatus` only returns `draft` or `published`. To support the "Closed" tab and the kanban-style status flow:

```js
// formStore.js — add status field to form model
const createNewForm = () => ({
  id: generateId(),
  title: 'Untitled Form',
  description: '',
  fields: [],
  rows: [],
  status: 'draft',     // 'draft' | 'published' | 'closed'  ← NEW
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

// FormsDashboard.jsx — update deriveStatus
const deriveStatus = (form) => form.status || ((form.fields?.length || 0) === 0 ? 'draft' : 'published');
```

Add a "Close form" action to the overflow menu and a `setFormStatus(id, status)` action to the store.

### 7.2 Completion rate (optional)

If you want the completion % metric in the card meta and the ring tile, track `startedAt` and `completedAt` on submissions:

```js
// In submissions tracking:
completionRate = submissions.filter(s => s.completedAt).length / submissions.length
```

If not ready, replace the completion metric with **"Created" date** in the card meta and **"Avg fields per form"** in the ring tile.

### 7.3 Submission trend delta

For the hero tile's "X% vs last week" trend:

```js
const stats = useMemo(() => {
  const now = Date.now();
  const weekAgo = now - 7 * 864e5;
  const twoWeeksAgo = now - 14 * 864e5;
  const thisWeek = submissions.filter(s => s.submittedAt >= weekAgo).length;
  const lastWeek = submissions.filter(s => s.submittedAt >= twoWeeksAgo && s.submittedAt < weekAgo).length;
  const subsTrend = lastWeek > 0 ? Math.round((thisWeek - lastWeek) / lastWeek * 100) : 0;
  return { totalSubs: submissions.length, thisWeek, subsTrend, ... };
}, [forms, submissions]);
```

---

## 8. Implementation Phases

### Phase 1 — Bento stats (low risk, high visual impact)
- [ ] Add `--border-soft`, `--surface-tertiary`, `--shadow-card-sm` tokens to `index.css`
- [ ] Replace the 4-flat-card stats row with the 5-tile bento grid (§3)
- [ ] Add `QuickAction` component (§3.5)
- [ ] Add completion ring SVG (§3.4) — use "Avg fields per form" if completion data isn't ready
- **Files touched:** `FormsDashboard.jsx`, `index.css`
- **No data model changes**

### Phase 2 — Toolbar upgrade
- [ ] Replace status filter chips with count-bearing tab pills (§4.1)
- [ ] Add `viewMode` state + grid/list toggle (§4.2)
- [ ] Reorder toolbar: tabs left, search middle, sort + view right (§4.3)
- **Files touched:** `FormsDashboard.jsx`

### Phase 3 — Card redesign
- [ ] Replace gradient cover stripe with `FormPreview` component (§5.2)
- [ ] Replace `COVER_COLORS` gradients with `COVER_TINTS` soft backgrounds
- [ ] Add 3-column meta stats row (§5.3)
- [ ] Add hover-reveal action icons (§5.4)
- [ ] Add in-grid "Create new form" dashed card (§5.5)
- **Files touched:** `FormsDashboard.jsx`, `index.css` (`.icon-btn-sm`)

### Phase 4 — List view
- [ ] Implement list-mode rendering (§5.6)
- [ ] Test both modes with 0, 1, 5, 20+ forms
- **Files touched:** `FormsDashboard.jsx`

### Phase 5 — Sub-header + status model
- [ ] Add frosted sub-header bar (§2.2)
- [ ] Add `status: 'closed'` to form model (§7.1)
- [ ] Add "Close form" / "Reopen" to overflow menu
- [ ] Add `setFormStatus` to `formStore.js`
- **Files touched:** `FormsDashboard.jsx`, `formStore.js`, `formsApi.js`

---

## 9. Component Extraction

Currently `StatCard`, `MenuItem`, `EmptyState` are inline in `FormsDashboard.jsx`. As the page grows, extract to:

```
forms/components/
├── FormCard.jsx           ← card + preview + meta + hover actions
├── FormPreview.jsx        ← abstract form-field shapes (§5.2)
├── FormListRow.jsx        ← list-mode row (§5.6)
├── BentoStats.jsx         ← the 5-tile bento grid (§3)
├── QuickAction.jsx        ← single quick-action button (§3.5)
├── CompletionRing.jsx     ← reusable SVG ring
├── FormsToolbar.jsx       ← tabs + search + sort + view toggle (§4)
└── FormsSubHeader.jsx     ← frosted breadcrumb bar (§2.2)
```

Keep `FormsDashboard.jsx` as the orchestrator: data fetching, filtering/sorting state, modal state, and composition of the above components.

---

## 10. Accessibility Notes

- **Frosted sub-header:** ensure `backdrop-filter` has a `-webkit-` prefix and a solid fallback `bg-surface` for browsers without support
- **Progress ring:** add `role="img" aria-label={`${completionRate}% completion rate`}` on the SVG
- **View toggle:** use `aria-pressed` on each button, group with `role="group" aria-label="View mode"`
- **Status tabs:** keep `aria-pressed` (already present in current code)
- **Hover-reveal actions:** actions must also be keyboard-accessible — the 3-dot menu remains the always-visible path; hover icons are a shortcut. Ensure `:focus-within` also reveals them:
  ```css
  .form-card .quick-actions { opacity: 0; }
  .form-card:hover .quick-actions,
  .form-card:focus-within .quick-actions { opacity: 1; }
  ```
- **Touch devices:** hover-reveal won't work on touch. The 3-dot menu is the fallback. Consider making actions always visible on `@media (hover: none)`.

---

## 11. Reference Files

| What | Path |
|------|------|
| Target stats design | `form example/3-bento-grid.html` |
| Target card grid design | `form example/4-card-gallery.html` |
| Current dashboard | `client/src/pages/forms/FormsDashboard.jsx` |
| Form store | `client/src/pages/forms/store/formStore.js` |
| API layer | `client/src/pages/forms/api/formsApi.js` |
| Design tokens | `client/src/index.css` + `THEME.md` |
| Tailwind config | `client/tailwind.config.js` |
| Global shell | `client/src/layouts/AppShell.jsx` |
| Forms skill | `.devin/skills/forms/SKILL.md` |
| Builder redesign (existing) | `client/src/pages/forms/REDESIGN-PLAN.md` |
