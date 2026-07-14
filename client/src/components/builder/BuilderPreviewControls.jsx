import { Monitor, Smartphone, Tablet } from 'lucide-react';

const devices = [
  { id: 'desktop', label: 'Desktop', Icon: Monitor },
  { id: 'tablet', label: 'Tablet', Icon: Tablet },
  { id: 'mobile', label: 'Mobile', Icon: Smartphone },
];

export default function BuilderPreviewControls({ value, onChange, size = 'default' }) {
  const isCompact = size === 'compact';

  return (
    <div className={`flex items-center gap-1 rounded-base bg-surface-raised ${isCompact ? 'p-0.5' : 'p-1'}`} aria-label="Preview device">
      {devices.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={`flex items-center justify-center rounded-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 ${isCompact ? 'h-7 w-7' : 'h-9 w-9'} ${
            value === id ? 'bg-surface text-primary shadow-card-sm' : 'text-muted hover:bg-surface hover:text-base'
          }`}
          title={`${label} preview`}
          aria-label={`${label} preview`}
          aria-pressed={value === id}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}
