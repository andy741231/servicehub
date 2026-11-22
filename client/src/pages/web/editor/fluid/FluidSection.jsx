import { useState, useRef, useEffect } from 'react';
import {
  Plus, Copy, Trash2, MoveUp, MoveDown,
  SlidersHorizontal, Smartphone, RotateCcw, BookmarkPlus, ChevronDown, Eye, EyeOff,
} from 'lucide-react';
import { blockTypeLabel } from '../BlockSettingsPanel.jsx';

/**
 * Section menu (the "Hero ▾" chip): less frequent section actions. Lives in
 * the canvas iframe, so it listens on its own document for outside clicks.
 */
function SectionMenu({ label, items }) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const box = boxRef.current;
    box?.querySelector('[role="menuitem"]:not([disabled])')?.focus();
    const doc = box?.ownerDocument;
    const onDown = (e) => { if (!box?.contains(e.target)) setOpen(false); };
    doc?.addEventListener('mousedown', onDown, true);
    return () => doc?.removeEventListener('mousedown', onDown, true);
  }, [open]);
  const onKeyDown = (e) => {
    const list = [...(boxRef.current?.querySelectorAll('[role="menuitem"]:not([disabled])') || [])];
    const i = list.indexOf(e.target.ownerDocument.activeElement);
    if (e.key === 'Escape' && open) { e.stopPropagation(); setOpen(false); boxRef.current?.querySelector('[aria-haspopup]')?.focus(); }
    else if (e.key === 'ArrowDown' && open) { e.preventDefault(); list[(i + 1) % list.length]?.focus(); }
    else if (e.key === 'ArrowUp' && open) { e.preventDefault(); list[(i - 1 + list.length) % list.length]?.focus(); }
  };
  return (
    <div className="relative" ref={boxRef} onKeyDown={onKeyDown}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Section menu: ${label}`}
        title="More section actions"
        className={`inline-flex items-center gap-1 h-9 px-2.5 rounded-md text-[12px] font-semibold text-text-base hover:bg-surface-raised ${open ? 'bg-surface-raised' : ''}`}
      >
        {label} <ChevronDown className="w-3.5 h-3.5 text-muted" />
      </button>
      {open && (
        <div role="menu" aria-label="Section menu" className="absolute left-0 top-full mt-1 min-w-[190px] rounded-lg bg-white p-1 shadow-[0_4px_16px_rgba(16,20,30,0.18)]">
          {items.map(({ label: l, Icon, onSelect, disabled }) => (
            <button
              key={l}
              type="button"
              role="menuitem"
              disabled={disabled}
              onClick={(e) => { e.stopPropagation(); setOpen(false); onSelect(); }}
              className="w-full flex items-center gap-2 px-2.5 min-h-[32px] rounded-md text-xs font-medium text-text-base text-left hover:bg-surface-raised focus:bg-surface-raised focus:outline-none disabled:opacity-40"
            >
              <Icon className="w-4 h-4 text-muted" aria-hidden="true" /> {l}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
import FluidBlock from './FluidBlock.jsx';
import { sectionColumns, restack, columnSpan } from './columnLayout.js';
import {
  fluidGridMetrics, sectionBoxStyle, fluidSectionMinHeight, isMobileAuto, mobileAutoFlow,
  sectionContentWidthStyle, SectionVideo,
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
  onSaveSection,
  onMoveSectionUp,
  onMoveSectionDown,
  onAddSectionBelow,
  onUpdateBlockContent,
  onAddNestedBlock,
  onOpenInspector,
  onDropBlock,
  onMoveBlockToSection,
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
  // Column mode (fluidConfig.columns): blocks snap to columns and stack in
  // them (columnLayout.js). Desktop only — phones keep the auto-stack.
  const columns = isMobile ? null : sectionColumns(section);
  const colSpanCells = columns ? columnSpan(columns, gridColumns) : 1;

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
    if (columns) {
      // Locked into a column: snap, insert at the drop row, push the rest down.
      writePlacements(restack(current.map((p, i) => (i === bIdx ? { ...p, ...updates } : p)), columns, gridColumns, { movedIndex: bIdx }));
      return;
    }
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
  const growBlock = (bIdx, newRowEnd, { shrink = false } = {}) => {
    growQueueRef.current.push({ bIdx, newRowEnd, shrink });
    if (growQueueRef.current.length > 1) return; // flush already scheduled
    queueMicrotask(() => {
      const requests = growQueueRef.current;
      growQueueRef.current = [];
      const next = placements.map((p, i) => ({ ...(blocks[i][layoutKey] ? blocks[i][layoutKey] : p) }));
      if (columns) {
        // Column stacks: change the heights, then re-derive the rows.
        let changedCols = false;
        for (const { bIdx: i, newRowEnd: wanted, shrink } of requests) {
          const t = next[i];
          const end = t.rowStart + (wanted - placements[i].rowStart);
          if (end > t.rowEnd || (shrink && end < t.rowEnd)) { t.rowEnd = Math.max(t.rowStart + 1, end); changedCols = true; }
        }
        if (changedCols) writePlacements(restack(next, columns, gridColumns));
        return;
      }
      // Top-most first, so pushes cascade downwards correctly.
      requests.sort((a, b) => next[a.bIdx].rowStart - next[b.bIdx].rowStart);
      let changed = false;
      for (const { bIdx: i, newRowEnd: wanted, shrink } of requests) {
        const target = next[i];
        const delta = (target.rowStart + (wanted - placements[i].rowStart)) - target.rowEnd;
        if (delta < 0 && shrink) {
          // Fit a just-inserted block to its content. Blocks below keep their
          // rows (moving them could collide with blocks in other columns).
          target.rowEnd = Math.max(target.rowStart + 1, target.rowEnd + delta);
          changed = true;
          continue;
        }
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
  // Chip label: what the section is, from its first block ("Hero", "Gallery").
  const sectionTypeLabel = blocks.length ? blockTypeLabel(blocks[0].type) : 'Empty section';
  // Hidden on the public site (fluidConfig.hidden; SiteSections skips it).
  const hidden = !!cfg?.hidden;

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
      onLayer={columns ? undefined : (action) => layerBlock(bIdx, action)}
      columnCells={columns ? colSpanCells : null}
      onMoveToSection={!isMobile && onMoveBlockToSection ? (target) => onMoveBlockToSection(sectionIndex, bIdx, target) : undefined}
      onGrow={(newRowEnd) => growBlock(bIdx, newRowEnd)}
      onFit={(newRowEnd) => growBlock(bIdx, newRowEnd, { shrink: true })}
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
  // Column mode: which column (0-based) the pointer is over.
  const [dropCol, setDropCol] = useState(null);
  const colFromEvent = (e) => {
    if (!columns) return null;
    const rect = gridRef.current.getBoundingClientRect();
    return Math.min(columns - 1, Math.max(0, Math.floor(((e.clientX - rect.left) / rect.width) * columns)));
  };
  const dropHandlers = onDropBlock && !readOnly ? {
    onDragOver: (e) => {
      if (!isBlockDrag(e)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      const r = mobileAuto ? null : rowFromEvent(e);
      if (r !== dropRow) setDropRow(r ?? 0);
      const c = colFromEvent(e);
      if (c !== dropCol) setDropCol(c);
    },
    onDragLeave: (e) => {
      if (!e.currentTarget.contains(e.relatedTarget)) setDropRow(null);
    },
    onDrop: (e) => {
      if (!isBlockDrag(e)) return;
      e.preventDefault();
      const type = e.dataTransfer.getData(DRAG_TYPE);
      const r = mobileAuto ? null : rowFromEvent(e);
      const c = colFromEvent(e);
      setDropRow(null);
      setDropCol(null);
      // Phone view auto-stacks, so a drop there just appends.
      onDropBlock(sectionIndex, type, r, c);
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
      data-section-index={sectionIndex}
      aria-label={sectionAccessibleName}
      aria-current={selected ? 'true' : undefined}
    >
      {/* ── Top-center: + Add Section (above) ───────────────────────────── */}
      {!readOnly && (
        <div
          className="site-editor-chrome site-editor-ui absolute left-1/2 -translate-x-1/2 z-[2000] transition-opacity duration-100"
          // First section sits under the sticky toolbar — keep its pill inside.
          style={{ top: sectionIndex === 0 ? 8 : -14, transformOrigin: sectionIndex === 0 ? 'top center' : 'center', ...chromeStyle }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); onAddSectionBelow(sectionIndex - 1); }}
            className={`inline-flex items-center gap-1.5 h-8 px-4 rounded-full bg-white text-[12px] font-semibold border ${pillShadow}`}
            style={{ color: 'hsl(var(--admin-primary))', borderColor: 'hsl(var(--admin-primary))' }}
            title="Add section above"
          >
            <Plus className="w-3 h-3" /> Add Section
          </button>
        </div>
      )}

      {/* ── Top-left: section settings + Add Block ─────────────────────── */}
      {!readOnly && (
        <div
          className="site-editor-chrome site-editor-ui absolute left-4 flex items-center gap-2 z-[2000] transition-opacity duration-100"
          // First section: its "Add Section" pill sits inside at the top, so
          // start this cluster below it (they collide on narrow canvases).
          style={{ top: sectionIndex === 0 ? 56 : 16, transformOrigin: 'top left', ...chromeStyle }}
        >
          <div className={`bg-white rounded-lg ${pillShadow} flex items-center gap-0.5 p-0.5`} role="toolbar" aria-label="Section tools">
            <button
              onClick={(e) => { e.stopPropagation(); onSelectSection(sectionIndex); onOpenInspector?.(); }}
              title="Section settings: background, spacing, width"
              aria-label="Section settings"
              className="w-9 h-9 rounded-md flex items-center justify-center text-text-base hover:bg-surface-raised"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
            <SectionMenu
              label={sectionTypeLabel}
              items={[
                ...(onSaveSection ? [{ label: 'Save section', Icon: BookmarkPlus, onSelect: () => onSaveSection(sectionIndex) }] : []),
                { label: 'Move section up', Icon: MoveUp, onSelect: () => onMoveSectionUp(sectionIndex), disabled: sectionIndex === 0 },
                { label: 'Move section down', Icon: MoveDown, onSelect: () => onMoveSectionDown(sectionIndex), disabled: isLastSection },
              ]}
            />
            {/* An empty section shows its own big "Add Block" button. */}
            {blocks.length > 0 && <button
              onClick={(e) => { e.stopPropagation(); onAddBlock(sectionIndex); }}
              className="inline-flex items-center gap-1 h-9 px-2.5 rounded-md text-[12px] font-semibold hover:bg-surface-raised"
              style={{ color: 'hsl(var(--admin-primary))' }}
              title="Add block to this section"
            >
              <Plus className="w-3.5 h-3.5" /> Add Block
            </button>}
          </div>
        </div>
      )}

      {/* ── Top-right: section actions — one compact row on every device. (The
          old tall desktop menu covered ~170px of the blocks underneath, so a
          click meant for a block could land on Remove.) Section settings and
          height live in the inspector; "add below" is the bottom pill. */}
      {!readOnly && (
        <div className="site-editor-chrome site-editor-ui absolute right-4 flex gap-2 z-[2000] transition-opacity duration-100" style={{ top: sectionIndex === 0 ? 56 : 16, transformOrigin: 'top right', ...chromeStyle }}>
            <div className={`bg-white rounded-lg ${pillShadow} flex items-center p-0.5`} role="toolbar" aria-label="Section actions">
              {cfg && (
                <button
                  onClick={(e) => { e.stopPropagation(); onUpdateSection(sectionIndex, { fluidConfig: { ...cfg, hidden: !hidden } }); }}
                  title={hidden ? 'Hidden on the site — click to show it again' : 'Hide this section on the site (keeps it in the editor)'}
                  aria-label={hidden ? 'Show section on the site' : 'Hide section on the site'}
                  aria-pressed={hidden}
                  className={`w-9 h-9 flex items-center justify-center rounded-md hover:bg-surface-raised ${hidden ? 'text-warning' : 'text-text-base'}`}
                >
                  {hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              )}
              <button onClick={(e) => { e.stopPropagation(); onDuplicateSection(sectionIndex); }} title="Duplicate section" aria-label="Duplicate section" className="w-9 h-9 flex items-center justify-center rounded-md text-text-base hover:bg-surface-raised">
                <Copy className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteSection(sectionIndex); }}
                title="Remove section"
                aria-label="Remove section"
                className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-surface-raised"
                style={{ color: 'hsl(var(--danger, 0 84% 60%))' }}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
        </div>
      )}

      {/* ── Mobile layout mode (mobile view only) ──────────────────────── */}
      {!readOnly && isMobile && blocks.length > 0 && (
        <div className="site-editor-chrome site-editor-ui absolute bottom-3 left-1/2 -translate-x-1/2 z-[2000] transition-opacity duration-100" style={{ transformOrigin: 'bottom center', ...chromeStyle }}>
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
        <div className="site-editor-chrome site-editor-ui absolute left-1/2 -translate-x-1/2 z-[2000] transition-opacity duration-100" style={{ bottom: -14, transformOrigin: 'center', ...chromeStyle }}>
          <button
            onClick={(e) => { e.stopPropagation(); onAddSectionBelow(sectionIndex); }}
            className={`inline-flex items-center gap-1.5 h-8 px-4 rounded-full bg-white text-[12px] font-semibold border ${pillShadow}`}
            style={{ color: 'hsl(var(--admin-primary))', borderColor: 'hsl(var(--admin-primary))' }}
            title="Add section below"
          >
            <Plus className="w-3 h-3" /> Add Section
          </button>
        </div>
      )}

      <SectionVideo cfg={cfg} />

      {hidden && !readOnly && (
        <div className="site-editor-chrome site-editor-ui absolute left-4 bottom-3 z-[1999] inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-white text-[11px] font-semibold text-warning shadow pointer-events-none" style={{ transformOrigin: 'bottom left' }}>
          <EyeOff className="w-3.5 h-3.5" aria-hidden="true" /> Hidden on the site
        </div>
      )}

      {/* The layout container: grid, or the auto mobile flow */}
      <div
        ref={gridRef}
        data-fluid-grid=""
        data-row-step={rowHeight + gapV}
        data-grid-columns={gridColumns}
        data-columns={columns || ''}
        // Content width, the video layer and the hidden look apply only when set.
        style={{ ...gridStyle, ...sectionContentWidthStyle(cfg), ...(cfg.backgroundVideo ? { zIndex: 1 } : {}), ...(hidden ? { opacity: 0.45 } : {}) }}
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
              backgroundImage: columns
                ? `linear-gradient(to right, rgba(99, 102, 241, 0.10) 0, rgba(99, 102, 241, 0.10) calc(100% - ${gapH}px), transparent calc(100% - ${gapH}px)),
                   linear-gradient(to bottom, rgba(99, 102, 241, 0.10) 1px, transparent 1px)`
                : `
                linear-gradient(to right, rgba(99, 102, 241, 0.12) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(99, 102, 241, 0.12) 1px, transparent 1px)
              `,
              backgroundSize: columns ? `${colWidth * colSpanCells}px 100%, 100% ${rowHeight + gapV}px` : `${colWidth}px ${rowHeight + gapV}px`,
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
              ? { gridColumn: columns && dropCol != null ? `${dropCol * colSpanCells + 1} / span ${colSpanCells}` : '1 / -1', gridRow: `${dropRow} / span 2`, borderColor: 'hsl(var(--admin-primary))', background: 'hsl(var(--admin-primary) / .08)', color: 'hsl(var(--admin-primary))' }
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
