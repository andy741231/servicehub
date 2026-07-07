import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Pagination footer for tables.
 * @param {number} currentPage - current page (1-indexed)
 * @param {number} totalPages - total number of pages
 * @param {number} totalItems - total item count
 * @param {number} pageSize - items per page
 * @param {(page: number) => void} onPageChange - page change callback
 */
export default function Pagination({ currentPage = 1, totalPages = 1, totalItems = 0, pageSize = 10, onPageChange }) {
  const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  const pages = [];
  const maxButtons = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);
  if (endPage - startPage < maxButtons - 1) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }
  for (let i = startPage; i <= endPage; i++) pages.push(i);

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 border-t border-border text-sm flex-wrap">
      <span className="text-muted">
        Showing {start}–{end} of {totalItems} results
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange?.(currentPage - 1)}
          className="w-8 h-8 flex items-center justify-center rounded-base text-muted hover:bg-surface-raised hover:text-text-base transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {pages.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange?.(p)}
            className={`min-w-[44px] h-8 px-2 flex items-center justify-center rounded-base text-sm font-medium transition-colors ${
              p === currentPage
                ? 'bg-primary text-primary-foreground'
                : 'text-muted hover:bg-surface-raised hover:text-text-base'
            }`}
            aria-current={p === currentPage ? 'page' : undefined}
          >
            {p}
          </button>
        ))}
        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange?.(currentPage + 1)}
          className="w-8 h-8 flex items-center justify-center rounded-base text-muted hover:bg-surface-raised hover:text-text-base transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
