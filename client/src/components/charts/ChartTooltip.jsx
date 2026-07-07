import useChartColors from './useChartColors';

/**
 * Custom Recharts tooltip that matches the Service Hub design system.
 * Uses semantic tokens (surface, border, text) so it adapts to light/dark mode.
 *
 * Usage: <Tooltip content={<ChartTooltip />} />
 */
export default function ChartTooltip({ active, payload, label }) {
  const c = useChartColors();
  if (!active || !payload || !payload.length) return null;

  return (
    <div
      style={{
        backgroundColor: c.surface,
        border: `1px solid ${c.border}`,
        borderRadius: '8px',
        boxShadow: 'var(--shadow-dropdown-value)',
        padding: '8px 12px',
        fontSize: '12px',
        color: c.text,
        lineHeight: 1.5,
        maxWidth: '220px',
      }}
    >
      {label && (
        <div style={{ fontWeight: 600, marginBottom: payload.length > 1 ? '4px' : 0 }}>
          {label}
        </div>
      )}
      {payload.map((entry, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              display: 'inline-block',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: entry.color || entry.payload?.fill || c.muted,
              flexShrink: 0,
            }}
          />
          <span style={{ color: c.text }}>
            {entry.name}: <strong>{entry.value}</strong>
          </span>
        </div>
      ))}
    </div>
  );
}
