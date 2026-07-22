/**
 * EditorToolbar.jsx — The dark top toolbar for the Web Editor edit mode.
 *
 * Extracted from WebEditor.jsx for modularity. Contains:
 * - Left: SAVE button + Exit + save status indicator
 * - Center: page title + publish status
 * - Right: breakpoint selector, undo/redo, publish, secondary actions
 *
 * All icon buttons have 44px touch targets and aria-labels.
 */

import { Plus, Type, X, Edit3, Copy, Sparkles, Rows3, History, Eye, AlertCircle, Layers } from 'lucide-react';
import BuilderBreakpointSelector from '../../../components/builder/BuilderBreakpointSelector';
import BuilderHistoryControls from '../../../components/builder/BuilderHistoryControls';
import BuilderSaveStatus from '../../../components/builder/BuilderSaveStatus';

export default function EditorToolbar({
  // Save
  saveStatus, lastSavedAt, onSave, saveRef,
  // Exit
  onExit,
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
      className="sticky top-0 z-40 flex items-center justify-between px-5 text-[13px]"
      style={{ height: 52, background: 'hsl(var(--editor-chrome))', color: 'hsl(var(--editor-chrome-text))' }}
    >
      {/* Left — SAVE + Exit */}
      <div className="flex items-center gap-3.5">
        <button
          onClick={() => saveRef.current()}
          disabled={saveStatus === 'saving' || saveStatus === 'clean' || saveStatus === 'saved'}
          className="px-3.5 py-1.5 rounded-md font-semibold text-[12px] tracking-[0.03em] text-[color:hsl(var(--editor-chrome))] bg-white hover:bg-white/90 disabled:opacity-60 disabled:cursor-not-allowed"
          title="Save draft (Ctrl/Cmd+S)"
        >
          {saveStatus === 'saving' ? 'SAVING…' : saveStatus === 'error' ? 'RETRY SAVE' : 'SAVE'}
        </button>
        <button
          onClick={onExit}
          className="text-[color:hsl(var(--editor-chrome-muted))] hover:text-white transition-colors text-[13px] px-3 py-2 rounded min-h-[44px] flex items-center focus:outline-none focus:ring-2 focus:ring-primary"
          title="Exit edit mode"
          aria-label="Exit edit mode"
        >
          Exit
        </button>
        <div className="min-w-[110px] flex justify-center">
          <BuilderSaveStatus
            status={saveStatus}
            lastSavedAt={lastSavedAt}
            onRetry={() => saveRef.current()}
          />
        </div>
      </div>

      {/* Center — page title + publish status */}
      <div className="absolute left-1/2 -translate-x-1/2 text-center pointer-events-none">
        <div className="font-semibold text-white text-[14px] leading-tight">
          {pageTitle || pageSlug}
        </div>
        <div className="text-[color:hsl(var(--editor-chrome-muted))] text-[11px] leading-tight">
          Page · {hasPublishedSnapshot && isPublished ? 'Published' : hasPublishedSnapshot ? 'Unpublished' : 'Draft'}
        </div>
      </div>

      {/* Right — unified breakpoint selector + actions */}
      <div className="flex items-center gap-4 text-[color:hsl(var(--editor-chrome-muted))]">
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
          className="flex items-center gap-1.5 text-[12px] font-medium transition-colors disabled:opacity-50"
          style={{ color: publishSaving ? 'hsl(var(--editor-chrome-muted))' : 'hsl(var(--editor-success))' }}
          title="Publish current draft to public site"
        >
          <div className={`w-1.5 h-1.5 rounded-full ${publishSaving ? 'bg-[color:hsl(var(--editor-chrome-muted))] animate-pulse' : 'bg-[color:hsl(var(--editor-success))]'}`} />
          {publishSaving ? 'Publishing…' : 'Publish'}
        </button>

        {/* Secondary icon actions — 44px touch targets via padding */}
        <button
          onClick={onSaveTemplate}
          disabled={templateSaving}
          className="text-[color:hsl(var(--editor-chrome-muted))] hover:text-white transition-colors disabled:opacity-50 p-2.5 rounded min-w-[44px] min-h-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary"
          title="Save this page as a reusable template"
          aria-label="Save as template"
        >
          <Copy className="w-4 h-4" />
        </button>
        <button
          onClick={onShowVersionHistory}
          className="text-[color:hsl(var(--editor-chrome-muted))] hover:text-white transition-colors p-2.5 rounded min-w-[44px] min-h-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary"
          title="Version history"
          aria-label="Version history"
        >
          <History className="w-4 h-4" />
        </button>
        <button
          onClick={onShowKeyboardHelp}
          className="text-[color:hsl(var(--editor-chrome-muted))] hover:text-white transition-colors p-2.5 rounded min-w-[44px] min-h-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary"
          title="Keyboard shortcuts"
          aria-label="Keyboard shortcuts"
        >
          <Type className="w-4 h-4" />
        </button>
        <button
          onClick={onToggleLayersPanel}
          className={`transition-colors p-2.5 rounded min-w-[44px] min-h-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary ${showLayersPanel ? 'text-white' : 'text-[color:hsl(var(--editor-chrome-muted))] hover:text-white'}`}
          title="Toggle layers panel"
          aria-label="Toggle layers panel"
          aria-pressed={showLayersPanel}
        >
          <Layers className="w-4 h-4" />
        </button>
        <button
          onClick={() => window.open(pageSlug === 'home' ? '/' : `/${pageSlug}`, '_blank')}
          className="text-[color:hsl(var(--editor-chrome-muted))] hover:text-white transition-colors p-2.5 rounded min-w-[44px] min-h-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary"
          title="Open published page in a new tab"
          aria-label="Open published page in a new tab"
        >
          <Eye className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
