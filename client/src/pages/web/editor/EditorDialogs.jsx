/**
 * EditorDialogs.jsx — All modal dialogs for the Web Editor.
 *
 * Extracted from WebEditor.jsx. Contains:
 * - Add Section modal
 * - Add Block palette modal
 * - Keyboard Shortcuts help modal
 *
 * All dialogs use AccessibleModal for focus trap, Escape handling,
 * focus restoration, and scroll locking.
 */

import { Plus, Type, X, Sparkles } from 'lucide-react';
import { AccessibleModal } from '../../../components/Dialog';
import { AddSectionModal } from './editorComponents';
import { BLOCK_TYPES } from './editorUtils';

export default function EditorDialogs({
  // Add Section
  addSectionAfterIndex, onAddSection, onCloseAddSection,
  // Add Block
  blockPaletteTarget, onAddBlock, onCloseBlockPalette,
  // Keyboard Help
  showKeyboardHelp, onCloseKeyboardHelp,
}) {
  return (
    <>
      {/* Add Section modal */}
      {addSectionAfterIndex !== null && (
        <AddSectionModal
          onClose={onCloseAddSection}
          onAdd={(sectionConfig) => onAddSection(sectionConfig, addSectionAfterIndex)}
        />
      )}

      {/* Block palette modal — for adding blocks inside a section */}
      {blockPaletteTarget !== null && (
        <AccessibleModal onClose={onCloseBlockPalette} labelledById="block-palette-title" maxWidth="max-w-5xl" className="max-h-[85vh] flex flex-col">
          <div className="p-6 border-b border-border bg-surface-raised">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center">
                  <Plus className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 id="block-palette-title" className="text-xl font-semibold text-text-base">Add Block</h3>
                  <p className="text-sm text-muted">Choose a block type to add to this section</p>
                </div>
              </div>
              <button
                onClick={onCloseBlockPalette}
                className="p-2 hover:bg-surface-tertiary rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-muted" />
              </button>
            </div>
          </div>
          <div className="p-6 overflow-y-auto flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {BLOCK_TYPES.map(({ id, name, Icon, description }) => (
                <button
                  key={id}
                  onClick={() => onAddBlock(blockPaletteTarget.sectionIndex, id)}
                  className="p-5 border-2 border-border rounded-xl hover:border-primary-light hover:bg-primary-light hover:shadow-lg transition-all duration-200 text-left group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-surface-raised group-hover:bg-primary-light flex items-center justify-center flex-shrink-0 transition-colors">
                      <Icon className="w-6 h-6 text-muted group-hover:text-primary transition-colors" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-text-base mb-1 group-hover:text-primary transition-colors">{name}</div>
                      <div className="text-sm text-muted leading-relaxed">{description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </AccessibleModal>
      )}

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
                  { action: 'Save', shortcut: 'Ctrl/Cmd + S' },
                  { action: 'Undo', shortcut: 'Ctrl/Cmd + Z' },
                  { action: 'Redo', shortcut: 'Ctrl/Cmd + Shift + Z' },
                  { action: 'Preview', shortcut: 'Ctrl/Cmd + P' },
                  { action: 'Add Section', shortcut: '+' },
                  { action: 'Close Dialog', shortcut: 'Esc' },
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
                    <span>Click any text to edit it inline</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">-</span>
                    <span>Hover over blocks to reveal action toolbar</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">-</span>
                    <span>Drag blocks to reorder them on the page</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">-</span>
                    <span>Use the style panel (palette icon) for advanced styling</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">-</span>
                    <span>Switch device previews to see responsive layouts</span>
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
