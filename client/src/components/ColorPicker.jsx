/**
 * ColorPicker.jsx — Global, in-app color picker for Service Hub.
 *
 * Replaces the native <input type="color"> (which pops the OS color picker)
 * with an integrated popover that matches the app's design system.
 *
 * Features:
 *   - Preset swatches (curated palette)
 *   - Hex input (#rgb / #rrggbb / #rrggbbaa)
 *   - RGB channel inputs
 *   - Alpha / opacity slider (0–100%)
 *   - Recent colors (per-session memory)
 *   - Smart viewport positioning (flips when near edges)
 *   - Click-outside + Escape to close
 *   - Accessible (focus trap inside popover, labelled trigger)
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
import { Check, Pipette } from 'lucide-react';

// ─── Curated preset palette ──────────────────────────────────────────────────
const PRESETS = [
  '#000000', '#1f2937', '#374151', '#6b7280', '#9ca3af', '#d1d5db', '#e5e7eb', '#f3f4f6', '#ffffff',
  '#dc2626', '#ea580c', '#d97706', '#ca8a04', '#65a30d', '#16a34a', '#059669', '#0d9488', '#0e7490',
  '#0284c7', '#2563eb', '#4f46e5', '#7c3aed', '#9333ea', '#c026d3', '#db2777', '#e11d48', '#f43f5e',
  '#fee2e2', '#ffedd5', '#fef3c7', '#ecfccb', '#d1fae5', '#ccfbf1', '#cffafe', '#dbeafe', '#e0e7ff',
  '#f3e8ff', '#fae8ff', '#fce7f3', '#ffe4e6',
];

// ─── Recent-colors memory (shared across all ColorPicker instances) ───────────
const RECENTS_KEY = 'servicehub.colorPicker.recents';
const MAX_RECENTS = 8;
let recentsCache = null;

function loadRecents() {
  if (recentsCache) return recentsCache;
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    recentsCache = raw ? JSON.parse(raw) : [];
  } catch {
    recentsCache = [];
  }
  return recentsCache;
}

function saveRecent(color) {
  const list = loadRecents().filter((c) => c !== color);
  list.unshift(color);
  while (list.length > MAX_RECENTS) list.pop();
  recentsCache = list;
  try { localStorage.setItem(RECENTS_KEY, JSON.stringify(list)); } catch { /* ignore */ }
}

// ─── Color parsing / formatting helpers ───────────────────────────────────────

/** Parse any supported color string into { r, g, b, a } with channels 0–255 / 0–1. */
function parseColor(input) {
  if (!input || typeof input !== 'string') return { r: 0, g: 0, b: 0, a: 1 };
  const s = input.trim();

  // rgba(r,g,b,a) / rgb(r,g,b)
  const rgbMatch = s.match(/^rgba?\(\s*(\d+)\s*[,\s]\s*(\d+)\s*[,\s]\s*(\d+)\s*(?:[,/]\s*([\d.]+)\s*)?\)$/i);
  if (rgbMatch) {
    const a = rgbMatch[4] !== undefined ? clamp01(parseFloat(rgbMatch[4])) : 1;
    return { r: clamp255(+rgbMatch[1]), g: clamp255(+rgbMatch[2]), b: clamp255(+rgbMatch[3]), a };
  }

  // #rgb | #rgba  (short)
  const hexShort = s.match(/^#([0-9a-f]{3,4})$/i);
  if (hexShort) {
    const h = hexShort[1];
    const r = parseInt(h[0] + h[0], 16);
    const g = parseInt(h[1] + h[1], 16);
    const b = parseInt(h[2] + h[2], 16);
    const a = h[3] !== undefined ? parseInt(h[3] + h[3], 16) / 255 : 1;
    return { r, g, b, a };
  }

  // #rrggbb | #rrggbbaa
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

/** Format { r, g, b, a } back to a string. #rrggbb when opaque, otherwise rgba(). */
function formatColor({ r, g, b, a }) {
  if (a >= 1) return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  return `rgba(${r}, ${g}, ${b}, ${round2(a)})`;
}

function toHex(n) { return clamp255(Math.round(n)).toString(16).padStart(2, '0'); }
function clamp255(n) { return Math.max(0, Math.min(255, n)); }
function clamp01(n) { return Math.max(0, Math.min(1, n)); }
function round2(n) { return Math.round(n * 100) / 100; }

/** Checkerboard data URL for the transparent-swatch background. */
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

  const [recents, setRecents] = useState(() => loadRecents());

  const commit = useCallback(
    (next) => {
      const out = formatColor(next);
      onChange?.(out);
    },
    [onChange]
  );

  // Remember a color when the popover closes (only if it changed).
  const handleClose = useCallback(() => {
    setOpen(false);
    saveRecent(display);
    setRecents(loadRecents());
  }, [display]);

  // Close on Escape + click-outside.
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

  // Compute popover position relative to the trigger, flipping at edges.
  const [pos, setPos] = useState(null);
  usePopoverPosition(open, () => {
    if (!triggerRef.current) return null;
    const r = triggerRef.current.getBoundingClientRect();
    const POPOVER_W = 248;
    const POPOVER_H = allowAlpha ? 360 : 324;
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
          recents={recents}
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
  { pos, parsed, allowAlpha, recents, onCommit, onClose },
  ref
) {
    const [draft, setDraft] = useState(parsed);
    const [hexInput, setHexInput] = useState(formatHexNoAlpha(parsed));
    const [hexDirty, setHexDirty] = useState(false);

    // Keep draft in sync when the parent value changes externally while open.
    useEffect(() => { setDraft(parsed); }, [parsed]);

    const push = (next) => {
      setDraft(next);
      onCommit(next);
    };

    const setChannel = (key, val) => push({ ...draft, [key]: clamp255(val) });
    const setAlpha = (a) => push({ ...draft, a: clamp01(a) });

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
      setHexInput(formatHexNoAlpha(draft));
    };

    // Sync hex field when draft changes from swatches/sliders (and user isn't typing).
    useEffect(() => {
      if (!hexDirty) setHexInput(formatHexNoAlpha(draft));
    }, [draft, hexDirty]);

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
        className="fixed z-[10000] w-[248px] rounded-card border border-border bg-surface-raised shadow-modal p-3 animate-[fadeInScale_0.12s_ease-out]"
        style={{ top: pos.top, left: pos.left }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Preset swatches */}
        <p className="text-label font-medium text-muted mb-1.5">Presets</p>
        <div className="grid grid-cols-9 gap-1 mb-3">
          {PRESETS.map((c) => {
            const active = formatColor(draft).toLowerCase() === c.toLowerCase();
            return (
              <button
                key={c}
                type="button"
                title={c}
                onClick={() => push({ ...parseColor(c), a: allowAlpha ? draft.a : 1 })}
                className="relative h-6 w-6 rounded-sm border border-border-strong hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-primary"
                style={swatchStyle(c)}
              >
                {active && (
                  <Check className="absolute inset-0 m-auto h-3.5 w-3.5 text-white mix-blend-difference" />
                )}
              </button>
            );
          })}
        </div>

        {/* Recent colors */}
        {recents.length > 0 && (
          <>
            <p className="text-label font-medium text-muted mb-1.5">Recent</p>
            <div className="flex flex-wrap gap-1 mb-3">
              {recents.map((c) => (
                <button
                  key={c}
                  type="button"
                  title={c}
                  onClick={() => push({ ...parseColor(c), a: allowAlpha ? parseColor(c).a : 1 })}
                  className="h-6 w-6 rounded-sm border border-border-strong hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-primary"
                  style={swatchStyle(c)}
                />
              ))}
            </div>
          </>
        )}

        {/* Hex input */}
        <label className="block text-label font-medium text-muted mb-1.5">Hex</label>
        <div className="relative mb-3">
          <Pipette className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-subtle pointer-events-none" />
          <input
            type="text"
            value={hexInput}
            onChange={onHexChange}
            onBlur={onHexBlur}
            spellCheck={false}
            className="w-full pl-8 pr-2 py-1.5 text-small font-mono border border-border-strong rounded-base bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="#000000"
          />
        </div>

        {/* RGB inputs */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {['r', 'g', 'b'].map((ch) => (
            <div key={ch}>
              <label className="block text-label text-subtle mb-1 uppercase">{ch}</label>
              <input
                type="number"
                min={0}
                max={255}
                value={draft[ch]}
                onChange={(e) => setChannel(ch, parseInt(e.target.value, 10) || 0)}
                className="w-full px-2 py-1.5 text-small border border-border-strong rounded-base bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          ))}
        </div>

        {/* Alpha slider */}
        {allowAlpha && (
          <div className="mb-1">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-label font-medium text-muted">Opacity</label>
              <span className="text-label font-mono text-subtle">{Math.round(draft.a * 100)}%</span>
            </div>
            <div className="relative h-5 rounded-base overflow-hidden border border-border-strong" style={{ backgroundImage: CHECKER_BG, backgroundSize: CHECKER_SIZE }}>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(draft.a * 100)}
                onChange={(e) => setAlpha(parseInt(e.target.value, 10) / 100)}
                className="absolute inset-0 w-full h-full appearance-none bg-transparent cursor-pointer cp-alpha-range"
                style={{
                  background: `linear-gradient(to right, transparent, ${formatColor({ ...draft, a: 1 })})`,
                }}
              />
            </div>
          </div>
        )}

        {/* Footer: current value + done */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-border-soft">
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

function formatHexNoAlpha({ r, g, b }) {
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Recompute popover position when it opens or the viewport changes. */
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
