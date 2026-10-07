import {
  ArcElement,
  Chart,
  type ChartConfiguration,
  DoughnutController,
  Legend,
  Tooltip,
} from 'chart.js';

import {type DonutSegment} from './types';
import {CHART_FONT_SIZE, chartFontFamily, cssVar, fontFamily} from './utils';

Chart.register(DoughnutController, ArcElement, Tooltip, Legend);

/**
 * Ordered so neighbours (including the wrap from last back to first) sit far
 * apart on the colour wheel; the brand petrol leads.
 */
const DEFAULT_COLORS = [
  '#175a6d',
  '#f59e0b',
  '#a855f7',
  '#84cc16',
  '#ec4899',
  '#3b82f6',
  '#10b981',
  '#ef4444',
];
const PERCENT_MULTIPLIER = 100;

export interface DonutChartTokens {
  /** Canvas font stack; defaults to the `--font-sans` token. */
  fontFamily?: string;
  textSecondary: string;
}

export function resolveDonutChartTokens(): DonutChartTokens {
  return {
    fontFamily: chartFontFamily(),
    textSecondary: cssVar('--color-text-secondary', '#46565e'),
  };
}

/** A donut with no segments, or only zero-value ones, has no ring to draw. */
export function isDonutEmpty(segments: readonly DonutSegment[]): boolean {
  return segments.every(s => s.value <= 0);
}

function segmentColors(segments: DonutSegment[]): string[] {
  return segments.map((s, i) => s.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]);
}

export function buildDonutChartConfig(
  segments: DonutSegment[],
  tokens: DonutChartTokens,
  currency: string,
  showLegend: boolean
): ChartConfiguration<'doughnut'> {
  return {
    type: 'doughnut',
    data: {
      labels: segments.map(s => s.label),
      datasets: [
        {
          data: segments.map(s => s.value),
          backgroundColor: segmentColors(segments),
          borderWidth: 0,
          hoverOffset: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: {
        legend: {
          display: showLegend,
          position: 'bottom',
          labels: {
            color: tokens.textSecondary,
            font: {family: fontFamily(tokens), size: CHART_FONT_SIZE},
            boxWidth: 10,
            padding: 12,
          },
        },
        tooltip: {
          callbacks: {
            label: ctx => {
              const val = ctx.parsed;
              const formatted = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency,
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(val);
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const pct = total > 0 ? ((val / total) * PERCENT_MULTIPLIER).toFixed(1) : '0.0';
              return `${formatted} (${pct}%)`;
            },
          },
        },
      },
    },
  };
}

export function updateDonutChart(chart: Chart, segments: DonutSegment[]): void {
  // eslint-disable-next-line no-param-reassign
  chart.data.labels = segments.map(s => s.label);
  // eslint-disable-next-line no-param-reassign
  chart.data.datasets[0].data = segments.map(s => s.value);
  // eslint-disable-next-line no-param-reassign
  chart.data.datasets[0].backgroundColor = segmentColors(segments);
  chart.update('none');
}
