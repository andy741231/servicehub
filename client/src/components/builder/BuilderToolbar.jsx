import { ArrowLeft } from 'lucide-react';

export default function BuilderToolbar({ title, description, Icon, onBack, status, leading, children }) {
  return (
    <header className="min-h-14 bg-surface border-b border-border flex items-center justify-between gap-3 px-4 py-2">
      <div className="flex min-w-0 items-center gap-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-base text-muted transition-colors hover:bg-surface-raised hover:text-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
            aria-label="Back to dashboard"
            title="Back to dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        {leading}
        {Icon && <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />}
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold text-base">{title}</h1>
          {(description || status) && (
            <div className="mt-0.5 flex items-center gap-2 text-xs text-muted">
              {description && <span className="truncate">{description}</span>}
              {status}
            </div>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </header>
  );
}
