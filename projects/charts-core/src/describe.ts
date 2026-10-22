import {type ChartPoint, type ChartTable, type DonutSegment} from './types';
import {chartDelta} from './utils';

/**
 * The text alternatives a chart carries beside its canvas: a short summary for its accessible
 * name, the reading of one point, bar or segment for a live announcement, and its data as a table.
 * Each takes the formatter the chart's tooltip uses, so the text reads exactly as the canvas does.
 */

/** Formats one value the way the chart's tooltip shows it. */
export type ChartTextFormat = (value: number) => string;

/** A labelled run of points: a line, an area band or a bar series. */
interface PointSeries {
  label: string;
  points: readonly ChartPoint[];
}

const PERCENT_SCALE = 100;
const SHARE_DIGITS = 1;

/** "A", "A and B", "A, B and C". */
function listOf(names: readonly string[]): string {
  return names.length <= 1
    ? (names[0] ?? '')
    : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

/** How a value moved: "up 12.5%", "down $40" (from zero, which has no percent) or "unchanged". */
function trend(from: number, to: number, format: ChartTextFormat): string {
  const {change, percent} = chartDelta(from, to);
  if (change === 0) {
    return 'unchanged';
  }
  const direction = change > 0 ? 'up' : 'down';
  return percent === null
    ? `${direction} ${format(Math.abs(change))}`
    : `${direction} ${Math.abs(percent).toFixed(SHARE_DIGITS)}%`;
}

/** The span a run of points covers: "12 points from May to Apr", or "1 point at May". */
function span(points: readonly ChartPoint[], noun: string): string {
  const first = points[0];
  const last = points[points.length - 1];
  return points.length === 1
    ? `${plural(1, noun)} at ${first.label}`
    : `${plural(points.length, noun)} from ${first.label} to ${last.label}`;
}

/** Sum of every series' value at `index`; a series without a point there adds nothing. */
function totalAt(series: readonly PointSeries[], index: number): number {
  return series.reduce((sum, s) => sum + (s.points[index]?.value ?? 0), 0);
}

function share(value: number, total: number): string {
  return `${(total > 0 ? (value / total) * PERCENT_SCALE : 0).toFixed(SHARE_DIGITS)}%`;
}

/** A line chart's summary: its span, first and last values and the trend between them. */
export function describeLineChart(points: readonly ChartPoint[], format: ChartTextFormat): string {
  if (points.length === 0) {
    return '';
  }
  const first = points[0];
  const last = points[points.length - 1];
  if (points.length === 1) {
    return `${first.label}: ${format(first.value)}`;
  }
  return `${span(points, 'point')}: ${format(first.value)} to ${format(last.value)}, ${trend(first.value, last.value, format)}`;
}

/**
 * An area chart's summary: its bands, its span and, when the bands stack (or there is only one),
 * how the total moved across it.
 */
export function describeAreaChart(
  series: readonly PointSeries[],
  format: ChartTextFormat,
  stacked: boolean
): string {
  const points = series[0]?.points ?? [];
  if (points.length === 0) {
    return '';
  }
  const names = listOf(series.map(s => s.label));
  const lastIndex = points.length - 1;
  const first = totalAt(series, 0);
  const last = totalAt(series, lastIndex);
  const what = series.length > 1 ? 'total ' : '';
  const reading =
    points.length === 1
      ? `${what}${format(first)}`
      : `${what}${format(first)} to ${format(last)}, ${trend(first, last, format)}`;
  return stacked || series.length === 1
    ? `${names}, ${span(points, 'point')}; ${reading}`
    : `${names}, ${span(points, 'point')}`;
}

/** A bar chart's summary: its span and, for a single series, its highest and lowest bar. */
export function describeBarChart(series: readonly PointSeries[], format: ChartTextFormat): string {
  const points = series[0]?.points ?? [];
  if (points.length === 0) {
    return '';
  }
  if (series.length > 1) {
    return `${listOf(series.map(s => s.label))}, ${span(points, 'group')}`;
  }
  if (points.length === 1) {
    return `${points[0].label}: ${format(points[0].value)}`;
  }
  const highest = points.reduce((best, p) => (p.value > best.value ? p : best));
  const lowest = points.reduce((best, p) => (p.value < best.value ? p : best));
  return `${span(points, 'bar')}; highest ${highest.label}, ${format(highest.value)}; lowest ${lowest.label}, ${format(lowest.value)}`;
}

/** A donut chart's summary: how many segments, their total and the largest one's share. */
export function describeDonutChart(
  segments: readonly DonutSegment[],
  format: ChartTextFormat
): string {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (segments.length === 0 || total <= 0) {
    return '';
  }
  const largest = segments.reduce((best, s) => (s.value > best.value ? s : best));
  return `${plural(segments.length, 'segment')} totalling ${format(total)}; largest ${largest.label}, ${format(largest.value)} (${share(largest.value, total)})`;
}

/**
 * What point `index` reads across `series`: "May: $1,200" for one series, else each series' value
 * ("May: Cash $200, Stocks $1,000"), plus their total when `withTotal`. Empty past the end.
 */
export function describeSeriesAt(
  series: readonly PointSeries[],
  index: number,
  format: ChartTextFormat,
  withTotal = false
): string {
  const point = series[0]?.points[index];
  if (!point) {
    return '';
  }
  if (series.length === 1) {
    return `${point.label}: ${format(point.value)}`;
  }
  const values = series
    .filter(s => s.points[index] !== undefined)
    .map(s => `${s.label} ${format(s.points[index].value)}`);
  const total = withTotal ? [`total ${format(totalAt(series, index))}`] : [];
  return `${point.label}: ${[...values, ...total].join(', ')}`;
}

/** What segment `index` reads: "Housing: $4,200, 42.0%". Empty past the end. */
export function describeSegmentAt(
  segments: readonly DonutSegment[],
  index: number,
  format: ChartTextFormat
): string {
  const segment = segments[index];
  if (!segment) {
    return '';
  }
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  return `${segment.label}: ${format(segment.value)}, ${share(segment.value, total)}`;
}

/** The table of a line, area or bar chart: a row per x position, a column per series. */
export function seriesTable(
  series: readonly PointSeries[],
  format: ChartTextFormat,
  withTotal = false
): ChartTable {
  const points = series[0]?.points ?? [];
  const total = withTotal && series.length > 1;
  return {
    headers: ['Label', ...series.map(s => s.label), ...(total ? ['Total'] : [])],
    rows: points.map((point, i) => [
      point.label,
      ...series.map(s => (s.points[i] ? format(s.points[i].value) : '')),
      ...(total ? [format(totalAt(series, i))] : []),
    ]),
  };
}

/** The table of a donut chart: a row per segment with its value and share of the total. */
export function segmentsTable(
  segments: readonly DonutSegment[],
  format: ChartTextFormat
): ChartTable {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  return {
    headers: ['Segment', 'Value', 'Share'],
    rows: segments.map(s => [s.label, format(s.value), share(s.value, total)]),
  };
}
