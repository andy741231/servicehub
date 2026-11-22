/**
 * EditorToolbar.jsx — The dark top toolbar for the Web Editor edit mode.
 *
 * Extracted from WebEditor.jsx for modularity. Contains:
 * - Left: Exit + Preview + autosave status
 * - Center: page title + publish status
 * - Right: breakpoint selector, undo/redo, publish, secondary actions
 *
 * All icon buttons have 44px touch targets and aria-labels.
 */

import { Keyboard, Copy, History, Eye, Layers, ExternalLink } from 'lucide-react';
import BuilderBreakpointSelector from '../../../components/builder/BuilderBreakpointSelector';
import BuilderHistoryControls from '../../../components/builder/BuilderHistoryControls';
import BuilderSaveStatus from '../../../components/builder/BuilderSaveStatus';

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

      {/* Right — unified breakpoint selector + actions */}
      <div className="flex items-center gap-1.5 xl:gap-4 shrink-0 text-[color:hsl(var(--editor-chrome-muted))]">
        <BuilderBreakpointSelector
          value={viewport === 'mobile' ? 'mobile' : previewDevice}
          onChange={onBreakpointChange}
        />

        <BuilderHistoryControls onUndo={onUndo} onRedo={onRedo} canUndo={canUndo} canRedo={canRedo} />

        <div className="w-px h-5 bg-white/10" />

        {/* Publish */}
        <button
          onClick={onPublish}
          disabled={publishSaving}
          className="flex items-center gap-1.5 text-[12px] font-medium transition-colors disabled:opacity-50 whitespace-nowrap"
          style={{ color: publishSaving ? 'hsl(var(--editor-chrome-muted))' : 'hsl(var(--editor-success))' }}
          title="Publish current draft to public site"
        >
          <div className={`w-1.5 h-1.5 rounded-full ${publishSaving ? 'bg-[color:hsl(var(--editor-chrome-muted))] animate-pulse' : 'bg-[color:hsl(var(--editor-success))]'}`} />
          {publishSaving ? 'Publishing…' : 'Publish'}
        </button>

        {/* Secondary icon actions */}
        <button
          onClick={onSaveTemplate}
          disabled={templateSaving}
          className="text-[color:hsl(var(--editor-chrome-muted))] hover:text-white transition-colors disabled:opacity-50 p-2 xl:p-2.5 rounded min-w-[36px] xl:min-w-[44px] min-h-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary"
          title="Save this page as a reusable template"
          aria-label="Save as template"
        >
          <Copy className="w-4 h-4" />
        </button>
        <button
          onClick={onShowVersionHistory}
          className="text-[color:hsl(var(--editor-chrome-muted))] hover:text-white transition-colors p-2 xl:p-2.5 rounded min-w-[36px] xl:min-w-[44px] min-h-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary"
          title="Version history"
          aria-label="Version history"
        >
          <History className="w-4 h-4" />
        </button>
        <button
          onClick={onShowKeyboardHelp}
          className="text-[color:hsl(var(--editor-chrome-muted))] hover:text-white transition-colors p-2 xl:p-2.5 rounded min-w-[36px] xl:min-w-[44px] min-h-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary"
          title="Keyboard shortcuts"
          aria-label="Keyboard shortcuts"
        >
          <Keyboard className="w-4 h-4" />
        </button>
        <button
          onClick={onToggleLayersPanel}
          className={`transition-colors p-2 xl:p-2.5 rounded min-w-[36px] xl:min-w-[44px] min-h-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary ${showLayersPanel ? 'text-white' : 'text-[color:hsl(var(--editor-chrome-muted))] hover:text-white'}`}
          title="Toggle layers panel"
          aria-label="Toggle layers panel"
          aria-pressed={showLayersPanel}
        >
          <Layers className="w-4 h-4" />
        </button>
        {/* Only once there is a live page to open (on a draft it was a 404).
            Preview shows the draft; this shows what visitors see now. */}
        {hasPublishedSnapshot && isPublished && (
          <button
            onClick={() => window.open(pageSlug === 'home' ? '/' : `/${pageSlug}`, '_blank')}
            className="text-[color:hsl(var(--editor-chrome-muted))] hover:text-white transition-colors p-2 xl:p-2.5 rounded min-w-[36px] xl:min-w-[44px] min-h-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary"
            title="View live page (new tab)"
            aria-label="View live page"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
