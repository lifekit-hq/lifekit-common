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

describe('buildLineChartConfig compact', () => {
  it('hides both axes, and with them the ticks and gridlines', () => {
    const scales = buildLineChartConfig(POINTS, TOKENS, 'USD', 'currency', true).options?.scales;
    expect(scales?.['x']?.display).toBe(false);
    expect(scales?.['y']?.display).toBe(false);
  });

  it('draws no legend, title or tooltip, and ignores pointer events', () => {
    const options = buildLineChartConfig(POINTS, TOKENS, 'USD', 'currency', true).options;
    expect(options?.plugins?.legend?.display).toBe(false);
    expect(options?.plugins?.title).toBeUndefined();
    expect(options?.plugins?.tooltip?.enabled).toBe(false);
    expect(options?.events).toEqual([]);
  });

  it('disables animation', () => {
    const config = buildLineChartConfig(POINTS, TOKENS, 'USD', 'currency', true);
    expect(config.options?.animation).toBe(false);
  });

  it('insets the plot so the stroke is not clipped, and still fills the canvas', () => {
    const options = buildLineChartConfig(POINTS, TOKENS, 'USD', 'currency', true).options;
    expect(options?.layout?.padding).toBe(2);
    expect(options?.responsive).toBe(true);
    expect(options?.maintainAspectRatio).toBe(false);
  });

  it('keeps the line and area fill', () => {
    const config = buildLineChartConfig(POINTS, TOKENS, 'USD', 'currency', true);
    expect(config.data.datasets[0].data).toEqual([100, 200, 150]);
    expect(config.data.datasets[0].fill).toBe(true);
  });

  it('leaves the default chart unchanged: axes, tooltip and events on', () => {
    const options = buildLineChartConfig(POINTS, TOKENS, 'USD').options;
    expect(options?.scales?.['x']?.display).toBe(true);
    expect(options?.scales?.['y']?.display).toBe(true);
    expect(options?.plugins?.tooltip?.enabled).toBe(true);
    expect(options?.events).toBeUndefined();
    expect(options?.layout).toBeUndefined();
    expect(options?.animation).toBeUndefined();
  });
});

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 0, 1);
const HOUR = 3_600_000;
// Midday UTC is the same calendar date in every timezone from UTC-11 to UTC+11.
const NOON = 12 * HOUR;

type TimeTickCb = (value: number, index: number, ticks: {value: number}[]) => string | null;

// Two signals on day 0, then a long gap: even spacing would draw these as equals.
const TIMED: ChartPoint[] = [
  {label: 'A', value: 1, time: T0},
  {label: 'B', value: 2, time: T0 + DAY},
  {label: 'C', value: 3, time: T0 + 90 * DAY},
];

describe('buildLineChartConfig yDomain', () => {
  it('fixes the y range to the given min and max', () => {
    const y = buildLineChartConfig(POINTS, TOKENS, 'USD', 'currency', false, {
      yDomain: {min: 0, max: 3},
    }).options?.scales?.['y'];
    expect(y?.min).toBe(0);
    expect(y?.max).toBe(3);
  });

  it('keeps an omitted bound auto-scaled', () => {
    const y = buildLineChartConfig(POINTS, TOKENS, 'USD', 'currency', false, {
      yDomain: {min: 0},
    }).options?.scales?.['y'];
    expect(y?.min).toBe(0);
    expect(y?.max).toBeUndefined();
  });

  it('applies in compact mode too', () => {
    const y = buildLineChartConfig(POINTS, TOKENS, 'USD', 'currency', true, {
      yDomain: {min: 1, max: 3},
    }).options?.scales?.['y'];
    expect(y?.display).toBe(false);
    expect(y?.min).toBe(1);
    expect(y?.max).toBe(3);
  });

  it('leaves the y range auto-scaled by default', () => {
    const y = buildLineChartConfig(POINTS, TOKENS, 'USD').options?.scales?.['y'];
    expect(y?.min).toBeUndefined();
    expect(y?.max).toBeUndefined();
  });
});

describe('buildLineChartConfig xSpacing time', () => {
  const build = (points: ChartPoint[], compact = false) =>
    buildLineChartConfig(points, TOKENS, 'USD', 'currency', compact, {xSpacing: 'time'});

  it('positions each point by its timestamp on a linear x scale', () => {
    const config = build(TIMED);
    expect(config.data.datasets[0].data).toEqual([
      {x: T0, y: 1, label: 'A'},
      {x: T0 + DAY, y: 2, label: 'B'},
      {x: T0 + 90 * DAY, y: 3, label: 'C'},
    ]);
    expect(config.data.labels).toBeUndefined();
    const x = config.options?.scales?.['x'] as {type: string; bounds: string};
    expect(x.type).toBe('linear');
    expect(x.bounds).toBe('data');
  });

  it('orders points by time so the line never doubles back', () => {
    const config = build([TIMED[2], TIMED[0], TIMED[1]]);
    expect((config.data.datasets[0].data as {x: number}[]).map(p => p.x)).toEqual([
      T0,
      T0 + DAY,
      T0 + 90 * DAY,
    ]);
  });

  it('leaves out points without a finite timestamp', () => {
    const config = build([
      TIMED[0],
      {label: 'none', value: 9},
      {label: 'nan', value: 9, time: Number.NaN},
      TIMED[1],
    ]);
    expect(config.data.datasets[0].data).toHaveLength(2);
  });

  it('titles the tooltip with the point label and formats x ticks as dates', () => {
    const config = build([TIMED[2], TIMED[0]]);
    const title = config.options?.plugins?.tooltip?.callbacks?.title as unknown as (
      items: {dataIndex: number}[]
    ) => string;
    // Sorted by time, so index 0 is the earliest point.
    expect(title([{dataIndex: 0}])).toBe('A');
    const tick = (config.options?.scales?.['x'] as {ticks: {callback: TimeTickCb}}).ticks.callback;
    expect(tick(T0 + NOON, 0, [{value: T0 + NOON}])).toBe('Jan 1');
  });

  it('labels a date once when several x ticks fall on the same day', () => {
    const config = build(TIMED);
    const tick = (config.options?.scales?.['x'] as {ticks: {callback: TimeTickCb}}).ticks.callback;
    const ticks = [T0 + NOON - 2 * HOUR, T0 + NOON, T0 + NOON + 2 * HOUR, T0 + DAY + NOON].map(
      value => ({
        value,
      })
    );
    expect(ticks.map((t, i) => tick(t.value, i, ticks))).toEqual(['Jan 1', null, null, 'Jan 2']);
  });

  it('works in compact mode: no axes, still time-spaced', () => {
    const config = build(TIMED, true);
    expect(config.options?.scales?.['x']?.display).toBe(false);
    expect((config.options?.scales?.['x'] as {type: string}).type).toBe('linear');
    expect(config.options?.plugins?.tooltip?.enabled).toBe(false);
  });

  it('combines with a fixed y domain', () => {
    const config = buildLineChartConfig(TIMED, TOKENS, 'USD', 'currency', true, {
      xSpacing: 'time',
      yDomain: {min: 0, max: 4},
    });
    expect(config.options?.scales?.['y']?.max).toBe(4);
    expect(config.data.datasets[0].data).toHaveLength(3);
  });

  it('keeps even category spacing when xSpacing is even or unset', () => {
    for (const scale of [{xSpacing: 'even' as const}, {}]) {
      const config = buildLineChartConfig(TIMED, TOKENS, 'USD', 'currency', false, scale);
      expect(config.data.labels).toEqual(['A', 'B', 'C']);
      expect(config.data.datasets[0].data).toEqual([1, 2, 3]);
      expect((config.options?.scales?.['x'] as {type?: string}).type).toBeUndefined();
      expect(config.options?.plugins?.tooltip?.callbacks?.title).toBeUndefined();
    }
  });
});

describe('updateLineChart', () => {
  it('re-points the y domain and time-spaced data of a live chart', () => {
    const callbacks: Record<string, unknown> = {};
    const y: Record<string, unknown> = {min: 0, max: 10};
    const chart = {
      data: {datasets: [{data: [] as unknown[]}]},
      options: {plugins: {tooltip: {callbacks}}, scales: {y}},
      update: vi.fn(),
    };

    updateLineChart(chart as unknown as Chart, [TIMED[1], TIMED[0]], undefined, {
      xSpacing: 'time',
      yDomain: {min: 1, max: 3},
    });

    expect(chart.data.datasets[0].data).toEqual([
      {x: T0, y: 1, label: 'A'},
      {x: T0 + DAY, y: 2, label: 'B'},
    ]);
    expect(y['min']).toBe(1);
    expect(y['max']).toBe(3);
    expect((callbacks['title'] as (i: {dataIndex: number}[]) => string)([{dataIndex: 1}])).toBe(
      'B'
    );
    expect(chart.update).toHaveBeenCalledWith('none');
  });

  it('clears a fixed y domain when the scale no longer carries one', () => {
    const y: Record<string, unknown> = {min: 0, max: 10};
    const chart = {
      data: {labels: [] as string[], datasets: [{data: [] as unknown[]}]},
      options: {scales: {y}},
      update: vi.fn(),
    };
    updateLineChart(chart as unknown as Chart, POINTS);
    expect(y['min']).toBeUndefined();
    expect(y['max']).toBeUndefined();
    expect(chart.data.labels).toEqual(['Jan', 'Feb', 'Mar']);
  });

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
