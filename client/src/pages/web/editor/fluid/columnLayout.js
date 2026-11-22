/**
 * Column layout model — a constraint layer on the 24-column fluid grid.
 *
 * A section with `fluidConfig.columns` = n (1, 2, 3, 4 or 6) is n equal
 * columns of 24/n grid columns each. Every block starts on a column boundary
 * and spans whole columns; each column is a vertical stack, so a block's
 * rowStart is the bottom of whatever sits above it in the columns it spans.
 * No overlap, no layers.
 *
 * Storage is unchanged: the derived colStart/colEnd/rowStart/rowEnd are
 * written to each block's `fluid` like any other placement, so the public
 * renderer needs no new logic. Sections without `columns` keep their stored
 * freeform coordinates untouched (nothing on existing pages changes).
 * Desktop only — phones use the existing single-column auto-stack.
 */
export const COLUMN_OPTIONS = [1, 2, 3, 4, 6];
export const DEFAULT_COLUMNS = 3;

export const sectionColumns = (section) => {
  const n = section?.fluidConfig?.columns;
  return COLUMN_OPTIONS.includes(n) ? n : null;
};
export const isColumnMode = (section) => sectionColumns(section) != null;

/** Width of one column in grid columns. */
export const columnSpan = (n, gridColumns = 24) => gridColumns / n;

/** Snap a placement's columns: left edge to the nearest column, width to whole columns. */
export function snapToColumns(fluid, n, gridColumns = 24) {
  const w = columnSpan(n, gridColumns);
  const start = Math.min(n - 1, Math.max(0, Math.round(((fluid.colStart ?? 1) - 1) / w)));
  const span = Math.min(n - start, Math.max(1, Math.round(((fluid.colEnd ?? gridColumns + 1) - (fluid.colStart ?? 1)) / w)));
  return { colStart: start * w + 1, colEnd: (start + span) * w + 1 };
}

/** Column index (0-based) and span (in columns) of a placement. */
export function columnOf(fluid, n, gridColumns = 24) {
  const w = columnSpan(n, gridColumns);
  return { col: Math.round((fluid.colStart - 1) / w), span: Math.max(1, Math.round((fluid.colEnd - fluid.colStart) / w)) };
}

/**
 * Re-derive every block's placement: snap to columns, then stack in reading
 * order (rowStart, then column). `movedIndex` marks the block that was just
 * placed: it goes *before* a block starting on the same row, so dropping it
 * onto an occupied spot inserts it there and pushes the rest down.
 * Heights (row spans) are kept. Returns new placements (one per block).
 */
export function restack(placements, n, gridColumns = 24, { movedIndex = null } = {}) {
  const w = columnSpan(n, gridColumns);
  const items = placements.map((f, i) => {
    const s = snapToColumns(f, n, gridColumns);
    const rows = Math.max(1, (f.rowEnd ?? (f.rowStart ?? 1) + 2) - (f.rowStart ?? 1));
    return { i, ...s, rows, key: (f.rowStart ?? 1) - (i === movedIndex ? 0.5 : 0) };
  });
  items.sort((a, b) => (a.key - b.key) || (a.colStart - b.colStart) || (a.i - b.i));
  const bottom = new Array(n).fill(1); // next free row in each column
  const out = new Array(placements.length);
  for (const it of items) {
    const c0 = (it.colStart - 1) / w;
    const c1 = (it.colEnd - 1) / w;
    let start = 1;
    for (let c = c0; c < c1; c++) start = Math.max(start, bottom[c]);
    for (let c = c0; c < c1; c++) bottom[c] = start + it.rows;
    out[it.i] = { ...placements[it.i], colStart: it.colStart, colEnd: it.colEnd, rowStart: start, rowEnd: start + it.rows, zIndex: 0 };
  }
  return out;
}

/** Blocks of a section with their desktop placements re-derived (column mode only). */
export function restackSection(section, opts = {}) {
  const n = sectionColumns(section);
  const blocks = section.blocks || [];
  if (!n || !blocks.length) return blocks;
  const grid = section.fluidConfig?.gridColumns || 24;
  const next = restack(blocks.map((b) => b.fluid || { colStart: 1, colEnd: grid + 1, rowStart: 1, rowEnd: 3 }), n, grid, opts);
  return blocks.map((b, i) => ({ ...b, fluid: next[i] }));
}

/**
 * Switch a section to n columns (or back to freeform with n = null). Returns
 * the section patch. Converting snaps each block's left edge and width to the
 * columns and stacks them top-down in reading order.
 */
export function applyColumns(section, n) {
  const fluidConfig = { ...(section.fluidConfig || {}), columns: n ?? undefined };
  if (!n) return { fluidConfig };
  const blocks = restackSection({ ...section, fluidConfig });
  return { fluidConfig, blocks };
}

/** The column whose stack ends highest (where a new block fits best), 0-based. */
export function shortestColumn(placements, n, gridColumns = 24) {
  const w = columnSpan(n, gridColumns);
  const bottom = new Array(n).fill(1);
  for (const f of placements) {
    const c0 = Math.round((f.colStart - 1) / w);
    const c1 = Math.round((f.colEnd - 1) / w);
    for (let c = c0; c < c1 && c < n; c++) bottom[c] = Math.max(bottom[c], f.rowEnd);
  }
  let best = 0;
  for (let c = 1; c < n; c++) if (bottom[c] < bottom[best]) best = c;
  return { col: best, row: bottom[best] };
}

/**
 * Column count that represents a template's layout exactly (all block edges
 * on column boundaries), preferring the default; null when none does (the
 * section stays freeform).
 */
export function fitColumns(placements, gridColumns = 24) {
  for (const n of [DEFAULT_COLUMNS, 1, 2, 4, 6]) {
    const w = columnSpan(n, gridColumns);
    if (placements.every((f) => ((f.colStart ?? 1) - 1) % w === 0 && ((f.colEnd ?? gridColumns + 1) - 1) % w === 0)) return n;
  }
  return null;
}
