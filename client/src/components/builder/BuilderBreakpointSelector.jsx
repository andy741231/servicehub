/**
 * BuilderBreakpointSelector.jsx — Unified breakpoint selector for the Web Editor.
 *
 * Replaces the separate "viewport" (Desktop/Mobile edit coordinates) and
 * "previewDevice" (Desktop/Tablet/Mobile frame width) controls with a single
 * segmented control.
 *
 * Behavior:
 * - Desktop  → edits desktop coordinates (24-col), full-width frame
 * - Tablet   → PREVIEW ONLY, edits desktop coordinates, tablet-width frame
 * - Mobile   → edits mobile coordinates (6-col), mobile-width frame
 *
 * Accessibility:
 * - role="radiogroup" with aria-label
 * - Each option is role="radio" with aria-checked
 * - Keyboard: Tab to move between options, arrows to change selection
 * - Active breakpoint shows editable/preview-only label
 */

import { Monitor, Smartphone, Tablet } from 'lucide-react';

const BREAKPOINTS = [
  { id: 'desktop', label: 'Desktop', Icon: Monitor, editable: true,  widthLabel: 'Full width' },
  { id: 'tablet',  label: 'Tablet',  Icon: Tablet,  editable: false, widthLabel: '768 px' },
  { id: 'mobile',  label: 'Mobile',  Icon: Smartphone, editable: true,  widthLabel: '375 px' },
];

export default function BuilderBreakpointSelector({ value, onChange }) {
  const active = BREAKPOINTS.find((b) => b.id === value) || BREAKPOINTS[0];

  const handleKeyDown = (e, idx) => {
    let nextIdx = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextIdx = (idx + 1) % BREAKPOINTS.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') nextIdx = (idx - 1 + BREAKPOINTS.length) % BREAKPOINTS.length;
    if (nextIdx !== null) {
      e.preventDefault();
      onChange(BREAKPOINTS[nextIdx].id);
      // Move focus to the newly-selected option
      const groupId = 'breakpoint-radiogroup';
      const btn = document.querySelector(`[role=radiogroup][data-group-id="${groupId}"] [data-idx="${nextIdx}"]`);
      btn?.focus();
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <div
        className="flex items-center gap-0.5 rounded-md bg-white/5 p-0.5"
        role="radiogroup"
        aria-label="Breakpoint"
        data-group-id="breakpoint-radiogroup"
      >
        {BREAKPOINTS.map((bp, idx) => {
          const isActive = value === bp.id;
          return (
            <button
              key={bp.id}
              type="button"
              role="radio"
              aria-checked={isActive}
              data-idx={idx}
              onClick={() => onChange(bp.id)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 ${
                isActive ? 'bg-white/15 text-white' : 'text-[#8a90a0] hover:text-white'
              }`}
              title={`${bp.label} — ${bp.editable ? 'editable' : 'preview only'} (${bp.widthLabel})`}
            >
              <bp.Icon className="w-3.5 h-3.5" />
              {bp.label}
            </button>
          );
        })}
      </div>
      {/* Editable / preview-only indicator + canvas width */}
      <div className="text-[10px] text-[#8a90a0] text-center min-h-[14px]" aria-live="polite">
        {active.editable ? 'Editable' : 'Preview only'} · {active.widthLabel}
      </div>
    </div>
  );
}
