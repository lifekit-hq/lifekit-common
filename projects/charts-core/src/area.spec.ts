import {type Chart} from 'chart.js';
import {describe, expect, it} from 'vitest';

import {
  type AreaChartTokens,
  buildAreaChartConfig,
  buildAreaDatasets,
  updateAreaChart,
} from './area';
import {type AreaSeries} from './types';

const TOKENS: AreaChartTokens = {textSecondary: '#464555', borderDefault: '#c7c4d8'};

const SERIES: AreaSeries[] = [
  {
    label: 'Banking',
    points: [
      {label: 'Jan', value: 100},
      {label: 'Feb', value: 120},
    ],
  },
  {
    label: 'Crypto',
    points: [
      {label: 'Jan', value: 40},
      {label: 'Feb', value: 55},
    ],
  },
];

/** Chart.js models scales as a deep-partial union, so read `stacked` structurally. */
function scaleStacking(target: {options?: unknown}): {x?: boolean; y?: boolean} {
  const scales = (target.options as {scales?: Record<string, {stacked?: boolean}>} | undefined)
    ?.scales;
  return {x: scales?.['x']?.stacked, y: scales?.['y']?.stacked};
}

/** `fill` is line-only, so it is absent from the generic dataset union on `Chart`. */
function fills(datasets: readonly unknown[]): unknown[] {
  return datasets.map(d => (d as {fill?: unknown}).fill);
}

describe('buildAreaChartConfig', () => {
  it('defaults to stacked so existing consumers keep the shipped behaviour', () => {
    const config = buildAreaChartConfig(SERIES, TOKENS, 'USD');
    expect(scaleStacking(config)).toEqual({x: true, y: true});
    expect(fills(config.data.datasets)).toEqual([true, true]);
  });

  it('stacks both scales and fills every band when stacked is true', () => {
    const config = buildAreaChartConfig(SERIES, TOKENS, 'USD', true);
    expect(scaleStacking(config)).toEqual({x: true, y: true});
    expect(fills(config.data.datasets)).toEqual([true, true]);
  });

  it('draws independent unfilled lines when stacked is false', () => {
    const config = buildAreaChartConfig(SERIES, TOKENS, 'USD', false);
    expect(scaleStacking(config)).toEqual({x: false, y: false});
    expect(fills(config.data.datasets)).toEqual([false, false]);
  });

  it('keeps labels, values and colours identical across both modes', () => {
    const stacked = buildAreaChartConfig(SERIES, TOKENS, 'USD', true);
    const lines = buildAreaChartConfig(SERIES, TOKENS, 'USD', false);
    expect(lines.data.labels).toEqual(stacked.data.labels);
    expect(lines.data.datasets.map(d => d.data)).toEqual(stacked.data.datasets.map(d => d.data));
    expect(lines.data.datasets.map(d => d.borderColor)).toEqual(
      stacked.data.datasets.map(d => d.borderColor)
    );
  });

  it('handles an empty series list', () => {
    const config = buildAreaChartConfig([], TOKENS, 'USD', false);
    expect(config.data.labels).toEqual([]);
    expect(config.data.datasets).toEqual([]);
  });
});

describe('buildAreaDatasets', () => {
  it('prefers the caller colour over the palette default', () => {
    const [dataset] = buildAreaDatasets([{label: 'Cash', color: '#123456', points: []}]);
    expect(dataset.borderColor).toBe('#123456');
    expect(dataset.backgroundColor).toBe('#123456cc');
  });

  it('cycles the default palette per series index', () => {
    const datasets = buildAreaDatasets(SERIES);
    expect(datasets[0].borderColor).not.toBe(datasets[1].borderColor);
  });
});

describe('updateAreaChart', () => {
  function fakeChart(): {chart: Chart; updates: string[]} {
    const updates: string[] = [];
    const chart = {
      data: {labels: ['Jan'], datasets: []},
      options: {scales: {x: {stacked: true}, y: {stacked: true}}},
      update: (mode: string) => updates.push(mode),
    } as unknown as Chart;
    return {chart, updates};
  }

  it('replaces labels and datasets then repaints without animation', () => {
    const {chart, updates} = fakeChart();

    updateAreaChart(chart, SERIES);

    expect(chart.data.labels).toEqual(['Jan', 'Feb']);
    expect(chart.data.datasets.map(d => d.data)).toEqual([
      [100, 120],
      [40, 55],
    ]);
    expect(updates).toEqual(['none']);
  });

  it('unstacks the live scales and clears the fill when toggled off', () => {
    const {chart} = fakeChart();

    updateAreaChart(chart, SERIES, false);

    expect(scaleStacking(chart)).toEqual({x: false, y: false});
    expect(fills(chart.data.datasets)).toEqual([false, false]);
  });

  it('restacks the live scales and restores the fill when toggled back on', () => {
    const {chart} = fakeChart();

    updateAreaChart(chart, SERIES, false);
    updateAreaChart(chart, SERIES, true);

    expect(scaleStacking(chart)).toEqual({x: true, y: true});
    expect(fills(chart.data.datasets)).toEqual([true, true]);
  });

  it('leaves a chart without cartesian scales alone', () => {
    const chart = {
      data: {labels: [], datasets: []},
      options: {},
      update: () => undefined,
    } as unknown as Chart;

    expect(() => updateAreaChart(chart, SERIES, false)).not.toThrow();
  });
});
