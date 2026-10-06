import {type Plugin} from 'chart.js';

import {type ChartValueFormat, type ChartValueFormatter} from './types';

export function cssVar(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

const FALLBACK_FONT_FAMILY = "'IBM Plex Sans Variable', 'IBM Plex Sans', system-ui, sans-serif";

/** Canvas text cannot inherit CSS, so charts read the token font stack explicitly. */
export function chartFontFamily(): string {
  return cssVar('--font-sans', FALLBACK_FONT_FAMILY);
}

/** The font stack a chart should draw with: its resolved token, else the token default. */
export function fontFamily(tokens: {fontFamily?: string}): string {
  return tokens.fontFamily ?? FALLBACK_FONT_FAMILY;
}

/** True when the series holds nothing to draw (no points at all). */
export function isSeriesEmpty(series: readonly {points: readonly unknown[]}[]): boolean {
  return series.every(s => s.points.length === 0);
}

/** Below this chart width (px) x labels are thinned so neighbours cannot touch. */
export const NARROW_CHART_WIDTH = 480;
const NARROW_TICK_LIMIT = 4;

/** Max x ticks for a chart of `width` px: the configured desktop limit, thinned when narrow. */
export function xTickLimit(width: number, wideLimit: number): number {
  return width < NARROW_CHART_WIDTH ? Math.min(NARROW_TICK_LIMIT, wideLimit) : wideLimit;
}

/**
 * Chart.js plugin that re-resolves the x `maxTicksLimit` from the live chart width before
 * every layout pass. `maxTicksLimit` is not typed as scriptable, so a plugin is the safe way
 * to make tick density follow the chart's size (initial render, resize, and data updates).
 */
export function xTickLimitPlugin(wideLimit: number): Plugin {
  return {
    id: 'xTickLimit',
    beforeLayout(chart) {
      const x = chart.options.scales?.['x'] as {ticks?: {maxTicksLimit?: number}} | undefined;
      if (x?.ticks) {
        x.ticks.maxTicksLimit = xTickLimit(chart.width, wideLimit);
      }
    },
  };
}

export function money(value: number, currency: string, compact = false): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    notation: compact ? 'compact' : 'standard',
    minimumFractionDigits: 0,
    maximumFractionDigits: compact ? 1 : 0,
  }).format(value);
}

const NUMBER_DIGITS = 2;
const NUMBER_COMPACT_DIGITS = 1;
const COMPACT_THRESHOLD = 1000;

/** A plain unit-less number: no currency symbol, up to two decimals (one when compact and 1000 or above). */
export function plainNumber(value: number, compact = false): string {
  const abbreviate = compact && Math.abs(value) >= COMPACT_THRESHOLD;
  return new Intl.NumberFormat('en-US', {
    notation: abbreviate ? 'compact' : 'standard',
    maximumFractionDigits: abbreviate ? NUMBER_COMPACT_DIGITS : NUMBER_DIGITS,
  }).format(value);
}

/** A percentage, where `value` is already in percent units (62.5 renders as `62.5%`); compact axis ticks keep at most one decimal, dropping a trailing `.0`. */
export function percent(value: number, compact = false): string {
  if (compact) {
    return `${new Intl.NumberFormat('en-US', {maximumFractionDigits: NUMBER_COMPACT_DIGITS}).format(value)}%`;
  }
  return `${value.toFixed(1)}%`;
}

/** Resolves a `ChartValueFormat` to the formatter every tick and tooltip of a chart shares. */
export function valueFormatter(format: ChartValueFormat, currency: string): ChartValueFormatter {
  if (typeof format === 'function') {
    return format;
  }
  switch (format) {
    case 'number':
      return plainNumber;
    case 'percent':
      return percent;
    default:
      return (value, compact) => money(value, currency, compact);
  }
}
