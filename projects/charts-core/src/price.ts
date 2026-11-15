import {
  Chart,
  type ChartConfiguration,
  type ChartDataset,
  type ChartType,
  LinearScale,
  LineController,
  LineElement,
  type Plugin,
  PointElement,
  Tooltip,
} from 'chart.js';

import {scrubPlugin} from './scrub';
import {
  type ChartDelta,
  type ChartPoint,
  type ChartScrubHandlers,
  type ChartValueFormat,
  type ChartValueFormatter,
} from './types';
import {
  CATEGORICAL_STEPS,
  CHART_FONT_SIZE,
  chartDelta,
  chartFontFamily,
  cssVar,
  fontFamily,
  NEUTRAL_STEP,
  seriesColor,
  valueFormatter,
} from './utils';

Chart.register(LinearScale, LineController, PointElement, LineElement, Tooltip);

/**
 * The price block's mechanics, free of any framework: the periods a price history is read over,
 * slicing a series to one, rebasing it to percent when a benchmark overlays, the signed delta, and
 * a Chart.js config with the dotted start-of-period baseline and the scrub crosshair. The combined
 * tooltip pill is the host's to draw (it is text, so it is DOM): the scrub reports every series'
 * value at the point under the pointer.
 */

/** The periods of a price history, shortest first. `'MAX'` is the whole history. */
export type PricePeriod = '1M' | '6M' | 'YTD' | '1Y' | '5Y' | 'MAX';

export const PRICE_PERIODS: readonly PricePeriod[] = ['1M', '6M', 'YTD', '1Y', '5Y', 'MAX'];

/** The tab label of each period. */
export const PRICE_PERIOD_LABELS: Readonly<Record<PricePeriod, string>> = {
  '1M': '1M',
  '6M': '6M',
  YTD: 'YTD',
  '1Y': '1Y',
  '5Y': '5Y',
  MAX: 'Max',
};

/** Each period as a phrase that follows a change ("+2.4% past month"). */
export const PRICE_PERIOD_PHRASES: Readonly<Record<PricePeriod, string>> = {
  '1M': 'past month',
  '6M': 'past 6 months',
  YTD: 'year to date',
  '1Y': 'past year',
  '5Y': 'past 5 years',
  MAX: 'all time',
};

/** One price: when (epoch ms) and how much. */
export interface PricePoint {
  time: number;
  value: number;
}

/** A named run of prices; the first series of a price block is the instrument, the rest overlay it. */
export interface PriceSeries {
  label: string;
  points: readonly PricePoint[];
}

/** A price block's chart axis: the series' own values, or each one's change since the period began. */
export type PriceMode = 'price' | 'percent';

/** `'auto'` reads percent while a benchmark overlays and price otherwise. */
export type PriceModeSetting = 'auto' | PriceMode;

/** A series ready to draw: points carry the formatted date as their `label`. */
export interface PriceChartSeries {
  label: string;
  color: string;
  points: readonly ChartPoint[];
}

function byTime(a: PricePoint, b: PricePoint): number {
  return a.time - b.time;
}

const MONTHS_IN_PERIOD: Partial<Record<PricePeriod, number>> = {
  '1M': 1,
  '6M': 6,
  '1Y': 12,
  '5Y': 60,
};
const PERCENT_SCALE = 100;

/**
 * Where `period` begins when the history ends at `anchor` (epoch ms): the same day that many
 * months earlier, or 1 January of the anchor's year for `'YTD'`. `'MAX'` begins at the beginning of
 * time. Reckoned in UTC, so the same data slices the same way in every zone.
 */
export function periodStart(period: PricePeriod, anchor: number): number {
  if (period === 'MAX') {
    return Number.NEGATIVE_INFINITY;
  }
  const end = new Date(anchor);
  if (period === 'YTD') {
    return Date.UTC(end.getUTCFullYear(), 0, 1);
  }
  const start = new Date(anchor);
  start.setUTCMonth(end.getUTCMonth() - (MONTHS_IN_PERIOD[period] ?? 0));
  return start.getTime();
}

/** The time of the last point of the first series: the instant every period is counted back from. */
export function priceAnchor(series: readonly PriceSeries[]): number {
  const points = series[0]?.points ?? [];
  return points.length === 0 ? 0 : points[points.length - 1].time;
}

/**
 * Every series cut to `period`: the points from its start to the anchor, in time order. A period
 * longer than the history is the whole history. Each series is cut by the same instants, so series
 * that shared timestamps still do.
 */
export function slicePriceSeries(
  series: readonly PriceSeries[],
  period: PricePeriod
): PriceSeries[] {
  const start = periodStart(period, priceAnchor(series));
  return series.map(s => ({
    label: s.label,
    points: s.points.filter(p => Number.isFinite(p.time) && p.time >= start).sort(byTime),
  }));
}

/** `value` as the percent it moved from `base`; a zero base has no percent, so it reads as no move. */
function percentFrom(base: number, value: number): number {
  return base === 0 ? 0 : ((value - base) / Math.abs(base)) * PERCENT_SCALE;
}

/** A series with every value replaced by its change, in percent, from the series' first point. */
export function rebaseToPercent(points: readonly PricePoint[]): PricePoint[] {
  const base = points[0]?.value ?? 0;
  return points.map(p => ({time: p.time, value: percentFrom(base, p.value)}));
}

/** The mode a block reads in: percent when a benchmark overlays (`seriesCount` above one), else price. */
export function resolvePriceMode(setting: PriceModeSetting, seriesCount: number): PriceMode {
  if (setting === 'auto') {
    return seriesCount > 1 ? 'percent' : 'price';
  }
  return setting;
}

/** A change and its sign: the sign picks the delta pill's colour (`0` for no change, never a colour). */
export interface PriceDelta extends ChartDelta {
  direction: -1 | 0 | 1;
}

/** How the price moved from `from` to `to`. A move that is exactly zero has no direction. */
export function priceDelta(from: number, to: number): PriceDelta {
  const delta = chartDelta(from, to);
  const direction = delta.change === 0 ? 0 : delta.change > 0 ? 1 : -1;
  return {...delta, direction};
}

const MINUS = '\u2212';
const SIGNED_PERCENT_DIGITS = 2;
const PERCENT_FORMAT = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: SIGNED_PERCENT_DIGITS,
  maximumFractionDigits: SIGNED_PERCENT_DIGITS,
});

/** A percent (62.5 is 62.5%) with its sign and two decimals: `+2.40%`, `−1.05%`, `0.00%`. */
export function signedPercent(value: number): string {
  const text = PERCENT_FORMAT.format(Math.abs(value));
  const rounded = Number(text.replace(/,/g, ''));
  const sign = rounded === 0 ? '' : value > 0 ? '+' : MINUS;
  return `${sign}${text}%`;
}

/** An amount in `format` with its sign: `+$12.40`, `−$3.00`, `$0.00`. */
export function signedAmount(value: number, format: ChartValueFormatter): string {
  const text = format(Math.abs(value), false);
  const sign =
    value === 0 || Number(text.replace(/[^0-9.]/g, '')) === 0 ? '' : value > 0 ? '+' : '−';
  return `${sign}${text}`;
}

const PRICE_FRACTION_DIGITS = 2;
const COMPACT_FRACTION_DIGITS = 1;

/** A price in `currency` to the cent; compact (axis ticks) abbreviates thousands and keeps one decimal. */
export function priceMoney(value: number, currency: string, compact = false): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    notation: compact ? 'compact' : 'standard',
    minimumFractionDigits: compact ? 0 : PRICE_FRACTION_DIGITS,
    maximumFractionDigits: compact ? COMPACT_FRACTION_DIGITS : PRICE_FRACTION_DIGITS,
  }).format(value);
}

/** `'price'` is currency to the cent (what an instrument's price is quoted in); the rest are a chart's own. */
export type PriceValueFormat = ChartValueFormat | 'price';

/** The formatter of prices in a price block; in percent mode every value is a signed percent instead. */
export function priceFormatter(
  format: PriceValueFormat,
  currency: string,
  mode: PriceMode
): ChartValueFormatter {
  if (mode === 'percent') {
    return (value, compact) => (compact ? `${value}%` : signedPercent(value));
  }
  return format === 'price'
    ? (value, compact) => priceMoney(value, currency, compact)
    : valueFormatter(format, currency);
}

const DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

/** The date of a price: `Mar 4, 2026` (UTC, so every zone reads the same day). */
export function priceDateLabel(time: number): string {
  return DATE_FORMAT.format(time);
}

/** A price series' points as chart points whose label is their date. */
export function toPricePoints(points: readonly PricePoint[]): ChartPoint[] {
  return points.map(p => ({label: priceDateLabel(p.time), value: p.value, time: p.time}));
}

/** The colour of the `index`th series (0-based): the accent, then a muted neutral for a benchmark, then the ramp. */
export function priceSeriesColor(index: number): string {
  if (index === 0) {
    return seriesColor(CATEGORICAL_STEPS[0]);
  }
  return seriesColor(
    index === 1 ? NEUTRAL_STEP : CATEGORICAL_STEPS[(index - 1) % CATEGORICAL_STEPS.length]
  );
}

const DAY_MS = 86_400_000;
const DAYS_PER_YEAR = 365;
const SHORT_SPAN_DAYS = 62;
const YEARS_AS_DAYS = 2;
const YEAR_SPAN_DAYS = DAYS_PER_YEAR * YEARS_AS_DAYS;

const DAY_TICK = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});
const MONTH_TICK = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  year: '2-digit',
  timeZone: 'UTC',
});
const YEAR_TICK = new Intl.DateTimeFormat('en-US', {year: 'numeric', timeZone: 'UTC'});

/**
 * The x tick label for a history `spanMs` long: a day for a couple of months, a month for a couple
 * of years, else a year. Ticks fall on round timestamps, so a run of ticks in one day, month or year
 * would repeat a label; only the first of a run is labelled.
 */
export function priceTickFormatter(
  spanMs: number
): (val: string | number, index: number, ticks: {value: number}[]) => string | null {
  const days = spanMs / DAY_MS;
  const format =
    days <= SHORT_SPAN_DAYS ? DAY_TICK : days <= YEAR_SPAN_DAYS ? MONTH_TICK : YEAR_TICK;
  return (val, index, ticks) => {
    const label = format.format(Number(val));
    const previous = index > 0 ? ticks[index - 1] : undefined;
    return previous && format.format(previous.value) === label ? null : label;
  };
}

/** What the baseline plugin draws: a dotted line at `value`, labelled with `text`. */
export interface PriceBaselineOptions {
  /** The y value the line sits at; null draws nothing. */
  value: number | null;
  text: string;
  color: string;
  /** Behind the label, so it stays legible where the line runs under it. */
  halo: string;
  fontFamily: string;
}

declare module 'chart.js' {
  // The type parameter must keep Chart.js's name for the declarations to merge.
  // eslint-disable-next-line unused-imports/no-unused-vars
  interface PluginOptionsByType<TType extends ChartType> {
    priceBaseline?: PriceBaselineOptions;
  }
}

const BASELINE_DOT_SIZE = 1.5;
const BASELINE_DOT_GAP = 4;
const LABEL_INSET = 4;
const LABEL_GAP = 4;
const HALO_WIDTH = 3;

/**
 * Draws the start-of-period baseline: a dotted line across the plot at `options.value`, and its
 * value written at the right end, above the line (below it when the line is at the top edge).
 * Drawn under the series, so the data stays in front.
 */
export const priceBaselinePlugin: Plugin<'line', PriceBaselineOptions> = {
  id: 'priceBaseline',
  beforeDatasetsDraw(chart, _args, options) {
    const yScale = chart.scales['y'];
    if (!options || options.value === null || !yScale) {
      return;
    }
    const y = yScale.getPixelForValue(options.value);
    const {left, right, top, bottom} = chart.chartArea;
    if (!Number.isFinite(y) || y < top || y > bottom) {
      return;
    }
    const {ctx} = chart;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.lineWidth = BASELINE_DOT_SIZE;
    ctx.lineCap = 'round';
    // A zero-length dash with a round cap is a dot.
    ctx.setLineDash([0, BASELINE_DOT_GAP]);
    ctx.strokeStyle = options.color;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = `${CHART_FONT_SIZE}px ${options.fontFamily}`;
    ctx.textAlign = 'right';
    const above = y - top >= CHART_FONT_SIZE + LABEL_GAP;
    ctx.textBaseline = above ? 'bottom' : 'top';
    const textY = above ? y - LABEL_GAP : y + LABEL_GAP;
    ctx.lineJoin = 'round';
    ctx.lineWidth = HALO_WIDTH;
    ctx.strokeStyle = options.halo;
    ctx.strokeText(options.text, right - LABEL_INSET, textY);
    ctx.fillStyle = options.color;
    ctx.fillText(options.text, right - LABEL_INSET, textY);
    ctx.restore();
  },
};

export interface PriceChartTokens {
  fontFamily?: string;
  textSecondary: string;
  borderDefault: string;
  /** The card the chart sits on. */
  surface: string;
}

export function resolvePriceChartTokens(): PriceChartTokens {
  return {
    fontFamily: chartFontFamily(),
    textSecondary: cssVar('--color-text-secondary', '#46565e'),
    borderDefault: cssVar('--color-border-default', '#d9e0e3'),
    surface: cssVar('--color-surface-card', '#ffffff'),
  };
}

/** What a price chart draws: the series, how their values read, and the baseline. */
export interface PriceChartModel {
  /** Series ready to draw, index-aligned (same timestamps), the instrument first. */
  series: readonly PriceChartSeries[];
  /** Formats a value on the y axis (compact) and in the baseline label. */
  format: ChartValueFormatter;
  /** The start-of-period value, or null for no baseline. */
  baseline: number | null;
  /** Room (px) kept above the plot for the host's tooltip pill. */
  headroom: number;
}

const INSTRUMENT_WIDTH = 2;
const OVERLAY_WIDTH = 1.5;
const Y_GRACE = '5%';
const X_TICK_LIMIT = 5;

function datasetOf(series: PriceChartSeries, index: number): ChartDataset<'line'> {
  return {
    label: series.label,
    data: series.points.map(p => ({x: p.time as number, y: p.value, label: p.label})),
    borderColor: series.color,
    backgroundColor: series.color,
    borderWidth: index === 0 ? INSTRUMENT_WIDTH : OVERLAY_WIDTH,
    pointRadius: 0,
    pointHoverRadius: 0,
    fill: false,
    tension: 0,
  };
}

const MIN_SPAN_POINTS = 2;

function spanOf(series: readonly PriceChartSeries[]): number {
  const points = series[0]?.points ?? [];
  return points.length < MIN_SPAN_POINTS
    ? 0
    : (points[points.length - 1].time ?? 0) - (points[0].time ?? 0);
}

function baselineOptions(model: PriceChartModel, tokens: PriceChartTokens): PriceBaselineOptions {
  return {
    value: model.baseline,
    text: model.baseline === null ? '' : model.format(model.baseline, false),
    color: tokens.textSecondary,
    halo: tokens.surface,
    fontFamily: fontFamily(tokens),
  };
}

/**
 * The Chart.js config of a price chart: the series as lines on a time-spaced x axis, the dotted
 * baseline, and the scrub crosshair (a dot on every series at the point under a pointer, with
 * `handlers` told what it reads). The chart's own tooltip is off: the host draws one combined pill.
 */
export function buildPriceChartConfig(
  model: PriceChartModel,
  tokens: PriceChartTokens,
  handlers: ChartScrubHandlers
): ChartConfiguration<'line'> {
  const font = {family: fontFamily(tokens), size: CHART_FONT_SIZE};
  return {
    type: 'line',
    plugins: [scrubPlugin(handlers, tokens.textSecondary), priceBaselinePlugin],
    data: {datasets: model.series.map(datasetOf)},
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: {padding: {top: model.headroom}},
      interaction: {mode: 'index', intersect: false},
      plugins: {
        legend: {display: false},
        tooltip: {enabled: false},
        priceBaseline: baselineOptions(model, tokens),
      },
      scales: {
        x: {
          type: 'linear',
          bounds: 'data',
          grid: {display: false},
          border: {color: tokens.borderDefault},
          ticks: {
            color: tokens.textSecondary,
            font,
            maxTicksLimit: X_TICK_LIMIT,
            callback: priceTickFormatter(spanOf(model.series)),
          },
        },
        y: {
          grace: Y_GRACE,
          grid: {color: tokens.borderDefault},
          border: {display: false},
          ticks: {
            color: tokens.textSecondary,
            font,
            callback: val => model.format(val as number, true),
          },
        },
      },
    },
  };
}

/**
 * Re-points a live price chart at a new model: another period, another mode. The number of series
 * must match what the chart was built with (a different count needs a new chart).
 */
export function updatePriceChart(
  chart: Chart,
  model: PriceChartModel,
  tokens: PriceChartTokens
): void {
  model.series.forEach((series, i) => {
    const dataset = chart.data.datasets[i];
    if (dataset) {
      Object.assign(dataset, datasetOf(series, i));
    }
  });
  const scales = chart.options.scales;
  const xTicks = scales?.['x']?.ticks;
  if (xTicks) {
    xTicks.callback = priceTickFormatter(spanOf(model.series));
  }
  const yTicks = scales?.['y']?.ticks;
  if (yTicks) {
    yTicks.callback = val => model.format(val as number, true);
  }
  const padding = chart.options.layout?.padding;
  if (padding && typeof padding === 'object') {
    (padding as {top: number}).top = model.headroom;
  }
  const plugins = chart.options.plugins;
  if (plugins) {
    plugins.priceBaseline = baselineOptions(model, tokens);
  }
  chart.update('none');
}

/**
 * Puts every overlay on the instrument's timestamps, so the series are index-aligned (the scrub
 * reads one index across all of them). An overlay that has no price at a timestamp (its market was
 * closed) holds its last price; before its first price it holds that first one.
 */
export function alignToPrimary(series: readonly PriceSeries[]): PriceSeries[] {
  const [primary, ...overlays] = series;
  if (!primary) {
    return [];
  }
  return [
    primary,
    ...overlays.map(overlay => {
      const sorted = [...overlay.points].sort(byTime);
      let cursor = 0;
      const points = primary.points.map(({time}) => {
        while (cursor + 1 < sorted.length && sorted[cursor + 1].time <= time) {
          cursor++;
        }
        return {time, value: sorted[cursor]?.value ?? 0};
      });
      return {label: overlay.label, points: sorted.length === 0 ? [] : points};
    }),
  ];
}

export interface PriceViewInput {
  series: readonly PriceSeries[];
  period: PricePeriod;
  mode: PriceModeSetting;
  valueFormat: PriceValueFormat;
  currency: string;
}

/** Everything a price block draws and says for one period: the chart's model plus the figures. */
export interface PriceView {
  mode: PriceMode;
  /** What the chart draws: prices, or each series' percent change since the period began. */
  drawn: PriceChartSeries[];
  /** The primary series in the series' own units (prices), whatever the mode. */
  prices: readonly ChartPoint[];
  /** Formats a drawn value: a price, or a signed percent in percent mode. */
  format: ChartValueFormatter;
  /** Formats a price in the series' own units (the headline and the delta's amount). */
  priceFormat: ChartValueFormatter;
  /** The primary's first price of the period: the baseline's value. */
  start: number;
  /** The primary's last price of the period. */
  end: number;
}

/** Slices, aligns and (for a benchmark) rebases `input.series` into what the block shows; null when there is nothing to draw. */
export function buildPriceView(input: PriceViewInput): PriceView | null {
  const sliced = slicePriceSeries(input.series, input.period);
  const primary = sliced[0];
  if (!primary || primary.points.length === 0) {
    return null;
  }
  const aligned = alignToPrimary(sliced);
  const mode = resolvePriceMode(input.mode, aligned.length);
  const drawn = aligned.map((s, i) => ({
    label: s.label,
    color: priceSeriesColor(i),
    points: toPricePoints(mode === 'percent' ? rebaseToPercent(s.points) : s.points),
  }));
  const prices = toPricePoints(primary.points);
  return {
    mode,
    drawn,
    prices,
    format: priceFormatter(input.valueFormat, input.currency, mode),
    priceFormat: priceFormatter(input.valueFormat, input.currency, 'price'),
    start: prices[0].value,
    end: prices[prices.length - 1].value,
  };
}

/** The chart model of a view: a baseline at the start price, or at 0% when the chart reads in percent. */
export function priceChartModel(view: PriceView, headroom: number): PriceChartModel {
  return {
    series: view.drawn,
    format: view.format,
    baseline: view.mode === 'percent' ? 0 : view.start,
    headroom,
  };
}
