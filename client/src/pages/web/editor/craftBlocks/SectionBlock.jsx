import { useNode, useEditor } from '@craftjs/core';
import { useRef } from 'react';
import { Trash2, Copy, Plus } from 'lucide-react';
import { craftEditorApiRef } from '../craftEditorApi';

export default function SectionBlock({
  children,
  columns,
  gap,
  paddingTop,
  paddingBottom,
  paddingLeft,
  paddingRight,
  marginTop,
  marginBottom,
  backgroundColor,
  backgroundImage,
  minHeight,
}) {
  const {
    id,
    connectors: { connect, drag },
    selected,
    hovered,
  } = useNode((node) => ({
    id: node.id,
    selected: node.events.selected,
    hovered: node.events.hovered,
  }));

  const sectionRef = useRef(null);
  const { actions, query } = useEditor();
  const { onAddSectionBelow, onAddBlock, onDeleteSection, onDuplicateSection } = craftEditorApiRef.current;

  const getSectionIndex = () => {
    if (sectionRef.current) {
      const allSections = Array.from(
        (sectionRef.current.parentElement || document).querySelectorAll('.section-block')
      );
      const idx = allSections.indexOf(sectionRef.current);
      if (idx >= 0) return idx;
    }
    try {
      const nodeData = query.node(id).get();
      const parentId = nodeData.parent;
      const siblings = query.node(parentId).get().nodes;
      return siblings.indexOf(id);
    } catch {
      return 0;
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    e.preventDefault();
    const idx = getSectionIndex();
    if (idx >= 0) onDeleteSection(idx);
  };

  const handleDuplicate = (e) => {
    e.stopPropagation();
    e.preventDefault();
    const idx = getSectionIndex();
    if (idx >= 0) onDuplicateSection(idx);
  };

  const handleAddBelow = (e) => {
    e.stopPropagation();
    e.preventDefault();
    onAddSectionBelow(getSectionIndex());
  };

  const handleAddBlock = (e) => {
    e.stopPropagation();
    e.preventDefault();
    onAddBlock(getSectionIndex());
  };

  return (
    <div
      ref={(ref) => {
        sectionRef.current = ref;
        connect(ref);
      }}
      className={`section-block relative ${selected ? 'ring-2 ring-primary' : hovered ? 'ring-1 ring-primary/40' : ''}`}
    >
      {/* Hover toolbar — outside drag area so buttons are clickable */}
      <div
        className={`absolute top-2 left-2 z-30 flex items-center gap-1 bg-surface/95 backdrop-blur-sm border border-border rounded-lg shadow-lg p-1 transition-all duration-150 ${hovered || selected ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      >
        <button
          onClick={handleDuplicate}
          className="p-1.5 hover:bg-surface-tertiary rounded text-muted hover:text-text-base transition-colors"
          title="Duplicate section"
        >
          <Copy className="w-4 h-4" />
        </button>
        <button
          onClick={handleDelete}
          className="p-1.5 hover:bg-danger/10 rounded text-muted hover:text-danger transition-colors"
          title="Delete section"
        >
          <Trash2 className="w-4 h-4" />
        </button>
        <button
          onClick={handleAddBelow}
          className="p-1.5 hover:bg-primary/10 rounded text-muted hover:text-primary transition-colors"
          title="Add section below"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Draggable content area */}
      <div
        ref={drag}
        style={{
          paddingTop: paddingTop ?? 48,
          paddingBottom: paddingBottom ?? 48,
          paddingLeft: paddingLeft ?? 0,
          paddingRight: paddingRight ?? 0,
          marginTop: marginTop ?? 0,
          marginBottom: marginBottom ?? 0,
          backgroundColor: backgroundColor || undefined,
          backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          minHeight: minHeight || undefined,
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${columns || 1}, 1fr)`,
            gap: typeof gap === 'number' ? `${gap}px` : (gap || '24px'),
          }}
        >
          {children}
        </div>
      </div>

      {/* Add Block button — outside drag area */}
      <div className={`px-6 py-3 transition-opacity duration-150 ${hovered || selected ? 'opacity-100' : 'opacity-50'}`}>
        <button
          onClick={handleAddBlock}
          className="w-full py-2 border-2 border-dashed border-border rounded-lg text-muted hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2 text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Block
        </button>
      </div>
    </div>
  );
}

SectionBlock.craft = {
  displayName: 'Section',
  props: {
    columns: 1,
    gap: 24,
    paddingTop: 48,
    paddingBottom: 48,
    paddingLeft: 0,
    paddingRight: 0,
    marginTop: 0,
    marginBottom: 0,
    backgroundColor: '',
    backgroundImage: '',
    minHeight: '',
  },
  rules: {
    canDrag: () => true,
    canMoveIn: () => true,
    canMoveOut: () => true,
  },
  isCanvas: true,
};