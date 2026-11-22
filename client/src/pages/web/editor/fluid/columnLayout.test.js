// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { snapToColumns, restack, applyColumns, shortestColumn, fitColumns, isColumnMode } from './columnLayout';

const f = (colStart, colEnd, rowStart, rowEnd) => ({ colStart, colEnd, rowStart, rowEnd, zIndex: 0 });

describe('columnLayout', () => {
  it('snaps left edges to the nearest column and widths to whole columns', () => {
    expect(snapToColumns(f(3, 10, 1, 2), 3)).toEqual({ colStart: 1, colEnd: 9 }); // 3 cols of 8
    expect(snapToColumns(f(14, 25, 1, 2), 3)).toEqual({ colStart: 17, colEnd: 25 }); // 13 → col 2, span 11 → 1
    expect(snapToColumns(f(1, 25, 1, 2), 6)).toEqual({ colStart: 1, colEnd: 25 }); // full width kept
    expect(snapToColumns(f(22, 25, 1, 2), 4)).toEqual({ colStart: 19, colEnd: 25 }); // clamped inside
  });

  it('stacks each column top-down, keeping heights, removing gaps and overlap', () => {
    const out = restack([f(1, 9, 1, 3), f(1, 9, 7, 9), f(9, 17, 2, 4)], 3);
    expect(out[0]).toMatchObject({ rowStart: 1, rowEnd: 3 });
    expect(out[1]).toMatchObject({ rowStart: 3, rowEnd: 5 }); // gap closed under block 0
    expect(out[2]).toMatchObject({ colStart: 9, rowStart: 1, rowEnd: 3 }); // its own column
  });

  it('a block spanning columns starts below the deepest of them', () => {
    const out = restack([f(1, 9, 1, 4), f(9, 17, 1, 2), f(1, 17, 5, 6)], 3);
    expect(out[2]).toMatchObject({ colStart: 1, colEnd: 17, rowStart: 4, rowEnd: 5 });
  });

  it('a dropped block is inserted at its row and pushes the column down', () => {
    // A at rows 1-3, B at 3-5; drop C onto row 3 of the same column.
    const out = restack([f(1, 9, 1, 3), f(1, 9, 3, 5), f(1, 9, 3, 4)], 3, 24, { movedIndex: 2 });
    expect(out[2]).toMatchObject({ rowStart: 3, rowEnd: 4 });
    expect(out[1]).toMatchObject({ rowStart: 4, rowEnd: 6 });
  });

  it('converts a freeform section and back', () => {
    const section = { fluidConfig: { gridColumns: 24 }, blocks: [{ fluid: f(2, 12, 2, 4) }, { fluid: f(13, 25, 6, 7) }] };
    expect(isColumnMode(section)).toBe(false);
    const patch = applyColumns(section, 2);
    expect(patch.fluidConfig.columns).toBe(2);
    expect(patch.blocks.map((b) => b.fluid)).toEqual([f(1, 13, 1, 3), f(13, 25, 1, 2)]);
    expect(applyColumns({ ...section, ...patch }, null).fluidConfig.columns).toBeUndefined();
  });

  it('finds the shortest column and the column count that fits a template', () => {
    expect(shortestColumn([f(1, 9, 1, 5), f(9, 17, 1, 2)], 3)).toEqual({ col: 2, row: 1 });
    expect(fitColumns([f(1, 25, 1, 5)])).toBe(3);
    expect(fitColumns([f(1, 13, 1, 5), f(13, 25, 1, 5)])).toBe(2);
    expect(fitColumns([f(1, 11, 1, 5)])).toBeNull();
  });
});
