// ── Chart theming ──────────────────────────────────────────────────────────
// Charts render to SVG, where CSS `var()` does not resolve inside presentation
// attributes (stroke/fill). So we read the computed HSL values from the design
// tokens at call time and hand Recharts concrete `hsl(...)` strings. Because we
// read them live, they automatically reflect the active theme (light/dark).
function readToken(name) {
  if (typeof window === 'undefined') return '';
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return raw ? `hsl(${raw})` : '';
}

/**
 * Resolve the current chart color palette from CSS variables.
 * Call inside `useChartColors()` so results refresh on theme change.
 */
export function getChartColors() {
  return {
    primary:  readToken('--chart-primary'),
    success:  readToken('--chart-success'),
    warning:  readToken('--chart-warning'),
    danger:   readToken('--chart-danger'),
    info:     readToken('--chart-info'),
    muted:    readToken('--chart-muted'),
    grid:     readToken('--chart-grid'),
    axis:     readToken('--chart-axis'),
    axisTick: readToken('--chart-axis-tick'),
    // Surface/text tokens for custom tooltip styling.
    surface:      readToken('--surface'),
    border:       readToken('--border'),
    text:         readToken('--text-base'),
    onPrimary:    readToken('--primary-foreground'),
  };
}

// Ordered palette used when a chart has multiple series and no explicit colors.
export const CHART_SERIES_KEYS = ['primary', 'success', 'warning', 'danger', 'info', 'muted'];

export function groupByDate(items, dateKey = 'createdAt', valueKey = 'count', days = 7) {
  const buckets = new Map();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    buckets.set(label, { name: label, [valueKey]: 0, date: d });
  }

  items.forEach((item) => {
    const date = new Date(item[dateKey]);
    const cutoff = new Date(today);
    cutoff.setDate(cutoff.getDate() - (days - 1));
    cutoff.setHours(0, 0, 0, 0);
    if (date < cutoff) return;

    const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (buckets.has(label)) {
      buckets.get(label)[valueKey] += 1;
    }
  });

  return Array.from(buckets.values());
}

export function groupByWeek(items, dateKey = 'createdAt', valueKey = 'count', weeks = 4) {
  const buckets = new Map();
  const now = new Date();

  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const label = `Week ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    buckets.set(weekStart.getTime(), { name: label, [valueKey]: 0, weekStart });
  }

  items.forEach((item) => {
    const date = new Date(item[dateKey]);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const key = weekStart.getTime();
    const existing = Array.from(buckets.values()).find((b) => b.weekStart.getTime() === key);
    if (existing) {
      existing[valueKey] += 1;
    }
  });

  return Array.from(buckets.values());
}

export function groupByCategory(items, key) {
  const counts = {};
  items.forEach((item) => {
    const value = item[key] || 'Unknown';
    counts[value] = (counts[value] || 0) + 1;
  });
  return Object.entries(counts).map(([name, value]) => ({ name, value }));
}

/**
 * Build sparkline data (cumulative count over time) from a list of items.
 * Returns an array of { value } points, one per day for the last `days` days.
 * Each value is the running total up to that day — so the final point equals
 * the total count, giving the sparkline a clear growth shape.
 */
export function buildSparklineData(items, dateKey = 'createdAt', days = 14) {
  const buckets = new Array(days).fill(0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - (days - 1));

  items.forEach((item) => {
    if (!item[dateKey]) return;
    const d = new Date(item[dateKey]);
    d.setHours(0, 0, 0, 0);
    const diff = Math.floor((d - startDate) / 86400000);
    if (diff >= 0 && diff < days) {
      buckets[diff] += 1;
    }
  });

  // Cumulative sum so the sparkline shows growth toward the total
  let running = 0;
  return buckets.map((count) => {
    running += count;
    return { value: running };
  });
}

/**
 * Build a simple sparkline from raw values (no date parsing).
 * Just wraps each number in { value }.
 */
export function sparklineFromValues(values) {
  return values.map((v) => ({ value: v }));
}
