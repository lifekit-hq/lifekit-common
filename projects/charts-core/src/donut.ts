import {
  ArcElement,
  Chart,
  type ChartConfiguration,
  DoughnutController,
  Legend,
  Tooltip,
} from 'chart.js';

import {type DonutSegment} from './types';
import {cssVar} from './utils';

Chart.register(DoughnutController, ArcElement, Tooltip, Legend);

const DEFAULT_COLORS = [
  '#4f46e5',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#6366f1',
  '#34d399',
  '#fbbf24',
  '#a78bfa',
];
const PERCENT_MULTIPLIER = 100;

export interface DonutChartTokens {
  textSecondary: string;
}

export function resolveDonutChartTokens(): DonutChartTokens {
  return {
    textSecondary: cssVar('--color-text-secondary', '#464555'),
  };
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
            font: {family: 'Inter', size: 11},
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
