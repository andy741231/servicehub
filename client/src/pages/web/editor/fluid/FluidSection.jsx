import { useState, useRef, useEffect } from 'react';
import {
  Plus, Copy, Trash2, MoveUp, MoveDown,
  SlidersHorizontal, Pencil, LayoutGrid, Maximize2, Minimize2, Smartphone, RotateCcw,
} from 'lucide-react';
import FluidBlock from './FluidBlock.jsx';
import {
  fluidGridMetrics, sectionBoxStyle, fluidSectionMinHeight, isMobileAuto, mobileAutoFlow,
} from '../../../../site/SiteSections.jsx';

const DEFAULT_CFG = {
  gridColumns: 24,
  rowHeight: 80,
  gap: { horizontal: 8, vertical: 8 },
  fillScreen: false,
  minHeight: 320,
  verticalAlignment: 'top',
};

const overlapsColumns = (a, b) => a.colStart < b.colEnd && b.colStart < a.colEnd;

/**
 * FluidSection — one page section on the editor canvas.
 *
 * Desktop (and customised mobile) layouts are a CSS grid: blocks sit at grid
 * coordinates and are dragged/resized on it. A mobile layout nobody has
 * customised is "auto": the same stacked flow the public site renders
 * (src/site/SiteSections.jsx), shown read-only until the user chooses to
 * customise it.
 *
 * Sizing/placement comes from the shared site layout helpers so blocks sit
 * exactly where they will on the published page. Selection state is owned by
 * WebEditor (the inspector shows the selected section/block).
 */
export default function FluidSection({
  section,
  sectionIndex,
  selected,
  selectedBlockIds,
  onSelectSection,
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
  onUpdateBlockContent,
  onAddNestedBlock,
  onOpenInspector,
  onDropBlock,
  isJustAdded,
  isLastSection,
  viewport = 'desktop',
  readOnly,
}) {
  const cfg = section.fluidConfig || DEFAULT_CFG;
  const isMobile = viewport === 'mobile';
  const blocks = section.blocks || [];
  const mobileAuto = isMobile && isMobileAuto(blocks);

  const [showGrid, setShowGrid] = useState(false);
  // Same grid metrics as the public renderer, so blocks sit exactly where they
  // will on the site. While dragging/resizing, two extra rows give room below.
  const metrics = fluidGridMetrics({ ...section, fluidConfig: cfg }, { mobile: isMobile, extraRows: showGrid ? 2 : 0 });
  const { columns: gridColumns, rowHeight, gapH, gapV, placements } = metrics;
  const layoutKey = isMobile ? 'fluidMobile' : 'fluid';

  const [isHovered, setIsHovered] = useState(false);
  const [guides, setGuides] = useState({ vertical: [], horizontal: [] });
  const gridRef = useRef(null);
  const [colWidth, setColWidth] = useState(40);

  const hasSelectedBlock = blocks.some((b) => selectedBlockIds?.has(b.id));

  // Measure column width from the grid container itself.
  useEffect(() => {
    const el = gridRef.current;
    if (!el || mobileAuto) return undefined;
    const measure = () => {
      const w = el.clientWidth || 960;
      setColWidth((w + gapH) / gridColumns); // each column = (totalWidth + gap) / cols
    };
    measure();
    // The canvas is an iframe — use its realm's ResizeObserver.
    const RO = el.ownerDocument.defaultView?.ResizeObserver || ResizeObserver;
    const ro = new RO(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [gridColumns, gapH, mobileAuto]);

  // "G" key toggles grid overlay
  useEffect(() => {
    if (readOnly) return undefined;
    const onKey = (e) => {
      if (e.key === 'g' || e.key === 'G') {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
        setShowGrid((s) => !s);
      }
    };
    // Listen in the editor window and in the canvas iframe.
    const canvasWin = gridRef.current?.ownerDocument?.defaultView;
    window.addEventListener('keydown', onKey);
    if (canvasWin && canvasWin !== window) canvasWin.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (canvasWin && canvasWin !== window) canvasWin.removeEventListener('keydown', onKey);
    };
  }, [readOnly]);

  // ── Layout updates ──────────────────────────────────────────────────────
  /** Write placements for every block at once (one undo step). */
  const writePlacements = (next) => {
    onUpdateSection(sectionIndex, {
      blocks: blocks.map((b, i) => ({ ...b, [layoutKey]: next[i] })),
    });
  };

  /** Move/resize one block. On mobile this also freezes the other blocks'
   *  current positions, so customising one block doesn't reshuffle the rest. */
  const updatePlacement = (bIdx, updates) => {
    const current = placements.map((p, i) => (blocks[i][layoutKey] ? blocks[i][layoutKey] : p));
    if (isMobile && blocks.some((b) => !b.fluidMobile)) {
      writePlacements(current.map((p, i) => (i === bIdx ? { ...p, ...updates } : p)));
      return;
    }
    onUpdateBlock(sectionIndex, bIdx, { [layoutKey]: { ...current[bIdx], ...updates } });
  };

  /** Auto-grow: content outgrew the block → extend it and push blocks that
   *  sit below it (in overlapping columns) down by the same amount.
   *  Requests from one render (e.g. several blocks of a freshly inserted
   *  section fitting themselves at once) are batched into a single update —
   *  applied one by one they'd each start from the same stale layout. */
  const growQueueRef = useRef([]);
  const growBlock = (bIdx, newRowEnd) => {
    growQueueRef.current.push({ bIdx, newRowEnd });
    if (growQueueRef.current.length > 1) return; // flush already scheduled
    queueMicrotask(() => {
      const requests = growQueueRef.current;
      growQueueRef.current = [];
      const next = placements.map((p, i) => ({ ...(blocks[i][layoutKey] ? blocks[i][layoutKey] : p) }));
      // Top-most first, so pushes cascade downwards correctly.
      requests.sort((a, b) => next[a.bIdx].rowStart - next[b.bIdx].rowStart);
      let changed = false;
      for (const { bIdx: i, newRowEnd: wanted } of requests) {
        const target = next[i];
        const delta = (target.rowStart + (wanted - placements[i].rowStart)) - target.rowEnd;
        if (delta <= 0) continue;
        const oldEnd = target.rowEnd;
        target.rowEnd += delta;
        next.forEach((p, j) => {
          if (j !== i && p.rowStart >= oldEnd && overlapsColumns(p, target)) {
            p.rowStart += delta;
            p.rowEnd += delta;
          }
        });
        changed = true;
      }
      if (changed) writePlacements(next);
    });
  };

  /** Turn the auto-stacked mobile flow into an editable grid, sizing each
   *  block from its measured height so nothing overlaps. */
  const customizeMobile = () => {
    const flow = mobileAutoFlow(section);
    const items = gridRef.current ? [...gridRef.current.querySelectorAll(':scope > [data-block-index]')] : [];
    const heights = new Map(items.map((el) => [Number(el.dataset.blockIndex), el.getBoundingClientRect().height]));
    const next = new Array(blocks.length);
    let cursor = Math.min(...placements.map((p) => p.rowStart), Infinity);
    if (!Number.isFinite(cursor)) cursor = 1;
    for (const i of flow.order) {
      const minSpan = Math.max(1, placements[i].rowEnd - placements[i].rowStart);
      const h = heights.get(i) || 0;
      const span = Math.max(minSpan, Math.ceil((h + gapV) / (rowHeight + gapV)));
      next[i] = { ...placements[i], rowStart: cursor, rowEnd: cursor + span };
      cursor += span;
    }
    writePlacements(next);
  };

  /** Layering. Layers are kept as 0…n-1 within the section — never negative:
   *  a negative z-index paints the block behind the page background on the
   *  public site (invisible) and under the grid in the editor (unclickable). */
  const layerBlock = (bIdx, action) => {
    const current = placements.map((p, i) => ({ ...(blocks[i][layoutKey] ? blocks[i][layoutKey] : p) }));
    const order = current.map((_, i) => i).sort((a, b) => ((current[a].zIndex ?? 0) - (current[b].zIndex ?? 0)) || (a - b));
    const pos = order.indexOf(bIdx);
    order.splice(pos, 1);
    if (action === 'front') order.push(bIdx);
    else if (action === 'back') order.unshift(bIdx);
    else if (action === 'forward') order.splice(Math.min(pos + 1, order.length), 0, bIdx);
    else order.splice(Math.max(pos - 1, 0), 0, bIdx); // backward
    order.forEach((i, z) => { current[i].zIndex = z; });
    writePlacements(current);
  };

  const resetMobileToAuto = () => {
    onUpdateSection(sectionIndex, { blocks: blocks.map((b) => ({ ...b, fluidMobile: null })) });
  };

  // ── Rendering ───────────────────────────────────────────────────────────
  const sectionStyle = { ...sectionBoxStyle(section), minHeight: fluidSectionMinHeight(cfg) };
  const flow = mobileAuto ? mobileAutoFlow(section) : null;
  // isolation: own stacking context, so blocks with a negative layer (older
  // data) still render above the section and stay clickable.
  const gridStyle = mobileAuto
    ? { ...flow.containerStyle, position: 'relative', isolation: 'isolate' }
    : { ...metrics.gridStyle, position: 'relative', isolation: 'isolate' };

  // One toolbar at a time: while a block in this section is selected, the
  // block's toolbar is shown and the section chrome steps aside.
  const chromeVisible = (isHovered || selected) && !hasSelectedBlock;
  // Section chrome is z-[2000]: above every block's drag overlay (z 100 + the
  // block's layer, up to 1100 for "bring to front"), otherwise clicking
  // "Add Block" / "Edit Section" over a block selected the block instead.
  const chromeStyle = { opacity: chromeVisible ? 1 : 0, pointerEvents: chromeVisible ? 'auto' : 'none' };
  const pillShadow = 'shadow-[0_2px_8px_rgba(16,20,30,0.15),0_1px_2px_rgba(16,20,30,0.08)]';

  const sectionAccessibleName = `Section ${sectionIndex + 1}${blocks.length > 0 ? `, ${blocks.length} block${blocks.length !== 1 ? 's' : ''}` : ''}`;

  const renderBlock = (block, bIdx) => (
    <FluidBlock
      key={block.id || bIdx}
      block={block}
      blockIndex={bIdx}
      sectionIndex={sectionIndex}
      fluid={placements[bIdx]}
      flowStyle={mobileAuto ? flow.itemStyle(bIdx) : null}
      gridColumns={gridColumns}
      rowHeight={rowHeight}
      gapH={gapH}
      gapV={gapV}
      colWidth={colWidth}
      selected={selectedBlockIds?.has(block.id) ?? false}
      readOnly={readOnly}
      onSelect={(additive) => onSelectBlock(block.id, { additive })}
      onClearSelection={onClearSelection}
      onUpdate={(updates) => updatePlacement(bIdx, updates)}
      onLayer={(action) => layerBlock(bIdx, action)}
      onGrow={(newRowEnd) => growBlock(bIdx, newRowEnd)}
      onUpdateContent={(updates) => onUpdateBlockContent(sectionIndex, bIdx, updates)}
      onAddNestedBlock={(colIndex, type) => onAddNestedBlock?.(sectionIndex, bIdx, colIndex, type)}
      onDelete={() => onDeleteBlock(sectionIndex, bIdx)}
      onDuplicate={() => onDuplicateBlock(sectionIndex, bIdx)}
      onOpenInspector={onOpenInspector}
      onShowGrid={() => setShowGrid(true)}
      onHideGrid={() => { setShowGrid(false); setGuides({ vertical: [], horizontal: [] }); }}
      onGuidesChange={setGuides}
      allBlocks={blocks}
      allPlacements={placements}
      viewport={viewport}
      autoFit={isJustAdded ? isJustAdded(block.id) : false}
    />
  );

  // ── Drag a block in from the block picker ──────────────────────────────
  // Drop preview: a full-width bar at the row under the cursor.
  const [dropRow, setDropRow] = useState(null);
  const DRAG_TYPE = 'application/x-site-block';
  const isBlockDrag = (e) => Array.from(e.dataTransfer?.types || []).includes(DRAG_TYPE);
  const rowFromEvent = (e) => {
    const rect = gridRef.current.getBoundingClientRect();
    return Math.max(1, Math.floor((e.clientY - rect.top) / (rowHeight + gapV)) + 1);
  };
  const dropHandlers = onDropBlock && !readOnly ? {
    onDragOver: (e) => {
      if (!isBlockDrag(e)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      const r = mobileAuto ? null : rowFromEvent(e);
      if (r !== dropRow) setDropRow(r ?? 0);
    },
    onDragLeave: (e) => {
      if (!e.currentTarget.contains(e.relatedTarget)) setDropRow(null);
    },
    onDrop: (e) => {
      if (!isBlockDrag(e)) return;
      e.preventDefault();
      const type = e.dataTransfer.getData(DRAG_TYPE);
      const r = mobileAuto ? null : rowFromEvent(e);
      setDropRow(null);
      // Phone view auto-stacks, so a drop there just appends.
      onDropBlock(sectionIndex, type, r);
    },
  } : {};

  return (
    <div
      className="relative group"
      style={{
        ...sectionStyle,
        outline: chromeVisible ? '2px solid hsl(var(--admin-primary))' : '2px solid transparent',
        outlineOffset: -2,
        transition: 'outline-color .08s ease',
        // Each section is its own stacking context (z-index 0+), so its blocks'
        // transparent drag overlays (z 100+) can't cover toolbars/panels that
        // overflow from a neighbouring section. The active section is raised
        // so its overflowing chrome stays on top.
        zIndex: (selected || hasSelectedBlock) ? 6 : isHovered ? 5 : 0,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={(e) => {
        // Click on the section's own background (not a block or chrome) selects it.
        if (e.target === e.currentTarget) onSelectSection(sectionIndex);
      }}
      onKeyDown={(e) => {
        if (hasSelectedBlock) return; // a block owns the selection — don't steal it
        if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onSelectSection(sectionIndex);
        }
      }}
      tabIndex={0}
      role="group"
      aria-label={sectionAccessibleName}
      aria-current={selected ? 'true' : undefined}
    >
      {/* ── Top-center: + Add Section (above) ───────────────────────────── */}
      {!readOnly && (
        <div
          className="site-editor-chrome absolute left-1/2 -translate-x-1/2 z-[2000] transition-opacity duration-100"
          // First section sits under the sticky toolbar — keep its pill inside.
          style={{ top: sectionIndex === 0 ? 8 : -14, ...chromeStyle }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); onAddSectionBelow(sectionIndex - 1); }}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-[0.06em] ${pillShadow} text-white`}
            style={{ background: 'hsl(var(--admin-primary))' }}
            title="Add section above"
          >
            <Plus className="w-3 h-3" /> Add Section
          </button>
        </div>
      )}

      {/* ── Top-left: section settings + Add Block ─────────────────────── */}
      {!readOnly && (
        <div
          className="site-editor-chrome absolute left-4 flex items-center gap-2 z-[2000] transition-opacity duration-100"
          // First section: its "Add Section" pill sits inside at the top, so
          // start this cluster below it (they collide on narrow canvases).
          style={{ top: sectionIndex === 0 ? 56 : 16, ...chromeStyle }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); onSelectSection(sectionIndex); onOpenInspector?.(); }}
            title="Section settings"
            aria-label="Section settings"
            className={`w-9 h-9 bg-white rounded-lg flex items-center justify-center ${pillShadow} text-text-base hover:bg-surface-raised`}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onAddBlock(sectionIndex); }}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white text-text-base text-[11px] font-bold uppercase tracking-[0.06em] ${pillShadow} hover:bg-surface-raised`}
            title="Add block to this section"
          >
            <Plus className="w-3 h-3" /> Add Block
          </button>
        </div>
      )}

      {/* ── Top-right: section menu (compact bar on mobile so it doesn't cover 375px content) */}
      {!readOnly && (
        <div className="site-editor-chrome absolute right-4 flex flex-col gap-2 z-[2000] transition-opacity duration-100" style={{ top: sectionIndex === 0 ? 56 : 16, ...chromeStyle }}>
          {isMobile ? (
            <div className={`bg-white rounded-lg ${pillShadow} flex items-center p-0.5`}>
              <button onClick={(e) => { e.stopPropagation(); onDuplicateSection(sectionIndex); }} title="Duplicate section" aria-label="Duplicate section" className="w-8 h-8 flex items-center justify-center rounded text-text-base hover:bg-surface-raised">
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onMoveSectionUp(sectionIndex); }}
                disabled={sectionIndex === 0}
                title="Move section up"
                aria-label="Move section up"
                className={`w-8 h-8 flex items-center justify-center rounded text-text-base ${sectionIndex === 0 ? 'opacity-30 cursor-default' : 'hover:bg-surface-raised'}`}
              >
                <MoveUp className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onMoveSectionDown(sectionIndex); }}
                disabled={isLastSection}
                title="Move section down"
                aria-label="Move section down"
                className={`w-8 h-8 flex items-center justify-center rounded text-text-base ${isLastSection ? 'opacity-30 cursor-default' : 'hover:bg-surface-raised'}`}
              >
                <MoveDown className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteSection(sectionIndex); }}
                title="Remove section"
                aria-label="Remove section"
                className="w-8 h-8 flex items-center justify-center rounded hover:bg-surface-raised"
                style={{ color: 'hsl(var(--danger, 0 84% 60%))' }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className={`bg-white rounded-lg ${pillShadow} overflow-hidden min-w-[168px]`}>
              <button
                onClick={(e) => { e.stopPropagation(); onSelectSection(sectionIndex); onOpenInspector?.(); }}
                className="flex items-center gap-2.5 px-3.5 py-2.5 text-[12.5px] font-semibold text-text-base hover:bg-surface-raised w-full text-left border-b border-border"
              >
                <Pencil className="w-[15px] h-[15px]" /> Edit Section
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onAddSectionBelow(sectionIndex); }}
                className="flex items-center gap-2.5 px-3.5 py-2.5 text-[12.5px] font-semibold text-text-base hover:bg-surface-raised w-full text-left border-b border-border"
                title="Add a new section below this one"
              >
                <LayoutGrid className="w-[15px] h-[15px]" /> Add Section Below
              </button>
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
                  disabled={isLastSection}
                  title="Move section down"
                  aria-label="Move section down"
                  className={`flex-1 h-10 flex items-center justify-center ${isLastSection ? 'opacity-30 cursor-default' : 'hover:bg-surface-raised'}`}
                >
                  <MoveDown className="w-[15px] h-[15px]" />
                </button>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteSection(sectionIndex); }}
                className="flex items-center gap-2.5 px-3.5 py-2.5 text-[12.5px] font-semibold w-full text-left hover:bg-surface-raised"
                style={{ color: 'hsl(var(--danger, 0 84% 60%))' }}
                title="Remove section"
                aria-label="Remove section"
              >
                <Trash2 className="w-[15px] h-[15px]" /> Remove
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Mobile layout mode (mobile view only) ──────────────────────── */}
      {!readOnly && isMobile && blocks.length > 0 && (
        <div className="site-editor-chrome absolute bottom-3 left-1/2 -translate-x-1/2 z-[2000] transition-opacity duration-100" style={chromeStyle}>
          {mobileAuto ? (
            <button
              onClick={(e) => { e.stopPropagation(); customizeMobile(); }}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white text-text-base text-[11px] font-bold uppercase tracking-[0.06em] ${pillShadow} hover:bg-surface-raised whitespace-nowrap`}
              title="Blocks stack automatically on phones. Customize to drag and resize them."
            >
              <Smartphone className="w-3 h-3" /> Auto layout · Customize
            </button>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); resetMobileToAuto(); }}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white text-text-base text-[11px] font-bold uppercase tracking-[0.06em] ${pillShadow} hover:bg-surface-raised whitespace-nowrap`}
              title="Discard the custom mobile layout and stack blocks automatically"
            >
              <RotateCcw className="w-3 h-3" /> Reset to auto layout
            </button>
          )}
        </div>
      )}

      {/* ── Bottom-center: + Add Section (below; omitted on last section where the page-level CTA sits) */}
      {!readOnly && !isLastSection && (
        <div className="site-editor-chrome absolute left-1/2 -translate-x-1/2 z-[2000] transition-opacity duration-100" style={{ bottom: -14, ...chromeStyle }}>
          <button
            onClick={(e) => { e.stopPropagation(); onAddSectionBelow(sectionIndex); }}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-[0.06em] ${pillShadow} text-white`}
            style={{ background: 'hsl(var(--admin-primary))' }}
            title="Add section below"
          >
            <Plus className="w-3 h-3" /> Add Section
          </button>
        </div>
      )}

      {/* The layout container: grid, or the auto mobile flow */}
      <div
        ref={gridRef}
        style={gridStyle}
        {...dropHandlers}
        className="relative"
        onMouseDown={(e) => {
          // Clicking the empty grid selects the section
          if (e.target === e.currentTarget) onSelectSection(sectionIndex);
        }}
      >
        {/* Grid overlay — visible during drag/resize or when toggled with G */}
        {showGrid && !mobileAuto && (
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

        {mobileAuto
          ? flow.order.map((bIdx) => renderBlock(blocks[bIdx], bIdx))
          : blocks.map((block, bIdx) => renderBlock(block, bIdx))}

        {/* Drop preview while dragging a block in from the picker */}
        {dropRow !== null && (
          <div
            className="site-editor-chrome pointer-events-none z-[150] rounded-md border-2 border-dashed flex items-center justify-center text-xs font-semibold"
            style={dropRow > 0
              ? { gridColumn: '1 / -1', gridRow: `${dropRow} / span 2`, borderColor: 'hsl(var(--admin-primary))', background: 'hsl(var(--admin-primary) / .08)', color: 'hsl(var(--admin-primary))' }
              : { position: 'absolute', left: 0, right: 0, bottom: 0, height: 64, borderColor: 'hsl(var(--admin-primary))', background: 'hsl(var(--admin-primary) / .08)', color: 'hsl(var(--admin-primary))' }}
          >
            Drop to add block here
          </div>
        )}

        {/* Alignment guide lines — shown during drag/resize */}
        {guides.vertical.map((x, i) => (
          <div key={`v-${i}`} className="absolute top-0 bottom-0 pointer-events-none z-[200]" style={{ left: `${x}px`, width: '1px', background: '#ec4899', boxShadow: '0 0 2px rgba(236,72,153,0.5)' }} />
        ))}
        {guides.horizontal.map((y, i) => (
          <div key={`h-${i}`} className="absolute left-0 right-0 pointer-events-none z-[200]" style={{ top: `${y}px`, height: '1px', background: '#ec4899', boxShadow: '0 0 2px rgba(236,72,153,0.5)' }} />
        ))}

        {/* Empty state */}
        {blocks.length === 0 && !readOnly && (
          <div className="site-editor-chrome col-span-full flex flex-col items-center justify-center py-16 gap-3 border-2 border-dashed border-border rounded-lg">
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
