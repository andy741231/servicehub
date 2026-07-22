/**
 * MobileLayoutInspector.jsx — Inspector panel for mobile layout positioning.
 *
 * When the editor is in mobile viewport mode and a block is selected, this
 * panel shows stepper inputs for the block's grid position (column start,
 * column span, row start, row span) and z-index. This provides an accessible,
 * keyboard-friendly alternative to drag/resize on small screens.
 *
 * The mobile grid is 6 columns wide.
 */

import { useEffect, useState } from 'react';
import { Smartphone, ArrowUp, ArrowDown } from 'lucide-react';

const MOBILE_GRID_COLUMNS = 6;

export default function MobileLayoutInspector({
  block,
  onUpdate,
  onClose,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}) {
  const fluid = block?.fluidMobile || { colStart: 1, colEnd: 7, rowStart: 1, rowEnd: 3, zIndex: 0 };

  const [colStart, setColStart] = useState(fluid.colStart ?? 1);
  const [colSpan, setColSpan] = useState((fluid.colEnd ?? 7) - (fluid.colStart ?? 1));
  const [rowStart, setRowStart] = useState(fluid.rowStart ?? 1);
  const [rowSpan, setRowSpan] = useState((fluid.rowEnd ?? 3) - (fluid.rowStart ?? 1));
  const [zIndex, setZIndex] = useState(fluid.zIndex ?? 0);

  // Sync local state when the selected block changes
  useEffect(() => {
    setColStart(fluid.colStart ?? 1);
    setColSpan((fluid.colEnd ?? 7) - (fluid.colStart ?? 1));
    setRowStart(fluid.rowStart ?? 1);
    setRowSpan((fluid.rowEnd ?? 3) - (fluid.rowStart ?? 1));
    setZIndex(fluid.zIndex ?? 0);
  }, [block?.id, fluid.colStart, fluid.colEnd, fluid.rowStart, fluid.rowEnd, fluid.zIndex]);

  const commit = (updates) => {
    const next = { ...fluid, ...updates };
    // Clamp to valid ranges
    next.colStart = Math.max(1, Math.min(MOBILE_GRID_COLUMNS, next.colStart));
    next.colEnd = Math.max(next.colStart + 1, Math.min(MOBILE_GRID_COLUMNS + 1, next.colStart + (next.colEnd - next.colStart)));
    next.rowStart = Math.max(1, next.rowStart);
    next.rowEnd = Math.max(next.rowStart + 1, next.rowStart + (next.rowEnd - next.rowStart));
    onUpdate(next);
  };

  const handleColStart = (v) => {
    const val = parseInt(v, 10) || 1;
    setColStart(val);
    commit({ colStart: val, colEnd: val + colSpan });
  };

  const handleColSpan = (v) => {
    const val = Math.max(1, parseInt(v, 10) || 1);
    setColSpan(val);
    commit({ colEnd: colStart + val });
  };

  const handleRowStart = (v) => {
    const val = parseInt(v, 10) || 1;
    setRowStart(val);
    commit({ rowStart: val, rowEnd: val + rowSpan });
  };

  const handleRowSpan = (v) => {
    const val = Math.max(1, parseInt(v, 10) || 1);
    setRowSpan(val);
    commit({ rowEnd: rowStart + val });
  };

  const handleZIndex = (v) => {
    const val = parseInt(v, 10) || 0;
    setZIndex(val);
    commit({ zIndex: val });
  };

  if (!block) return null;

  const blockTypeLabel = block?.type ? block.type.charAt(0).toUpperCase() + block.type.slice(1) : 'Block';

  const stepper = (label, value, onChange, min = 0, max = 999, step = 1, id) => (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-muted">{label}</label>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - step))}
          disabled={value <= min}
          className="w-8 h-8 flex items-center justify-center rounded border border-border bg-surface text-text-base hover:bg-surface-raised disabled:opacity-30 focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label={`Decrease ${label}`}
        >
          −
        </button>
        <input
          id={id}
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(e.target.value)}
          className="w-14 px-2 py-1.5 text-center text-sm border border-border rounded bg-surface text-text-base focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label={label}
        />
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + step))}
          disabled={value >= max}
          className="w-8 h-8 flex items-center justify-center rounded border border-border bg-surface text-text-base hover:bg-surface-raised disabled:opacity-30 focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );

  return (
    <aside
      className="w-72 bg-surface border-l border-border flex flex-col h-full"
      aria-label="Mobile layout inspector"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-raised">
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-muted" />
          <h2 className="text-sm font-semibold text-text-base">Mobile Layout</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-surface rounded transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label="Close inspector"
        >
          ✕
        </button>
      </div>

      {/* Block info */}
      <div className="px-4 py-3 border-b border-border">
        <p className="text-sm font-medium text-text-base">{blockTypeLabel} block</p>
        <p className="text-xs text-muted mt-0.5">6-column mobile grid</p>
      </div>

      {/* Stepper controls */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {stepper('Column start', colStart, handleColStart, 1, MOBILE_GRID_COLUMNS, 1, 'col-start')}
          {stepper('Column span', colSpan, handleColSpan, 1, MOBILE_GRID_COLUMNS, 1, 'col-span')}
          {stepper('Row start', rowStart, handleRowStart, 1, 999, 1, 'row-start')}
          {stepper('Row span', rowSpan, handleRowSpan, 1, 999, 1, 'row-span')}
          {stepper('Z-index', zIndex, handleZIndex, -10, 100, 1, 'z-index')}
        </div>

        {/* Quick presets */}
        <div className="pt-2 border-t border-border">
          <p className="text-xs font-medium text-muted mb-2">Quick presets</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { setColStart(1); setColSpan(6); commit({ colStart: 1, colEnd: 7 }); }}
              className="px-3 py-1.5 text-xs border border-border rounded bg-surface hover:bg-surface-raised focus:outline-none focus:ring-2 focus:ring-primary"
            >
              Full width
            </button>
            <button
              onClick={() => { setColStart(1); setColSpan(3); commit({ colStart: 1, colEnd: 4 }); }}
              className="px-3 py-1.5 text-xs border border-border rounded bg-surface hover:bg-surface-raised focus:outline-none focus:ring-2 focus:ring-primary"
            >
              Half width
            </button>
            <button
              onClick={() => { setColStart(1); setColSpan(2); commit({ colStart: 1, colEnd: 3 }); }}
              className="px-3 py-1.5 text-xs border border-border rounded bg-surface hover:bg-surface-raised focus:outline-none focus:ring-2 focus:ring-primary"
            >
              Third width
            </button>
          </div>
        </div>

        {/* Reorder */}
        <div className="pt-2 border-t border-border">
          <p className="text-xs font-medium text-muted mb-2">Reorder in section</p>
          <div className="flex gap-2">
            <button
              onClick={onMoveUp}
              disabled={canMoveUp === false}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs border border-border rounded bg-surface hover:bg-surface-raised disabled:opacity-30 focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
            >
              <ArrowUp className="w-3.5 h-3.5" /> Move up
            </button>
            <button
              onClick={onMoveDown}
              disabled={canMoveDown === false}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs border border-border rounded bg-surface hover:bg-surface-raised disabled:opacity-30 focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
            >
              <ArrowDown className="w-3.5 h-3.5" /> Move down
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
