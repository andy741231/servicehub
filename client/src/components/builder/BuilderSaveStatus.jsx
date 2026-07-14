import { Check, CircleAlert, Loader2 } from 'lucide-react';

const statusConfig = {
  idle: { label: 'Saved', Icon: Check, className: 'text-muted' },
  unsaved: { label: 'Unsaved changes', Icon: null, className: 'text-muted' },
  saving: { label: 'Saving…', Icon: Loader2, className: 'text-primary' },
  saved: { label: 'Saved', Icon: Check, className: 'text-success' },
  error: { label: 'Save failed', Icon: CircleAlert, className: 'text-danger' },
};

export default function BuilderSaveStatus({ status = 'idle', compact = false }) {
  const { label, Icon, className } = statusConfig[status] || statusConfig.idle;

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`} role="status" aria-live="polite">
      {Icon ? <Icon className={`h-3.5 w-3.5 ${status === 'saving' ? 'animate-spin' : ''}`} /> : <span className="h-1.5 w-1.5 rounded-full bg-border" />}
      {!compact && <span>{label}</span>}
    </span>
  );
}
