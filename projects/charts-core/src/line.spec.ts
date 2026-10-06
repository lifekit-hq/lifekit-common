import {type Chart} from 'chart.js';
import {describe, expect, it, vi} from 'vitest';

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

type LabelCb = (ctx: {parsed: {y: number}}) => string;
type TickCb = (val: number) => string;

function formatters(config: ReturnType<typeof buildLineChartConfig>) {
  const label = config.options?.plugins?.tooltip?.callbacks?.label as unknown as LabelCb;
  const tick = (config.options?.scales?.['y'] as {ticks: {callback: unknown}}).ticks
    .callback as TickCb;
  return {tooltip: (y: number) => label({parsed: {y}}), tick};
}

describe('buildLineChartConfig value format', () => {
  it('defaults to currency in the tooltip and ticks', () => {
    const {tooltip, tick} = formatters(buildLineChartConfig(POINTS, TOKENS, 'USD'));
    expect(tooltip(25)).toBe('$25');
    expect(tick(12_400)).toBe('$12.4K');
  });

  it('treats an explicit currency format the same as the default', () => {
    const {tooltip, tick} = formatters(buildLineChartConfig(POINTS, TOKENS, 'EUR', 'currency'));
    expect(tooltip(25)).toContain('25');
    expect(tooltip(25)).not.toBe('25');
    expect(tick(12_400)).toContain('12.4K');
  });

  it('renders a unit-less number without a currency symbol', () => {
    const {tooltip, tick} = formatters(buildLineChartConfig(POINTS, TOKENS, 'USD', 'number'));
    expect(tooltip(25)).toBe('25');
    expect(tooltip(25.5)).toBe('25.5');
    expect(tick(25)).toBe('25');
    expect(tick(12_400)).toBe('12.4K');
  });

  it('renders percent values with a percent sign', () => {
    const {tooltip, tick} = formatters(buildLineChartConfig(POINTS, TOKENS, 'USD', 'percent'));
    expect(tooltip(62.45)).toBe('62.5%');
    expect(tick(62.45)).toBe('62.5%');
  });

  it('delegates to a consumer formatter, flagging ticks as compact', () => {
    const {tooltip, tick} = formatters(
      buildLineChartConfig(POINTS, TOKENS, 'USD', (v, compact) => `${v}${compact ? 't' : 'T'}`)
    );
    expect(tooltip(3)).toBe('3T');
    expect(tick(3)).toBe('3t');
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

  it('re-points the tooltip and tick formatters when given a format', () => {
    const callbacks: Record<string, unknown> = {};
    const ticks: Record<string, unknown> = {};
    const chart = {
      data: {labels: ['Jan'], datasets: [{data: [100]}]},
      options: {plugins: {tooltip: {callbacks}}, scales: {y: {ticks}}},
      update: vi.fn(),
    };

    updateLineChart(chart as unknown as Chart, POINTS, {currency: 'USD', valueFormat: 'number'});

    const label = callbacks['label'] as LabelCb;
    const tick = ticks['callback'] as TickCb;
    expect(label({parsed: {y: 25}})).toBe('25');
    expect(tick(25)).toBe('25');
  });
});
