/**
 * EditorInspector — docked right-hand panel for the current selection.
 *
 *  Block selected   → Content (non-inline settings) · Design (block.style) ·
 *                     Layout (grid position for the current device)
 *  Section selected → background, spacing and grid settings
 *
 * Text, images and button labels are still edited directly on the canvas;
 * this panel holds everything that has no on-canvas affordance.
 *
 * Number/text/color fields keep local state and commit on blur/Enter, so a
 * value typed as "120" is one undo step (and one autosave), not three.
 */
import { useEffect, useRef, useState } from 'react';
import { X, LayoutPanelTop } from 'lucide-react';
import { BlockContentSettings, blockTypeLabel, ImageField } from './BlockSettingsPanel';
import { isTextEntryTarget } from './editorUtils';

const inputCls = 'w-full px-2.5 py-1.5 text-sm border border-border rounded-md bg-surface text-text-base focus:outline-none focus:ring-2 focus:ring-primary';
const labelCls = 'block text-xs font-medium text-muted';

/** Text/number input that commits on blur or Enter. Empty → undefined. */
function CommitInput({ value, onCommit, type = 'text', placeholder, min, max, ariaLabel }) {
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
  return (
    <input
      className={`${inputCls} mt-1`}
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
}

/** Color: swatch (commits when the picker closes) + hex text field. */
function ColorField({ label, value, onCommit, placeholder = 'Default' }) {
  const swatchRef = useRef(null);
  useEffect(() => {
    const el = swatchRef.current;
    if (!el) return undefined;
    // Native "change" fires once when the picker closes (React's onChange
    // fires continuously while dragging — one undo step per pick instead).
    const onChange = () => onCommit(el.value);
    el.addEventListener('change', onChange);
    return () => el.removeEventListener('change', onChange);
  }, [onCommit]);
  const isHex = /^#[0-9a-f]{6}$/i.test(value || '');
  return (
    <div>
      <span className={labelCls}>{label}</span>
      <div className="flex items-center gap-2">
        <div className="relative mt-1 h-8 w-10 rounded border border-border bg-surface overflow-hidden" title={isHex ? value : `${label}: theme default`}>
          {!isHex && (
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{ background: 'repeating-conic-gradient(hsl(var(--border-strong, 215 16% 47%) / 0.45) 0% 25%, transparent 0% 50%)', backgroundSize: '8px 8px' }}
            />
          )}
          <input ref={swatchRef} type="color" defaultValue={isHex ? value : '#ffffff'} key={value || 'none'} className={`h-full w-full p-0.5 bg-transparent ${isHex ? '' : 'opacity-0'}`} aria-label={`${label} picker`} />
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
      <div className="mt-1 flex rounded-md border border-border overflow-hidden" role="radiogroup" aria-label={label}>
        {options.map(([v, l]) => (
          <button
            key={String(v)}
            type="button"
            role="radio"
            aria-checked={value === v}
            onClick={() => onChange(v)}
            className={`flex-1 min-h-[32px] py-1.5 text-xs font-medium ${value === v ? 'bg-primary text-primary-foreground' : 'bg-surface text-muted hover:bg-surface-raised'}`}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Block: Design tab ──────────────────────────────────────────────────────
function BlockDesign({ block, onStyle }) {
  const st = block.style || {};
  return (
    <div className="space-y-4">
      <ColorField label="Background" value={st.backgroundColor} onCommit={(v) => onStyle({ backgroundColor: v })} />
      <ColorField label="Text color" value={st.color} onCommit={(v) => onStyle({ color: v })} />
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

// ── Section ────────────────────────────────────────────────────────────────
function SectionSettings({ section, onUpdate }) {
  const cfg = section.fluidConfig || {};
  const setCfg = (patch) => onUpdate({ fluidConfig: { ...cfg, ...patch } });
  return (
    <div className="space-y-4">
      <ColorField label="Background" value={section.backgroundColor || undefined} onCommit={(v) => onUpdate({ backgroundColor: v || null })} />
      <ImageField label="Background photo" value={cfg.backgroundImage} onChange={(v) => setCfg({ backgroundImage: v })} />
      {cfg.backgroundImage && (
        <Segmented
          label="Darken photo (keeps text readable)"
          value={cfg.backgroundOverlay || 'none'}
          options={[['none', 'None'], ['light', 'Light'], ['medium', 'Medium'], ['dark', 'Dark']]}
          onChange={(v) => setCfg({ backgroundOverlay: v })}
        />
      )}
      <div className="grid grid-cols-2 gap-3">
        <label className={labelCls}>Space above (px)
          <CommitInput type="number" min={0} max={600} value={section.paddingTop ?? 0} onCommit={(v) => onUpdate({ paddingTop: v ?? 0 })} />
        </label>
        <label className={labelCls}>Space below (px)
          <CommitInput type="number" min={0} max={600} value={section.paddingBottom ?? 0} onCommit={(v) => onUpdate({ paddingBottom: v ?? 0 })} />
        </label>
      </div>
      <Segmented
        label="Height"
        value={!!cfg.fillScreen}
        options={[[false, 'Fit content'], [true, 'Tall']]}
        onChange={(v) => setCfg({ fillScreen: v })}
      />
      {cfg.fillScreen && (
        <label className={labelCls}>Minimum height (px)
          <CommitInput type="number" min={100} max={2000} value={cfg.minHeight ?? 320} onCommit={(v) => setCfg({ minHeight: v ?? 320 })} />
        </label>
      )}
      <Segmented
        label="Vertical alignment"
        value={cfg.verticalAlignment || 'top'}
        options={[['top', 'Top'], ['center', 'Middle'], ['bottom', 'Bottom']]}
        onChange={(v) => setCfg({ verticalAlignment: v })}
      />
      <div className="pt-2 border-t border-border space-y-3">
        <div className="text-xs font-semibold text-text-base">Layout grid</div>
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
}) {
  const [tab, setTab] = useState('content');
  const blockId = selection?.kind === 'block' ? selection.block.id : null;
  useEffect(() => { setTab('content'); }, [blockId]);

  if (!selection) return null;

  const title = selection.kind === 'block'
    ? `${blockTypeLabel(selection.block.type)} block`
    : `Section ${selection.sIdx + 1}`;

  return (
    <aside
      className="w-80 shrink-0 border-l border-border bg-surface sticky top-[52px] self-start h-[calc(100vh-52px)] overflow-y-auto"
      aria-label="Inspector"
      // Esc in a text field just leaves the field (so a half-typed value isn't
      // lost to a selection change); anywhere else it walks the selection up
      // like on the canvas — the panel used to swallow it entirely.
      onKeyDown={(e) => { if (e.key === 'Escape' && isTextEntryTarget(e.target)) { e.stopPropagation(); e.target.blur(); } }}
    >
      <div className="flex items-center justify-between px-4 h-12 border-b border-border sticky top-0 bg-surface z-10">
        <h2 className="text-sm font-semibold text-text-base flex items-center gap-2 truncate">
          <LayoutPanelTop className="w-4 h-4 text-muted shrink-0" />{title}
        </h2>
        <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded hover:bg-surface-raised text-muted" aria-label="Close inspector" title="Close"><X className="w-4 h-4" /></button>
      </div>

      {selection.kind === 'block' ? (
        <>
          <div className="flex border-b border-border px-2" role="tablist" aria-label="Block settings">
            {[['content', 'Content'], ['design', 'Design'], ['layout', 'Layout']].map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={`px-3 py-2.5 text-xs font-semibold border-b-2 -mb-px ${tab === id ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-text-base'}`}
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
            {tab === 'layout' && (
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
        <div className="p-4">
          <SectionSettings section={selection.section} onUpdate={(u) => onUpdateSection(selection.sIdx, u)} />
        </div>
      )}
    </aside>
  );
}
