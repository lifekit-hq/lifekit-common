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

import {type ChartPoint} from './types';
import {cssVar, money} from './utils';

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
  accent: string;
  textSecondary: string;
  borderDefault: string;
}

export function resolveLineChartTokens(): LineChartTokens {
  return {
    accent: cssVar('--color-accent-default', '#4f46e5'),
    textSecondary: cssVar('--color-text-secondary', '#464555'),
    borderDefault: cssVar('--color-border-default', '#c7c4d8'),
  };
}

function buildLineDataset(points: ChartPoint[], accent: string): ChartDataset<'line'> {
  return {
    data: points.map(p => p.value),
    borderColor: accent,
    backgroundColor: `${accent}1a`,
    borderWidth: 2,
    pointRadius: 0,
    pointHoverRadius: 4,
    fill: true,
    tension: 0.3,
  };
}

export function buildLineChartConfig(
  points: ChartPoint[],
  tokens: LineChartTokens,
  currency: string
): ChartConfiguration<'line'> {
  return {
    type: 'line',
    data: {
      labels: points.map(p => p.label),
      datasets: [buildLineDataset(points, tokens.accent)],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {mode: 'index', intersect: false},
      plugins: {
        legend: {display: false},
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            label: ctx => money(ctx.parsed.y as number, currency),
          },
        },
      },
      scales: {
        x: {
          grid: {color: tokens.borderDefault},
          ticks: {color: tokens.textSecondary, font: {family: 'Inter', size: 11}},
        },
        y: {
          grid: {color: tokens.borderDefault},
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

export function updateLineChart(chart: Chart, points: ChartPoint[]): void {
  // eslint-disable-next-line no-param-reassign
  chart.data.labels = points.map(p => p.label);
  // eslint-disable-next-line no-param-reassign
  chart.data.datasets[0].data = points.map(p => p.value);
  chart.update('none');
}
