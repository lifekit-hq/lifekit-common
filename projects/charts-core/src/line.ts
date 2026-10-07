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

import {type ChartPoint, type ChartValueFormat} from './types';
import {CHART_FONT_SIZE, chartFontFamily, cssVar, fontFamily, valueFormatter} from './utils';

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
  currency: string,
  valueFormat: ChartValueFormat = 'currency'
): ChartConfiguration<'line'> {
  const format = valueFormatter(valueFormat, currency);
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
            label: ctx => format(ctx.parsed.y as number, false),
          },
        },
      },
      scales: {
        x: {
          grid: {color: tokens.borderDefault},
          ticks: {
            color: tokens.textSecondary,
            font: {family: fontFamily(tokens), size: CHART_FONT_SIZE},
          },
        },
        y: {
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

export function updateLineChart(
  chart: Chart,
  points: ChartPoint[],
  format?: LineChartFormat
): void {
  // eslint-disable-next-line no-param-reassign
  chart.data.labels = points.map(p => p.label);
  // eslint-disable-next-line no-param-reassign
  chart.data.datasets[0].data = points.map(p => p.value);
  if (format) {
    const formatter = valueFormatter(format.valueFormat ?? 'currency', format.currency);
    const callbacks = chart.options.plugins?.tooltip?.callbacks;
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
