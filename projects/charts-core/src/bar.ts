import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  type ChartConfiguration,
  type ChartDataset,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js';

import {type BarSeries, type BarValueFormat} from './types';
import {cssVar} from './utils';

Chart.register(CategoryScale, LinearScale, BarController, BarElement, Tooltip, Legend);

const DEFAULT_SERIES_COLORS = ['#10b981', '#ef4444', '#6366f1', '#f59e0b', '#64748b'];
const BAR_RADIUS = 4;

export interface BarChartTokens {
  textSecondary: string;
  borderDefault: string;
}

export function resolveBarChartTokens(): BarChartTokens {
  return {
    textSecondary: cssVar('--color-text-secondary', '#464555'),
    borderDefault: cssVar('--color-border-default', '#c7c4d8'),
  };
}

export function barFormat(
  value: number,
  valueFormat: BarValueFormat,
  currency: string,
  compact = false
): string {
  if (valueFormat === 'percent') {
    return `${value.toFixed(compact ? 0 : 1)}%`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    notation: compact ? 'compact' : 'standard',
    minimumFractionDigits: 0,
    maximumFractionDigits: compact ? 1 : 0,
  }).format(value);
}

export function buildBarDatasets(series: BarSeries[]): ChartDataset<'bar'>[] {
  return series.map((s, i) => ({
    label: s.label,
    data: s.points.map(p => p.value),
    backgroundColor: s.color ?? DEFAULT_SERIES_COLORS[i % DEFAULT_SERIES_COLORS.length],
    borderRadius: BAR_RADIUS,
    borderSkipped: false,
    maxBarThickness: 40,
  }));
}

export function buildBarChartConfig(
  series: BarSeries[],
  tokens: BarChartTokens,
  currency: string,
  stacked: boolean,
  valueFormat: BarValueFormat
): ChartConfiguration<'bar'> {
  const showLegend = series.length > 1;
  return {
    type: 'bar',
    data: {
      labels: series[0]?.points.map(p => p.label) ?? [],
      datasets: buildBarDatasets(series),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {mode: 'index', intersect: false},
      plugins: {
        legend: {
          display: showLegend,
          position: 'top',
          align: 'end',
          labels: {
            color: tokens.textSecondary,
            boxWidth: 10,
            boxHeight: 10,
            usePointStyle: true,
            font: {family: 'Inter', size: 11},
          },
        },
        tooltip: {
          callbacks: {
            label: ctx =>
              `${ctx.dataset.label}: ${barFormat(ctx.parsed.y as number, valueFormat, currency)}`,
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
            font: {family: 'Inter', size: 11},
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 12,
          },
        },
        y: {
          stacked,
          grid: {color: tokens.borderDefault},
          border: {display: false},
          ticks: {
            color: tokens.textSecondary,
            font: {family: 'Inter', size: 11},
            callback: val => barFormat(val as number, valueFormat, currency, true),
          },
        },
      },
    },
  };
}

export function updateBarChart(chart: Chart, series: BarSeries[]): void {
  // eslint-disable-next-line no-param-reassign
  chart.data.labels = series[0]?.points.map(p => p.label) ?? [];
  // eslint-disable-next-line no-param-reassign
  chart.data.datasets = buildBarDatasets(series);
  chart.update('none');
}
