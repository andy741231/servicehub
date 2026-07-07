import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import useChartColors from './useChartColors';
import ChartTooltip from './ChartTooltip';

export default function SimpleLineChart({ data, dataKeys, labels, colors }) {
  const c = useChartColors();
  const resolvedColors = colors || dataKeys.map((_, i) => c.series[i % c.series.length]);

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
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
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            name={labels?.[key] || key}
            stroke={resolvedColors[i]}
            strokeWidth={2}
            dot={{ r: 3, strokeWidth: 2, fill: c.surface }}
            activeDot={{ r: 5 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
