import { useRef, useCallback, useState, useEffect, useLayoutEffect } from 'react';
import { Rnd } from 'react-rnd';
import {
  Trash2, Copy, ArrowUp, ArrowDown, ChevronsUp, ChevronsDown, GripVertical, Layers,
  Pencil, SlidersHorizontal,
} from 'lucide-react';
import SiteBlock from '../../../../site/SiteBlock.jsx';
import { gridItemStyle as siteGridItemStyle } from '../../../../site/SiteSections.jsx';
import { SiteEditProvider } from '../siteEditBridge.jsx';
import EditorErrorBoundary from '../EditorErrorBoundary.jsx';
import { blockTypeLabel } from '../BlockSettingsPanel.jsx';

/**
 * FluidBlock — one block on the editor canvas.
 *
 * The visible block is a CSS grid item rendered with the same component the
 * public site uses (SiteBlock), so it looks exactly like the published page.
 * In grid layouts a transparent react-rnd overlay on top handles dragging and
 * resizing; when the block is selected the overlay lets clicks through to the
 * editable text, keeping only the drag handle, resize handles and toolbar.
 *
 * In the auto-stacked mobile flow (`flowStyle` set) there is no grid to drag
 * on: the block is shown read-only in place (still selectable and editable).
 */
export default function FluidBlock({
  block,
  fluid: placement,
  flowStyle,
  gridColumns,
  rowHeight,
  gapH,
  gapV,
  colWidth,
  selected,
  readOnly,
  onSelect,
  onUpdate,
  onLayer,
  onGrow,
  onFit,
  onUpdateContent,
  onAddNestedBlock,
  onDelete,
  onDuplicate,
  onOpenInspector,
  onShowGrid,
  onHideGrid,
  onGuidesChange,
  allBlocks,
  allPlacements,
  blockIndex,
  sectionIndex,
  autoFit = false,
}) {
  const interactive = !flowStyle; // drag/resize available
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Inline text/image editing inside the block (dashed outline, no resize
  // handles while active). Called by the editable site fields. Also ensures
  // the block is selected (in mobile auto-layout, clicking text directly
  // enters editing without hitting the grid click handler).
  const startEditing = useCallback(() => {
    setIsEditing(true);
    if (!selected) onSelect?.(false);
  }, [selected, onSelect]);
  const endEditing = useCallback(() => setIsEditing(false), []);

  const fluid = { colStart: 1, colEnd: gridColumns + 1, rowStart: 1, rowEnd: 3, zIndex: 0, ...(placement || {}) };
  const itemStyle = flowStyle || siteGridItemStyle(fluid, gridColumns);

  // ── Pixel position for the react-rnd overlay ────────────────────────────
  const cellW = colWidth;
  const cellH = rowHeight + gapV;
  const pxX = (fluid.colStart - 1) * cellW;
  const pxW = (fluid.colEnd - fluid.colStart) * cellW - gapH;
  const pxY = (fluid.rowStart - 1) * cellH;
  const pxH = (fluid.rowEnd - fluid.rowStart) * cellH - gapV;

  // react-rnd fires onDragStop/onResizeStop on every mouseup, including plain
  // clicks. Only commit when the grid coordinates actually changed — otherwise
  // a click marks the page dirty and adds an empty undo step.
  const commitPlacement = (next) => {
    if (
      next.colStart === fluid.colStart && next.colEnd === fluid.colEnd &&
      next.rowStart === fluid.rowStart && next.rowEnd === fluid.rowEnd
    ) return;
    onUpdate(next);
  };

  // Clicking the transparent overlay would otherwise move focus to the nearest
  // focusable ancestor — the section — whose Space/Enter handler then steals
  // the selection. Focus the block itself instead (after the browser's own
  // mousedown focus handling has run).
  const itemRef = useRef(null);
  const focusBlock = () => {
    setTimeout(() => {
      if (!itemRef.current) return;
      if (itemRef.current.contains(itemRef.current.ownerDocument.activeElement)) return; // editing text inside
      itemRef.current.focus({ preventScroll: true });
    }, 0);
  };

  // ── Auto-grow ───────────────────────────────────────────────────────────
  // When an edit makes the content taller than the block's grid rows, extend
  // the block (and push blocks below it down — FluidSection.growBlock) instead
  // of letting text spill over the next block. Runs after content edits and
  // for blocks that were just added (`autoFit`) — never just because a page
  // was opened, so loading never changes it.
  // Compare against the content last seen (not a "first run" flag: React
  // StrictMode runs effects twice on mount, and a flag made the second run
  // look like an edit — opening the editor then silently grew and saved
  // any block that already overflowed).
  //
  // Measuring once is not enough: web fonts can finish loading after the
  // first measurement, and a field re-renders (e.g. its HTML is normalised)
  // when editing ends — both change the height without a content change.
  // So after an edit/insert the block stays "armed" for a few seconds and a
  // ResizeObserver re-measures whenever the rendered content changes size.
  // A freshly inserted block is fitted both ways (grow or shrink) so it
  // doesn't start with a band of empty rows; edits only ever grow.
  const seenContentRef = useRef(block.content);
  const autoFitDoneRef = useRef(false);
  const armRef = useRef({ until: 0, mode: 'grow' });
  const measureRef = useRef(null);
  measureRef.current = () => {
    const el = itemRef.current;
    if (!el || !interactive || !onGrow) return;
    const { until, mode } = armRef.current;
    if (Date.now() > until) return;
    // Natural content height: the bottom of the lowest child (the grid item
    // itself is stretched to its rows, so its own height says nothing).
    const top = el.getBoundingClientRect().top;
    let needed = 0;
    for (const child of el.children) {
      if (child.classList?.contains('site-editor-chrome')) continue;
      needed = Math.max(needed, child.getBoundingClientRect().bottom - top);
    }
    needed = Math.max(needed, mode === 'grow' ? el.scrollHeight : 0);
    if (needed <= 0) return;
    const rows = Math.max(1, Math.ceil((needed - 2 + gapV) / (rowHeight + gapV)));
    const newRowEnd = fluid.rowStart + rows;
    if (newRowEnd > fluid.rowEnd) onGrow(newRowEnd);
    else if (mode === 'fit' && newRowEnd < fluid.rowEnd && onFit) onFit(newRowEnd);
  };
  useLayoutEffect(() => {
    const changed = block.content !== seenContentRef.current;
    seenContentRef.current = block.content;
    const fitNow = autoFit && !autoFitDoneRef.current;
    if (fitNow) {
      autoFitDoneRef.current = true;
      armRef.current = { until: Date.now() + 5000, mode: 'fit' };
    } else if (changed) {
      armRef.current = { until: Date.now() + 3000, mode: armRef.current.mode === 'fit' && Date.now() < armRef.current.until ? 'fit' : 'grow' };
    } else {
      return;
    }
    measureRef.current?.();
  }, [block.content]); // eslint-disable-line react-hooks/exhaustive-deps
  // Narrowing a block reflows its content (container queries: fewer cards
  // across, more lines of text), so it gets taller — grow it to fit, like an
  // edit. Grow only: a width change never shrinks a block's height.
  const seenColsRef = useRef(`${fluid.colStart}-${fluid.colEnd}`);
  useLayoutEffect(() => {
    const cols = `${fluid.colStart}-${fluid.colEnd}`;
    if (cols === seenColsRef.current) return;
    seenColsRef.current = cols;
    armRef.current = { until: Date.now() + 3000, mode: 'grow' };
    measureRef.current?.();
  }, [fluid.colStart, fluid.colEnd]);
  useEffect(() => {
    const el = itemRef.current;
    if (!el || !interactive) return undefined;
    const win = el.ownerDocument.defaultView;
    const RO = win?.ResizeObserver || ResizeObserver;
    const ro = new RO(() => measureRef.current?.());
    const observeChildren = () => { for (const child of el.children) ro.observe(child); };
    observeChildren();
    const mo = new (win?.MutationObserver || MutationObserver)(observeChildren);
    mo.observe(el, { childList: true });
    const fonts = el.ownerDocument.fonts;
    const onFonts = () => measureRef.current?.();
    fonts?.addEventListener?.('loadingdone', onFonts);
    return () => { ro.disconnect(); mo.disconnect(); fonts?.removeEventListener?.('loadingdone', onFonts); };
  }, [interactive]);

  // Toolbar, drag handle and hover label sit just ABOVE the block so they
  // never cover its content. (Sections are separate stacking contexts and the
  // active one is raised — FluidSection — so chrome overlapping the previous
  // section stays on top and clickable.) Exceptions: blocks at the very top of
  // the page (above = under the editor toolbar) and the overlay-less mobile
  // flow — there the chrome goes inside, toolbar in the top-right corner.
  const chromeInside = !interactive || (sectionIndex === 0 && fluid.rowStart <= 1);

  const atLeftEdge = fluid.colStart <= 1;
  const atRightEdge = fluid.colEnd >= gridColumns + 1;
  const corner = { width: '9px', height: '9px', background: '#fff', border: '2px solid hsl(var(--admin-primary))', borderRadius: '2px', pointerEvents: 'auto', scale: 'var(--ui-scale, 1)' };
  const edge = 'calc(12px * var(--ui-scale, 1))';

  const dragGrid = [Math.round(cellW), Math.round(cellH)];
  const resizeGrid = [Math.round(cellW), Math.round(cellH)];

  // ── Drag handlers ───────────────────────────────────────────────────────
  const handleDragStart = useCallback(() => {
    onSelect();
    onShowGrid();
  }, [onSelect, onShowGrid]);

  // Check alignment during drag and show guide lines
  const handleDrag = useCallback((e, d) => {
    if (!onGuidesChange || !allPlacements) return;
    const dragColStart = Math.round(d.x / cellW) + 1;
    const dragColEnd = dragColStart + (fluid.colEnd - fluid.colStart);
    const dragRowStart = Math.round(d.y / cellH) + 1;
    const dragRowEnd = dragRowStart + (fluid.rowEnd - fluid.rowStart);
    const dragCenter = Math.round((dragColStart + dragColEnd) / 2);

    const verticalGuides = new Set();
    const horizontalGuides = new Set();
    allPlacements.forEach((of, i) => {
      if (i === blockIndex || !of) return;
      const otherCenter = Math.round((of.colStart + of.colEnd) / 2);
      if (dragColStart === of.colStart || dragColStart === of.colEnd) verticalGuides.add(dragColStart);
      if (dragColEnd === of.colStart || dragColEnd === of.colEnd) verticalGuides.add(dragColEnd);
      if (dragCenter === otherCenter) verticalGuides.add(dragCenter);
      if (dragRowStart === of.rowStart || dragRowStart === of.rowEnd) horizontalGuides.add(dragRowStart);
      if (dragRowEnd === of.rowStart || dragRowEnd === of.rowEnd) horizontalGuides.add(dragRowEnd);
    });
    onGuidesChange({
      vertical: [...verticalGuides].map((col) => Math.round((col - 1) * cellW)),
      horizontal: [...horizontalGuides].map((row) => Math.round((row - 1) * cellH)),
    });
  }, [onGuidesChange, allPlacements, blockIndex, cellW, cellH, fluid.colStart, fluid.colEnd, fluid.rowStart, fluid.rowEnd]);

  const handleDragStop = (e, d) => {
    onHideGrid();
    onGuidesChange?.({ vertical: [], horizontal: [] });
    // Keep the block inside the grid (same width, shifted back if needed).
    const span = fluid.colEnd - fluid.colStart;
    const newColStart = Math.min(Math.max(1, Math.round(d.x / cellW) + 1), gridColumns + 1 - span);
    const newRowStart = Math.max(1, Math.round(d.y / cellH) + 1);
    commitPlacement({ colStart: newColStart, colEnd: newColStart + span, rowStart: newRowStart, rowEnd: newRowStart + (fluid.rowEnd - fluid.rowStart) });
  };

  // ── Resize handlers ─────────────────────────────────────────────────────
  const handleResizeStart = useCallback(() => {
    onSelect();
    onShowGrid();
  }, [onSelect, onShowGrid]);

  const handleResizeStop = (e, dir, ref, delta, position) => {
    onHideGrid();
    onGuidesChange?.({ vertical: [], horizontal: [] });
    const newColStart = Math.min(Math.max(1, Math.round(position.x / cellW) + 1), gridColumns);
    const colSpan = Math.min(Math.max(1, Math.round((ref.offsetWidth + gapH) / cellW)), gridColumns + 1 - newColStart);
    const rowSpan = Math.max(1, Math.round((ref.offsetHeight + gapV) / cellH));
    const newRowStart = Math.max(1, Math.round(position.y / cellH) + 1);
    commitPlacement({ colStart: newColStart, colEnd: newColStart + colSpan, rowStart: newRowStart, rowEnd: newRowStart + rowSpan });
  };

  // ── Layering ────────────────────────────────────────────────────────────
  const handleLayering = (action) => onLayer?.(action); // FluidSection.layerBlock
  // The four layer commands live in one "Arrange" menu (they were four
  // look-alike arrow buttons, easy to confuse with move up/down).
  const [arrangeOpen, setArrangeOpen] = useState(false);
  const arrangeRef = useRef(null);
  useEffect(() => {
    if (!arrangeOpen) return undefined;
    const box = arrangeRef.current;
    const doc = box?.ownerDocument;
    box?.querySelector('[role="menuitem"]')?.focus();
    const onDown = (e) => { if (!box?.contains(e.target)) setArrangeOpen(false); };
    doc?.addEventListener('mousedown', onDown, true);
    return () => doc?.removeEventListener('mousedown', onDown, true);
  }, [arrangeOpen]);
  useEffect(() => { if (!selected) setArrangeOpen(false); }, [selected]);
  const arrangeKeys = (e) => {
    const items = [...(arrangeRef.current?.querySelectorAll('[role="menuitem"]') || [])];
    const i = items.indexOf(e.target.ownerDocument.activeElement);
    if (e.key === 'Escape') { e.stopPropagation(); setArrangeOpen(false); arrangeRef.current?.querySelector('[aria-haspopup]')?.focus(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length]?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length]?.focus(); }
  };
  const ARRANGE = [
    ['front', 'Bring to front', ChevronsUp],
    ['forward', 'Bring forward', ArrowUp],
    ['backward', 'Send backward', ArrowDown],
    ['back', 'Send to back', ChevronsDown],
  ];

  // ── Read-only (no editor chrome) ────────────────────────────────────────
  if (readOnly) {
    return <div style={itemStyle}><SiteBlock block={block} /></div>;
  }

  // Outline: hover / selected → solid, inline text editing → dashed
  const outlineStyle = isEditing
    ? { outline: '2px dashed hsl(var(--admin-primary))', outlineOffset: '6px', borderRadius: '2px' }
    : ((isHovered && !selected) || selected)
      ? { outline: '2px solid hsl(var(--admin-primary))', outlineOffset: '6px', borderRadius: '2px' }
      : { outline: '2px solid transparent', outlineOffset: '6px', borderRadius: '2px' };

  const typeLabel = blockTypeLabel(block.type);
  const accessibleName = `${typeLabel} block, row ${fluid.rowStart}, column ${fluid.colStart}`;
  const btn = 'w-8 h-8 flex items-center justify-center rounded-md text-text-base hover:bg-surface-raised';

  const toolbar = selected && !isEditing && (
    <div
      className="site-editor-chrome site-editor-ui absolute z-[100] flex items-center gap-0.5 bg-white rounded-lg shadow-[0_2px_8px_rgba(16,20,30,0.15),0_1px_2px_rgba(16,20,30,0.08)] p-1"
      style={{ ...(chromeInside ? { top: 8, right: 8, transformOrigin: 'top right' } : { top: -46, left: 0, transformOrigin: 'bottom left' }), pointerEvents: 'auto' }}
      role="toolbar"
      aria-label="Block actions"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <span className="px-2 text-[11px] font-semibold text-muted whitespace-nowrap">{typeLabel}</span>
      <button onClick={() => itemRef.current?.querySelector('[contenteditable="true"]')?.focus()} title="Edit text" aria-label="Edit text" className={btn}>
        <Pencil className="w-4 h-4" />
      </button>
      <button onClick={() => onOpenInspector?.()} title="Block settings" aria-label="Block settings" className={btn}>
        <SlidersHorizontal className="w-4 h-4" />
      </button>
      {interactive && (
        <>
          <div className="relative" ref={arrangeRef} onKeyDown={arrangeKeys}>
            <button
              onClick={() => setArrangeOpen((v) => !v)}
              title="Arrange (stacking order for overlapping blocks)"
              aria-label="Arrange"
              aria-haspopup="menu"
              aria-expanded={arrangeOpen}
              className={`${btn} ${arrangeOpen ? 'bg-surface-raised' : ''}`}
            >
              <Layers className="w-4 h-4" />
            </button>
            {arrangeOpen && (
              <div role="menu" aria-label="Arrange" className="absolute left-0 top-full mt-1 min-w-[170px] rounded-lg bg-white p-1 shadow-[0_4px_16px_rgba(16,20,30,0.18)]">
                {ARRANGE.map(([action, label, Icon]) => (
                  <button
                    key={action}
                    type="button"
                    role="menuitem"
                    onClick={() => { handleLayering(action); setArrangeOpen(false); }}
                    className="w-full flex items-center gap-2 px-2.5 min-h-[32px] rounded-md text-xs font-medium text-text-base hover:bg-surface-raised focus:bg-surface-raised focus:outline-none"
                  >
                    <Icon className="w-4 h-4 text-muted" aria-hidden="true" /> {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
      <button onClick={onDuplicate} title="Duplicate" aria-label="Duplicate block" className={btn}><Copy className="w-4 h-4" /></button>
      <button onClick={onDelete} title="Delete" aria-label="Delete block" className={btn} style={{ color: 'hsl(var(--danger, 0 84% 60%))' }}><Trash2 className="w-4 h-4" /></button>
    </div>
  );

  // Hover label (block type), like Squarespace's block name tag.
  const hoverLabel = isHovered && !selected && !isEditing && (
    <span
      className="site-editor-chrome site-editor-ui absolute z-[100] px-2 py-0.5 rounded text-[11px] font-semibold text-white pointer-events-none"
      style={{ top: chromeInside ? 6 : -24, left: chromeInside ? 6 : 0, background: 'hsl(var(--admin-primary))', transformOrigin: chromeInside ? 'top left' : 'bottom left' }}
    >
      {typeLabel}
    </span>
  );

  return (
    <>
      {/* CSS grid item — visual position matches the public renderer exactly */}
      <div
        ref={itemRef}
        data-block-index={blockIndex}
        data-block-id={block.id}
        style={{ ...itemStyle, ...outlineStyle }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onMouseDown={(e) => {
          if (selected) return; // let clicks reach contentEditable
          e.stopPropagation();
          onSelect(e.metaKey || e.ctrlKey);
          if (!interactive) focusBlock();
        }}
        onKeyDown={(e) => {
          // Only when the block itself has focus — keys typed into text inside
          // the block bubble here too, and swallowing them made it impossible
          // to type a space (or Enter) in inline text.
          if (e.target !== e.currentTarget) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            onSelect(e.metaKey || e.ctrlKey);
          }
        }}
        tabIndex={0}
        role="group"
        aria-label={accessibleName}
        className="group/block focus:outline-none"
      >
        {/* Block content — the SAME component the public site renders, with
            editable fields supplied through SiteEditProvider. */}
        <SiteEditProvider
          content={block.content}
          onUpdateContent={onUpdateContent}
          onEditingStart={startEditing}
          onEditingEnd={endEditing}
          onAddNestedBlock={block.type === 'grid' && onAddNestedBlock ? (colIndex) => onAddNestedBlock(colIndex, 'text') : undefined}
        >
          <EditorErrorBoundary compact resetKey={block.content}>
            <SiteBlock block={block} />
          </EditorErrorBoundary>
        </SiteEditProvider>

        {/* Flow mode has no overlay layer — chrome lives on the block itself. */}
        {!interactive && toolbar}
        {!interactive && hoverLabel}
      </div>

      {/* Transparent react-rnd overlay — drag/resize. Disabled while inline
          text editing so the contentEditable receives all mouse events. */}
      {interactive && (
        <Rnd
          position={{ x: pxX, y: pxY }}
          size={{ width: pxW, height: pxH }}
          dragGrid={dragGrid}
          resizeGrid={resizeGrid}
          // No `bounds`: react-rnd only computes them when the parent passes
          // `instanceof HTMLElement` — false for elements inside the canvas
          // iframe (different realm), which left the bounds at 0 and blocks
          // impossible to drag. Placement is clamped to the grid on drop.
          dragHandleClassName={selected ? 'fluid-drag-handle' : undefined}
          onDragStart={handleDragStart}
          onDrag={handleDrag}
          onDragStop={handleDragStop}
          onResizeStart={handleResizeStart}
          onResizeStop={handleResizeStop}
          enableResizing={!isEditing && {
            top: true, right: true, bottom: true, left: true,
            topLeft: true, topRight: true, bottomLeft: true, bottomRight: true,
          }}
          resizeHandleClasses={{ right: 'fluid-resize-r', bottom: 'fluid-resize-b', bottomRight: 'fluid-resize-br' }}
          // Handles sit just outside the block, except at the canvas edges:
          // the canvas clips horizontal overflow (B16), which cut a full-width
          // block's side handle in half and hid its corner handles entirely.
          resizeHandleStyles={{
            top:    { height: edge, top: '-6px', cursor: 'ns-resize', pointerEvents: 'auto', background: 'transparent' },
            bottom: { height: edge, bottom: '-6px', cursor: 'ns-resize', pointerEvents: 'auto', background: 'transparent' },
            left:   { width: edge, left: atLeftEdge ? '0px' : '-6px', cursor: 'ew-resize', pointerEvents: 'auto', background: 'transparent' },
            right:  { width: edge, right: atRightEdge ? '0px' : '-6px', cursor: 'ew-resize', pointerEvents: 'auto', background: 'transparent' },
            topLeft:    { ...corner, top: '-11px', left: atLeftEdge ? '1px' : '-11px', cursor: 'nwse-resize' },
            topRight:   { ...corner, top: '-11px', right: atRightEdge ? '1px' : '-11px', cursor: 'nesw-resize' },
            bottomLeft: { ...corner, bottom: '-11px', left: atLeftEdge ? '1px' : '-11px', cursor: 'nesw-resize' },
            bottomRight:{ ...corner, bottom: '-11px', right: atRightEdge ? '1px' : '-11px', cursor: 'nwse-resize' },
          }}
          style={{
            zIndex: (fluid.zIndex ?? 0) + 100,
            cursor: selected ? 'default' : 'grab',
            background: 'transparent',
            border: (selected && !isEditing) ? 'none' : '1px dashed rgba(99,102,241,0.2)',
            borderRadius: '4px',
            boxSizing: 'border-box',
            pointerEvents: isEditing ? 'none' : (selected ? 'none' : 'auto'),
          }}
        >
          {/* Selection click catcher — fills the overlay. When selected it is
              pointer-events:none so clicks reach the editable text below. */}
          <div
            style={{ position: 'absolute', inset: 0, pointerEvents: selected ? 'none' : 'auto' }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onMouseDown={(e) => {
              // Don't stopPropagation — let react-draggable also handle it for drag
              onSelect(e.metaKey || e.ctrlKey);
              focusBlock();
            }}
          />
          {/* Toolbar + hover label live in this overlay layer (above resize
              handles and content) so nothing covers them. */}
          {toolbar}
          {hoverLabel}
          {/* Drag handle — keeps pointer events while the overlay body doesn't. */}
          {selected && !isEditing && (
            <div
              className={`fluid-drag-handle site-editor-chrome site-editor-ui absolute ${chromeInside ? 'top-2' : '-top-7'} left-1/2 -translate-x-1/2 flex items-center justify-center w-10 h-6 bg-primary text-primary-foreground rounded-md shadow-lg cursor-grab active:cursor-grabbing`}
              style={{ pointerEvents: 'auto', transformOrigin: chromeInside ? 'top center' : 'bottom center' }}
              title="Drag to move"
            >
              <GripVertical className="w-3.5 h-3.5" />
            </div>
          )}
        </Rnd>
      )}
    </>
  );
}
