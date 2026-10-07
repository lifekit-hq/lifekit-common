import {
  CategoryScale,
  Chart,
  type ChartConfiguration,
  type ChartDataset,
  Filler,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';

import {
  type ChartDomain,
  type ChartPoint,
  type ChartValueFormat,
  type ChartXSpacing,
} from './types';
import {CHART_FONT_SIZE, chartFontFamily, cssVar, fontFamily, valueFormatter} from './utils';

/** Inset (px) that keeps a compact chart's 2px stroke from being clipped at the canvas edge. */
const COMPACT_PADDING = 2;

Chart.register(
  CategoryScale,
  LinearScale,
  LineController,
  PointElement,
  LineElement,
  Tooltip,
  Filler
);

export interface LineChartTokens {
  /** Canvas font stack; defaults to the `--font-sans` token. */
  fontFamily?: string;
  accent: string;
  textSecondary: string;
  borderDefault: string;
}

export function resolveLineChartTokens(): LineChartTokens {
  return {
    fontFamily: chartFontFamily(),
    accent: cssVar('--color-accent-default', '#175a6d'),
    textSecondary: cssVar('--color-text-secondary', '#46565e'),
    borderDefault: cssVar('--color-border-default', '#d9e0e3'),
  };
}

/** The scale options a line chart takes on top of its points: all optional, all additive. */
export interface LineChartScale {
  /** Fixes the y range instead of auto-scaling it to the data; an omitted bound stays auto. */
  yDomain?: ChartDomain;
  /** `'time'` places points by `ChartPoint.time` rather than in equal slots; default `'even'`. */
  xSpacing?: ChartXSpacing;
}

const TIME_TICK_FORMAT = new Intl.DateTimeFormat('en-US', {month: 'short', day: 'numeric'});

/**
 * The points a chart draws. Time spacing needs a timestamp, so points without a finite `time`
 * are left out, and the rest are ordered by it so the line never doubles back.
 */
function drawnPoints(points: ChartPoint[], xSpacing: ChartXSpacing): ChartPoint[] {
  if (xSpacing !== 'time') {
    return points;
  }
  return points
    .filter(p => Number.isFinite(p.time))
    .sort((a, b) => (a.time as number) - (b.time as number));
}

/**
 * A time-spaced x tick's date. Linear ticks fall on round timestamps, not day boundaries, so a
 * short span repeats a date across several ticks; only the first of a run is labelled.
 */
function timeTick(val: string | number, index: number, ticks: {value: number}[]): string | null {
  const label = TIME_TICK_FORMAT.format(Number(val));
  const previous = index > 0 ? ticks[index - 1] : undefined;
  return previous && TIME_TICK_FORMAT.format(previous.value) === label ? null : label;
}

function lineData(points: ChartPoint[], xSpacing: ChartXSpacing): ChartDataset<'line'>['data'] {
  return xSpacing === 'time'
    ? points.map(p => ({x: p.time as number, y: p.value}))
    : points.map(p => p.value);
}

/** Tooltip title of a time-spaced point: its label, since the x value is a bare timestamp. */
function timeTitle(points: ChartPoint[]): (items: {dataIndex: number}[]) => string {
  return items => points[items[0]?.dataIndex]?.label ?? '';
}

function buildLineDataset(
  points: ChartPoint[],
  accent: string,
  xSpacing: ChartXSpacing
): ChartDataset<'line'> {
  return {
    data: lineData(points, xSpacing),
    borderColor: accent,
    backgroundColor: `${accent}1a`,
    borderWidth: 2,
    pointRadius: 0,
    pointHoverRadius: 4,
    fill: true,
    tension: 0.3,
  };
}

/**
 * `compact` renders a sparkline: no axes, ticks, gridlines or tooltip, no animation, and it
 * fills whatever box its canvas is given.
 */
export function buildLineChartConfig(
  points: ChartPoint[],
  tokens: LineChartTokens,
  currency: string,
  valueFormat: ChartValueFormat = 'currency',
  compact = false,
  scale: LineChartScale = {}
): ChartConfiguration<'line'> {
  const format = valueFormatter(valueFormat, currency);
  const xSpacing = scale.xSpacing ?? 'even';
  const timed = xSpacing === 'time';
  const drawn = drawnPoints(points, xSpacing);
  return {
    type: 'line',
    data: {
      // A time-spaced chart reads x from the data, so it has no category labels.
      ...(timed ? {} : {labels: drawn.map(p => p.label)}),
      datasets: [buildLineDataset(drawn, tokens.accent, xSpacing)],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      // A compact chart is a still glyph: no animation, no hover, no tooltip.
      ...(compact
        ? {animation: false as const, events: [], layout: {padding: COMPACT_PADDING}}
        : {}),
      interaction: {mode: 'index', intersect: false},
      plugins: {
        legend: {display: false},
        tooltip: {
          enabled: !compact,
          mode: 'index',
          intersect: false,
          callbacks: {
            ...(timed ? {title: timeTitle(drawn)} : {}),
            label: ctx => format(ctx.parsed.y as number, false),
          },
        },
      },
      scales: {
        x: {
          // Linear rather than a time scale: timestamps need no date adapter, and `bounds: 'data'`
          // makes the line span the whole width instead of rounding out to tick values.
          ...(timed ? {type: 'linear' as const, bounds: 'data' as const} : {}),
          display: !compact,
          grid: {color: tokens.borderDefault},
          ticks: {
            color: tokens.textSecondary,
            font: {family: fontFamily(tokens), size: CHART_FONT_SIZE},
            ...(timed ? {callback: timeTick} : {}),
          },
        },
        y: {
          display: !compact,
          min: scale.yDomain?.min,
          max: scale.yDomain?.max,
          grid: {color: tokens.borderDefault},
          ticks: {
            color: tokens.textSecondary,
            font: {family: fontFamily(tokens), size: CHART_FONT_SIZE},
            callback: val => format(val as number, true),
          },
        },
      },
    },
  };
}

/** The value-format inputs a live chart can be re-pointed at without being rebuilt. */
export interface LineChartFormat {
  currency: string;
  valueFormat?: ChartValueFormat;
}

/**
 * Re-points a live chart at new points, format and y domain. `scale.xSpacing` must match what the
 * chart was built with: it changes the x scale type, so a change means building a new chart.
 */
export function updateLineChart(
  chart: Chart,
  points: ChartPoint[],
  format?: LineChartFormat,
  scale: LineChartScale = {}
): void {
  const xSpacing = scale.xSpacing ?? 'even';
  const drawn = drawnPoints(points, xSpacing);
  if (xSpacing !== 'time') {
    // eslint-disable-next-line no-param-reassign
    chart.data.labels = drawn.map(p => p.label);
  }
  // eslint-disable-next-line no-param-reassign
  chart.data.datasets[0].data = lineData(drawn, xSpacing);
  const callbacks = chart.options?.plugins?.tooltip?.callbacks;
  if (xSpacing === 'time' && callbacks) {
    callbacks.title = timeTitle(drawn);
  }
  const yScale = chart.options?.scales?.['y'];
  if (yScale) {
    yScale.min = scale.yDomain?.min;
    yScale.max = scale.yDomain?.max;
  }
  if (format) {
    const formatter = valueFormatter(format.valueFormat ?? 'currency', format.currency);
    if (callbacks) {
      callbacks.label = ctx => formatter(ctx.parsed.y as number, false);
    }
    const ticks = chart.options.scales?.['y']?.ticks;
    if (ticks) {
      ticks.callback = val => formatter(val as number, true);
    }
  }
  chart.update('none');
}
