import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import useChartColors from './useChartColors';
import ChartTooltip from './ChartTooltip';

export default function SimplePieChart({ data, dataKey = 'value', nameKey = 'name', colors }) {
  const c = useChartColors();
  const resolvedColors = colors || c.series;

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data}
          dataKey={dataKey}
          nameKey={nameKey}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={3}
        >
          {data.map((entry, i) => (
            <Cell key={`cell-${entry[nameKey]}`} fill={resolvedColors[i % resolvedColors.length]} />
          ))}
        </Pie>
        <Tooltip content={<ChartTooltip />} />
        <Legend
          verticalAlign="bottom"
          height={24}
          iconType="circle"
          wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
