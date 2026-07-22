import { Check, CircleAlert, Loader2, RotateCw } from 'lucide-react';

const statusConfig = {
  idle:    { label: '',                Icon: null,       className: 'text-muted' },
  clean:   { label: 'Saved',           Icon: Check,      className: 'text-muted' },
  dirty:   { label: 'Unsaved changes', Icon: null,       className: 'text-warning' },
  saving:  { label: 'Saving…',         Icon: Loader2,    className: 'text-primary' },
  saved:   { label: 'Saved',           Icon: Check,      className: 'text-success' },
  error:   { label: 'Save failed',     Icon: CircleAlert,className: 'text-danger' },
};

export default function BuilderSaveStatus({ status = 'idle', compact = false, lastSavedAt = null, onRetry = null }) {
  const { label, Icon, className } = statusConfig[status] || statusConfig.idle;

  const timeLabel = (status === 'clean' || status === 'saved') && lastSavedAt
    ? `${label} · ${lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : label;

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`} role="status" aria-live="polite">
      {Icon ? <Icon className={`h-3.5 w-3.5 ${status === 'saving' ? 'animate-spin' : ''}`} /> : <span className={`h-1.5 w-1.5 rounded-full ${status === 'dirty' ? 'bg-warning' : 'bg-border'}`} />}
      {!compact && <span>{timeLabel}</span>}
      {status === 'error' && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1 ml-1 px-1.5 py-0.5 rounded text-xs font-medium text-danger hover:bg-danger/10 transition-colors"
          aria-label="Retry save"
        >
          <RotateCw className="h-3 w-3" /> Retry
        </button>
      )}
    </span>
  );
}
