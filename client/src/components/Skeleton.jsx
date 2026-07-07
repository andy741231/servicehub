/**
 * Skeleton loading placeholder with shimmer animation.
 * @param {string} className - additional classes (e.g. width, height)
 * @param {string} variant - 'block' (default) or 'line'
 */
export default function Skeleton({ className = '', variant = 'block' }) {
  const base = 'skeleton';
  const v = variant === 'line' ? ' skeleton-line' : '';
  return <div className={`${base}${v} ${className}`} aria-hidden="true" />;
}

/**
 * Skeleton card — mimics a stat card layout during loading.
 */
export function SkeletonStatCard() {
  return (
    <div className="card">
      <Skeleton className="!w-10 !h-10 rounded-xl mb-3" />
      <Skeleton variant="line" className="!w-3/5" />
      <Skeleton className="!w-4/5 !h-7 mb-2" />
      <Skeleton variant="line" className="!w-1/2" />
    </div>
  );
}

/**
 * Skeleton table row — mimics a table row during loading.
 */
export function SkeletonTableRow({ cols = 4 }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton variant="line" className="!w-full" />
        </td>
      ))}
    </tr>
  );
}
