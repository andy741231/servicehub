/**
 * EditorToolbar.jsx — The dark top toolbar for the Web Editor edit mode.
 *
 * Extracted from WebEditor.jsx for modularity. Contains:
 * - Left: Exit + Preview + autosave status
 * - Center: page title + publish status
 * - Right: breakpoint selector, undo/redo, publish, secondary actions
 *
 * All icon buttons have 44px touch targets and aria-labels. Rarely used
 * actions live in the ⚙ "More actions" menu.
 */

import { useEffect, useRef, useState } from 'react';
import { Keyboard, Copy, History, Eye, Layers, ExternalLink, Settings } from 'lucide-react';
import BuilderBreakpointSelector from '../../../components/builder/BuilderBreakpointSelector';
import BuilderHistoryControls from '../../../components/builder/BuilderHistoryControls';
import BuilderSaveStatus from '../../../components/builder/BuilderSaveStatus';

const chromeIcon = 'inline-flex items-center justify-center w-11 h-11 rounded-md text-[color:hsl(var(--editor-chrome-muted))] hover:text-white hover:bg-[color:hsl(var(--editor-chrome-raised))] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary';

/**
 * ⚙ overflow for the less frequent actions (version history, save as
 * template, keyboard shortcuts, view live page). Menu button pattern:
 * arrows move, Esc / outside click closes and returns focus.
 */
function MoreMenu({ items }) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  const btnRef = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    boxRef.current?.querySelector('[role="menuitem"]:not([disabled])')?.focus();
    const onDown = (e) => { if (!boxRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);
  const onKeyDown = (e) => {
    const list = [...(boxRef.current?.querySelectorAll('[role="menuitem"]:not([disabled])') || [])];
    const i = list.indexOf(document.activeElement);
    if (e.key === 'Escape' && open) { e.stopPropagation(); setOpen(false); btnRef.current?.focus(); }
    else if (e.key === 'ArrowDown' && open) { e.preventDefault(); list[(i + 1) % list.length]?.focus(); }
    else if (e.key === 'ArrowUp' && open) { e.preventDefault(); list[(i - 1 + list.length) % list.length]?.focus(); }
  };
  return (
    <div className="relative" ref={boxRef} onKeyDown={onKeyDown}>
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        className={`${chromeIcon} ${open ? 'text-white bg-[color:hsl(var(--editor-chrome-active))]' : ''}`}
        title="More: version history, templates, shortcuts"
        aria-label="More actions"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Settings className="w-[18px] h-[18px]" />
      </button>
      {open && (
        <div role="menu" aria-label="More actions" className="absolute right-0 top-full mt-2 z-50 min-w-[220px] rounded-lg bg-surface text-text-base border border-border shadow-[0_8px_24px_rgba(16,20,30,0.22)] p-1">
          {items.map(({ label, Icon, onSelect, disabled }) => (
            <button
              key={label}
              type="button"
              role="menuitem"
              disabled={disabled}
              onClick={() => { setOpen(false); onSelect?.(); }}
              className="w-full flex items-center gap-2.5 px-3 min-h-[40px] rounded-md text-[13px] text-left hover:bg-surface-raised focus:bg-surface-raised focus:outline-none disabled:opacity-50"
            >
              <Icon className="w-4 h-4 text-muted" aria-hidden="true" /> {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function EditorToolbar({
  // Save
  saveStatus, lastSavedAt, onSave, saveRef,
  // Exit / preview
  onExit, onPreview,
  // Page info
  pageTitle, pageSlug, hasPublishedSnapshot, isPublished,
  // Breakpoint
  viewport, previewDevice, onBreakpointChange,
  // History
  onUndo, onRedo, canUndo, canRedo,
  // Publish
  onPublish, publishSaving,
  // Template
  onSaveTemplate, templateSaving,
  // Panels
  onShowVersionHistory, onShowKeyboardHelp,
  onToggleLayersPanel, showLayersPanel,
  // Toast (for template save feedback)
  toast,
}) {
  return (
    <div
      className="sticky top-0 z-40 flex items-center justify-between gap-2 xl:gap-4 px-3 xl:px-5 text-[13px]"
      style={{ height: 52, background: 'hsl(var(--editor-chrome))', color: 'hsl(var(--editor-chrome-text))' }}
    >
      {/* Left — Exit + Preview + autosave status + page title (title truncates; it used to be
          absolutely centered and ran underneath the breakpoint switcher). */}
      <div className="flex items-center gap-1.5 xl:gap-3.5 min-w-0 flex-1 overflow-hidden">
        <button
          onClick={onExit}
          className="text-[color:hsl(var(--editor-chrome-muted))] hover:text-white transition-colors text-[13px] px-2 xl:px-3 py-2 rounded min-h-[44px] flex items-center shrink-0 focus:outline-none focus:ring-2 focus:ring-primary"
          title="Save and return to Pages"
          aria-label="Exit editor"
        >
          Exit
        </button>
        <button
          onClick={onPreview}
          className="text-[color:hsl(var(--editor-chrome-muted))] hover:text-white transition-colors text-[13px] px-2 xl:px-3 py-2 rounded min-h-[44px] flex items-center gap-1.5 shrink-0 focus:outline-none focus:ring-2 focus:ring-primary"
          title="Preview this page without editor controls"
          aria-label="Preview"
        >
          <Eye className="w-4 h-4" /> Preview
        </button>
        <div className="flex justify-center shrink-0 whitespace-nowrap">
          <BuilderSaveStatus
            status={saveStatus}
            lastSavedAt={lastSavedAt}
            onRetry={() => saveRef.current()}
          />
        </div>
        <div className="w-px h-5 bg-white/10 shrink-0 hidden lg:block" />
        <div className="min-w-0 hidden lg:block">
          <div className="font-semibold text-white text-[14px] leading-tight truncate" title={pageTitle || pageSlug}>
            {pageTitle || pageSlug}
          </div>
          <div className="text-[color:hsl(var(--editor-chrome-muted))] text-[11px] leading-tight truncate">
            Page · {hasPublishedSnapshot && isPublished ? 'Published' : hasPublishedSnapshot ? 'Unpublished' : 'Draft'}
          </div>
        </div>
      </div>

      {/* Right — device switcher, history, Layers, ⚙ overflow, Publish (reskin) */}
      <div className="flex items-center gap-1.5 xl:gap-2.5 shrink-0 text-[color:hsl(var(--editor-chrome-muted))]">
        <BuilderBreakpointSelector
          value={viewport === 'mobile' ? 'mobile' : previewDevice}
          onChange={onBreakpointChange}
        />

        <div className="w-px h-6 bg-white/10 mx-0.5 xl:mx-1" />
        <BuilderHistoryControls size="chrome" onUndo={onUndo} onRedo={onRedo} canUndo={canUndo} canRedo={canRedo} />

        <button
          onClick={onToggleLayersPanel}
          className={`${chromeIcon} ${showLayersPanel ? 'text-white bg-[color:hsl(var(--editor-chrome-active))]' : ''}`}
          title="Toggle layers panel"
          aria-label="Toggle layers panel"
          aria-pressed={showLayersPanel}
        >
          <Layers className="w-[18px] h-[18px]" />
        </button>

        <MoreMenu
          items={[
            { label: 'Version history', Icon: History, onSelect: onShowVersionHistory },
            { label: templateSaving ? 'Saving template…' : 'Save as template', Icon: Copy, onSelect: onSaveTemplate, disabled: templateSaving },
            { label: 'Keyboard shortcuts', Icon: Keyboard, onSelect: onShowKeyboardHelp },
            // Only once there is a live page to open (on a draft it was a 404).
            ...(hasPublishedSnapshot && isPublished ? [{ label: 'View live page', Icon: ExternalLink, onSelect: () => window.open(pageSlug === 'home' ? '/' : `/${pageSlug}`, '_blank') }] : []),
          ]}
        />

        {/* Publish — solid primary (the text + dot treatment was too quiet) */}
        <button
          onClick={onPublish}
          disabled={publishSaving}
          className="ml-1 inline-flex items-center justify-center h-10 min-w-[88px] px-4 rounded-[8px] bg-primary text-primary-foreground text-[13px] font-semibold shadow-sm hover:bg-primary-hover transition-colors disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[color:hsl(var(--editor-chrome))] whitespace-nowrap"
          title="Publish current draft to public site"
        >
          {publishSaving ? 'Publishing…' : 'Publish'}
        </button>
      </div>
    </div>
  );
}
