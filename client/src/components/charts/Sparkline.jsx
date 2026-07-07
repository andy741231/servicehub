import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import useChartColors from './useChartColors';

/**
 * Tiny inline sparkline for embedding inside stat tiles.
 * Renders a smooth line with no axes or grid — just the trend shape.
 *
 * @param {Array<{value: number}>} data - Time-series data points
 * @param {string} color - Stroke color. Falls back to the chart primary token.
 * @param {number} height - Chart height in px (default 40)
 */
export default function Sparkline({ data = [], color, height = 40 }) {
  const c = useChartColors();
  const stroke = color || c.primary;
  if (!data || data.length === 0) {
    data = [{ value: 0 }, { value: 0 }];
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
        <YAxis domain={['dataMin', 'dataMax']} hide />
        <Line
          type="monotone"
          dataKey="value"
          stroke={stroke}
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
