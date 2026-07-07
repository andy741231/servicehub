import { useMemo } from 'react';
import useThemeStore from '../../store/themeStore';
import { getChartColors, CHART_SERIES_KEYS } from '../../utils/charts';

/**
 * Returns the current chart color palette resolved from CSS design tokens.
 * Re-reads whenever the theme changes so charts stay in sync with light/dark.
 */
export default function useChartColors() {
  const theme = useThemeStore((s) => s.theme);
  return useMemo(() => {
    const colors = getChartColors();
    // Ordered array for multi-series charts.
    colors.series = CHART_SERIES_KEYS.map((k) => colors[k]);
    return colors;
  }, [theme]);
}
