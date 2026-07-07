import { useState, useMemo, useCallback } from 'react';
import { ChevronsUpDown, ArrowUp, ArrowDown, Pencil, Trash2 } from 'lucide-react';
import Pagination from './Pagination';

/**
 * Reusable data table with sortable headers, row hover actions, and responsive overflow.
 *
 * @param {Array<{ key: string, label: string, sortable?: boolean, render?: (row) => ReactNode }>} columns
 * @param {Array<object>} data - row objects keyed by column.key
 * @param {boolean} showActions - show edit/delete row action buttons
 * @param {(row: object) => void} onEdit - edit callback
 * @param {(row: object) => void} onDelete - delete callback
 * @param {number} pageSize - items per page (0 = no pagination)
 * @param {string} emptyMessage - message when data is empty
 */
export default function Table({
  columns = [],
  data = [],
  showActions = false,
  onEdit,
  onDelete,
  pageSize = 0,
  emptyMessage = 'No data available.',
}) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortable) return data;
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...data].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [data, sortKey, sortDir, columns]);

  const totalPages = pageSize > 0 ? Math.ceil(sortedData.length / pageSize) : 1;
  const pagedData = pageSize > 0
    ? sortedData.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : sortedData;

  const handleSort = useCallback((col) => {
    if (!col.sortable) return;
    if (sortKey === col.key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(col.key);
      setSortDir('asc');
    }
  }, [sortKey]);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-full inline-block align-middle">
        <table className="min-w-full divide-y divide-border">
          <thead>
            <tr>
              {columns.map((col) => {
                const isSorted = sortKey === col.key;
                return (
                  <th
                    key={col.key}
                    tabIndex={col.sortable ? 0 : undefined}
                    onClick={() => handleSort(col)}
                    onKeyDown={(e) => {
                      if (col.sortable && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        handleSort(col);
                      }
                    }}
                    className={`px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider whitespace-nowrap select-none ${
                      col.sortable ? 'cursor-pointer hover:text-text-base transition-colors' : ''
                    }`}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {col.sortable && (
                        isSorted ? (
                          sortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronsUpDown className="w-3.5 h-3.5 opacity-40" />
                        )
                      )}
                    </span>
                  </th>
                );
              })}
              {showActions && <th className="px-4 py-3 w-px" scope="col" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-soft">
            {pagedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (showActions ? 1 : 0)} className="px-4 py-12 text-center text-muted">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              pagedData.map((row, i) => (
                <tr key={row.id || i} className="transition-colors hover:bg-surface-raised/50 group">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-sm text-text-base whitespace-nowrap">
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                  {showActions && (
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        {onEdit && (
                          <button
                            type="button"
                            onClick={() => onEdit(row)}
                            className="w-8 h-8 flex items-center justify-center rounded-base text-muted hover:bg-surface-tertiary hover:text-text-base transition-colors"
                            aria-label="Edit row"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            type="button"
                            onClick={() => onDelete(row)}
                            className="w-8 h-8 flex items-center justify-center rounded-base text-muted hover:bg-danger-light hover:text-danger transition-colors"
                            aria-label="Delete row"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
        {pageSize > 0 && sortedData.length > pageSize && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={sortedData.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
          />
        )}
      </div>
    </div>
  );
}
