/**
 * useWebDocument.js — Hook for managing the web page document state.
 *
 * Encapsulates sections, header, footer, and pageData state, plus all
 * CRUD operations (add/delete/duplicate/move/update for sections and blocks).
 *
 * History is managed via saveToHistory callbacks — the hook itself is
 * history-agnostic so it can be composed with any history strategy.
 *
 * @param {Function} saveToHistory — called with (sections, header, footer) after each mutation
 * @param {Function} onBlockDelete — called with (sIdx, bIdx, deletedBlock) for undo toast
 * @param {Function} onSectionDelete — called with (sIdx, deletedSection) for undo toast
 * @returns {object} document state and mutation functions
 */

import { useState, useCallback } from 'react';
import {
  createBlock,
  createSection,
  duplicateBlockEntity,
  duplicateSectionEntity,
  autoStackFluid,
  makeDefaultBlockContent,
} from './editorUtils';

export function useWebDocument({ saveToHistory, onBlockDelete, onSectionDelete } = {}) {
  const [pageData, setPageData] = useState(null);
  const [sections, setSections] = useState([]);
  const [header, setHeader] = useState({ logo: { text: '', imageUrl: '' }, navigation: [], styles: {} });
  const [footer, setFooter] = useState({ sections: [], copyright: '', styles: {} });

  // ── Section-level operations ──────────────────────────────────────────────

  const addSection = useCallback((sectionConfig, afterIndex) => {
    const newSection = createSection(sectionConfig);
    setSections((prev) => {
      const insertAt = afterIndex == null ? prev.length : afterIndex + 1;
      const newSections = [...prev.slice(0, insertAt), newSection, ...prev.slice(insertAt)];
      saveToHistory?.(newSections, header, footer);
      return newSections;
    });
  }, [saveToHistory, header, footer]);

  const deleteSection = useCallback((sIdx) => {
    setSections((prev) => {
      const deletedSection = prev[sIdx];
      if (!deletedSection) return prev;
      const newSections = prev.filter((_, i) => i !== sIdx);
      saveToHistory?.(newSections, header, footer);
      onSectionDelete?.(sIdx, deletedSection);
      return newSections;
    });
  }, [saveToHistory, onSectionDelete, header, footer]);

  const duplicateSection = useCallback((sIdx) => {
    setSections((prev) => {
      const sec = prev[sIdx];
      if (!sec) return prev;
      const newSec = duplicateSectionEntity(sec);
      const newSections = [...prev.slice(0, sIdx + 1), newSec, ...prev.slice(sIdx + 1)];
      saveToHistory?.(newSections, header, footer);
      return newSections;
    });
  }, [saveToHistory, header, footer]);

  const moveSection = useCallback((sIdx, direction) => {
    setSections((prev) => {
      const newIdx = sIdx + direction;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const newSections = [...prev];
      [newSections[sIdx], newSections[newIdx]] = [newSections[newIdx], newSections[sIdx]];
      saveToHistory?.(newSections, header, footer);
      return newSections;
    });
  }, [saveToHistory, header, footer]);

  const updateSection = useCallback((sIdx, updates) => {
    setSections((prev) => {
      const newSections = prev.map((s, i) => i === sIdx ? { ...s, ...updates } : s);
      saveToHistory?.(newSections, header, footer);
      return newSections;
    });
  }, [saveToHistory, header, footer]);

  // ── Block-level operations ────────────────────────────────────────────────

  const updateSectionBlocks = useCallback((sIdx, newBlocksOrFn) => {
    setSections((prev) => {
      const newSections = prev.map((s, i) => {
        if (i !== sIdx) return s;
        const newBlocks = typeof newBlocksOrFn === 'function' ? newBlocksOrFn(s.blocks || []) : newBlocksOrFn;
        return { ...s, blocks: newBlocks };
      });
      saveToHistory?.(newSections, header, footer);
      return newSections;
    });
  }, [saveToHistory, header, footer]);

  const addBlockToSection = useCallback((sIdx, type) => {
    setSections((prev) => {
      const sec = prev[sIdx];
      if (!sec) return prev;
      const gridColumns = sec.fluidConfig?.gridColumns || 24;
      const fluid = autoStackFluid(sec.blocks || [], gridColumns);
      const newBlock = createBlock(type, { fluid });
      const newBlocks = [...(sec.blocks || []), newBlock];
      const newSections = prev.map((s, i) => i === sIdx ? { ...s, blocks: newBlocks } : s);
      saveToHistory?.(newSections, header, footer);
      return newSections;
    });
  }, [saveToHistory, header, footer]);

  const updateBlock = useCallback((sIdx, bIdx, updates) => {
    updateSectionBlocks(sIdx, (blocks) => blocks.map((b, i) => i === bIdx ? { ...b, ...updates } : b));
  }, [updateSectionBlocks]);

  const updateBlockContent = useCallback((sIdx, bIdx, contentUpdates) => {
    updateSectionBlocks(sIdx, (blocks) => blocks.map((b, i) => {
      if (i !== bIdx) return b;
      return { ...b, content: { ...b.content, ...contentUpdates } };
    }));
  }, [updateSectionBlocks]);

  const deleteBlock = useCallback((sIdx, bIdx) => {
    setSections((prev) => {
      const sec = prev[sIdx];
      const deletedBlock = sec?.blocks?.[bIdx];
      if (!deletedBlock) return prev;
      const newBlocks = (sec.blocks || []).filter((_, i) => i !== bIdx);
      const newSections = prev.map((s, i) => i === sIdx ? { ...s, blocks: newBlocks } : s);
      saveToHistory?.(newSections, header, footer);
      onBlockDelete?.(sIdx, bIdx, deletedBlock);
      return newSections;
    });
  }, [saveToHistory, onBlockDelete, header, footer]);

  const duplicateBlock = useCallback((sIdx, bIdx) => {
    updateSectionBlocks(sIdx, (blocks) => {
      const block = blocks[bIdx];
      if (!block) return blocks;
      const newBlock = duplicateBlockEntity(block);
      return [...blocks.slice(0, bIdx + 1), newBlock, ...blocks.slice(bIdx + 1)];
    });
  }, [updateSectionBlocks]);

  const moveBlock = useCallback((sIdx, bIdx, direction) => {
    updateSectionBlocks(sIdx, (blocks) => {
      const newIdx = bIdx + direction;
      if (newIdx < 0 || newIdx >= blocks.length) return blocks;
      const newBlocks = [...blocks];
      [newBlocks[bIdx], newBlocks[newIdx]] = [newBlocks[newIdx], newBlocks[bIdx]];
      return newBlocks;
    });
  }, [updateSectionBlocks]);

  const addNestedBlock = useCallback((sIdx, parentBIdx, colIndex, type) => {
    updateBlockContent(sIdx, parentBIdx, {});
    setSections((prev) => {
      const sec = prev[sIdx];
      if (!sec) return prev;
      const block = sec.blocks[parentBIdx];
      if (!block) return prev;
      const items = [...(block.content.items || [])];
      const column = items[colIndex] || { width: '33.33%', blocks: [] };
      column.blocks = [...column.blocks, { type, content: makeDefaultBlockContent(type) }];
      items[colIndex] = column;
      const newBlocks = sec.blocks.map((b, i) => i === parentBIdx ? { ...b, content: { ...b.content, items } } : b);
      const newSections = prev.map((s, i) => i === sIdx ? { ...s, blocks: newBlocks } : s);
      saveToHistory?.(newSections, header, footer);
      return newSections;
    });
  }, [saveToHistory, header, footer]);

  // ── Restore (for undo) ────────────────────────────────────────────────────

  const restoreSection = useCallback((sIdx, section) => {
    setSections((prev) => {
      const restored = [...prev.slice(0, sIdx), section, ...prev.slice(sIdx)];
      saveToHistory?.(restored, header, footer);
      return restored;
    });
  }, [saveToHistory, header, footer]);

  const restoreBlock = useCallback((sIdx, bIdx, block) => {
    setSections((prev) => {
      const newSections = prev.map((s, i) => {
        if (i !== sIdx) return s;
        const restoredBlocks = [...(s.blocks || []).slice(0, bIdx), block, ...(s.blocks || []).slice(bIdx)];
        return { ...s, blocks: restoredBlocks };
      });
      saveToHistory?.(newSections, header, footer);
      return newSections;
    });
  }, [saveToHistory, header, footer]);

  // ── Bulk setters (used by fetch/restore) ──────────────────────────────────

  const loadDocument = useCallback((data) => {
    setPageData(data);
    const loadedSections = data.sections && data.sections.length > 0
      ? data.sections
      : (data.blocks && data.blocks.length > 0)
        ? [{ ...createSection({}), id: 'legacy', order: 0, blocks: data.blocks }]
        : [];
    setSections(loadedSections);
    setHeader(data.header || { logo: { text: '', imageUrl: '' }, navigation: [], styles: {} });
    setFooter(data.footer || { sections: [], copyright: '', styles: {} });
    return { sections: loadedSections, header: data.header || {}, footer: data.footer || {} };
  }, []);

  const setAllSections = useCallback((newSections) => {
    setSections(newSections);
    saveToHistory?.(newSections, header, footer);
  }, [saveToHistory, header, footer]);

  const setDocumentState = useCallback((newSections, newHeader, newFooter) => {
    setSections(newSections);
    setHeader(newHeader);
    setFooter(newFooter);
  }, []);

  return {
    // State
    pageData, setPageData,
    sections, setSections,
    header, setHeader,
    footer, setFooter,
    // Section ops
    addSection, deleteSection, duplicateSection, moveSection, updateSection,
    // Block ops
    updateSectionBlocks, addBlockToSection, updateBlock, updateBlockContent,
    deleteBlock, duplicateBlock, moveBlock, addNestedBlock,
    // Restore (for undo)
    restoreSection, restoreBlock,
    // Bulk
    loadDocument, setAllSections, setDocumentState,
  };
}
