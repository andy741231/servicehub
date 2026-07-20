import { useEffect, useRef, useCallback } from 'react';
import { Editor, Frame, useEditor } from '@craftjs/core';
import { craftResolver } from './craftBlocks';
import { fromDb, toDb } from './craftSerializer';
import { setCraftEditorApi } from './craftEditorApi';

function CraftHydrator({ sections, suppressSyncRef }) {
  const { actions, query } = useEditor();
  const lastJson = useRef('');

  useEffect(() => {
    try {
      const nodes = fromDb({ sections: sections || [] });
      const json = JSON.stringify(nodes);
      if (json === lastJson.current) return;

      // If the change originated from Craft.js (suppressSyncRef is true),
      // the Craft.js internal state already reflects this change.
      // Update lastJson to match so we don't re-deserialize on every keystroke.
      if (suppressSyncRef.current) {
        lastJson.current = json;
        suppressSyncRef.current = false;
        return;
      }

      lastJson.current = json;
      suppressSyncRef.current = true;
      actions.deserialize(nodes);
      requestAnimationFrame(() => {
        suppressSyncRef.current = false;
      });
    } catch (err) {
      console.error('Craft hydrate failed:', err);
      suppressSyncRef.current = false;
    }
  }, [sections, actions, query, suppressSyncRef]);

  return null;
}

function CraftHistoryBridge({ historyApiRef }) {
  const { actions, query } = useEditor();

  useEffect(() => {
    if (!historyApiRef) return;
    historyApiRef.current = {
      undo: () => actions.history.undo(),
      redo: () => actions.history.redo(),
      canUndo: () => query.history.canUndo(),
      canRedo: () => query.history.canRedo(),
    };
  }, [actions, query, historyApiRef]);

  return null;
}

/** Place inside WebCraftRoot (enabled) to render the Craft.js canvas. */
export function CraftCanvas({ className = '' }) {
  return (
    <div className={className}>
      <Frame />
    </div>
  );
}

/**
 * WebCraftRoot — Craft.js Editor provider.
 * enabled=false: passthrough children (legacy).
 * enabled=true: wrap with Editor; put <CraftCanvas /> where the page canvas should render.
 */
export default function WebCraftRoot({
  children,
  sections,
  enabled = false,
  onCraftChange,
  historyApiRef,
  onAddSectionBelow,
  onAddBlock,
  onDeleteSection,
  onDuplicateSection,
}) {
  const suppressSyncRef = useRef(false);

  useEffect(() => {
    setCraftEditorApi({
      onAddSectionBelow: onAddSectionBelow || (() => {}),
      onAddBlock: onAddBlock || (() => {}),
      onDeleteSection: onDeleteSection || (() => {}),
      onDuplicateSection: onDuplicateSection || (() => {}),
    });
  }, [onAddSectionBelow, onAddBlock, onDeleteSection, onDuplicateSection]);

  const handleNodesChange = useCallback(
    (query) => {
      if (!onCraftChange || suppressSyncRef.current) return;
      try {
        const nodes = query.getSerializedNodes();
        const { sections: nextSections } = toDb(nodes);
        // Suppress the next hydrate cycle because this change originated
        // from within Craft.js — re-deserializing would unmount/remount
        // all blocks and cause focus loss in contentEditable editors.
        // The flag is reset by CraftHydrator after it processes the update.
        suppressSyncRef.current = true;
        onCraftChange(nextSections);
      } catch (err) {
        console.error('Craft serialize failed:', err);
        suppressSyncRef.current = false;
      }
    },
    [onCraftChange]
  );

  if (!enabled) {
    return children;
  }

  return (
    <Editor resolver={craftResolver} onNodesChange={handleNodesChange}>
      <CraftHydrator sections={sections} suppressSyncRef={suppressSyncRef} />
      <CraftHistoryBridge historyApiRef={historyApiRef} />
      {children}
    </Editor>
  );
}

export { toDb, fromDb };