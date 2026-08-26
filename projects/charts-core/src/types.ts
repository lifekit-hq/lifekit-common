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

export interface DonutSegment {
  label: string;
  value: number;
  color?: string;
}
