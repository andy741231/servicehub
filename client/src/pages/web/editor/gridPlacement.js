/**
 * gridPlacement.js — Pure functions for 2-D grid-aware block drop calculation
 * and auto-packing inside a multi-column section.
 *
 * These are extracted from MoveableWrapper's imperative DOM code so they can
 * be unit-tested with hand-crafted rect arrays. The caller is responsible for
 * converting live DOM elements into the sibling descriptors these functions
 * expect.
 *
 * Section model: a section is a CSS grid with `columns` columns and implicit
 * rows (auto-flow). Each block has an optional `_colSpan` and `_rowSpan`
 * stored in `block.content`. For exact placement, blocks may also carry
 * `_colStart` / `_rowStart` (1-indexed).
 */

// ─── Types ────────────────────────────────────────────────────────────
//
// SiblingRect: { id: string, rect: { left, top, right, bottom, width, height } }
// Point:       { x: number, y: number }
// DropResult:  { index: number, indicator: { x, y, width, height } | null }
//
// `index` is the flat child index within the parent's `nodes` array that the
// dragged block should be moved to. The caller must apply the Craft.js
// `+1` correction when `index > currentIndex` (see web-grid.md §4.2).

// ─── computeGridDrop ──────────────────────────────────────────────────

/**
 * Default tolerance for grouping sibling rects into the same visual row.
 * Pixels of vertical difference in `top` edge allowed before a sibling is
 * considered to be on a new row.
 */
export const DEFAULT_ROW_TOLERANCE = 8;

/**
 * Given the siblings of the dragged block (excluding the dragged block
 * itself) and the cursor position, compute the flat child index to move the
 * block to and a drop indicator rectangle.
 *
 * The function:
 *   1. Groups siblings into visual rows by top-edge proximity.
 *   2. Finds the nearest row by cursor `y`.
 *   3. Finds the target column within that row by cursor `x`.
 *   4. Converts (row, col) back to a flat index in the original sibling order.
 *
 * @param {SiblingRect[]} siblings  — siblings of the dragged block, in DOM
 *                                    order, excluding the dragged block.
 * @param {Point} point             — cursor position in viewport coords.
 * @param {object} [opts]
 * @param {number} [opts.rowTolerance=8] — max px difference in `top` to be
 *                                    considered the same row.
 * @returns {DropResult}
 */
export function computeGridDrop(siblings, point, opts = {}) {
  const rowTolerance = opts.rowTolerance ?? DEFAULT_ROW_TOLERANCE;

  if (!siblings || siblings.length === 0) {
    return { index: 0, indicator: null };
  }

  // 1. Group siblings into rows by top-edge proximity (preserves DOM order).
  const rows = groupIntoRows(siblings, rowTolerance);

  // 2. Find the target row (nearest row by y).
  const { rowIndex } = findNearestRow(rows, point.y);

  // 3. Find the target column inside that row by x.
  const row = rows[rowIndex];
  const colIndex = findColumnInRow(row, point.x);

  // 4. Convert (row, col) → flat index in the original siblings array.
  //    Because `siblings` preserves DOM order and rows are built in DOM
  //    order, the flat index is: (count of items in all preceding rows) + col.
  const preceding = rows.slice(0, rowIndex).reduce((sum, r) => sum + r.items.length, 0);
  const finalIndex = preceding + colIndex;

  // 5. Build the indicator — a full-cell ghost at the drop slot.
  const indicator = buildIndicator(row, colIndex);

  return { index: finalIndex, indicator };
}

/**
 * Group sibling rects into visual rows by top-edge proximity.
 * Siblings whose `top` differs by more than `tolerance` start a new row.
 * Within a row, `bottom` is the max of all members (handles mixed heights).
 *
 * @param {SiblingRect[]} siblings
 * @param {number} tolerance
 * @returns {Array<{ top: number, bottom: number, items: SiblingRect[] }>}
 */
function groupIntoRows(siblings, tolerance) {
  const rows = [];
  for (const sib of siblings) {
    const last = rows[rows.length - 1];
    if (!last || Math.abs(sib.rect.top - last.top) > tolerance) {
      rows.push({
        top: sib.rect.top,
        bottom: sib.rect.bottom,
        items: [sib],
      });
    } else {
      last.items.push(sib);
      last.bottom = Math.max(last.bottom, sib.rect.bottom);
    }
  }
  return rows;
}

/**
 * Find the row whose vertical range contains `y`, or the row whose center is
 * nearest to `y` if `y` is in a gap between rows.
 *
 * @param {Array<{ top, bottom, items }>} rows
 * @param {number} y
 * @returns {{ rowIndex: number }}
 */
function findNearestRow(rows, y) {
  let rowIndex = 0;
  let bestDist = Infinity;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (y >= row.top && y <= row.bottom) {
      // Cursor is inside this row's vertical range — exact match.
      return { rowIndex: i };
    }
    // Otherwise track the nearest by center distance (only if no exact match
    // has been found yet — exact matches short-circuit above).
    const center = (row.top + row.bottom) / 2;
    const dist = Math.abs(y - center);
    if (dist < bestDist) {
      bestDist = dist;
      rowIndex = i;
    }
  }

  return { rowIndex };
}

/**
 * Within a single row, find the column index where the cursor `x` falls.
 * Returns 0 if cursor is left of the first item, items.length if right of
 * the last.
 *
 * @param {{ top, bottom, items: SiblingRect[] }} row
 * @param {number} x
 * @returns {number}
 */
function findColumnInRow(row, x) {
  for (let i = 0; i < row.items.length; i++) {
    const r = row.items[i].rect;
    if (x < r.left + r.width / 2) {
      return i;
    }
  }
  return row.items.length;
}

/**
 * Build the indicator rectangle for the drop slot.
 * If dropping before an existing item, highlight that item's cell.
 * If dropping after the last item in a row, show a thin insertion line at
 * the right edge of the last item.
 *
 * @param {{ items: SiblingRect[] }} row
 * @param {number} colIndex
 * @returns {{ x, y, width, height } | null}
 */
function buildIndicator(row, colIndex) {
  if (!row || row.items.length === 0) return null;

  const target = row.items[colIndex];
  if (target) {
    return {
      x: target.rect.left,
      y: target.rect.top,
      width: target.rect.width,
      height: target.rect.height,
    };
  }

  // After the last item — insertion line at the right edge.
  const last = row.items[row.items.length - 1];
  return {
    x: last.rect.right,
    y: last.rect.top,
    width: 3,
    height: last.rect.height,
  };
}

// ─── packBlocks ───────────────────────────────────────────────────────

/**
 * Greedy row-major packer. Assigns `_colStart` / `_rowStart` (1-indexed) to
 * each block so that no two blocks overlap in the grid. Blocks are placed in
 * array order; each block is placed at the first (row, col) where it fits.
 *
 * Mutates each block's `content` in place AND returns the same array for
 * convenience.
 *
 * @param {Array<{ content: { _colSpan?: number, _rowSpan?: number, _colStart?: number, _rowStart?: number } }>} blocks
 * @param {number} columns — section column count (1–6).
 * @returns {Array} the same `blocks` array, with starts assigned.
 */
export function packBlocks(blocks, columns) {
  if (!blocks || blocks.length === 0 || columns < 1) return blocks || [];

  const occupied = new Set(); // key: `${row},${col}`

  const fits = (r, c, cSpan, rSpan) => {
    for (let rr = r; rr < r + rSpan; rr++) {
      for (let cc = c; cc < c + cSpan; cc++) {
        if (cc > columns) return false;
        if (occupied.has(`${rr},${cc}`)) return false;
      }
    }
    return true;
  };

  const mark = (r, c, cSpan, rSpan) => {
    for (let rr = r; rr < r + rSpan; rr++) {
      for (let cc = c; cc < c + cSpan; cc++) {
        occupied.add(`${rr},${cc}`);
      }
    }
  };

  for (const block of blocks) {
    const content = block.content || (block.content = {});
    // Clamp span to grid bounds.
    const cSpan = Math.min(Math.max(content._colSpan || 1, 1), columns);
    const rSpan = Math.max(content._rowSpan || 1, 1);

    let r = 1;
    let c = 1;
    while (!fits(r, c, cSpan, rSpan)) {
      c++;
      if (c + cSpan - 1 > columns) {
        c = 1;
        r++;
      }
    }

    content._colStart = c;
    content._rowStart = r;
    mark(r, c, cSpan, rSpan);
  }

  return blocks;
}

// ─── craftMoveIndex ───────────────────────────────────────────────────

/**
 * Craft.js `actions.move(targetId, parentId, index)` inserts the node at
 * `index` while the old slot is still marked `$$`, then removes `$$` from
 * the end. This means moving to a *later* index in the same parent lands the
 * block one slot early unless we add +1.
 *
 * This helper computes the correct index to pass to `actions.move` given the
 * desired final index and the block's current index in the same parent.
 *
 * For cross-parent moves (different parent), no correction is needed — the
 * block doesn't exist in the new parent's nodes array yet.
 *
 * @param {number} desiredIndex  — where the block should end up in the
 *                                 target parent's nodes array.
 * @param {number} currentIndex  — the block's current index in the target
 *                                 parent's nodes array. Use -1 (or any
 *                                 negative) for cross-parent moves.
 * @returns {number} the index to pass to `actions.move`.
 */
export function craftMoveIndex(desiredIndex, currentIndex) {
  if (currentIndex < 0) return desiredIndex; // cross-parent
  if (desiredIndex === currentIndex) return desiredIndex; // no-op
  if (desiredIndex > currentIndex) return desiredIndex + 1; // same-parent, later
  return desiredIndex; // same-parent, earlier
}
