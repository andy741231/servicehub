import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

/**
 * Breadcrumbs navigation component.
 * @param {Array<{ label: string, to?: string }>} items - breadcrumb trail, last item is current page
 */
export default function Breadcrumbs({ items = [] }) {
  if (!items.length) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-subtle mb-2 flex-wrap">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1.5">
            {item.to && !isLast ? (
              <Link
                to={item.to}
                className="text-muted hover:text-text-base transition-colors duration-150"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-text-base font-medium" aria-current="page">
                {item.label}
              </span>
            )}
            {!isLast && <ChevronRight className="w-3.5 h-3.5 opacity-50" />}
          </span>
        );
      })}
    </nav>
  );
}
