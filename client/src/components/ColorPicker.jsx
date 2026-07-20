/**
 * ColorPicker.jsx — Global, in-app color picker for Service Hub.
 *
 * Built on react-colorful, with a popover wrapper that matches the
 * app's design system. Supports hex colors with optional alpha.
 *
 * Features:
 *   - Visual color picker (react-colorful HexColorPicker / HexAlphaColorPicker)
 *   - Hex input (#rrggbb / #rrggbbaa)
 *   - Alpha support via HexAlphaColorPicker when allowAlpha is true
 *   - Smart viewport positioning (flips when near edges)
 *   - Click-outside + Escape to close
 *   - Accessible (labelled trigger, role=dialog)
 *
 * Value format:
 *   - Accepts:  #rgb | #rrggbb | #rrggbbaa | rgb(r,g,b) | rgba(r,g,b,a)
 *   - Emits:    #rrggbb when alpha === 1, otherwise rgba(r, g, b, a)
 *
 * Usage:
 *   <ColorPicker value={block.style?.backgroundColor || '#ffffff'}
 *                onChange={(v) => handleStyleUpdate({ backgroundColor: v })} />
 *
 *   // Optional:
 *   <ColorPicker value={c} onChange={setC} label="Background" allowAlpha={false} />
 */

import { useState, useRef, useEffect, useCallback, useMemo, forwardRef } from 'react';
import { createPortal } from 'react-dom';
import { HexColorPicker, HexAlphaColorPicker } from 'react-colorful';

// ─── Color parsing / formatting helpers ───────────────────────────────────────

function parseColor(input) {
  if (!input || typeof input !== 'string') return { r: 0, g: 0, b: 0, a: 1 };
  const s = input.trim();

  const rgbMatch = s.match(/^rgba?\(\s*(\d+)\s*[,\s]\s*(\d+)\s*[,\s]\s*(\d+)\s*(?:[,/]\s*([\d.]+)\s*)?\)$/i);
  if (rgbMatch) {
    const a = rgbMatch[4] !== undefined ? clamp01(parseFloat(rgbMatch[4])) : 1;
    return { r: clamp255(+rgbMatch[1]), g: clamp255(+rgbMatch[2]), b: clamp255(+rgbMatch[3]), a };
  }

  const hexShort = s.match(/^#([0-9a-f]{3,4})$/i);
  if (hexShort) {
    const h = hexShort[1];
    const r = parseInt(h[0] + h[0], 16);
    const g = parseInt(h[1] + h[1], 16);
    const b = parseInt(h[2] + h[2], 16);
    const a = h[3] !== undefined ? parseInt(h[3] + h[3], 16) / 255 : 1;
    return { r, g, b, a };
  }

  const hexLong = s.match(/^#([0-9a-f]{6}(?:[0-9a-f]{2})?)$/i);
  if (hexLong) {
    const h = hexLong[1];
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
    return { r, g, b, a };
  }

  return { r: 0, g: 0, b: 0, a: 1 };
}

function formatColor({ r, g, b, a }) {
  if (a >= 1) return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  return `rgba(${r}, ${g}, ${b}, ${round2(a)})`;
}

function toHex(n) { return clamp255(Math.round(n)).toString(16).padStart(2, '0'); }
function clamp255(n) { return Math.max(0, Math.min(255, n)); }
function clamp01(n) { return Math.max(0, Math.min(1, n)); }
function round2(n) { return Math.round(n * 100) / 100; }

function formatHexNoAlpha({ r, g, b }) {
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function formatHexAlpha({ r, g, b, a }) {
  return `#${toHex(r)}${toHex(g)}${toHex(b)}${toHex(Math.round(a * 255))}`;
}

const CHECKER_BG =
  'linear-gradient(45deg,#e5e7eb 25%,transparent 25%,transparent 75%,#e5e7eb 75%),linear-gradient(45deg,#e5e7eb 25%,transparent 25%,transparent 75%,#e5e7eb 50%)';
const CHECKER_SIZE = '8px 8px, 8px 8px';

// ─── Component ────────────────────────────────────────────────────────────────

export default function ColorPicker({
  value = '#000000',
  onChange,
  label,
  allowAlpha = true,
  disabled = false,
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);

  const parsed = useMemo(() => parseColor(value), [value]);
  const display = useMemo(() => formatColor(parsed), [parsed]);

  const commit = useCallback(
    (next) => {
      const out = formatColor(next);
      onChange?.(out);
    },
    [onChange]
  );

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') handleClose(); };
    const onDown = (e) => {
      if (popoverRef.current?.contains(e.target)) return;
      if (triggerRef.current?.contains(e.target)) return;
      handleClose();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open, handleClose]);

  const [pos, setPos] = useState(null);
  usePopoverPosition(open, () => {
    if (!triggerRef.current) return null;
    const r = triggerRef.current.getBoundingClientRect();
    const POPOVER_W = 220;
    const POPOVER_H = allowAlpha ? 320 : 280;
    const MARGIN = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = r.left;
    if (left + POPOVER_W + MARGIN > vw) left = Math.max(MARGIN, vw - POPOVER_W - MARGIN);
    if (left < MARGIN) left = MARGIN;

    let top = r.bottom + 4;
    if (top + POPOVER_H + MARGIN > vh) {
      const above = r.top - POPOVER_H - 4;
      top = above > MARGIN ? above : Math.max(MARGIN, vh - POPOVER_H - MARGIN);
    }
    return { top, left };
  }, setPos);

  const swatchStyle = {
    backgroundColor: display,
    backgroundImage: parsed.a < 1 ? CHECKER_BG : undefined,
    backgroundSize: parsed.a < 1 ? CHECKER_SIZE : undefined,
    backgroundBlendMode: parsed.a < 1 ? 'lighten' : undefined,
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-label={label ? `Pick ${label} color` : 'Pick color'}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="group relative h-9 w-9 rounded-base border border-border-strong bg-surface p-0 cursor-pointer overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="absolute inset-0.5 rounded-[calc(var(--radius-base-value)-2px)]" style={swatchStyle} />
        <span className="absolute inset-0 rounded-base ring-1 ring-inset ring-black/10 pointer-events-none" />
      </button>

      {open && pos && createPortal(
        <ColorPickerPopover
          ref={popoverRef}
          pos={pos}
          parsed={parsed}
          allowAlpha={allowAlpha}
          onCommit={commit}
          onClose={handleClose}
        />,
        document.body
      )}
    </div>
  );
}

// ─── Popover body ─────────────────────────────────────────────────────────────

const ColorPickerPopover = forwardRef(function ColorPickerPopover(
  { pos, parsed, allowAlpha, onCommit, onClose },
  ref
) {
  const [draft, setDraft] = useState(parsed);
  const [hexInput, setHexInput] = useState(allowAlpha ? formatHexAlpha(parsed) : formatHexNoAlpha(parsed));
  const [hexDirty, setHexDirty] = useState(false);

  useEffect(() => { setDraft(parsed); }, [parsed]);

  const push = (next) => {
    setDraft(next);
    onCommit(next);
  };

  const hexValue = allowAlpha ? formatHexAlpha(draft) : formatHexNoAlpha(draft);

  const onPickerChange = (hex) => {
    const p = parseColor(hex);
    push({ ...p, a: allowAlpha ? p.a : 1 });
  };

  const onHexChange = (e) => {
    const raw = e.target.value;
    setHexInput(raw);
    setHexDirty(true);
    const p = parseColor(raw);
    if (/^#([0-9a-f]{3}|[0-9a-f]{6}(?:[0-9a-f]{2})?)$/i.test(raw.trim())) {
      push({ ...p, a: allowAlpha ? p.a : 1 });
    }
  };

  const onHexBlur = () => {
    setHexDirty(false);
    setHexInput(allowAlpha ? formatHexAlpha(draft) : formatHexNoAlpha(draft));
  };

  useEffect(() => {
    if (!hexDirty) setHexInput(allowAlpha ? formatHexAlpha(draft) : formatHexNoAlpha(draft));
  }, [draft, hexDirty, allowAlpha]);

  const swatchStyle = (c) => {
    const p = parseColor(c);
    const base = formatColor(p);
    return {
      backgroundColor: base,
      backgroundImage: p.a < 1 ? CHECKER_BG : undefined,
      backgroundSize: p.a < 1 ? CHECKER_SIZE : undefined,
    };
  };

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Color picker"
      className="fixed z-[10000] w-[220px] rounded-card border border-border bg-surface-raised shadow-modal p-3 animate-[fadeInScale_0.12s_ease-out]"
      style={{ top: pos.top, left: pos.left }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* react-colorful picker */}
      <div className="mb-3 react-colorful-wrapper">
        {allowAlpha ? (
          <HexAlphaColorPicker color={hexValue} onChange={onPickerChange} />
        ) : (
          <HexColorPicker color={formatHexNoAlpha(draft)} onChange={onPickerChange} />
        )}
      </div>

      {/* Hex input */}
      <label className="block text-label font-medium text-muted mb-1.5">Hex</label>
      <input
        type="text"
        value={hexInput}
        onChange={onHexChange}
        onBlur={onHexBlur}
        spellCheck={false}
        className="w-full px-2 py-1.5 text-small font-mono border border-border-strong rounded-base bg-surface focus:outline-none focus:ring-2 focus:ring-primary mb-3"
        placeholder="#000000"
      />

      {/* Footer: current value + done */}
      <div className="flex items-center justify-between mt-1 pt-2 border-t border-border-soft">
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-5 w-5 rounded-sm border border-border-strong flex-shrink-0" style={swatchStyle(formatColor(draft))} />
          <span className="text-small font-mono text-muted truncate">{formatColor(draft)}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="px-2.5 py-1 text-small font-medium text-primary hover:bg-primary-light rounded-base focus:outline-none focus:ring-2 focus:ring-primary"
        >
          Done
        </button>
      </div>
    </div>
  );
}
);

// ─── Small helpers ────────────────────────────────────────────────────────────

function usePopoverPosition(open, compute, setter) {
  useEffect(() => {
    if (!open) return;
    const result = compute();
    if (result) setter(result);
    const onResize = () => {
      const r = compute();
      if (r) setter(r);
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
}
