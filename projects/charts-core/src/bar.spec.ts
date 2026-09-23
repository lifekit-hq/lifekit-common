import {type Chart} from 'chart.js';
import {describe, expect, it} from 'vitest';

import {
  type BarChartTokens,
  barFormat,
  buildBarChartConfig,
  buildBarDatasets,
  resolveBarChartTokens,
  updateBarChart,
} from './bar';
import {type BarSeries} from './types';

const TOKENS: BarChartTokens = {textSecondary: '#464555', borderDefault: '#c7c4d8'};

const SERIES: BarSeries[] = [
  {
    label: 'Income',
    points: [
      {label: 'Jan', value: 5000},
      {label: 'Feb', value: 5200},
    ],
  },
  {
    label: 'Spending',
    points: [
      {label: 'Jan', value: 1200},
      {label: 'Feb', value: 980},
    ],
  },
];

/** Chart.js models scales as a deep-partial union, so read `stacked` structurally. */
function scaleStacking(target: {options?: unknown}): {x?: boolean; y?: boolean} {
  const scales = (target.options as {scales?: Record<string, {stacked?: boolean}>} | undefined)
    ?.scales;
  return {x: scales?.['x']?.stacked, y: scales?.['y']?.stacked};
}

function legendDisplay(target: {options?: unknown}): boolean | undefined {
  return (target.options as {plugins?: {legend?: {display?: boolean}}} | undefined)?.plugins?.legend
    ?.display;
}

describe('barFormat', () => {
  it('formats currency without decimals', () => {
    expect(barFormat(1234, 'currency', 'USD')).toBe('$1,234');
  });

  it('compacts currency for axis ticks', () => {
    expect(barFormat(12_400, 'currency', 'USD', true)).toBe('$12.4K');
  });

  it('honours the requested currency', () => {
    expect(barFormat(1234, 'currency', 'EUR')).toContain('1,234');
  });

  it('formats percentages with one decimal', () => {
    expect(barFormat(62.45, 'percent', 'USD')).toBe('62.5%');
  });

  it('drops the decimal for compact percentages', () => {
    expect(barFormat(62.45, 'percent', 'USD', true)).toBe('62%');
  });

  it('formats a negative value', () => {
    expect(barFormat(-140, 'currency', 'USD')).toBe('-$140');
  });
});

describe('buildBarDatasets', () => {
  it('maps one dataset per series, carrying its label and values', () => {
    const datasets = buildBarDatasets(SERIES);
    expect(datasets).toHaveLength(2);
    expect(datasets[0].label).toBe('Income');
    expect(datasets[0].data).toEqual([5000, 5200]);
    expect(datasets[1].data).toEqual([1200, 980]);
  });

  it('assigns distinct default colors and cycles them past the palette length', () => {
    const many: BarSeries[] = Array.from({length: 7}, (_, i) => ({
      label: `S${i}`,
      points: [{label: 'Jan', value: i}],
    }));
    const colors = buildBarDatasets(many).map(d => d.backgroundColor);
    expect(colors[0]).not.toBe(colors[1]);
    expect(colors[5]).toBe(colors[0]);
    expect(colors[6]).toBe(colors[1]);
  });

  it('lets a series override its color', () => {
    const [dataset] = buildBarDatasets([
      {label: 'Custom', color: '#123456', points: [{label: 'Jan', value: 1}]},
    ]);
    expect(dataset.backgroundColor).toBe('#123456');
  });

  it('returns nothing for no series', () => {
    expect(buildBarDatasets([])).toEqual([]);
  });
});

describe('buildBarChartConfig', () => {
  it('takes the x labels from the first series', () => {
    const config = buildBarChartConfig(SERIES, TOKENS, 'USD', false, 'currency');
    expect(config.data.labels).toEqual(['Jan', 'Feb']);
  });

  it('renders an empty label set when there are no series', () => {
    const config = buildBarChartConfig([], TOKENS, 'USD', false, 'currency');
    expect(config.data.labels).toEqual([]);
    expect(config.data.datasets).toEqual([]);
  });

  it('leaves both scales unstacked by default', () => {
    const config = buildBarChartConfig(SERIES, TOKENS, 'USD', false, 'currency');
    expect(scaleStacking(config)).toEqual({x: false, y: false});
  });

  it('stacks both scales when asked', () => {
    const config = buildBarChartConfig(SERIES, TOKENS, 'USD', true, 'currency');
    expect(scaleStacking(config)).toEqual({x: true, y: true});
  });

  it('hides the legend for a single series and shows it for more', () => {
    expect(legendDisplay(buildBarChartConfig([SERIES[0]], TOKENS, 'USD', false, 'currency'))).toBe(
      false
    );
    expect(legendDisplay(buildBarChartConfig(SERIES, TOKENS, 'USD', false, 'currency'))).toBe(true);
  });

  it('colors the chrome from the supplied tokens', () => {
    const config = buildBarChartConfig(SERIES, TOKENS, 'USD', false, 'currency');
    const scales = (
      config.options as {scales?: Record<string, {ticks?: {color?: string}}>} | undefined
    )?.scales;
    expect(scales?.['x']?.ticks?.color).toBe(TOKENS.textSecondary);
    expect(scales?.['y']?.ticks?.color).toBe(TOKENS.textSecondary);
  });
});

describe('resolveBarChartTokens', () => {
  it('falls back to built-in values when the CSS variables are unset', () => {
    const tokens = resolveBarChartTokens();
    expect(tokens.textSecondary).toBeTruthy();
    expect(tokens.borderDefault).toBeTruthy();
  });
});

describe('updateBarChart', () => {
  it('replaces the labels and datasets in place, then repaints without animation', () => {
    const chart = {
      data: {labels: ['old'], datasets: []},
      update: (mode?: string) => {
        chart.lastMode = mode;
      },
      lastMode: undefined as string | undefined,
    };

    updateBarChart(chart as unknown as Chart, SERIES);

    expect(chart.data.labels).toEqual(['Jan', 'Feb']);
    expect(chart.data.datasets).toHaveLength(2);
    expect(chart.lastMode).toBe('none');
  });

  it('clears the chart when the series go away', () => {
    const chart = {
      data: {labels: ['Jan'], datasets: [{}]},
      update: () => void 0,
    };

    updateBarChart(chart as unknown as Chart, []);
    expect(chart.data.labels).toEqual([]);
    expect(chart.data.datasets).toEqual([]);
  });
});
