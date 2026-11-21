import { useRef, useCallback, useState, useEffect, useLayoutEffect } from 'react';
import { Rnd } from 'react-rnd';
import {
  Trash2, Copy, ArrowUp, ChevronsUp, ChevronsDown, GripVertical,
  Pencil, SlidersHorizontal,
} from 'lucide-react';
import SiteBlock from '../../../../site/SiteBlock.jsx';
import { gridItemStyle as siteGridItemStyle } from '../../../../site/SiteSections.jsx';
import { SiteEditProvider } from '../siteEditBridge.jsx';
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
  // handles while active). Called by the editable site fields.
  const startEditing = useCallback(() => setIsEditing(true), []);
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
      if (itemRef.current.contains(document.activeElement)) return; // editing text inside
      itemRef.current.focus({ preventScroll: true });
    }, 0);
  };

  // ── Auto-grow ───────────────────────────────────────────────────────────
  // When an edit makes the content taller than the block's grid rows, extend
  // the block (and push blocks below it down — FluidSection.growBlock) instead
  // of letting text spill over the next block. Runs after content edits and
  // for blocks that were just added (`autoFit`) — never just because a page
  // was opened, so loading never changes it.
  const firstRenderRef = useRef(true);
  useLayoutEffect(() => {
    const first = firstRenderRef.current;
    firstRenderRef.current = false;
    if (!interactive || !onGrow) return;
    if (first && !autoFit) return;
    const el = itemRef.current;
    if (!el) return;
    const needed = el.scrollHeight;
    const available = el.clientHeight;
    if (needed <= available + 2) return;
    const rows = Math.ceil((needed + gapV) / (rowHeight + gapV));
    const newRowEnd = fluid.rowStart + rows;
    if (newRowEnd > fluid.rowEnd) onGrow(newRowEnd);
  }, [block.content]); // eslint-disable-line react-hooks/exhaustive-deps

  // Toolbar, drag handle and hover label sit just ABOVE the block so they
  // never cover its content. (Sections are separate stacking contexts and the
  // active one is raised — FluidSection — so chrome overlapping the previous
  // section stays on top and clickable.) Exceptions: blocks at the very top of
  // the page (above = under the editor toolbar) and the overlay-less mobile
  // flow — there the chrome goes inside, toolbar in the top-right corner.
  const chromeInside = !interactive || (sectionIndex === 0 && fluid.rowStart <= 1);

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
    const newColStart = Math.max(1, Math.round(d.x / cellW) + 1);
    const newColEnd = Math.min(gridColumns + 1, newColStart + (fluid.colEnd - fluid.colStart));
    const newRowStart = Math.max(1, Math.round(d.y / cellH) + 1);
    commitPlacement({ colStart: newColStart, colEnd: newColEnd, rowStart: newRowStart, rowEnd: newRowStart + (fluid.rowEnd - fluid.rowStart) });
  };

  // ── Resize handlers ─────────────────────────────────────────────────────
  const handleResizeStart = useCallback(() => {
    onSelect();
    onShowGrid();
  }, [onSelect, onShowGrid]);

  const handleResizeStop = (e, dir, ref, delta, position) => {
    onHideGrid();
    onGuidesChange?.({ vertical: [], horizontal: [] });
    const colSpan = Math.max(1, Math.round((ref.offsetWidth + gapH) / cellW));
    const rowSpan = Math.max(1, Math.round((ref.offsetHeight + gapV) / cellH));
    const newColStart = Math.max(1, Math.round(position.x / cellW) + 1);
    const newRowStart = Math.max(1, Math.round(position.y / cellH) + 1);
    commitPlacement({ colStart: newColStart, colEnd: Math.min(gridColumns + 1, newColStart + colSpan), rowStart: newRowStart, rowEnd: newRowStart + rowSpan });
  };

  // ── Layering ────────────────────────────────────────────────────────────
  const handleLayering = (action) => onLayer?.(action); // FluidSection.layerBlock

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
      className="site-editor-chrome absolute z-[100] flex items-center gap-0.5 bg-white rounded-lg shadow-[0_2px_8px_rgba(16,20,30,0.15),0_1px_2px_rgba(16,20,30,0.08)] p-1"
      style={{ ...(chromeInside ? { top: 8, right: 8 } : { top: -46, left: 0 }), pointerEvents: 'auto' }}
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
          <button onClick={() => handleLayering('forward')} title="Bring forward" aria-label="Bring forward" className={btn}><ArrowUp className="w-4 h-4" /></button>
          <button onClick={() => handleLayering('front')} title="Bring to front" aria-label="Bring to front" className={btn}><ChevronsUp className="w-4 h-4" /></button>
          <button onClick={() => handleLayering('back')} title="Send to back" aria-label="Send to back" className={btn}><ChevronsDown className="w-4 h-4" /></button>
        </>
      )}
      <button onClick={onDuplicate} title="Duplicate" aria-label="Duplicate block" className={btn}><Copy className="w-4 h-4" /></button>
      <button onClick={onDelete} title="Delete" aria-label="Delete block" className={btn} style={{ color: 'hsl(var(--danger, 0 84% 60%))' }}><Trash2 className="w-4 h-4" /></button>
    </div>
  );

  // Hover label (block type), like Squarespace's block name tag.
  const hoverLabel = isHovered && !selected && !isEditing && (
    <span
      className="site-editor-chrome absolute z-[100] px-2 py-0.5 rounded text-[11px] font-semibold text-white pointer-events-none"
      style={{ top: chromeInside ? 6 : -24, left: chromeInside ? 6 : 0, background: 'hsl(var(--admin-primary))' }}
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
          <SiteBlock block={block} />
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
          bounds="parent"
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
          resizeHandleStyles={{
            top:    { height: '12px', top: '-6px', cursor: 'ns-resize', pointerEvents: 'auto', background: 'transparent' },
            bottom: { height: '12px', bottom: '-6px', cursor: 'ns-resize', pointerEvents: 'auto', background: 'transparent' },
            left:   { width: '12px', left: '-6px', cursor: 'ew-resize', pointerEvents: 'auto', background: 'transparent' },
            right:  { width: '12px', right: '-6px', cursor: 'ew-resize', pointerEvents: 'auto', background: 'transparent' },
            topLeft:    { width: '9px', height: '9px', top: '-11px', left: '-11px', cursor: 'nwse-resize', background: '#fff', border: '2px solid hsl(var(--admin-primary))', borderRadius: '2px', pointerEvents: 'auto' },
            topRight:   { width: '9px', height: '9px', top: '-11px', right: '-11px', cursor: 'nesw-resize', background: '#fff', border: '2px solid hsl(var(--admin-primary))', borderRadius: '2px', pointerEvents: 'auto' },
            bottomLeft: { width: '9px', height: '9px', bottom: '-11px', left: '-11px', cursor: 'nesw-resize', background: '#fff', border: '2px solid hsl(var(--admin-primary))', borderRadius: '2px', pointerEvents: 'auto' },
            bottomRight:{ width: '9px', height: '9px', bottom: '-11px', right: '-11px', cursor: 'nwse-resize', background: '#fff', border: '2px solid hsl(var(--admin-primary))', borderRadius: '2px', pointerEvents: 'auto' },
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
              className={`fluid-drag-handle site-editor-chrome absolute ${chromeInside ? 'top-2' : '-top-7'} left-1/2 -translate-x-1/2 flex items-center justify-center w-10 h-6 bg-primary text-primary-foreground rounded-md shadow-lg cursor-grab active:cursor-grabbing`}
              style={{ pointerEvents: 'auto' }}
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
