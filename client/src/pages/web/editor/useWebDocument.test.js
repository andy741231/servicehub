/**
 * useWebDocument.test.js — Tests for the document state management hook.
 *
 * Tests CRUD operations for sections and blocks, including:
 * - addSection, deleteSection, duplicateSection, moveSection, updateSection
 * - addBlockToSection, updateBlock, updateBlockContent, deleteBlock, duplicateBlock, moveBlock
 * - restoreSection, restoreBlock (for undo)
 * - loadDocument, setAllSections, setDocumentState
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWebDocument } from './useWebDocument';

// Mock the editorUtils functions
vi.mock('./editorUtils', () => ({
  createBlock: vi.fn((type, opts = {}) => ({
    id: `block-test-${Date.now()}-${Math.random()}`,
    type,
    content: {},
    fluid: opts.fluid || { colStart: 1, colEnd: 25, rowStart: 1, rowEnd: 2 },
  })),
  createSection: vi.fn((config = {}) => ({
    id: `section-test-${Date.now()}-${Math.random()}`,
    order: 0,
    blocks: [],
    fluidConfig: { gridColumns: 24 },
    ...config,
  })),
  duplicateBlockEntity: vi.fn((block) => ({ ...block, id: `block-dup-${Date.now()}` })),
  duplicateSectionEntity: vi.fn((section) => ({ ...section, id: `section-dup-${Date.now()}` })),
  autoStackFluid: vi.fn(() => ({ colStart: 1, colEnd: 25, rowStart: 1, rowEnd: 2 })),
  makeDefaultBlockContent: vi.fn((type) => ({ type, text: '' })),
}));

describe('useWebDocument', () => {
  const saveToHistory = vi.fn();
  const onBlockDelete = vi.fn();
  const onSectionDelete = vi.fn();

  const setup = () => renderHook(() =>
    useWebDocument({ saveToHistory, onBlockDelete, onSectionDelete })
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('starts with empty sections', () => {
      const { result } = setup();
      expect(result.current.sections).toEqual([]);
      expect(result.current.pageData).toBeNull();
    });

    it('starts with default header and footer', () => {
      const { result } = setup();
      expect(result.current.header).toEqual({
        logo: { text: '', imageUrl: '' },
        navigation: [],
        styles: {},
      });
      expect(result.current.footer).toEqual({
        sections: [],
        copyright: '',
        styles: {},
      });
    });
  });

  describe('loadDocument', () => {
    it('loads page data and sections', () => {
      const { result } = setup();
      const data = {
        title: 'Test Page',
        sections: [{ id: 's1', order: 0, blocks: [] }],
        header: { logo: { text: 'Logo' }, navigation: [], styles: {} },
        footer: { sections: [], copyright: '2024', styles: {} },
      };

      act(() => {
        result.current.loadDocument(data);
      });

      expect(result.current.pageData).toEqual(data);
      expect(result.current.sections).toEqual(data.sections);
      expect(result.current.header).toEqual(data.header);
      expect(result.current.footer).toEqual(data.footer);
    });

    it('handles missing sections by using empty array', () => {
      const { result } = setup();
      act(() => {
        result.current.loadDocument({ title: 'Empty' });
      });
      expect(result.current.sections).toEqual([]);
    });
  });

  describe('addSection', () => {
    it('adds a section at the end when no afterIndex', () => {
      const { result } = setup();
      act(() => {
        result.current.loadDocument({ sections: [{ id: 's1', blocks: [] }] });
      });
      act(() => {
        result.current.addSection({});
      });
      expect(result.current.sections).toHaveLength(2);
      expect(saveToHistory).toHaveBeenCalled();
    });

    it('adds a section after the specified index', () => {
      const { result } = setup();
      act(() => {
        result.current.loadDocument({
          sections: [{ id: 's1', blocks: [] }, { id: 's2', blocks: [] }],
        });
      });
      act(() => {
        result.current.addSection({}, 0);
      });
      expect(result.current.sections).toHaveLength(3);
      expect(result.current.sections[1].id).not.toBe('s1');
      expect(result.current.sections[0].id).toBe('s1');
    });
  });

  describe('deleteSection', () => {
    it('removes the section at the given index', () => {
      const { result } = setup();
      act(() => {
        result.current.loadDocument({
          sections: [{ id: 's1', blocks: [] }, { id: 's2', blocks: [] }],
        });
      });
      act(() => {
        result.current.deleteSection(0);
      });
      expect(result.current.sections).toHaveLength(1);
      expect(result.current.sections[0].id).toBe('s2');
      expect(onSectionDelete).toHaveBeenCalledWith(0, expect.objectContaining({ id: 's1' }));
    });

    it('does nothing for invalid index', () => {
      const { result } = setup();
      act(() => {
        result.current.loadDocument({ sections: [{ id: 's1', blocks: [] }] });
      });
      act(() => {
        result.current.deleteSection(99);
      });
      expect(result.current.sections).toHaveLength(1);
    });
  });

  describe('duplicateSection', () => {
    it('duplicates the section at the given index', () => {
      const { result } = setup();
      act(() => {
        result.current.loadDocument({ sections: [{ id: 's1', blocks: [] }] });
      });
      act(() => {
        result.current.duplicateSection(0);
      });
      expect(result.current.sections).toHaveLength(2);
    });
  });

  describe('moveSection', () => {
    it('moves section up', () => {
      const { result } = setup();
      act(() => {
        result.current.loadDocument({
          sections: [{ id: 's1', blocks: [] }, { id: 's2', blocks: [] }],
        });
      });
      act(() => {
        result.current.moveSection(1, -1);
      });
      expect(result.current.sections[0].id).toBe('s2');
      expect(result.current.sections[1].id).toBe('s1');
    });

    it('does nothing when moving first section up', () => {
      const { result } = setup();
      act(() => {
        result.current.loadDocument({
          sections: [{ id: 's1', blocks: [] }, { id: 's2', blocks: [] }],
        });
      });
      act(() => {
        result.current.moveSection(0, -1);
      });
      expect(result.current.sections[0].id).toBe('s1');
    });
  });

  describe('updateSection', () => {
    it('merges updates into the section', () => {
      const { result } = setup();
      act(() => {
        result.current.loadDocument({
          sections: [{ id: 's1', blocks: [], backgroundColor: '#fff' }],
        });
      });
      act(() => {
        result.current.updateSection(0, { backgroundColor: '#000' });
      });
      expect(result.current.sections[0].backgroundColor).toBe('#000');
    });
  });

  describe('block operations', () => {
    it('addBlockToSection adds a block to the section', () => {
      const { result } = setup();
      act(() => {
        result.current.loadDocument({ sections: [{ id: 's1', blocks: [] }] });
      });
      act(() => {
        result.current.addBlockToSection(0, 'text');
      });
      expect(result.current.sections[0].blocks).toHaveLength(1);
      expect(result.current.sections[0].blocks[0].type).toBe('text');
    });

    it('updateBlock merges updates', () => {
      const { result } = setup();
      act(() => {
        result.current.loadDocument({
          sections: [{ id: 's1', blocks: [{ id: 'b1', type: 'text', content: {} }] }],
        });
      });
      act(() => {
        result.current.updateBlock(0, 0, { fluid: { colStart: 2 } });
      });
      expect(result.current.sections[0].blocks[0].fluid).toEqual({ colStart: 2 });
    });

    it('updateBlockContent merges content updates', () => {
      const { result } = setup();
      act(() => {
        result.current.loadDocument({
          sections: [{ id: 's1', blocks: [{ id: 'b1', type: 'text', content: { text: 'hi' } }] }],
        });
      });
      act(() => {
        result.current.updateBlockContent(0, 0, { text: 'hello' });
      });
      expect(result.current.sections[0].blocks[0].content.text).toBe('hello');
    });

    it('deleteBlock removes the block and calls onBlockDelete', () => {
      const { result } = setup();
      act(() => {
        result.current.loadDocument({
          sections: [{ id: 's1', blocks: [{ id: 'b1', type: 'text' }, { id: 'b2', type: 'text' }] }],
        });
      });
      act(() => {
        result.current.deleteBlock(0, 0);
      });
      expect(result.current.sections[0].blocks).toHaveLength(1);
      expect(result.current.sections[0].blocks[0].id).toBe('b2');
      expect(onBlockDelete).toHaveBeenCalledWith(0, 0, expect.objectContaining({ id: 'b1' }));
    });

    it('duplicateBlock adds a copy after the original', () => {
      const { result } = setup();
      act(() => {
        result.current.loadDocument({
          sections: [{ id: 's1', blocks: [{ id: 'b1', type: 'text' }] }],
        });
      });
      act(() => {
        result.current.duplicateBlock(0, 0);
      });
      expect(result.current.sections[0].blocks).toHaveLength(2);
    });

    it('moveBlock swaps block positions', () => {
      const { result } = setup();
      act(() => {
        result.current.loadDocument({
          sections: [{ id: 's1', blocks: [{ id: 'b1' }, { id: 'b2' }] }],
        });
      });
      act(() => {
        result.current.moveBlock(0, 0, 1);
      });
      expect(result.current.sections[0].blocks[0].id).toBe('b2');
      expect(result.current.sections[0].blocks[1].id).toBe('b1');
    });

    it('moveBlock does nothing at boundaries', () => {
      const { result } = setup();
      act(() => {
        result.current.loadDocument({
          sections: [{ id: 's1', blocks: [{ id: 'b1' }, { id: 'b2' }] }],
        });
      });
      act(() => {
        result.current.moveBlock(0, 0, -1);
      });
      expect(result.current.sections[0].blocks[0].id).toBe('b1');
    });
  });

  describe('restore (for undo)', () => {
    it('restoreSection inserts a section at the given index', () => {
      const { result } = setup();
      act(() => {
        result.current.loadDocument({ sections: [{ id: 's2', blocks: [] }] });
      });
      act(() => {
        result.current.restoreSection(0, { id: 's1', blocks: [] });
      });
      expect(result.current.sections).toHaveLength(2);
      expect(result.current.sections[0].id).toBe('s1');
    });

    it('restoreBlock inserts a block at the given index', () => {
      const { result } = setup();
      act(() => {
        result.current.loadDocument({
          sections: [{ id: 's1', blocks: [{ id: 'b2' }] }],
        });
      });
      act(() => {
        result.current.restoreBlock(0, 0, { id: 'b1', type: 'text' });
      });
      expect(result.current.sections[0].blocks).toHaveLength(2);
      expect(result.current.sections[0].blocks[0].id).toBe('b1');
    });
  });
});
