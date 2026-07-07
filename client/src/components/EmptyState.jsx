import { Inbox, Plus, ArrowRight } from 'lucide-react';

/**
 * Reusable empty state for sub-app dashboards.
 *
 * @param {string} title - Headline text.
 * @param {string} description - Supporting description.
 * @param {LucideIcon} icon - Lucide icon component.
 * @param {string} primaryLabel - Primary CTA label.
 * @param {Function} primaryAction - Primary CTA click handler.
 * @param {string} secondaryLabel - Optional secondary CTA label.
 * @param {Function} secondaryAction - Optional secondary CTA click handler.
 * @param {boolean} compact - Render a smaller inline variant (for tables/lists).
 */
export default function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  primaryLabel,
  primaryAction,
  secondaryLabel,
  secondaryAction,
  compact = false,
}) {
  if (compact) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-12 px-6">
        <div className="w-12 h-12 rounded-xl bg-primary-light text-primary flex items-center justify-center mb-4">
          <Icon className="w-6 h-6" />
        </div>
        <h3 className="text-subheading font-semibold text-text-base">{title}</h3>
        <p className="text-small text-muted mt-1 max-w-xs">{description}</p>
        {primaryLabel && (
          <button
            onClick={primaryAction}
            className="mt-4 inline-flex items-center gap-2 px-4 h-9 rounded-base bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-hover transition-colors duration-150 ease-out"
          >
            <Plus className="w-4 h-4" />
            {primaryLabel}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6 max-w-md mx-auto">
      <div className="w-14 h-14 rounded-2xl bg-primary-light text-primary flex items-center justify-center mb-5">
        <Icon className="w-7 h-7" />
      </div>
      <h2 className="text-heading font-bold text-text-base">{title}</h2>
      <p className="text-body text-muted mt-2">{description}</p>
      <div className="flex flex-col sm:flex-row items-center gap-3 mt-6">
        {primaryLabel && (
          <button
            onClick={primaryAction}
            className="inline-flex items-center gap-2 px-4 h-10 rounded-base bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-hover transition-colors duration-150 ease-out min-w-[44px]"
          >
            <Plus className="w-4 h-4" />
            {primaryLabel}
          </button>
        )}
        {secondaryLabel && (
          <button
            onClick={secondaryAction}
            className="inline-flex items-center gap-2 px-4 h-10 rounded-base border border-border bg-surface text-text-base text-sm font-medium hover:bg-surface-raised transition-colors duration-150 ease-out min-w-[44px]"
          >
            {secondaryLabel}
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
