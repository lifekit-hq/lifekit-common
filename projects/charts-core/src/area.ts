import {
  CategoryScale,
  Chart,
  type ChartConfiguration,
  type ChartDataset,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';

import {type AreaSeries} from './types';
import {chartFontFamily, cssVar, fontFamily, money, xTickLimitPlugin} from './utils';

Chart.register(
  CategoryScale,
  LinearScale,
  LineController,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler
);

const DEFAULT_SERIES_COLORS = ['#10b981', '#175a6d', '#f59e0b', '#64748b', '#ec4899'];
const FILL_ALPHA = 'cc';

const X_TICK_LIMIT = 8;

export interface AreaChartTokens {
  /** Canvas font stack; defaults to the `--font-sans` token. */
  fontFamily?: string;
  textSecondary: string;
  borderDefault: string;
}

export function resolveAreaChartTokens(): AreaChartTokens {
  return {
    fontFamily: chartFontFamily(),
    textSecondary: cssVar('--color-text-secondary', '#46565e'),
    borderDefault: cssVar('--color-border-default', '#d9e0e3'),
  };
}

export function buildAreaDatasets(series: AreaSeries[], stacked = true): ChartDataset<'line'>[] {
  return series.map((s, i) => {
    const color = s.color ?? DEFAULT_SERIES_COLORS[i % DEFAULT_SERIES_COLORS.length];
    return {
      label: s.label,
      data: s.points.map(p => p.value),
      borderColor: color,
      backgroundColor: `${color}${FILL_ALPHA}`,
      borderWidth: 1.5,
      pointRadius: 0,
      pointHoverRadius: 4,
      fill: stacked,
      tension: 0.3,
    };
  });
}

export function buildAreaChartConfig(
  series: AreaSeries[],
  tokens: AreaChartTokens,
  currency: string,
  stacked = true
): ChartConfiguration<'line'> {
  return {
    type: 'line',
    data: {
      labels: series[0]?.points.map(p => p.label) ?? [],
      datasets: buildAreaDatasets(series, stacked),
    },
    plugins: [xTickLimitPlugin(X_TICK_LIMIT)],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {mode: 'index', intersect: false},
      plugins: {
        legend: {
          display: true,
          position: 'top',
          align: 'end',
          labels: {
            color: tokens.textSecondary,
            boxWidth: 10,
            boxHeight: 10,
            usePointStyle: true,
            font: {family: fontFamily(tokens), size: 11},
          },
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            label: ctx => `${ctx.dataset.label}: ${money(ctx.parsed.y as number, currency)}`,
            footer: items => {
              const total = items.reduce((sum, item) => sum + (item.parsed.y as number), 0);
              return `Total: ${money(total, currency)}`;
            },
          },
        },
      },
      scales: {
        x: {
          stacked,
          grid: {display: false},
          border: {display: false},
          ticks: {
            color: tokens.textSecondary,
            font: {family: fontFamily(tokens), size: 11},
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: X_TICK_LIMIT,
          },
        },
        y: {
          stacked,
          // A stacked band's height only reads true against a zero baseline.
          beginAtZero: stacked,
          grid: {color: tokens.borderDefault},
          border: {display: false},
          ticks: {
            color: tokens.textSecondary,
            font: {family: fontFamily(tokens), size: 11},
            callback: val => money(val as number, currency, true),
          },
        },
      },
    },
  };
}

export function updateAreaChart(chart: Chart, series: AreaSeries[], stacked = true): void {
  // eslint-disable-next-line no-param-reassign
  chart.data.labels = series[0]?.points.map(p => p.label) ?? [];
  // eslint-disable-next-line no-param-reassign
  chart.data.datasets = buildAreaDatasets(series, stacked);
  // Scale stacking lives in options, not the datasets, so toggling `stacked` has to
  // reach into the live chart rather than only replacing the data. The cast narrows
  // Chart.js's all-scale-types union, which has no common `stacked` (radial lacks it).
  const scales = chart.options.scales as
    Record<string, {stacked?: boolean} | undefined> | undefined;
  const x = scales?.['x'];
  const y = scales?.['y'] as {stacked?: boolean; beginAtZero?: boolean} | undefined;
  if (x && y) {
    x.stacked = stacked;
    y.stacked = stacked;
    y.beginAtZero = stacked;
  }
  chart.update('none');
}
