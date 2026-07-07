import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import useChartColors from './useChartColors';
import ChartTooltip from './ChartTooltip';

export default function SimpleAreaChart({ data, dataKeys, labels, colors, stacked = false }) {
  const c = useChartColors();
  const resolvedColors = colors || dataKeys.map((_, i) => c.series[i % c.series.length]);

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
        <defs>
          {dataKeys.map((key, i) => (
            <linearGradient key={key} id={`areaGrad-${key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={resolvedColors[i]} stopOpacity={0.3} />
              <stop offset="95%" stopColor={resolvedColors[i]} stopOpacity={0.05} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
        <XAxis
          dataKey={labels?.dataKey || 'name'}
          tick={{ fill: c.axisTick, fontSize: 12 }}
          axisLine={{ stroke: c.axis }}
          tickLine={{ stroke: c.axis }}
        />
        <YAxis
          tick={{ fill: c.axisTick, fontSize: 12 }}
          axisLine={{ stroke: c.axis }}
          tickLine={{ stroke: c.axis }}
          allowDecimals={false}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: c.axis, strokeWidth: 1 }} />
        {dataKeys.length > 1 && (
          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
        )}
        {dataKeys.map((key, i) => (
          <Area
            key={key}
            type="monotone"
            dataKey={key}
            name={labels?.[key] || key}
            stroke={resolvedColors[i]}
            fill={`url(#areaGrad-${key})`}
            strokeWidth={2}
            stackId={stacked ? 'stack' : undefined}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
