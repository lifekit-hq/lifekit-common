import {type Chart} from 'chart.js';
import {describe, expect, it} from 'vitest';

import {buildLineChartConfig, updateLineChart} from './line';
import {type ChartPoint} from './types';

const TOKENS = {accent: '#4f46e5', textSecondary: '#464555', borderDefault: '#c7c4d8'};

const POINTS: ChartPoint[] = [
  {label: 'Jan', value: 100},
  {label: 'Feb', value: 200},
  {label: 'Mar', value: 150},
];

describe('buildLineChartConfig', () => {
  it('returns a line chart config with correct type', () => {
    const config = buildLineChartConfig(POINTS, TOKENS, 'USD');
    expect(config.type).toBe('line');
  });

  it('maps point labels to chart data labels', () => {
    const config = buildLineChartConfig(POINTS, TOKENS, 'USD');
    expect(config.data.labels).toEqual(['Jan', 'Feb', 'Mar']);
  });

  it('maps point values to dataset data', () => {
    const config = buildLineChartConfig(POINTS, TOKENS, 'USD');
    expect(config.data.datasets[0].data).toEqual([100, 200, 150]);
  });

  it('applies accent token to border color', () => {
    const config = buildLineChartConfig(POINTS, TOKENS, 'USD');
    expect(config.data.datasets[0].borderColor).toBe('#4f46e5');
  });

  it('derives background color from accent with 1a alpha suffix', () => {
    const config = buildLineChartConfig(POINTS, TOKENS, 'USD');
    expect(config.data.datasets[0].backgroundColor).toBe('#4f46e51a');
  });

  it('sets fill and tension', () => {
    const config = buildLineChartConfig(POINTS, TOKENS, 'USD');
    expect(config.data.datasets[0].fill).toBe(true);
    expect(config.data.datasets[0].tension).toBe(0.3);
  });

  it('sets responsive and no aspect ratio', () => {
    const config = buildLineChartConfig(POINTS, TOKENS, 'USD');
    expect(config.options?.responsive).toBe(true);
    expect(config.options?.maintainAspectRatio).toBe(false);
  });

  it('handles empty points array', () => {
    const config = buildLineChartConfig([], TOKENS, 'USD');
    expect(config.data.labels).toEqual([]);
    expect(config.data.datasets[0].data).toEqual([]);
  });
});

describe('updateLineChart', () => {
  it('mutates chart data labels and values then calls update', () => {
    const newPoints: ChartPoint[] = [{label: 'Apr', value: 300}];
    let updateCalled = false;
    const fakeChart = {
      data: {labels: ['Jan'], datasets: [{data: [100]}]},
      update: (mode: string) => {
        expect(mode).toBe('none');
        updateCalled = true;
      },
    } as unknown as Chart;

    updateLineChart(fakeChart, newPoints);

    expect(fakeChart.data.labels).toEqual(['Apr']);
    expect(fakeChart.data.datasets[0].data).toEqual([300]);
    expect(updateCalled).toBe(true);
  });
});
