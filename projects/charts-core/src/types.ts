export interface ChartPoint {
  label: string;
  value: number;
}

/** One stacked band; all series in a chart share x labels (index-aligned). */
export interface AreaSeries {
  label: string;
  color?: string;
  points: ChartPoint[];
}

/** One bar group; series in a chart share x labels (index-aligned). */
export interface BarSeries {
  label: string;
  color?: string;
  points: ChartPoint[];
}

export type BarValueFormat = 'currency' | 'percent';

/** Formats a chart value; `compact` is set for axis ticks, which have less room than tooltips. */
export type ChartValueFormatter = (value: number, compact: boolean) => string;

/**
 * How a value-axis chart renders its values: a built-in kind, or a consumer formatter.
 * `'currency'` uses the chart's `currency`; `'number'` and `'percent'` carry no currency symbol.
 */
export type ChartValueFormat = 'currency' | 'number' | 'percent' | ChartValueFormatter;

export interface DonutSegment {
  label: string;
  value: number;
  color?: string;
}
