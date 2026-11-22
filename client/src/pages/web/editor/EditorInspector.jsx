/**
 * EditorInspector — docked right-hand panel for the current selection.
 *
 *  Block selected   → Content (non-inline settings) · Design (block.style) ·
 *                     Layout (grid position for the current device)
 *  Section selected → tabs: Section (background · spacing · content width,
 *                     then collapsible Design / Advanced) · Page (title; the
 *                     address is changed on the Pages screen)
 *
 * Text, images and button labels are still edited directly on the canvas;
 * this panel holds everything that has no on-canvas affordance.
 *
 * Number/text/color fields keep local state and commit on blur/Enter, so a
 * value typed as "120" is one undo step (and one autosave), not three.
 */
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import ColorPicker from '../../../components/ColorPicker';
import { siteColorPresets } from '../../../site/siteTheme';
import { X, LayoutPanelTop, AlertTriangle, ChevronDown, ChevronRight, LayoutTemplate, ArrowUp, ArrowDown } from 'lucide-react';
import { BlockContentSettings, blockTypeLabel, ImageField } from './BlockSettingsPanel';
import { isTextEntryTarget } from './editorUtils';
import { COLUMN_OPTIONS, sectionColumns, columnOf, applyColumns } from './fluid/columnLayout';

const inputCls = 'w-full h-9 px-2.5 text-sm border border-border rounded-md bg-surface text-text-base focus:outline-none focus:ring-2 focus:ring-primary';
const labelCls = 'block text-xs font-medium text-muted';

/** Text/number input that commits on blur or Enter. Empty → undefined. */
function CommitInput({ value, onCommit, type = 'text', placeholder, min, max, ariaLabel, suffix }) {
  const shown = value ?? '';
  const [text, setText] = useState(String(shown));
  useEffect(() => { setText(String(shown)); }, [shown]);
  const commit = () => {
    const raw = text.trim();
    if (raw === String(shown)) return;
    if (raw === '') return onCommit(undefined);
    if (type === 'number') {
      let n = Number(raw);
      if (!Number.isFinite(n)) { setText(String(shown)); return undefined; }
      if (min != null) n = Math.max(min, n);
      if (max != null) n = Math.min(max, n);
      return onCommit(n);
    }
    return onCommit(raw);
  };
  const input = (
    <input
      className={`${inputCls} mt-1 ${suffix ? 'pr-8' : ''}`}
      type={type === 'number' ? 'number' : 'text'}
      inputMode={type === 'number' ? 'numeric' : undefined}
      value={text}
      placeholder={placeholder}
      min={min}
      max={max}
      aria-label={ariaLabel}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); } }}
    />
  );
  if (!suffix) return input;
  return (
    <span className="relative block">
      {input}
      <span className="absolute right-2.5 top-1/2 -translate-y-1/4 text-xs text-subtle pointer-events-none" aria-hidden="true">{suffix}</span>
    </span>
  );
}

// Site color presets (theme colors + palette) for every ColorField in the
// inspector — provided once at the top instead of threaded through each panel.
const PresetsContext = createContext(null);

/**
 * Color: shared ColorPicker (with the site's colors as presets) + hex text
 * field. One change = one undo step / one autosave: a preset click commits at
 * once; dragging on the wheel or typing in the popover's hex field previews in
 * the swatch and commits once when the popover closes.
 */
function ColorField({ label, value, onCommit, placeholder = 'Default' }) {
  const presets = useContext(PresetsContext) || undefined;
  const isHex = /^#[0-9a-f]{6}$/i.test(value || '');
  const [draft, setDraft] = useState(null);
  const draftRef = useRef(null);
  const commitDraft = () => {
    const d = draftRef.current;
    draftRef.current = null;
    setDraft(null);
    if (d && d.toLowerCase() !== (value || '').toLowerCase()) onCommit(d);
  };
  return (
    <div>
      <span className={labelCls}>{label}</span>
      <div className="flex items-center gap-2">
        <div className="mt-1 shrink-0">
          <ColorPicker
            value={draft || (isHex ? value : '#ffffff')}
            empty={!draft && !isHex}
            label={label}
            allowAlpha={false}
            presets={presets}
            onChange={(v, meta) => {
              if (meta?.preset) {
                draftRef.current = null;
                setDraft(null);
                if (v.toLowerCase() !== (value || '').toLowerCase()) onCommit(v);
              } else {
                draftRef.current = v;
                setDraft(v);
              }
            }}
            onClose={commitDraft}
          />
        </div>
        <div className="flex-1"><CommitInput value={value} onCommit={onCommit} placeholder={placeholder} ariaLabel={label} /></div>
        {value && (
          <button type="button" onClick={() => onCommit(undefined)} className="mt-1 text-xs text-muted hover:text-text-base" aria-label={`Clear ${label}`}>Reset</button>
        )}
      </div>
    </div>
  );
}

function Segmented({ label, value, options, onChange }) {
  return (
    <div>
      <span className={labelCls}>{label}</span>
      <div className="mt-1 flex gap-0.5 rounded-lg bg-surface-raised p-0.5" role="radiogroup" aria-label={label}>
        {options.map(([v, l]) => (
          <button
            key={String(v)}
            type="button"
            role="radio"
            aria-checked={value === v}
            onClick={() => onChange(v)}
            className={`flex-1 min-h-[32px] py-1.5 rounded-md text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${value === v ? 'bg-surface text-primary font-semibold shadow-sm ring-1 ring-primary/40' : 'text-muted hover:text-text-base'}`}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Contrast check ─────────────────────────────────────────────────────────
// Reads the rendered block on the canvas: its text colour against the first
// solid background behind it (block, section or page). Stays quiet when a
// photo is behind the text — that can't be measured reliably.
const parseRgb = (c) => {
  const m = String(c || '').match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const [r, g, b, a = 1] = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
  return { r, g, b, a };
};
const luminance = ({ r, g, b }) => {
  const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};
export const contrastRatio = (fg, bg) => {
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
function measureBlockContrast(blockId) {
  const doc = document.querySelector('iframe[title="Page canvas"]')?.contentDocument;
  const root = doc?.querySelector(`[data-block-id="${blockId}"] .site-block`);
  if (!root) return null;
  const win = doc.defaultView;
  const fg = parseRgb(win.getComputedStyle(root).color);
  for (let el = root; el && el.nodeType === 1; el = el.parentElement) {
    const cs = win.getComputedStyle(el);
    if (cs.backgroundImage && cs.backgroundImage !== 'none') return null; // photo / gradient
    const bg = parseRgb(cs.backgroundColor);
    if (bg && bg.a > 0.9) return fg ? contrastRatio(fg, bg) : null;
  }
  return null;
}
function ContrastCheck({ blockId, deps }) {
  const [ratio, setRatio] = useState(null);
  useEffect(() => {
    // After the canvas re-renders with the new style.
    const t = setTimeout(() => setRatio(measureBlockContrast(blockId)), 150);
    return () => clearTimeout(t);
  }, [blockId, deps]); // eslint-disable-line react-hooks/exhaustive-deps
  if (ratio == null || ratio >= 4.5) return null;
  return (
    <p className="flex items-start gap-1.5 rounded-md bg-warning-light px-2.5 py-2 text-xs text-text-base" role="status">
      <AlertTriangle className="w-3.5 h-3.5 mt-px shrink-0 text-warning" aria-hidden="true" />
      <span>
        Hard to read: the text and background contrast is {ratio.toFixed(1)}:1 (aim for at least 4.5:1).
        Change the text colour or the background{ratio < 1.6 ? ' — the text is nearly invisible' : ''}.
      </span>
    </p>
  );
}

// Blocks with a section heading (h2) that the Design tab's Heading group styles.
const HEADING_BLOCKS = new Set(['intro', 'features', 'highlights', 'gallery', 'testimonials', 'contact', 'video', 'events', 'split-banner', 'text']);

// ── Block: Design tab ──────────────────────────────────────────────────────
function BlockDesign({ block, onStyle }) {
  const st = block.style || {};
  return (
    <div className="space-y-4">
      <ColorField label="Background" value={st.backgroundColor} onCommit={(v) => onStyle({ backgroundColor: v })} />
      <ColorField label="Text color" value={st.color} onCommit={(v) => onStyle({ color: v })} />
      <ContrastCheck blockId={block.id} deps={`${st.color}|${st.backgroundColor}`} />
      <div className="grid grid-cols-2 gap-3">
        <label className={labelCls}>Space above (px)
          <CommitInput type="number" min={0} max={400} value={st.paddingTop} placeholder="Default" onCommit={(v) => onStyle({ paddingTop: v })} />
        </label>
        <label className={labelCls}>Space below (px)
          <CommitInput type="number" min={0} max={400} value={st.paddingBottom} placeholder="Default" onCommit={(v) => onStyle({ paddingBottom: v })} />
        </label>
      </div>
      <Segmented
        label="Text alignment"
        value={st.textAlign}
        options={[[undefined, 'Default'], ['left', 'Left'], ['center', 'Center'], ['right', 'Right']]}
        onChange={(v) => onStyle({ textAlign: v })}
      />
      {HEADING_BLOCKS.has(block.type) && (
        <div className="pt-2 border-t border-border space-y-3">
          <div className="text-xs font-semibold text-text-base">Heading</div>
          <div className="grid grid-cols-2 gap-3">
            <label className={labelCls}>Size (px)
              <CommitInput type="number" min={12} max={120} value={st.headingFontSize} placeholder="Default" onCommit={(v) => onStyle({ headingFontSize: v })} />
            </label>
            <label className={labelCls}>Weight
              <select className={`${inputCls} mt-1`} value={st.headingFontWeight || ''} onChange={(e) => onStyle({ headingFontWeight: e.target.value || undefined })}>
                <option value="">Default</option>
                <option value="400">Regular</option>
                <option value="500">Medium</option>
                <option value="600">Semibold</option>
                <option value="700">Bold</option>
                <option value="800">Extra bold</option>
              </select>
            </label>
          </div>
          <label className={`${labelCls} block`}>Font
            <select className={`${inputCls} mt-1`} value={st.headingFont || ''} onChange={(e) => onStyle({ headingFont: e.target.value || undefined })}>
              <option value="">Default</option>
              <option value="heading">Site heading font</option>
              <option value="body">Site body font</option>
              <option value="serif">Site serif font</option>
            </select>
          </label>
        </div>
      )}
      {block.type === 'hero' && (
        <div className="pt-2 border-t border-border space-y-3">
          <div className="text-xs font-semibold text-text-base">Title</div>
          <div className="grid grid-cols-2 gap-3">
            <label className={labelCls}>Size (px)
              <CommitInput type="number" min={12} max={160} value={st.titleFontSize} placeholder="Default" onCommit={(v) => onStyle({ titleFontSize: v })} />
            </label>
            <label className={labelCls}>Weight
              <select className={`${inputCls} mt-1`} value={st.titleFontWeight || ''} onChange={(e) => onStyle({ titleFontWeight: e.target.value || undefined })}>
                <option value="">Default</option>
                <option value="400">Regular</option>
                <option value="500">Medium</option>
                <option value="600">Semibold</option>
                <option value="700">Bold</option>
                <option value="800">Extra bold</option>
              </select>
            </label>
          </div>
          <Segmented
            label="Title alignment"
            value={st.titleTextAlign}
            options={[[undefined, 'Default'], ['left', 'Left'], ['center', 'Center'], ['right', 'Right']]}
            onChange={(v) => onStyle({ titleTextAlign: v })}
          />
        </div>
      )}
    </div>
  );
}

// ── Block: Layout tab in a column section ───────────────────────────────────
// Column, width (in columns) and position in the column's stack — not raw
// grid numbers. Changes are re-stacked by WebEditor.placeInColumns.
function ColumnLayout({ section, bIdx, onPlace }) {
  const n = sectionColumns(section);
  const grid = section.fluidConfig?.gridColumns || 24;
  const blocks = section.blocks || [];
  const f = blocks[bIdx]?.fluid;
  if (!f) return null;
  const { col, span } = columnOf(f, n, grid);
  const shares = (g) => g && g.colStart < f.colEnd && g.colEnd > f.colStart;
  const stack = blocks.map((b, i) => ({ g: b.fluid, i })).filter(({ g }) => shares(g)).sort((a, b) => a.g.rowStart - b.g.rowStart);
  const pos = stack.findIndex(({ i }) => i === bIdx) + 1;
  const btn = 'inline-flex items-center gap-1 h-9 px-2.5 rounded-md border border-border text-xs font-medium text-text-base hover:bg-surface-raised disabled:opacity-40 disabled:hover:bg-transparent';
  return (
    <div className="space-y-4">
      <p className="text-xs text-subtle">This section has {n} column{n > 1 ? 's' : ''}. Blocks stack inside their columns — drag a block to another column or section, or set it here.</p>
      <div className="grid grid-cols-2 gap-3">
        <label className={labelCls}>Column
          <select className={`${inputCls} mt-1`} value={col} onChange={(e) => onPlace({ col: Number(e.target.value) })}>
            {Array.from({ length: n }, (_, c) => <option key={c} value={c}>{c + 1} of {n}</option>)}
          </select>
        </label>
        <label className={labelCls}>Width
          <select className={`${inputCls} mt-1`} value={span} onChange={(e) => onPlace({ span: Number(e.target.value) })}>
            {Array.from({ length: n - col }, (_, k) => <option key={k} value={k + 1}>{k + 1} column{k ? 's' : ''}</option>)}
          </select>
        </label>
      </div>
      <div>
        <span className={labelCls}>Position in the column</span>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-sm text-text-base flex-1">{pos} of {stack.length}</span>
          <button type="button" className={btn} disabled={pos <= 1} onClick={() => onPlace({ move: -1 })}><ArrowUp className="w-3.5 h-3.5" /> Move up</button>
          <button type="button" className={btn} disabled={pos >= stack.length} onClick={() => onPlace({ move: 1 })}><ArrowDown className="w-3.5 h-3.5" /> Move down</button>
        </div>
      </div>
      <label className={labelCls}>Height (rows)
        <CommitInput type="number" min={1} max={60} value={f.rowEnd - f.rowStart} onCommit={(v) => v && onPlace({ rows: v })} />
      </label>
    </div>
  );
}

// ── Block: Layout tab ──────────────────────────────────────────────────────
function BlockLayout({ placement, columns, mobileAuto, isMobile, onPlace }) {
  if (mobileAuto) {
    return (
      <div className="space-y-2 text-sm text-muted">
        <p><strong className="text-text-base">Auto layout on phones.</strong> Blocks in this section stack in reading order, full width, and grow with their content.</p>
        <p>To position blocks yourself, hover the section and choose <em>Auto layout · Customize</em>.</p>
      </div>
    );
  }
  const p = placement;
  const width = p.colEnd - p.colStart;
  const height = p.rowEnd - p.rowStart;
  return (
    <div className="space-y-4">
      <p className="text-xs text-subtle">{isMobile ? 'Phone layout' : 'Desktop layout'} · {columns}-column grid. You can also drag and resize the block on the page.</p>
      <div className="grid grid-cols-2 gap-3">
        <label className={labelCls}>Column
          <CommitInput type="number" min={1} max={columns} value={p.colStart}
            onCommit={(v) => { const s = Math.min(v ?? 1, columns); onPlace({ colStart: s, colEnd: Math.min(columns + 1, s + width) }); }} />
        </label>
        <label className={labelCls}>Width (columns)
          <CommitInput type="number" min={1} max={columns} value={width}
            onCommit={(v) => onPlace({ colEnd: Math.min(columns + 1, p.colStart + (v ?? width)) })} />
        </label>
        <label className={labelCls}>Row
          <CommitInput type="number" min={1} max={200} value={p.rowStart}
            onCommit={(v) => { const s = v ?? 1; onPlace({ rowStart: s, rowEnd: s + height }); }} />
        </label>
        <label className={labelCls}>Height (rows)
          <CommitInput type="number" min={1} max={200} value={height}
            onCommit={(v) => onPlace({ rowEnd: p.rowStart + (v ?? height) })} />
        </label>
      </div>
      <label className={labelCls}>Layer (higher = in front)
        <CommitInput type="number" min={0} max={1000} value={Math.max(0, p.zIndex ?? 0)} onCommit={(v) => onPlace({ zIndex: Math.max(0, v ?? 0) })} />
      </label>
    </div>
  );
}

// ── Collapsible group ──────────────────────────────────────────────────────
function Group({ title, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between py-3 min-h-[44px] text-[13px] font-semibold text-text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
      >
        {title}
        {open ? <ChevronDown className="w-4 h-4 text-muted" /> : <ChevronRight className="w-4 h-4 text-muted" />}
      </button>
      {open && <div className="pb-4 space-y-4">{children}</div>}
    </div>
  );
}

// ── Overlay (darkening over a background photo/video) ─────────────────────
// Stored as a percentage; older pages store none/light/medium/dark, which
// read as the same darkness (SiteSections.SECTION_OVERLAYS: 0/25/45/65).
const OVERLAY_ENUM = { none: 0, light: 25, medium: 45, dark: 65 };
const overlayPercent = (v) => (typeof v === 'number' ? v : (OVERLAY_ENUM[v] ?? 0));
function OverlaySlider({ value, onCommit }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => { setDraft(value); }, [value]);
  const ref = useRef(null);
  // Commit when the slider is released (native "change"), so a drag is one
  // undo step / one save — not one per pixel.
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const onChange = () => onCommit(Number(el.value));
    el.addEventListener('change', onChange);
    return () => el.removeEventListener('change', onChange);
  }, [onCommit]);
  return (
    <div>
      <span className={labelCls}>Overlay</span>
      <div className="mt-1 flex items-center gap-3">
        <input
          ref={ref}
          type="range"
          min={0}
          max={80}
          step={5}
          value={draft}
          onChange={(e) => setDraft(Number(e.target.value))}
          aria-label="Overlay darkness"
          aria-valuetext={`${draft}%`}
          className="flex-1 h-2 accent-[hsl(var(--primary))] cursor-pointer"
        />
        <div className="w-20 -mt-1">
          <CommitInput type="number" min={0} max={80} value={draft} suffix="%" ariaLabel="Overlay percent" onCommit={(v) => onCommit(v ?? 0)} />
        </div>
      </div>
      <p className="mt-1 text-xs text-subtle">Darkens the background so text stays readable.</p>
    </div>
  );
}

// ── Section ────────────────────────────────────────────────────────────────
function SectionSettings({ section, onUpdate }) {
  const cfg = section.fluidConfig || {};
  const setCfg = (patch) => onUpdate({ fluidConfig: { ...cfg, ...patch } });
  const initialTab = cfg.backgroundVideo ? 'video' : cfg.backgroundImage ? 'image' : 'color';
  const [bgTab, setBgTab] = useState(initialTab);
  useEffect(() => { setBgTab(initialTab); }, [section.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const overlay = overlayPercent(cfg.backgroundOverlay);
  return (
    <div>
      <div className="pb-4 space-y-3">
        <Segmented label="Background" value={bgTab} options={[['color', 'Color'], ['image', 'Image'], ['video', 'Video']]} onChange={setBgTab} />
        {bgTab === 'color' && (
          <ColorField label="Color" value={section.backgroundColor || undefined} onCommit={(v) => onUpdate({ backgroundColor: v || null })} />
        )}
        {bgTab === 'image' && (
          <>
            <ImageField label="Image" value={cfg.backgroundImage} onChange={(v) => setCfg({ backgroundImage: v })} />
            {cfg.backgroundImage && <OverlaySlider value={overlay} onCommit={(v) => setCfg({ backgroundOverlay: v })} />}
          </>
        )}
        {bgTab === 'video' && (
          <>
            <ImageField kind="video" label="Video (MP4 or WebM, plays muted on a loop)" value={cfg.backgroundVideo} onChange={(v) => setCfg({ backgroundVideo: v })} />
            <p className="text-xs text-subtle">The Image tab's photo shows while the video loads, and instead of it for people who prefer reduced motion. Keep videos short and small.</p>
            {cfg.backgroundVideo && <OverlaySlider value={overlay} onCommit={(v) => setCfg({ backgroundOverlay: v })} />}
          </>
        )}
      </div>

      <Group title="Layout">
        <Segmented
          label="Columns"
          value={sectionColumns(section)}
          options={[[null, 'Free'], ...COLUMN_OPTIONS.map((n) => [n, String(n)])]}
          onChange={(v) => onUpdate(applyColumns(section, v))}
        />
        <p className="text-xs text-subtle">
          {sectionColumns(section)
            ? 'Blocks snap to the columns and stack inside them — no overlapping.'
            : 'Freeform: blocks stay exactly where you put them and may overlap. Pick a column count to line them up in columns.'}
        </p>
      </Group>

      <Group title="Spacing">
        <div className="grid grid-cols-2 gap-3">
          <label className={labelCls}>Top
            <CommitInput type="number" min={0} max={600} suffix="px" value={section.paddingTop ?? 0} onCommit={(v) => onUpdate({ paddingTop: v ?? 0 })} />
          </label>
          <label className={labelCls}>Bottom
            <CommitInput type="number" min={0} max={600} suffix="px" value={section.paddingBottom ?? 0} onCommit={(v) => onUpdate({ paddingBottom: v ?? 0 })} />
          </label>
          <label className={labelCls}>Left
            <CommitInput type="number" min={0} max={400} suffix="px" value={section.paddingLeft ?? 0} onCommit={(v) => onUpdate({ paddingLeft: v ?? 0 })} />
          </label>
          <label className={labelCls}>Right
            <CommitInput type="number" min={0} max={400} suffix="px" value={section.paddingRight ?? 0} onCommit={(v) => onUpdate({ paddingRight: v ?? 0 })} />
          </label>
        </div>
        <Segmented
          label="Content width"
          value={cfg.contentWidth}
          options={[['narrow', 'Narrow'], ['medium', 'Medium'], [undefined, 'Wide']]}
          onChange={(v) => setCfg({ contentWidth: v })}
        />
      </Group>

      <Group title="Design" defaultOpen={false}>
        <Segmented
          label="Height"
          value={!!cfg.fillScreen}
          options={[[false, 'Fit content'], [true, 'Tall']]}
          onChange={(v) => setCfg({ fillScreen: v })}
        />
        {cfg.fillScreen && (
          <label className={labelCls}>Minimum height
            <CommitInput type="number" min={100} max={2000} suffix="px" value={cfg.minHeight ?? 320} onCommit={(v) => setCfg({ minHeight: v ?? 320 })} />
          </label>
        )}
        <Segmented
          label="Vertical alignment"
          value={cfg.verticalAlignment || 'top'}
          options={[['top', 'Top'], ['center', 'Middle'], ['bottom', 'Bottom']]}
          onChange={(v) => setCfg({ verticalAlignment: v })}
        />
      </Group>

      <Group title="Advanced" defaultOpen={false}>
        <p className="text-xs text-subtle">Layout grid — blocks snap to these rows and gaps.</p>
        <div className="grid grid-cols-3 gap-3">
          <label className={labelCls}>Row height
            <CommitInput type="number" min={20} max={400} value={cfg.rowHeight ?? 80} onCommit={(v) => setCfg({ rowHeight: v ?? 80 })} />
          </label>
          <label className={labelCls}>Col gap
            <CommitInput type="number" min={0} max={120} value={cfg.gap?.horizontal ?? 8} onCommit={(v) => setCfg({ gap: { ...cfg.gap, horizontal: v ?? 8 } })} />
          </label>
          <label className={labelCls}>Row gap
            <CommitInput type="number" min={0} max={120} value={cfg.gap?.vertical ?? 8} onCommit={(v) => setCfg({ gap: { ...cfg.gap, vertical: v ?? 8 } })} />
          </label>
        </div>
      </Group>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
// Saved straight away (page details, not page content: no undo / autosave).
// The address isn't editable here — a new one breaks existing links, so it
// stays on the Pages screen. (No SEO description: WebPage has no column for
// it yet — adding one needs a database migration.)
function PageSettings({ page, onUpdatePageMeta }) {
  if (!page) return null;
  return (
    <div className="space-y-4">
      <label className={labelCls}>Page title
        <CommitInput value={page.title} placeholder="Page title" onCommit={(v) => v && onUpdatePageMeta({ title: v })} />
      </label>
      <div>
        <span className={labelCls}>Page address</span>
        <p className="mt-1 text-sm font-mono text-text-base break-all">/{page.slug === 'home' ? '' : page.slug}</p>
        <p className="mt-1 text-xs text-subtle">Change it on the <a className="text-primary hover:underline" href="/hub-admin/web/pages" target="_blank" rel="noreferrer">Pages</a> screen — a new address breaks existing links to this page.</p>
      </div>
    </div>
  );
}

export default function EditorInspector({
  selection, // { kind: 'block', sIdx, bIdx, block, placement, columns, mobileAuto } | { kind: 'section', sIdx, section }
  isMobile,
  onUpdateBlockContent,
  onUpdateBlock,
  onUpdateSection,
  onClose,
  page, // { id, title, slug }
  onUpdatePageMeta,
  onPlaceInColumns,
  siteTokens, // the site theme (tokens) — its colors are offered as presets
}) {
  const [tab, setTab] = useState('content');
  const [sectionTab, setSectionTab] = useState('section');
  const presets = useMemo(() => siteColorPresets(siteTokens), [siteTokens]);
  const blockId = selection?.kind === 'block' ? selection.block.id : null;
  useEffect(() => { setTab('content'); }, [blockId]);

  // Nothing selected: keep the column (with a hint) instead of removing it —
  // the canvas used to zoom in and out every time a block was selected or
  // deselected, moving the block away from the cursor.
  if (!selection) {
    return (
      <aside className="w-80 shrink-0 border-l border-border bg-surface sticky top-[52px] self-start h-[calc(100vh-52px)]" aria-label="Inspector">
        <div className="flex items-center justify-between px-4 h-12 border-b border-border">
          <h2 className="text-sm font-semibold text-text-base flex items-center gap-2"><LayoutPanelTop className="w-4 h-4 text-muted shrink-0" />Inspector</h2>
          <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded hover:bg-surface-raised text-muted" aria-label="Close inspector" title="Close (more room for the page)"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 text-sm text-muted space-y-2">
          <p className="text-text-base font-medium">Nothing selected</p>
          <p>Click a block to change its settings, design and layout. Hover a section and use its gear for background and spacing.</p>
        </div>
      </aside>
    );
  }

  const title = selection.kind === 'block'
    ? `${blockTypeLabel(selection.block.type)} block`
    : `Section ${selection.sIdx + 1}`;
  const sectionType = selection.kind === 'section'
    ? (selection.section.blocks?.length ? blockTypeLabel(selection.section.blocks[0].type) : 'Empty section')
    : null;
  const underlineTab = (active) => `px-3 h-full min-h-[44px] text-[13px] font-semibold border-b-2 -mb-px focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${active ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-text-base'}`;

  return (
    <PresetsContext.Provider value={presets}>
    <aside
      className="w-80 shrink-0 border-l border-border bg-surface sticky top-[52px] self-start h-[calc(100vh-52px)] overflow-y-auto"
      aria-label="Inspector"
      // Esc in a text field just leaves the field (so a half-typed value isn't
      // lost to a selection change); anywhere else it walks the selection up
      // like on the canvas — the panel used to swallow it entirely.
      onKeyDown={(e) => { if (e.key === 'Escape' && isTextEntryTarget(e.target)) { e.stopPropagation(); e.target.blur(); } }}
    >
      {selection.kind === 'block' ? (
        <div className="flex items-center justify-between px-4 h-12 border-b border-border sticky top-0 bg-surface z-10">
          <h2 className="text-sm font-semibold text-text-base flex items-center gap-2 truncate">
            <LayoutPanelTop className="w-4 h-4 text-muted shrink-0" />{title}
          </h2>
          <button type="button" onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-surface-raised text-muted" aria-label="Close inspector" title="Close"><X className="w-4 h-4" /></button>
        </div>
      ) : (
        <div className="flex items-stretch justify-between pl-2 pr-3 h-12 border-b border-border sticky top-0 bg-surface z-10">
          <div className="flex items-stretch" role="tablist" aria-label="Section or page settings">
            {[['section', 'Section'], ['page', 'Page']].map(([id, label]) => (
              <button key={id} type="button" role="tab" aria-selected={sectionTab === id} onClick={() => setSectionTab(id)} className={underlineTab(sectionTab === id)}>{label}</button>
            ))}
          </div>
          <button type="button" onClick={onClose} className="self-center w-9 h-9 flex items-center justify-center rounded-md hover:bg-surface-raised text-muted" aria-label="Close inspector" title="Close"><X className="w-4 h-4" /></button>
        </div>
      )}

      {selection.kind === 'block' ? (
        <>
          <div className="flex items-stretch border-b border-border px-2" role="tablist" aria-label="Block settings">
            {[['content', 'Content'], ['design', 'Design'], ['layout', 'Layout']].map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={underlineTab(tab === id)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="p-4" role="tabpanel">
            {tab === 'content' && (
              <BlockContentSettings
                block={selection.block}
                onUpdateContent={(u) => onUpdateBlockContent(selection.sIdx, selection.bIdx, u)}
              />
            )}
            {tab === 'design' && (
              <BlockDesign
                block={selection.block}
                onStyle={(patch) => {
                  const next = { ...(selection.block.style || {}), ...patch };
                  Object.keys(next).forEach((k) => (next[k] === undefined || next[k] === '') && delete next[k]);
                  onUpdateBlock(selection.sIdx, selection.bIdx, { style: next });
                }}
              />
            )}
            {tab === 'layout' && !isMobile && sectionColumns(selection.section) && (
              <ColumnLayout section={selection.section} bIdx={selection.bIdx} onPlace={(change) => onPlaceInColumns?.(selection.sIdx, selection.bIdx, change)} />
            )}
            {tab === 'layout' && (isMobile || !sectionColumns(selection.section)) && (
              <BlockLayout
                placement={selection.placement}
                columns={selection.columns}
                mobileAuto={selection.mobileAuto}
                isMobile={isMobile}
                onPlace={(patch) => {
                  const key = isMobile ? 'fluidMobile' : 'fluid';
                  onUpdateBlock(selection.sIdx, selection.bIdx, { [key]: { ...selection.placement, ...patch } });
                }}
              />
            )}
          </div>
        </>
      ) : (
        <div className="p-4" role="tabpanel">
          {sectionTab === 'section' ? (
            <>
              <div className="flex items-center gap-2.5 mb-4">
                <span className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-muted"><LayoutTemplate className="w-4 h-4" aria-hidden="true" /></span>
                <h2 className="text-sm font-semibold text-text-base"><span className="text-muted font-medium">Section {selection.sIdx + 1} · </span>{sectionType}</h2>
              </div>
              <SectionSettings section={selection.section} onUpdate={(u) => onUpdateSection(selection.sIdx, u)} />
            </>
          ) : (
            <PageSettings page={page} onUpdatePageMeta={onUpdatePageMeta} />
          )}
        </div>
      )}
    </aside>
    </PresetsContext.Provider>
  );
}
