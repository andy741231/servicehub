import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Plus, Settings as SettingsIcon, Copy, Trash2, MoveUp, MoveDown,
  Layers, Pencil, LayoutGrid, Maximize2, Minimize2, ArrowUpDown,
} from 'lucide-react';
import FluidBlock from './FluidBlock.jsx';

/**
 * FluidSection — a CSS Grid–based freeform layout container.
 *
 * Each section has an invisible 24-column grid. Blocks are positioned
 * using grid coordinates (colStart/colEnd/rowStart/rowEnd) and can
 * overlap/layer via zIndex.
 *
 * The grid overlay appears while dragging/resizing a block, or when
 * the user holds the "G" key.
 */
export default function FluidSection({
  section,
  sectionIndex,
  selectedBlockIds,
  onSelectBlock,
  onClearSelection,
  onUpdateBlock,
  onUpdateSection,
  onDeleteBlock,
  onDuplicateBlock,
  onAddBlock,
  onDeleteSection,
  onDuplicateSection,
  onMoveSectionUp,
  onMoveSectionDown,
  onAddSectionBelow,
  EditableText,
  EditableButton,
  EditableImage,
  onUpdateBlockContent,
  onAddNestedBlock,
  viewport = 'desktop',
  readOnly,
}) {
  const cfg = section.fluidConfig || {
    gridColumns: 24,
    rowHeight: 80,
    gap: { horizontal: 8, vertical: 8 },
    fillScreen: false,
    minHeight: 320,
    verticalAlignment: 'top',
  };
  const isMobile = viewport === 'mobile';
  const gridColumns = isMobile ? 6 : (cfg.gridColumns || 24);
  const rowHeight = cfg.rowHeight || 80;
  const gapH = cfg.gap?.horizontal ?? 8;
  const gapV = cfg.gap?.vertical ?? 8;

  const [showGrid, setShowGrid] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isSelected, setIsSelected] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [guides, setGuides] = useState({ vertical: [], horizontal: [] });
  const sectionRef = useRef(null);
  const [colWidth, setColWidth] = useState(40);

  // Clear section selection when a block in this section is selected —
  // the mockup spec says "only one toolbar shows at once."
  const hasSelectedBlock = (section.blocks || []).some(b => selectedBlockIds?.has(b.id));
  useEffect(() => {
    if (hasSelectedBlock && isSelected) setIsSelected(false);
  }, [hasSelectedBlock, isSelected]);

  // Measure column width from the actual container
  useEffect(() => {
    if (!sectionRef.current) return;
    const measure = () => {
      const w = sectionRef.current?.clientWidth || 960;
      setColWidth((w + gapH) / gridColumns); // each column = (totalWidth + gap) / cols
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(sectionRef.current);
    return () => ro.disconnect();
  }, [gridColumns, gapH]);

  // "G" key toggles grid overlay
  useEffect(() => {
    if (readOnly) return;
    const onKey = (e) => {
      if (e.key === 'g' || e.key === 'G') {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
        setShowGrid(s => !s);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [readOnly]);

  // Compute section height: fillScreen → min(viewport%), else hug content
  const blocks = section.blocks || [];
  const maxRowEnd = blocks.reduce((max, b) => Math.max(max, b.fluid?.rowEnd ?? 3), 1);
  const contentHeight = maxRowEnd * (rowHeight + gapV) - gapV;
  const sectionMinHeight = cfg.fillScreen
    ? Math.max(cfg.minHeight || 320, contentHeight)
    : Math.max(contentHeight + 96, 120); // +96 for padding

  const vAlignStyle = cfg.verticalAlignment === 'center'
    ? { alignContent: 'center' }
    : cfg.verticalAlignment === 'bottom'
    ? { alignContent: 'end' }
    : { alignContent: 'start' };

  const sectionStyle = {
    paddingTop:    section.paddingTop    ?? 48,
    paddingBottom: section.paddingBottom ?? 48,
    paddingLeft:   section.paddingLeft   ?? 0,
    paddingRight:  section.paddingRight  ?? 0,
    marginTop:     section.marginTop     ?? 0,
    marginBottom:  section.marginBottom  ?? 0,
    backgroundColor: section.backgroundColor || undefined,
    minHeight: sectionMinHeight,
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: `repeat(${gridColumns}, 1fr)`,
    gridTemplateRows: `repeat(${Math.max(maxRowEnd + 2, 4)}, ${rowHeight}px)`,
    gap: `${gapV}px ${gapH}px`,
    position: 'relative',
    ...vAlignStyle,
  };

  const chromeVisible = isHovered || isSelected;

  // Accessible name for this section, e.g. "Section 2, 3 blocks"
  const sectionAccessibleName = `Section ${sectionIndex + 1}${(blocks?.length || 0) > 0 ? `, ${blocks.length} block${blocks.length !== 1 ? 's' : ''}` : ''}`;

  return (
    <div
      ref={sectionRef}
      className="relative group"
      style={{
        ...sectionStyle,
        outline: chromeVisible ? '2px solid hsl(var(--primary))' : '2px solid transparent',
        outlineOffset: -2,
        transition: 'outline-color .08s ease',
        zIndex: isSelected ? 5 : 'auto',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={(e) => {
        // Click on the section's own padding area (not a child block or chrome
        // button) selects the section. Chrome buttons call stopPropagation.
        if (e.target === e.currentTarget) {
          if (onClearSelection) onClearSelection();
          setIsSelected(true);
        }
      }}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          if (onClearSelection) onClearSelection();
          setIsSelected(true);
        }
      }}
      tabIndex={0}
      role="group"
      aria-label={sectionAccessibleName}
    >
      {/* ── Top-center: + Add Section pill ─────────────────────────────── */}
      {!readOnly && (
        <div
          className="absolute left-1/2 -translate-x-1/2 z-50 transition-opacity duration-100"
          style={{ top: -14, opacity: chromeVisible ? 1 : 0, pointerEvents: chromeVisible ? 'auto' : 'none' }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); onAddSectionBelow(sectionIndex); }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-[0.06em] shadow-[0_2px_8px_rgba(16,20,30,0.15),0_1px_2px_rgba(16,20,30,0.08)] text-white"
            style={{ background: 'hsl(var(--primary))' }}
            title="Add section above"
          >
            <Plus className="w-3 h-3" /> Add Section
          </button>
        </div>
      )}

      {/* ── Top-left corner: Layers + Add Block pill ───────────────────── */}
      {!readOnly && (
        <div
          className="absolute top-4 left-4 flex items-center gap-2 z-50 transition-opacity duration-100"
          style={{ opacity: chromeVisible ? 1 : 0, pointerEvents: chromeVisible ? 'auto' : 'none' }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setIsSelected(true); }}
            title="Layers"
            className="w-9 h-9 bg-white rounded-lg flex items-center justify-center shadow-[0_2px_8px_rgba(16,20,30,0.15),0_1px_2px_rgba(16,20,30,0.08)] text-text-base hover:bg-surface-raised"
          >
            <Layers className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onAddBlock(sectionIndex); }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white text-text-base text-[11px] font-bold uppercase tracking-[0.06em] shadow-[0_2px_8px_rgba(16,20,30,0.15),0_1px_2px_rgba(16,20,30,0.08)] hover:bg-surface-raised"
            title="Add block to this section"
          >
            <Plus className="w-3 h-3" /> Add Block
          </button>
        </div>
      )}

      {/* ── Top-right corner: side-panel + Ask Beacon pill ─────────────── */}
      {!readOnly && (
        <div
          className="absolute top-4 right-4 flex flex-col gap-2 z-50 transition-opacity duration-100"
          style={{ opacity: chromeVisible ? 1 : 0, pointerEvents: chromeVisible ? 'auto' : 'none' }}
        >
          <div className="bg-white rounded-lg shadow-[0_2px_8px_rgba(16,20,30,0.15),0_1px_2px_rgba(16,20,30,0.08)] overflow-hidden min-w-[168px]">
            {/* Edit Section row */}
            <button
              onClick={(e) => { e.stopPropagation(); setShowSettings(s => !s); setIsSelected(true); }}
              className="flex items-center gap-2.5 px-3.5 py-2.5 text-[12.5px] font-semibold text-text-base hover:bg-surface-raised w-full text-left border-b border-border"
            >
              <Pencil className="w-[15px] h-[15px]" /> Edit Section
            </button>
            {/* Add Section Below row */}
            <button
              onClick={(e) => { e.stopPropagation(); onAddSectionBelow(sectionIndex); setIsSelected(true); }}
              className="flex items-center gap-2.5 px-3.5 py-2.5 text-[12.5px] font-semibold text-text-base hover:bg-surface-raised w-full text-left border-b border-border"
              title="Add a new section below this one"
            >
              <LayoutGrid className="w-[15px] h-[15px]" /> Add Section Below
            </button>
            {/* Icon row: Duplicate / Height toggle / Move up / Move down */}
            <div className="flex border-b border-border">
              <button onClick={(e) => { e.stopPropagation(); onDuplicateSection(sectionIndex); }} title="Duplicate section" aria-label="Duplicate section" className="flex-1 h-10 flex items-center justify-center hover:bg-surface-raised border-r border-border">
                <Copy className="w-[15px] h-[15px]" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onUpdateSection(sectionIndex, { fluidConfig: { ...cfg, fillScreen: !cfg.fillScreen } }); }}
                title={cfg.fillScreen ? 'Tall section — click to hug content' : 'Hug content — click to make tall'}
                aria-label={cfg.fillScreen ? 'Switch to hug content height' : 'Switch to full screen height'}
                className="flex-1 h-10 flex items-center justify-center hover:bg-surface-raised border-r border-border"
              >
                {cfg.fillScreen ? <Minimize2 className="w-[15px] h-[15px]" /> : <Maximize2 className="w-[15px] h-[15px]" />}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onMoveSectionUp(sectionIndex); }}
                disabled={sectionIndex === 0}
                title="Move section up"
                aria-label="Move section up"
                className={`flex-1 h-10 flex items-center justify-center border-r border-border ${sectionIndex === 0 ? 'opacity-30 cursor-default' : 'hover:bg-surface-raised'}`}
              >
                <MoveUp className="w-[15px] h-[15px]" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onMoveSectionDown(sectionIndex); }}
                title="Move section down"
                aria-label="Move section down"
                className="flex-1 h-10 flex items-center justify-center hover:bg-surface-raised"
              >
                <MoveDown className="w-[15px] h-[15px]" />
              </button>
            </div>
            {/* Remove row */}
            <button
              onClick={(e) => { e.stopPropagation(); onDeleteSection(sectionIndex); }}
              className="flex items-center gap-2.5 px-3.5 py-2.5 text-[12.5px] font-semibold w-full text-left hover:bg-surface-raised"
              style={{ color: 'hsl(var(--danger, 0 84% 60%))' }}
              title="Remove section"
              aria-label="Remove section"
            >
              <Trash2 className="w-[15px] h-[15px]" style={{ color: 'hsl(var(--danger, 0 84% 60%))' }} /> Remove
            </button>
          </div>
        </div>
      )}

      {/* ── Bottom-right: section height toggle ────────────────────────── */}
      {!readOnly && (
        <div
          className="absolute bottom-4 right-4 z-50 transition-opacity duration-100"
          style={{ opacity: chromeVisible ? 1 : 0, pointerEvents: chromeVisible ? 'auto' : 'none' }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); onUpdateSection(sectionIndex, { fluidConfig: { ...cfg, fillScreen: !cfg.fillScreen } }); }}
            title={cfg.fillScreen ? 'Switch to hug-content height' : 'Switch to fill-screen height'}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white shadow-[0_2px_8px_rgba(16,20,30,0.15),0_1px_2px_rgba(16,20,30,0.08)]"
            style={{ background: 'hsl(var(--primary))' }}
          >
            <ArrowUpDown className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Bottom-center: + Add Section pill ──────────────────────────── */}
      {!readOnly && (
        <div
          className="absolute left-1/2 -translate-x-1/2 z-50 transition-opacity duration-100"
          style={{ bottom: -14, opacity: chromeVisible ? 1 : 0, pointerEvents: chromeVisible ? 'auto' : 'none' }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); onAddSectionBelow(sectionIndex); }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-[0.06em] shadow-[0_2px_8px_rgba(16,20,30,0.15),0_1px_2px_rgba(16,20,30,0.08)] text-white"
            style={{ background: 'hsl(var(--primary))' }}
            title="Add section below"
          >
            <Plus className="w-3 h-3" /> Add Section
          </button>
        </div>
      )}

      {/* Section settings panel — opens below the top-left cluster when toggled */}
      {showSettings && !readOnly && (
        <div className="absolute top-20 left-4 z-[60] bg-surface border border-border rounded-xl shadow-[var(--shadow-modal-value)] p-4 w-72" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-text-base flex items-center gap-2">
              <SettingsIcon className="w-4 h-4" /> Fluid Section Settings
            </h4>
            <button onClick={() => setShowSettings(false)} className="p-1 hover:bg-surface-raised rounded text-muted">✕</button>
          </div>
          <div className="space-y-3">
            {/* Gap control */}
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Gap (px)</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-xs text-muted">Horizontal</span>
                  <input type="number" value={gapH} onChange={e => onUpdateSection(sectionIndex, { fluidConfig: { ...cfg, gap: { ...cfg.gap, horizontal: Number(e.target.value) } } })} className="w-full px-2 py-1 text-xs border border-border rounded" />
                </div>
                <div>
                  <span className="text-xs text-muted">Vertical</span>
                  <input type="number" value={gapV} onChange={e => onUpdateSection(sectionIndex, { fluidConfig: { ...cfg, gap: { ...cfg.gap, vertical: Number(e.target.value) } } })} className="w-full px-2 py-1 text-xs border border-border rounded" />
                </div>
              </div>
            </div>
            {/* Row height */}
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Row Height (px)</label>
              <input type="number" value={rowHeight} onChange={e => onUpdateSection(sectionIndex, { fluidConfig: { ...cfg, rowHeight: Number(e.target.value) } })} className="w-full px-2 py-1 text-xs border border-border rounded" />
            </div>
            {/* Fill Screen */}
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Fill Screen</label>
              <button onClick={() => onUpdateSection(sectionIndex, { fluidConfig: { ...cfg, fillScreen: !cfg.fillScreen } })} className={`px-3 py-1 text-xs rounded ${cfg.fillScreen ? 'bg-primary text-primary-foreground' : 'bg-surface-raised text-muted'}`}>
                {cfg.fillScreen ? 'ON' : 'OFF'}
              </button>
              {cfg.fillScreen && (
                <div className="mt-2">
                  <span className="text-xs text-muted">Min Height (px)</span>
                  <input type="number" value={cfg.minHeight ?? 320} onChange={e => onUpdateSection(sectionIndex, { fluidConfig: { ...cfg, minHeight: Number(e.target.value) } })} className="w-full px-2 py-1 text-xs border border-border rounded" />
                </div>
              )}
            </div>
            {/* Vertical alignment */}
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Vertical Alignment</label>
              <div className="flex gap-1">
                {['top', 'center', 'bottom'].map(a => (
                  <button key={a} onClick={() => onUpdateSection(sectionIndex, { fluidConfig: { ...cfg, verticalAlignment: a } })} className={`flex-1 py-1 text-xs rounded ${(cfg.verticalAlignment || 'top') === a ? 'bg-primary text-primary-foreground' : 'bg-surface-raised text-muted'}`}>{a}</button>
                ))}
              </div>
            </div>
            {/* Background color */}
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Background Color</label>
              <input type="text" placeholder="#f9fafb or transparent" value={section.backgroundColor || ''} onChange={e => onUpdateSection(sectionIndex, { backgroundColor: e.target.value || null })} className="w-full px-2 py-1 text-xs border border-border rounded" />
            </div>
          </div>
        </div>
      )}

      {/* The fluid grid container */}
      <div style={gridStyle} className="relative" onMouseDown={(e) => {
        // Only clear if clicking the grid container itself (not a child block)
        if (e.target === e.currentTarget && onClearSelection) onClearSelection();
      }}>
        {/* Grid overlay — visible during drag/resize or when toggled with G */}
        {(showGrid || showGrid) && (
          <div
            className="absolute inset-0 pointer-events-none z-0"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgba(99, 102, 241, 0.12) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(99, 102, 241, 0.12) 1px, transparent 1px)
              `,
              backgroundSize: `${colWidth}px ${rowHeight + gapV}px`,
              backgroundPosition: '0 0',
            }}
          />
        )}

        {/* Render blocks */}
        {blocks.map((block, bIdx) => (
          <FluidBlock
            key={block.id || bIdx}
            block={block}
            blockIndex={bIdx}
            sectionIndex={sectionIndex}
            gridColumns={gridColumns}
            rowHeight={rowHeight}
            gapH={gapH}
            gapV={gapV}
            colWidth={colWidth}
            selected={selectedBlockIds?.has(block.id) ?? false}
            readOnly={readOnly}
            onSelect={(additive) => onSelectBlock(block.id, { additive })}
            onClearSelection={onClearSelection}
            onUpdate={(fluidUpdates) => {
              if (isMobile) {
                onUpdateBlock(sectionIndex, bIdx, { fluidMobile: { ...(block.fluidMobile || {}), ...fluidUpdates } });
              } else {
                onUpdateBlock(sectionIndex, bIdx, { fluid: { ...block.fluid, ...fluidUpdates } });
              }
            }}
            onUpdateContent={(updates) => onUpdateBlockContent(sectionIndex, bIdx, updates)}
            onAddNestedBlock={(colIndex, type) => onAddNestedBlock?.(sectionIndex, bIdx, colIndex, type)}
            onDelete={() => onDeleteBlock(sectionIndex, bIdx)}
            onDuplicate={() => onDuplicateBlock(sectionIndex, bIdx)}
            onShowGrid={() => setShowGrid(true)}
            onHideGrid={() => { setShowGrid(false); setGuides({ vertical: [], horizontal: [] }); }}
            onGuidesChange={setGuides}
            allBlocks={blocks}
            viewport={viewport}
            EditableText={EditableText}
            EditableButton={EditableButton}
            EditableImage={EditableImage}
          />
        ))}

        {/* Alignment guide lines — shown during drag/resize */}
        {guides.vertical.map((x, i) => (
          <div key={`v-${i}`} className="absolute top-0 bottom-0 pointer-events-none z-[200]" style={{ left: `${x}px`, width: '1px', background: '#ec4899', boxShadow: '0 0 2px rgba(236,72,153,0.5)' }} />
        ))}
        {guides.horizontal.map((y, i) => (
          <div key={`h-${i}`} className="absolute left-0 right-0 pointer-events-none z-[200]" style={{ top: `${y}px`, height: '1px', background: '#ec4899', boxShadow: '0 0 2px rgba(236,72,153,0.5)' }} />
        ))}

        {/* Empty state */}
        {blocks.length === 0 && !readOnly && (
          <div className="col-span-full flex flex-col items-center justify-center py-16 gap-3 border-2 border-dashed border-border rounded-lg">
            <p className="text-muted text-sm">Empty section — add a block to begin</p>
            <button onClick={() => onAddBlock(sectionIndex)} className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary-hover">
              <Plus className="w-4 h-4" /> Add Block
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
