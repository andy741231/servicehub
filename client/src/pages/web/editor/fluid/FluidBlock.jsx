import { useRef, useCallback, useState } from 'react';
import { Rnd } from 'react-rnd';
import {
  Trash2, Copy, ArrowUp, ChevronsUp, ChevronsDown, GripVertical,
  Pencil,
} from 'lucide-react';
import BlockContent from '../BlockContent.jsx';

/**
 * FluidBlock — renders a block at grid coordinates using CSS Grid placement
 * (same as the public renderer) with a transparent react-rnd overlay for
 * drag/resize interactions.
 *
 * Architecture:
 * - The visual block is a CSS Grid item (gridColumn/gridRow) — this is what
 *   the user sees and what the public renderer uses, so positions match
 *   pixel-perfectly between editor and published page.
 * - A transparent react-rnd overlay sits on top (absolutely positioned within
 *   the grid container) — this captures drag/resize mouse events.
 * - When NOT selected: overlay captures clicks (to select the block) and
 *   allows drag from anywhere on the block.
 * - When selected: overlay body becomes pointer-events:none so clicks pass
 *   through to the contentEditable text below. A drag handle (grip icon) and
 *   resize handles retain pointer-events:auto for repositioning/resizing.
 */
export default function FluidBlock({
  block,
  blockIndex,
  sectionIndex,
  gridColumns,
  rowHeight,
  gapH,
  gapV,
  colWidth,
  selected,
  readOnly,
  onSelect,
  onClearSelection,
  onUpdate,
  onUpdateContent,
  onAddNestedBlock,
  onDelete,
  onDuplicate,
  onShowGrid,
  onHideGrid,
  onGuidesChange,
  allBlocks,
  viewport = 'desktop',
  EditableText,
  EditableButton,
  EditableImage,
}) {
  const isMobile = viewport === 'mobile';
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Wrap the editable components so we can track when inline text editing is
  // active. The mockup uses a dashed outline + hidden resize handles while
  // a text field is being edited in place.
  const EditableTextTracked = useCallback((props) => (
    <EditableText
      {...props}
      onEditingStart={() => { setIsEditing(true); props.onEditingStart?.(); }}
      onEditingEnd={(e) => { setIsEditing(false); props.onEditingEnd?.(e); }}
    />
  ), [EditableText]);
  const EditableButtonTracked = useCallback((props) => (
    <EditableButton
      {...props}
      onEditingStart={() => { setIsEditing(true); props.onEditingStart?.(); }}
      onEditingEnd={() => { setIsEditing(false); props.onEditingEnd?.(); }}
    />
  ), [EditableButton]);
  const EditableImageTracked = useCallback((props) => (
    <EditableImage
      {...props}
      onEditingStart={() => { setIsEditing(true); props.onEditingStart?.(); }}
      onEditingEnd={() => { setIsEditing(false); props.onEditingEnd?.(); }}
    />
  ), [EditableImage]);
  // Mobile layout stored separately under block.fluidMobile (6-column grid).
  // Falls back to a default full-width mobile layout if not yet configured.
  const defaultFluid = { colStart: 1, colEnd: 25, rowStart: 1, rowEnd: 3, zIndex: 0 };
  const defaultMobileFluid = { colStart: 1, colEnd: 7, rowStart: 1, rowEnd: 3, zIndex: 0 };
  const fluid = isMobile
    ? (block.fluidMobile || defaultMobileFluid)
    : (block.fluid || defaultFluid);

  // ── CSS Grid placement style (matches public renderer exactly) ──────────
  const gridItemStyle = {
    gridColumn: `${fluid.colStart} / ${fluid.colEnd}`,
    gridRow: `${fluid.rowStart} / ${fluid.rowEnd}`,
    zIndex: fluid.zIndex ?? 0,
    position: 'relative',
  };

  // ── Pixel position for the react-rnd overlay ────────────────────────────
  const cellW = colWidth;
  const cellH = rowHeight + gapV;
  const pxX = (fluid.colStart - 1) * cellW;
  const pxW = (fluid.colEnd - fluid.colStart) * cellW - gapH;
  const pxY = (fluid.rowStart - 1) * cellH;
  const pxH = (fluid.rowEnd - fluid.rowStart) * cellH - gapV;

  const dragGrid = [Math.round(cellW), Math.round(cellH)];
  const resizeGrid = [Math.round(cellW), Math.round(cellH)];

  // ── Drag handlers ───────────────────────────────────────────────────────
  const handleDragStart = useCallback(() => {
    onSelect();
    onShowGrid();
  }, [onSelect, onShowGrid]);

  // Check alignment during drag and show guide lines
  const handleDrag = useCallback((e, d) => {
    if (!onGuidesChange || !allBlocks) return;
    const dragColStart = Math.round(d.x / cellW) + 1;
    const colSpan = fluid.colEnd - fluid.colStart;
    const dragColEnd = dragColStart + colSpan;
    const dragRowStart = Math.round(d.y / cellH) + 1;
    const rowSpan = fluid.rowEnd - fluid.rowStart;
    const dragRowEnd = dragRowStart + rowSpan;

    const verticalGuides = new Set();
    const horizontalGuides = new Set();

    for (const other of allBlocks) {
      if (other.id === block.id) continue;
      const of = isMobile ? other.fluidMobile : other.fluid;
      if (!of) continue;
      // Check vertical alignment (column edges)
      const otherLeft = of.colStart;
      const otherRight = of.colEnd;
      const otherCenter = Math.round((of.colStart + of.colEnd) / 2);
      const dragLeft = dragColStart;
      const dragRight = dragColEnd;
      const dragCenter = Math.round((dragColStart + dragColEnd) / 2);
      if (dragLeft === otherLeft || dragLeft === otherRight) verticalGuides.add(dragLeft);
      if (dragRight === otherLeft || dragRight === otherRight) verticalGuides.add(dragRight);
      if (dragCenter === otherCenter) verticalGuides.add(dragCenter);
      // Check horizontal alignment (row edges)
      const otherTop = of.rowStart;
      const otherBottom = of.rowEnd;
      const dragTop = dragRowStart;
      const dragBottom = dragRowEnd;
      if (dragTop === otherTop || dragTop === otherBottom) horizontalGuides.add(dragTop);
      if (dragBottom === otherTop || dragBottom === otherBottom) horizontalGuides.add(dragBottom);
    }

    // Convert grid positions to pixel positions
    const vPx = [...verticalGuides].map(col => Math.round((col - 1) * cellW));
    const hPx = [...horizontalGuides].map(row => Math.round((row - 1) * cellH));
    onGuidesChange({ vertical: vPx, horizontal: hPx });
  }, [onGuidesChange, allBlocks, block.id, cellW, cellH, fluid, isMobile]);

  const handleDragStop = useCallback((e, d) => {
    onHideGrid();
    onGuidesChange?.({ vertical: [], horizontal: [] });
    const newColStart = Math.max(1, Math.round(d.x / cellW) + 1);
    const colSpan = fluid.colEnd - fluid.colStart;
    const newColEnd = Math.min(gridColumns + 1, newColStart + colSpan);
    const newRowStart = Math.max(1, Math.round(d.y / cellH) + 1);
    const rowSpan = fluid.rowEnd - fluid.rowStart;
    const newRowEnd = newRowStart + rowSpan;
    onUpdate({ colStart: newColStart, colEnd: newColEnd, rowStart: newRowStart, rowEnd: newRowEnd });
  }, [cellW, cellH, gridColumns, fluid, onUpdate, onHideGrid, onGuidesChange]);

  // ── Resize handlers ─────────────────────────────────────────────────────
  const handleResizeStart = useCallback(() => {
    onSelect();
    onShowGrid();
  }, [onSelect, onShowGrid]);

  const handleResizeStop = useCallback((e, dir, ref, delta, position) => {
    onHideGrid();
    onGuidesChange?.({ vertical: [], horizontal: [] });
    const newW = ref.offsetWidth;
    const newH = ref.offsetHeight;
    const colSpan = Math.max(1, Math.round((newW + gapH) / cellW));
    const rowSpan = Math.max(1, Math.round((newH + gapV) / cellH));
    const newColStart = Math.max(1, Math.round(position.x / cellW) + 1);
    const newRowStart = Math.max(1, Math.round(position.y / cellH) + 1);
    const newColEnd = Math.min(gridColumns + 1, newColStart + colSpan);
    const newRowEnd = newRowStart + rowSpan;
    onUpdate({ colStart: newColStart, colEnd: newColEnd, rowStart: newRowStart, rowEnd: newRowEnd });
  }, [cellW, cellH, gapH, gapV, gridColumns, onUpdate, onHideGrid]);

  // ── Layering ────────────────────────────────────────────────────────────
  const handleLayering = (action) => {
    const z = fluid.zIndex ?? 0;
    if (action === 'front') onUpdate({ zIndex: 1000 });
    else if (action === 'back') onUpdate({ zIndex: -1000 });
    else if (action === 'forward') onUpdate({ zIndex: z + 1 });
    else if (action === 'backward') onUpdate({ zIndex: z - 1 });
  };

  // ── Read-only mode (public renderer) — just CSS Grid placement ──────────
  if (readOnly) {
    return (
      <div style={gridItemStyle}>
        <BlockContent block={block} />
      </div>
    );
  }

  // ── Editor mode — CSS Grid item + transparent react-rnd overlay ─────────
  // When selected, the overlay body is pointer-events:none so clicks reach
  // the contentEditable text below. The drag handle and resize handles
  // retain pointer-events:auto. When not selected, the overlay captures
  // clicks to select the block.
  const overlayPointerEvents = selected ? 'none' : 'auto';

  // Outline style follows the mockup:
  //   hover (not selected, not editing) → 2px solid primary, 6px offset
  //   selected (not editing)            → 2px solid primary, 6px offset
  //   editing                           → 2px dashed primary, 6px offset
  const showHoverOutline = isHovered && !selected && !isEditing;
  const showSelectedOutline = selected && !isEditing;
  const outlineStyle = isEditing
    ? { outline: '2px dashed hsl(var(--primary))', outlineOffset: '6px', borderRadius: '2px' }
    : (showHoverOutline || showSelectedOutline)
      ? { outline: '2px solid hsl(var(--primary))', outlineOffset: '6px', borderRadius: '2px' }
      : { outline: '2px solid transparent', outlineOffset: '6px', borderRadius: '2px' };

  // Build an accessible name for this block, e.g. "Text block, section 2, row 1"
  const blockTypeLabel = block?.type ? block.type.charAt(0).toUpperCase() + block.type.slice(1) : 'Block';
  const accessibleName = `${blockTypeLabel} block, row ${fluid.rowStart}, column ${fluid.colStart}`;

  return (
    <>
      {/* CSS Grid item — visual position matches public renderer exactly */}
      <div
        style={{ ...gridItemStyle, ...outlineStyle }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onMouseDown={(e) => {
          if (selected) return; // let clicks reach contentEditable
          e.stopPropagation();
          onSelect(e.metaKey || e.ctrlKey);
        }}
        onKeyDown={(e) => {
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
        {/* Floating contextual toolbar — top-left, icon-only (mockup spec) */}
        {selected && !isEditing && (
          <div
            className="absolute z-[100] flex items-center gap-0.5 bg-white rounded-lg shadow-[0_2px_8px_rgba(16,20,30,0.15),0_1px_2px_rgba(16,20,30,0.08)] p-1"
            style={{ top: -46, left: 0 }}
            role="toolbar"
            aria-label="Block actions"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button onClick={() => setIsEditing(true)} title="Edit inline" aria-label="Edit inline" className="w-8 h-8 flex items-center justify-center rounded-md text-text-base hover:bg-surface-raised">
              <Pencil className="w-4 h-4" />
            </button>
            <button onClick={() => handleLayering('forward')} title="Bring forward" aria-label="Bring forward" className="w-8 h-8 flex items-center justify-center rounded-md text-text-base hover:bg-surface-raised">
              <ArrowUp className="w-4 h-4" />
            </button>
            <button onClick={() => handleLayering('front')} title="Bring to front" aria-label="Bring to front" className="w-8 h-8 flex items-center justify-center rounded-md text-text-base hover:bg-surface-raised">
              <ChevronsUp className="w-4 h-4" />
            </button>
            <button onClick={() => handleLayering('back')} title="Send to back" aria-label="Send to back" className="w-8 h-8 flex items-center justify-center rounded-md text-text-base hover:bg-surface-raised">
              <ChevronsDown className="w-4 h-4" />
            </button>
            <button onClick={onDuplicate} title="Duplicate" aria-label="Duplicate block" className="w-8 h-8 flex items-center justify-center rounded-md text-text-base hover:bg-surface-raised">
              <Copy className="w-4 h-4" />
            </button>
            <button onClick={onDelete} title="Delete" aria-label="Delete block" className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-surface-raised" style={{ color: 'hsl(var(--danger, 0 84% 60%))' }}>
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Block content — editable when selected, read-only preview otherwise */}
        <div className="w-full h-full overflow-hidden">
          {EditableText ? (
            <BlockContent
              block={block}
              EditableText={EditableTextTracked}
              EditableButton={EditableButtonTracked}
              EditableImage={EditableImageTracked}
              onUpdateContent={onUpdateContent}
              onUpdateBlock={null}
              onAddNestedBlock={onAddNestedBlock}
            />
          ) : (
            <BlockContentPreview block={block} />
          )}
        </div>
      </div>

      {/* Transparent react-rnd overlay — handles drag/resize only.
          Disabled (pointer-events:none) while inline text editing is active
          so the contentEditable receives all mouse events. */}
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
          // Mockup spec: 9x9 white squares with 2px primary border, 2px radius
          topLeft:    { width: '9px', height: '9px', top: '-11px', left: '-11px', cursor: 'nwse-resize', background: '#fff', border: '2px solid hsl(var(--primary))', borderRadius: '2px', pointerEvents: 'auto' },
          topRight:   { width: '9px', height: '9px', top: '-11px', right: '-11px', cursor: 'nesw-resize', background: '#fff', border: '2px solid hsl(var(--primary))', borderRadius: '2px', pointerEvents: 'auto' },
          bottomLeft: { width: '9px', height: '9px', bottom: '-11px', left: '-11px', cursor: 'nesw-resize', background: '#fff', border: '2px solid hsl(var(--primary))', borderRadius: '2px', pointerEvents: 'auto' },
          bottomRight:{ width: '9px', height: '9px', bottom: '-11px', right: '-11px', cursor: 'nwse-resize', background: '#fff', border: '2px solid hsl(var(--primary))', borderRadius: '2px', pointerEvents: 'auto' },
        }}
        style={{
          zIndex: (fluid.zIndex ?? 0) + 100,
          cursor: selected ? 'default' : 'grab',
          background: 'transparent',
          border: (selected && !isEditing) ? 'none' : '1px dashed rgba(99,102,241,0.2)',
          borderRadius: '4px',
          boxSizing: 'border-box',
          pointerEvents: isEditing ? 'none' : overlayPointerEvents,
        }}
      >
        {/* Selection click catcher — fills the Rnd area. Rnd doesn't pass
            onMouseDown to its child div, so we use a child element instead.
            When selected, this is pointer-events:none so clicks reach the
            contentEditable below. */}
        <div
          style={{ position: 'absolute', inset: 0, pointerEvents: selected ? 'none' : 'auto' }}
          onMouseDown={(e) => {
            // Don't stopPropagation — let react-draggable also handle it for drag
            onSelect(e.metaKey || e.ctrlKey);
          }}
        />
        {/* Drag handle — visible only when selected (and not editing). Has
            pointer-events:auto so it can initiate drag even while the overlay
            body is pointer-events:none. */}
        {selected && !isEditing && (
          <div
            className="fluid-drag-handle absolute -top-7 left-1/2 -translate-x-1/2 flex items-center justify-center w-10 h-6 bg-primary text-primary-foreground rounded-md shadow-lg cursor-grab active:cursor-grabbing"
            style={{ pointerEvents: 'auto' }}
            title="Drag to move"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </div>
        )}
      </Rnd>
    </>
  );
}

/**
 * Minimal block content preview for the editor canvas (fallback when
 * EditableText/EditableButton/EditableImage are not available).
 */
function BlockContentPreview({ block }) {
  const c = block.content || {};
  const type = block.type;
  if (type === 'text') return <div className="p-3 text-sm text-text-base prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: c.content || '' }} />;
  if (type === 'hero') return <div className="p-4"><h2 className="text-xl font-bold">{c.title}</h2><p className="text-sm text-muted">{c.subtitle}</p></div>;
  if (type === 'intro') return <div className="p-4"><h3 className="text-lg font-semibold">{c.title}</h3><p className="text-sm text-muted">{c.content}</p></div>;
  if (type === 'quote') return <div className="p-4"><blockquote className="text-base italic">"{c.quote}"</blockquote><p className="text-xs text-muted">— {c.citation}</p></div>;
  if (type === 'features') return <div className="p-4"><h3 className="text-lg font-semibold">{c.title}</h3><p className="text-xs text-muted">{c.subtitle}</p></div>;
  if (type === 'contact') return <div className="p-4"><h3 className="text-lg font-semibold">{c.title}</h3><p className="text-sm text-muted">{c.email}</p></div>;
  return <div className="p-3 text-sm text-muted capitalize">{type} block</div>;
}
