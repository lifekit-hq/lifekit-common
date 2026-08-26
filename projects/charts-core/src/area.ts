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
import {cssVar, money} from './utils';

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

const DEFAULT_SERIES_COLORS = ['#10b981', '#6366f1', '#f59e0b', '#64748b', '#ec4899'];
const FILL_ALPHA = 'cc';

export interface AreaChartTokens {
  textSecondary: string;
  borderDefault: string;
}

export function resolveAreaChartTokens(): AreaChartTokens {
  return {
    textSecondary: cssVar('--color-text-secondary', '#464555'),
    borderDefault: cssVar('--color-border-default', '#c7c4d8'),
  };
}

export function buildAreaDatasets(series: AreaSeries[]): ChartDataset<'line'>[] {
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
      fill: true,
      tension: 0.3,
    };
  });
}

export function buildAreaChartConfig(
  series: AreaSeries[],
  tokens: AreaChartTokens,
  currency: string
): ChartConfiguration<'line'> {
  return {
    type: 'line',
    data: {
      labels: series[0]?.points.map(p => p.label) ?? [],
      datasets: buildAreaDatasets(series),
    },
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
            font: {family: 'Inter', size: 11},
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
          stacked: true,
          grid: {display: false},
          border: {display: false},
          ticks: {
            color: tokens.textSecondary,
            font: {family: 'Inter', size: 11},
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 8,
          },
        },
        y: {
          stacked: true,
          grid: {color: tokens.borderDefault},
          border: {display: false},
          ticks: {
            color: tokens.textSecondary,
            font: {family: 'Inter', size: 11},
            callback: val => money(val as number, currency, true),
          },
        },
      },
    },
  };
}

export function updateAreaChart(chart: Chart, series: AreaSeries[]): void {
  // eslint-disable-next-line no-param-reassign
  chart.data.labels = series[0]?.points.map(p => p.label) ?? [];
  // eslint-disable-next-line no-param-reassign
  chart.data.datasets = buildAreaDatasets(series);
  chart.update('none');
}
