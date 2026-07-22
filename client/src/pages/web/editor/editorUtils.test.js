import { describe, it, expect } from 'vitest';
import {
  generateClientId,
  createBlock,
  createSection,
  duplicateBlock,
  duplicateSection,
  makeDefaultBlockContent,
} from './editorUtils.js';

// ─── generateClientId ─────────────────────────────────────────────────

describe('generateClientId', () => {
  it('produces a string with the given prefix', () => {
    const id = generateClientId('block');
    expect(typeof id).toBe('string');
    expect(id.startsWith('block-')).toBe(true);
  });

  it('produces unique IDs on repeated calls', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateClientId('x')));
    expect(ids.size).toBe(100);
  });

  it('uses different prefixes correctly', () => {
    const blockId = generateClientId('block');
    const sectionId = generateClientId('section');
    expect(blockId.startsWith('block-')).toBe(true);
    expect(sectionId.startsWith('section-')).toBe(true);
  });
});

// ─── createBlock ──────────────────────────────────────────────────────

describe('createBlock', () => {
  it('creates a block with a unique client ID', () => {
    const block = createBlock('text');
    expect(block.id).toBeTruthy();
    expect(block.id.startsWith('block-')).toBe(true);
  });

  it('creates blocks with different IDs on each call', () => {
    const b1 = createBlock('text');
    const b2 = createBlock('text');
    expect(b1.id).not.toBe(b2.id);
  });

  it('populates default content for known types', () => {
    const block = createBlock('hero');
    expect(block.content).toEqual(makeDefaultBlockContent('hero'));
  });

  it('accepts custom fluid coordinates', () => {
    const fluid = { colStart: 5, colEnd: 15, rowStart: 2, rowEnd: 5, zIndex: 3 };
    const block = createBlock('text', { fluid });
    expect(block.fluid).toEqual(fluid);
  });

  it('provides default fluid coordinates when none given', () => {
    const block = createBlock('text');
    expect(block.fluid.colStart).toBe(1);
    expect(block.fluid.colEnd).toBe(25);
    expect(block.fluid.rowStart).toBe(1);
    expect(block.fluid.rowEnd).toBe(3);
  });
});

// ─── createSection ────────────────────────────────────────────────────

describe('createSection', () => {
  it('creates a section with a unique client ID', () => {
    const section = createSection();
    expect(section.id).toBeTruthy();
    expect(section.id.startsWith('section-')).toBe(true);
  });

  it('creates sections with different IDs on each call', () => {
    const s1 = createSection();
    const s2 = createSection();
    expect(s1.id).not.toBe(s2.id);
  });

  it('accepts overrides', () => {
    const section = createSection({ paddingTop: 100, backgroundColor: '#ff0000' });
    expect(section.paddingTop).toBe(100);
    expect(section.backgroundColor).toBe('#ff0000');
  });

  it('initializes with empty blocks array', () => {
    const section = createSection();
    expect(section.blocks).toEqual([]);
  });
});

// ─── duplicateBlock ───────────────────────────────────────────────────

describe('duplicateBlock', () => {
  it('produces a block with a different ID from the original', () => {
    const original = createBlock('hero');
    const copy = duplicateBlock(original);
    expect(copy.id).not.toBe(original.id);
    expect(copy.id.startsWith('block-')).toBe(true);
  });

  it('deep-clones content (no shared reference)', () => {
    const original = createBlock('features');
    const copy = duplicateBlock(original);
    expect(copy.content).toEqual(original.content);
    expect(copy.content).not.toBe(original.content);
    expect(copy.content.items).not.toBe(original.content.items);
  });

  it('preserves type and fluid coordinates', () => {
    const original = createBlock('text', { fluid: { colStart: 3, colEnd: 10, rowStart: 1, rowEnd: 4, zIndex: 2 } });
    const copy = duplicateBlock(original);
    expect(copy.type).toBe(original.type);
    expect(copy.fluid).toEqual(original.fluid);
    expect(copy.fluid).not.toBe(original.fluid);
  });

  it('produces unique IDs when duplicating the same block twice', () => {
    const original = createBlock('text');
    const copy1 = duplicateBlock(original);
    const copy2 = duplicateBlock(original);
    expect(copy1.id).not.toBe(copy2.id);
  });
});

// ─── duplicateSection ─────────────────────────────────────────────────

describe('duplicateSection', () => {
  it('produces a section with a different ID from the original', () => {
    const original = createSection();
    const copy = duplicateSection(original);
    expect(copy.id).not.toBe(original.id);
    expect(copy.id.startsWith('section-')).toBe(true);
  });

  it('deep-clones fluidConfig (no shared reference)', () => {
    const original = createSection({ fluidConfig: { gridColumns: 24, rowHeight: 80, gap: { horizontal: 8, vertical: 8 }, fillScreen: false, minHeight: 320, verticalAlignment: 'top' } });
    const copy = duplicateSection(original);
    expect(copy.fluidConfig).toEqual(original.fluidConfig);
    expect(copy.fluidConfig).not.toBe(original.fluidConfig);
  });

  it('regenerates IDs for all nested blocks', () => {
    const original = createSection();
    original.blocks = [createBlock('text'), createBlock('hero'), createBlock('features')];
    const copy = duplicateSection(original);
    expect(copy.blocks).toHaveLength(3);
    copy.blocks.forEach((block, i) => {
      expect(block.id).not.toBe(original.blocks[i].id);
      expect(block.id.startsWith('block-')).toBe(true);
    });
  });

  it('deep-clones nested block content', () => {
    const original = createSection();
    original.blocks = [createBlock('features')];
    const copy = duplicateSection(original);
    expect(copy.blocks[0].content).toEqual(original.blocks[0].content);
    expect(copy.blocks[0].content).not.toBe(original.blocks[0].content);
  });
});
