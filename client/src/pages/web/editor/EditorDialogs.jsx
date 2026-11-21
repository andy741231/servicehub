/**
 * EditorDialogs.jsx — All modal dialogs for the Web Editor.
 *
 * Keyboard Shortcuts help modal. (Adding blocks/sections now uses
 * BlockPicker and SectionPicker.)
 *
 * All dialogs use AccessibleModal for focus trap, Escape handling,
 * focus restoration, and scroll locking.
 */

import { Type, X, Sparkles } from 'lucide-react';
import { AccessibleModal } from '../../../components/Dialog';

export default function EditorDialogs({ showKeyboardHelp, onCloseKeyboardHelp }) {
  return (
    <>
      {/* Keyboard shortcuts help modal */}
      {showKeyboardHelp && (
        <AccessibleModal onClose={onCloseKeyboardHelp} labelledById="keyboard-help-title" maxWidth="max-w-2xl" className="max-h-[85vh] flex flex-col">
          <div className="p-6 border-b border-border bg-surface-raised">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-info-light flex items-center justify-center">
                  <Type className="w-5 h-5 text-info" />
                </div>
                <div>
                  <h3 id="keyboard-help-title" className="text-xl font-semibold text-text-base">Keyboard Shortcuts</h3>
                  <p className="text-sm text-muted">Speed up your editing workflow</p>
                </div>
              </div>
              <button
                onClick={onCloseKeyboardHelp}
                className="p-2 hover:bg-surface-tertiary rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-muted" />
              </button>
            </div>
          </div>
          <div className="p-6 overflow-y-auto flex-1">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { action: 'Save now (also autosaves)', shortcut: 'Ctrl/Cmd + S' },
                  { action: 'Undo', shortcut: 'Ctrl/Cmd + Z' },
                  { action: 'Redo', shortcut: 'Ctrl/Cmd + Shift + Z' },
                  { action: 'Preview', shortcut: 'Ctrl/Cmd + P' },
                  { action: 'Add Section', shortcut: '+' },
                  { action: 'Select parent / close', shortcut: 'Esc' },
                  { action: 'Nudge block', shortcut: 'Arrow keys' },
                  { action: 'Delete block', shortcut: 'Delete' },
                  { action: 'Show layout grid', shortcut: 'G' },
                  { action: 'Show Help', shortcut: '?' },
                ].map(({ action, shortcut }) => (
                  <div key={action} className="flex justify-between items-center p-3 bg-surface-raised rounded-lg">
                    <span className="text-text-base font-medium">{action}</span>
                    <kbd className="px-3 py-1.5 bg-surface border border-border-strong rounded-lg text-sm font-mono shadow-sm">{shortcut}</kbd>
                  </div>
                ))}
              </div>

              <div className="p-5 bg-gradient-to-br from-primary-light to-info-light rounded-xl border border-primary-light">
                <h4 className="font-semibold text-primary mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Pro Tips
                </h4>
                <ul className="text-sm text-primary space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">-</span>
                    <span>Click a block to select it; click its text again to type</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">-</span>
                    <span>Drag blocks from Add block straight onto the page</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">-</span>
                    <span>Block and section settings are in the panel on the right</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">-</span>
                    <span>Switch to Mobile to check (or customize) the phone layout</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">-</span>
                    <span>Changes save automatically — Publish makes them live</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </AccessibleModal>
      )}
    </>
  );
}
