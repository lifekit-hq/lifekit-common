export interface ChartPoint {
  label: string;
  value: number;
  /** Timestamp (epoch ms) of the point; a line chart with `xSpacing: 'time'` places the point by it. */
  time?: number;
}

/** A fixed value-axis range; an omitted bound stays auto-scaled to the data. */
export interface ChartDomain {
  min?: number;
  max?: number;
}

/**
 * How a line chart spaces its points along x: `'even'` (default) gives each point an equal slot,
 * `'time'` places each by its `time`, so a burst of points reads as a burst.
 */
export type ChartXSpacing = 'even' | 'time';

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

/** One series' value at a scrubbed point. */
export interface ChartScrubValue {
  label: string;
  value: number;
}

/** The data point under a held pointer. */
export interface ChartScrubPoint {
  /** Index of the point in the drawn data. */
  index: number;
  /** The point's label; empty when the data carries none. */
  label: string;
  /** The x value: the category label, or the epoch-ms `time` on a time-spaced chart. */
  x: string | number;
  /** The headline value: the stacked total for a stacked chart, otherwise the first series' value. */
  y: number;
  /** Sum of every visible series' value at the point. */
  total: number;
  /** Each visible series' value at the point, in dataset order. */
  values: ChartScrubValue[];
}

/** What a chart tells its host while a pointer reads it. */
export interface ChartScrubHandlers {
  /** The held pointer moved onto a different point (fires once on touch-down, then on change). */
  onScrub(point: ChartScrubPoint): void;
  /** The pointer lifted or left the chart: the host snaps back to its resting value. */
  onRelease(): void;
}

/** A value's change between two points; `percent` is null when the starting value is zero. */
export interface ChartDelta {
  change: number;
  percent: number | null;
}
