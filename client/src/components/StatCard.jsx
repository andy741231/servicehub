import { TrendingUp, TrendingDown } from 'lucide-react';

const COLOR_MAP = {
  primary: { bg: 'bg-primary-light', fg: 'text-primary' },
  info:    { bg: 'bg-info-light',    fg: 'text-info' },
  success: { bg: 'bg-success-light', fg: 'text-success' },
  warning: { bg: 'bg-warning-light', fg: 'text-warning' },
  danger:  { bg: 'bg-danger-light',  fg: 'text-danger' },
};

/**
 * Mini CSS bar-chart sparkline.
 * @param {number[]} data - array of values 0-100
 * @param {string} color - semantic color key
 */
export function Sparkline({ data = [40, 55, 45, 70, 60, 85, 75, 90, 80, 95], color = 'primary' }) {
  const c = COLOR_MAP[color] || COLOR_MAP.primary;
  return (
    <div className="flex items-end gap-0.5 h-8 mt-3" aria-hidden="true">
      {data.map((v, i) => (
        <div
          key={i}
          className={`flex-1 rounded-sm ${c.fg.replace('text-', 'bg-')}`}
          style={{ height: `${v}%`, opacity: 0.3 + (i / data.length) * 0.5 }}
        />
      ))}
    </div>
  );
}

/**
 * Stat card with icon, value, trend, and optional sparkline.
 * @param {string} label - metric label
 * @param {string} value - metric value
 * @param {string} icon - Lucide icon component
 * @param {string} color - semantic color (primary|info|success|warning|danger)
 * @param {string} trend - trend description
 * @param {boolean} up - trend direction
 * @param {boolean} sparkline - show sparkline
 * @param {number[]} sparkData - sparkline data
 */
export default function StatCard({ label, value, icon: Icon, color = 'primary', trend, up = true, sparkline = false, sparkData }) {
  const c = COLOR_MAP[color] || COLOR_MAP.primary;
  return (
    <div className="card transition-shadow duration-200 ease-out hover:shadow-dropdown hover:-translate-y-px">
      <div className={`w-10 h-10 rounded-xl ${c.bg} ${c.fg} flex items-center justify-center mb-3`}>
        {Icon && <Icon className="w-5 h-5" />}
      </div>
      <div className="text-xs font-medium text-muted uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-bold text-text-base mt-1">{value}</div>
      {trend && (
        <div className={`flex items-center gap-1 text-xs mt-1 ${up ? 'text-success' : 'text-danger'}`}>
          {up ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          {trend}
        </div>
      )}
      {sparkline && <Sparkline data={sparkData} color={color} />}
    </div>
  );
}
