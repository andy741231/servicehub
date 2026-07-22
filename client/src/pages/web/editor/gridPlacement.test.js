import { describe, it, expect } from 'vitest';
import {
  computeGridDrop,
  packBlocks,
  craftMoveIndex,
} from './gridPlacement.js';

// ─── helpers ──────────────────────────────────────────────────────────

/** Build a sibling rect descriptor. */
function sib(id, left, top, width, height) {
  return {
    id,
    rect: { left, top, right: left + width, bottom: top + height, width, height },
  };
}

/** Build a block with optional colSpan / rowSpan. */
function blk(id, colSpan, rowSpan) {
  return {
    id,
    content: {
      _colSpan: colSpan || 1,
      _rowSpan: rowSpan || 1,
    },
  };
}

// ─── computeGridDrop ──────────────────────────────────────────────────

describe('computeGridDrop', () => {
  // ── Basic single-row cases ──────────────────────────────────────────

  it('returns index 0 and null indicator when there are no siblings', () => {
    const result = computeGridDrop([], { x: 50, y: 50 });
    expect(result.index).toBe(0);
    expect(result.indicator).toBeNull();
  });

  it('places a span-1 block before the first sibling when cursor is left of its midpoint', () => {
    // 4-col grid, one row: [A][B][C][D]
    const siblings = [
      sib('A', 0, 0, 100, 100),
      sib('B', 100, 0, 100, 100),
      sib('C', 200, 0, 100, 100),
      sib('D', 300, 0, 100, 100),
    ];
    // Cursor at x=10 (left of A's midpoint at 50)
    const result = computeGridDrop(siblings, { x: 10, y: 50 });
    expect(result.index).toBe(0);
    // Indicator should be A's cell
    expect(result.indicator).toEqual({ x: 0, y: 0, width: 100, height: 100 });
  });

  it('places a block between B and C when cursor is right of B midpoint', () => {
    const siblings = [
      sib('A', 0, 0, 100, 100),
      sib('B', 100, 0, 100, 100),
      sib('C', 200, 0, 100, 100),
      sib('D', 300, 0, 100, 100),
    ];
    // Cursor at x=180 (right of B's midpoint at 150, left of C's midpoint at 250)
    const result = computeGridDrop(siblings, { x: 180, y: 50 });
    expect(result.index).toBe(2); // before C
  });

  it('appends to end when cursor is right of the last sibling', () => {
    const siblings = [
      sib('A', 0, 0, 100, 100),
      sib('B', 100, 0, 100, 100),
    ];
    // Cursor at x=250 (right of B's midpoint at 150)
    const result = computeGridDrop(siblings, { x: 250, y: 50 });
    expect(result.index).toBe(2);
    // Indicator should be an insertion line at B's right edge
    expect(result.indicator).toEqual({ x: 200, y: 0, width: 3, height: 100 });
  });

  // ── Multi-row cases (the core fix) ──────────────────────────────────

  it('places a block in the second row, not at the end of the first', () => {
    // 2-col grid, two rows: [A][B] / [C][D]
    const siblings = [
      sib('A', 0, 0, 100, 100),
      sib('B', 100, 0, 100, 100),
      sib('C', 0, 120, 100, 100),
      sib('D', 100, 120, 100, 100),
    ];
    // Cursor at x=10, y=170 (inside C's row, left of C's midpoint)
    const result = computeGridDrop(siblings, { x: 10, y: 170 });
    expect(result.index).toBe(2); // before C (flat index 2)
    expect(result.indicator).toEqual({ x: 0, y: 120, width: 100, height: 100 });
  });

  it('places a block in the second row, second column', () => {
    // 2-col grid, two rows: [A][B] / [C][D]
    const siblings = [
      sib('A', 0, 0, 100, 100),
      sib('B', 100, 0, 100, 100),
      sib('C', 0, 120, 100, 100),
      sib('D', 100, 120, 100, 100),
    ];
    // Cursor at x=120, y=170 (right of C's midpoint at 50, left of D's midpoint at 150)
    const result = computeGridDrop(siblings, { x: 120, y: 170 });
    expect(result.index).toBe(3); // before D (flat index 3)
  });

  it('appends to the end of the second row, not the end of the first', () => {
    // 2-col grid, two rows: [A][B] / [C][D]
    const siblings = [
      sib('A', 0, 0, 100, 100),
      sib('B', 100, 0, 100, 100),
      sib('C', 0, 120, 100, 100),
      sib('D', 100, 120, 100, 100),
    ];
    // Cursor at x=250, y=170 (right of D's midpoint)
    const result = computeGridDrop(siblings, { x: 250, y: 170 });
    expect(result.index).toBe(4); // after D (flat index 4)
  });

  it('snaps to the nearest row when cursor is in the gap between rows', () => {
    // 2-col grid, two rows: [A][B] (y=0-100) / [C][D] (y=120-220)
    // Gap is y=100-120
    const siblings = [
      sib('A', 0, 0, 100, 100),
      sib('B', 100, 0, 100, 100),
      sib('C', 0, 120, 100, 100),
      sib('D', 100, 120, 100, 100),
    ];
    // Cursor at y=115 (in the gap, closer to row 2 center at 170 than row 1 center at 50)
    const result = computeGridDrop(siblings, { x: 10, y: 115 });
    expect(result.index).toBe(2); // row 2, before C
  });

  it('inserts at index 0 when cursor is above all rows', () => {
    const siblings = [
      sib('A', 0, 100, 100, 100),
      sib('B', 100, 100, 100, 100),
    ];
    // Cursor at y=10 (above all rows, nearest to row 1 center at 150)
    const result = computeGridDrop(siblings, { x: 10, y: 10 });
    expect(result.index).toBe(0); // before A
  });

  // ── Mixed-height blocks in the same row ─────────────────────────────

  it('groups blocks with different heights into the same row by top edge', () => {
    // Same row, A is 100px tall, B is 200px tall — both start at top=0
    const siblings = [
      sib('A', 0, 0, 100, 100),
      sib('B', 100, 0, 100, 200),
    ];
    // Cursor at x=180, y=50 (right of B's midpoint at 150)
    const result = computeGridDrop(siblings, { x: 180, y: 50 });
    expect(result.index).toBe(2); // after B (same row)
  });

  it('does not split a row when one block is much taller', () => {
    // A is 300px tall, B is 100px tall, both at top=0
    const siblings = [
      sib('A', 0, 0, 100, 300),
      sib('B', 100, 0, 100, 100),
    ];
    // Cursor at x=10, y=250 (inside A's height but below B; left of A's midpoint)
    // A spans y=0-300, B spans y=0-100. Row bottom = max(300, 100) = 300.
    // Cursor y=250 is inside the row's vertical range [0, 300].
    const result = computeGridDrop(siblings, { x: 10, y: 250 });
    expect(result.index).toBe(0); // before A (same row)
  });

  // ── Three-row case ──────────────────────────────────────────────────

  it('handles three rows correctly', () => {
    // 3-col grid, three rows: [A][B][C] / [D][E][F] / [G][H][I]
    const siblings = [
      sib('A', 0, 0, 100, 100),
      sib('B', 100, 0, 100, 100),
      sib('C', 200, 0, 100, 100),
      sib('D', 0, 120, 100, 100),
      sib('E', 100, 120, 100, 100),
      sib('F', 200, 120, 100, 100),
      sib('G', 0, 240, 100, 100),
      sib('H', 100, 240, 100, 100),
      sib('I', 200, 240, 100, 100),
    ];
    // Cursor in row 3 (y=290), between H and I (x=180)
    const result = computeGridDrop(siblings, { x: 180, y: 290 });
    // Row 3 starts at flat index 6 (rows 1+2 have 6 items)
    // Between H (index 7) and I (index 8) → index 8
    expect(result.index).toBe(8);
  });

  // ── Custom row tolerance ────────────────────────────────────────────

  it('respects custom rowTolerance for blocks with slight vertical offset', () => {
    // Two blocks offset by 5px — within default tolerance (8px) they're one row
    const siblings = [
      sib('A', 0, 0, 100, 100),
      sib('B', 100, 5, 100, 100),
    ];
    // Default tolerance: same row
    const defaultResult = computeGridDrop(siblings, { x: 10, y: 50 });
    expect(defaultResult.index).toBe(0); // before A, same row

    // With tolerance=2: different rows
    const strictResult = computeGridDrop(siblings, { x: 10, y: 50 }, { rowTolerance: 2 });
    // A is row 1 (top=0), B is row 2 (top=5). Cursor y=50 is inside A's row.
    expect(strictResult.index).toBe(0); // before A
  });
});

// ─── packBlocks ───────────────────────────────────────────────────────

describe('packBlocks', () => {
  it('returns empty array for no blocks', () => {
    expect(packBlocks([], 4)).toEqual([]);
  });

  it('returns input for columns < 1', () => {
    const blocks = [blk('A'), blk('B')];
    expect(packBlocks(blocks, 0)).toBe(blocks);
  });

  it('packs all span-1 blocks in row-major order', () => {
    const blocks = [blk('A'), blk('B'), blk('C'), blk('D'), blk('E')];
    packBlocks(blocks, 3);
    // Row 1: A(1,1), B(1,2), C(1,3)
    // Row 2: D(2,1), E(2,2)
    expect(blocks[0].content._colStart).toBe(1);
    expect(blocks[0].content._rowStart).toBe(1);
    expect(blocks[1].content._colStart).toBe(2);
    expect(blocks[1].content._rowStart).toBe(1);
    expect(blocks[2].content._colStart).toBe(3);
    expect(blocks[2].content._rowStart).toBe(1);
    expect(blocks[3].content._colStart).toBe(1);
    expect(blocks[3].content._rowStart).toBe(2);
    expect(blocks[4].content._colStart).toBe(2);
    expect(blocks[4].content._rowStart).toBe(2);
  });

  it('packs a colSpan-2 block and wraps remaining to next row', () => {
    // 4-col grid: A(span 2), B(span 1), C(span 1), D(span 1)
    const blocks = [blk('A', 2), blk('B'), blk('C'), blk('D')];
    packBlocks(blocks, 4);
    // Row 1: A(1-2), B(3), C(4)
    // Row 2: D(1)
    expect(blocks[0].content._colStart).toBe(1);
    expect(blocks[0].content._rowStart).toBe(1);
    expect(blocks[1].content._colStart).toBe(3);
    expect(blocks[1].content._rowStart).toBe(1);
    expect(blocks[2].content._colStart).toBe(4);
    expect(blocks[2].content._rowStart).toBe(1);
    expect(blocks[3].content._colStart).toBe(1);
    expect(blocks[3].content._rowStart).toBe(2);
  });

  it('wraps a colSpan-2 block that does not fit in the remaining row space', () => {
    // 3-col grid: A(span 1), B(span 2), C(span 1)
    // A at (1,1). B span 2 needs cols 2-3, fits! B at (1,2).
    // C span 1 needs col 1 of next row. C at (2,1).
    const blocks = [blk('A'), blk('B', 2), blk('C')];
    packBlocks(blocks, 3);
    expect(blocks[0].content._colStart).toBe(1);
    expect(blocks[0].content._rowStart).toBe(1);
    expect(blocks[1].content._colStart).toBe(2);
    expect(blocks[1].content._rowStart).toBe(1);
    expect(blocks[2].content._colStart).toBe(1);
    expect(blocks[2].content._rowStart).toBe(2);
  });

  it('wraps a colSpan-2 block that does not fit after a span-1 in a 3-col grid', () => {
    // 3-col grid: A(span 2), B(span 2), C(span 1)
    // A at (1,1-2). B span 2 needs cols 3-4, but col 4 > 3. Wrap to row 2.
    // B at (2,1-2). C span 1 fits at (1,3) — the remaining cell in row 1.
    const blocks = [blk('A', 2), blk('B', 2), blk('C')];
    packBlocks(blocks, 3);
    expect(blocks[0].content._colStart).toBe(1);
    expect(blocks[0].content._rowStart).toBe(1);
    expect(blocks[1].content._colStart).toBe(1);
    expect(blocks[1].content._rowStart).toBe(2);
    expect(blocks[2].content._colStart).toBe(3);
    expect(blocks[2].content._rowStart).toBe(1);
  });

  it('handles rowSpan > 1 without overlap', () => {
    // 3-col grid: A(span 1, rowSpan 2), B(span 1), C(span 1), D(span 1)
    // A occupies (1,1) and (2,1).
    // B at (1,2), C at (1,3).
    // D at (2,2) — col 1 of row 2 is occupied by A.
    const blocks = [blk('A', 1, 2), blk('B'), blk('C'), blk('D')];
    packBlocks(blocks, 3);
    expect(blocks[0].content._colStart).toBe(1);
    expect(blocks[0].content._rowStart).toBe(1);
    expect(blocks[1].content._colStart).toBe(2);
    expect(blocks[1].content._rowStart).toBe(1);
    expect(blocks[2].content._colStart).toBe(3);
    expect(blocks[2].content._rowStart).toBe(1);
    expect(blocks[3].content._colStart).toBe(2);
    expect(blocks[3].content._rowStart).toBe(2);
  });

  it('clamps colSpan to grid width', () => {
    // 3-col grid, block with colSpan 5 → clamped to 3
    const blocks = [blk('A', 5)];
    packBlocks(blocks, 3);
    // A should occupy all of row 1
    expect(blocks[0].content._colStart).toBe(1);
    expect(blocks[0].content._rowStart).toBe(1);
  });

  it('handles a block wider than the grid by clamping and placing at col 1', () => {
    // 2-col grid, block with colSpan 10 → clamped to 2
    const blocks = [blk('A', 10), blk('B')];
    packBlocks(blocks, 2);
    expect(blocks[0].content._colStart).toBe(1);
    expect(blocks[0].content._rowStart).toBe(1);
    expect(blocks[1].content._colStart).toBe(1);
    expect(blocks[1].content._rowStart).toBe(2);
  });

  it('does not overlap blocks with mixed spans in a 4-col grid', () => {
    // 4-col grid: A(span 2), B(span 1, rowSpan 2), C(span 1), D(span 2)
    // A at (1, 1-2). B at (1, 3), occupies (1,3) and (2,3). C at (1, 4).
    // D span 2 at row 2: col 1-2 free. D at (2, 1-2).
    const blocks = [blk('A', 2), blk('B', 1, 2), blk('C'), blk('D', 2)];
    packBlocks(blocks, 4);

    // Verify no overlap by collecting all occupied cells
    const cells = new Set();
    for (const b of blocks) {
      const cs = b.content._colSpan || 1;
      const rs = b.content._rowSpan || 1;
      const colStart = b.content._colStart;
      const rowStart = b.content._rowStart;
      for (let r = rowStart; r < rowStart + rs; r++) {
        for (let c = colStart; c < colStart + cs; c++) {
          const key = `${r},${c}`;
          expect(cells.has(key)).toBe(false);
          cells.add(key);
        }
      }
    }
  });

  it('preserves existing _colSpan and _rowSpan values', () => {
    const blocks = [blk('A', 3, 2)];
    packBlocks(blocks, 4);
    // Should not mutate span values, only add starts
    expect(blocks[0].content._colSpan).toBe(3);
    expect(blocks[0].content._rowSpan).toBe(2);
    expect(blocks[0].content._colStart).toBe(1);
    expect(blocks[0].content._rowStart).toBe(1);
  });
});

// ─── craftMoveIndex ───────────────────────────────────────────────────

describe('craftMoveIndex', () => {
  it('returns same index for no-op moves', () => {
    expect(craftMoveIndex(2, 2)).toBe(2);
  });

  it('returns same index for moves to an earlier position', () => {
    // Block at index 5, moving to index 2 — no correction needed
    expect(craftMoveIndex(2, 5)).toBe(2);
  });

  it('adds +1 for moves to a later position in the same parent', () => {
    // Block at index 1, moving to index 3 — needs +1 → 4
    expect(craftMoveIndex(3, 1)).toBe(4);
  });

  it('does not add +1 for cross-parent moves (currentIndex < 0)', () => {
    expect(craftMoveIndex(3, -1)).toBe(3);
    expect(craftMoveIndex(0, -1)).toBe(0);
  });

  it('handles move to index 0 from a later position', () => {
    // Block at index 3, moving to index 0 — earlier, no correction
    expect(craftMoveIndex(0, 3)).toBe(0);
  });

  it('handles move from index 0 to a later position', () => {
    // Block at index 0, moving to index 2 — later, needs +1 → 3
    expect(craftMoveIndex(2, 0)).toBe(3);
  });
});
