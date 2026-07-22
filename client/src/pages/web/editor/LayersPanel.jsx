/**
 * LayersPanel.jsx — Accessible layers panel for the Web Editor
 *
 * Provides a keyboard-accessible alternative to direct canvas manipulation.
 * Lists all sections and their blocks in a tree structure. Supports:
 * - Selection (click or keyboard)
 * - Reorder (move up/down buttons)
 * - Duplicate
 * - Delete (with undo via parent toast)
 * - Visibility toggle (hide on canvas while editing)
 *
 * Accessibility:
 * - Tree structure with role="tree", role="treeitem", aria-level, aria-expanded
 * - Keyboard navigation: Tab to move between items, Enter/Space to select
 * - All actions have aria-labels
 */

import { useState } from 'react';
import {
  ChevronDown, ChevronRight, Copy, Trash2, Eye, EyeOff,
  ArrowUp, ArrowDown, Layers,
} from 'lucide-react';

export default function LayersPanel({
  sections = [],
  selectedBlockIds = new Set(),
  onSelectSection,
  onSelectBlock,
  onMoveSection,
  onDuplicateSection,
  onDeleteSection,
  onMoveBlock,
  onDuplicateBlock,
  onDeleteBlock,
  onClose,
}) {
  const [expandedSections, setExpandedSections] = useState(() => {
    // Expand all sections by default
    const set = new Set();
    sections.forEach((_, i) => set.add(i));
    return set;
  });
  const [hiddenBlocks, setHiddenBlocks] = useState(new Set());

  const toggleSection = (sIdx) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sIdx)) next.delete(sIdx);
      else next.add(sIdx);
      return next;
    });
  };

  const toggleBlockVisibility = (blockId) => {
    setHiddenBlocks((prev) => {
      const next = new Set(prev);
      if (next.has(blockId)) next.delete(blockId);
      else next.add(blockId);
      return next;
    });
  };

  const getBlockLabel = (block, sIdx, bIdx) => {
    const type = block?.type ? block.type.charAt(0).toUpperCase() + block.type.slice(1) : 'Block';
    return `${type} block ${bIdx + 1}`;
  };

  return (
    <aside
      className="w-72 bg-surface border-r border-border flex flex-col h-full"
      aria-label="Layers panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-raised">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-muted" />
          <h2 className="text-sm font-semibold text-text-base">Layers</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-surface-raised rounded transition-colors"
          aria-label="Close layers panel"
        >
          <ChevronRight className="w-4 h-4 text-muted" />
        </button>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto p-2" role="tree" aria-label="Page structure">
        {sections.length === 0 && (
          <p className="text-sm text-muted p-4 text-center">No sections yet. Add a section to get started.</p>
        )}
        {sections.map((section, sIdx) => {
          const isExpanded = expandedSections.has(sIdx);
          const sectionBlocks = section.blocks || [];
          return (
            <div key={section.id || sIdx} className="mb-1" role="treeitem" aria-level={1} aria-expanded={isExpanded}>
              {/* Section row */}
              <div
                className="flex items-center gap-1 px-2 py-1.5 rounded hover:bg-surface-raised group cursor-pointer min-h-[36px]"
                onClick={() => onSelectSection?.(sIdx)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectSection?.(sIdx); } }}
                tabIndex={0}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); toggleSection(sIdx); }}
                  className="p-1 hover:bg-surface rounded transition-colors flex-shrink-0"
                  aria-label={isExpanded ? 'Collapse section' : 'Expand section'}
                >
                  {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-muted" /> : <ChevronRight className="w-3.5 h-3.5 text-muted" />}
                </button>
                <span className="flex-1 text-sm text-text-base truncate">
                  Section {sIdx + 1}{sectionBlocks.length > 0 ? ` · ${sectionBlocks.length} block${sectionBlocks.length !== 1 ? 's' : ''}` : ''}
                </span>
                {/* Section actions */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); onMoveSection?.(sIdx, -1); }}
                    disabled={sIdx === 0}
                    className="p-1 hover:bg-surface rounded transition-colors disabled:opacity-30"
                    aria-label="Move section up"
                    title="Move up"
                  >
                    <ArrowUp className="w-3.5 h-3.5 text-muted" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onMoveSection?.(sIdx, 1); }}
                    disabled={sIdx === sections.length - 1}
                    className="p-1 hover:bg-surface rounded transition-colors disabled:opacity-30"
                    aria-label="Move section down"
                    title="Move down"
                  >
                    <ArrowDown className="w-3.5 h-3.5 text-muted" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDuplicateSection?.(sIdx); }}
                    className="p-1 hover:bg-surface rounded transition-colors"
                    aria-label="Duplicate section"
                    title="Duplicate"
                  >
                    <Copy className="w-3.5 h-3.5 text-muted" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteSection?.(sIdx); }}
                    className="p-1 hover:bg-surface rounded transition-colors"
                    aria-label="Delete section"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-danger" />
                  </button>
                </div>
              </div>

              {/* Block rows */}
              {isExpanded && sectionBlocks.map((block, bIdx) => {
                const isSelected = selectedBlockIds.has(block.id);
                const isHidden = hiddenBlocks.has(block.id);
                return (
                  <div
                    key={block.id || bIdx}
                    className="flex items-center gap-1 px-2 py-1.5 ml-4 rounded hover:bg-surface-raised group cursor-pointer min-h-[36px] ${isSelected ? 'bg-primary-light' : ''}"
                    style={{ marginLeft: 16 }}
                    onClick={() => onSelectBlock?.(sIdx, bIdx)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectBlock?.(sIdx, bIdx); } }}
                    tabIndex={0}
                    role="treeitem"
                    aria-level={2}
                    aria-selected={isSelected}
                  >
                    <span className="w-4 flex-shrink-0" />
                    <span className={`flex-1 text-sm truncate ${isHidden ? 'text-muted line-through' : 'text-text-base'}`}>
                      {getBlockLabel(block, sIdx, bIdx)}
                    </span>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleBlockVisibility(block.id); }}
                        className="p-1 hover:bg-surface rounded transition-colors"
                        aria-label={isHidden ? 'Show block on canvas' : 'Hide block on canvas'}
                        title={isHidden ? 'Show on canvas' : 'Hide on canvas'}
                      >
                        {isHidden ? <EyeOff className="w-3.5 h-3.5 text-muted" /> : <Eye className="w-3.5 h-3.5 text-muted" />}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onMoveBlock?.(sIdx, bIdx, -1); }}
                        disabled={bIdx === 0}
                        className="p-1 hover:bg-surface rounded transition-colors disabled:opacity-30"
                        aria-label="Move block up"
                        title="Move up"
                      >
                        <ArrowUp className="w-3.5 h-3.5 text-muted" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onMoveBlock?.(sIdx, bIdx, 1); }}
                        disabled={bIdx === sectionBlocks.length - 1}
                        className="p-1 hover:bg-surface rounded transition-colors disabled:opacity-30"
                        aria-label="Move block down"
                        title="Move down"
                      >
                        <ArrowDown className="w-3.5 h-3.5 text-muted" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDuplicateBlock?.(sIdx, bIdx); }}
                        className="p-1 hover:bg-surface rounded transition-colors"
                        aria-label="Duplicate block"
                        title="Duplicate"
                      >
                        <Copy className="w-3.5 h-3.5 text-muted" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteBlock?.(sIdx, bIdx); }}
                        className="p-1 hover:bg-surface rounded transition-colors"
                        aria-label="Delete block"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-danger" />
                      </button>
                    </div>
                  </div>
                );
              })}
              {isExpanded && sectionBlocks.length === 0 && (
                <p className="text-xs text-muted px-2 py-1 ml-4">No blocks in this section</p>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
