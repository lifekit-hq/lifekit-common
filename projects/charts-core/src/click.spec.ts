import {type Chart, type ChartConfiguration, type ChartEvent} from 'chart.js';
import {describe, expect, it, vi} from 'vitest';

import {bindChartClick, resolveAreaClick} from './click';

const EVENT = {type: 'click', x: 10, y: 20} as unknown as ChartEvent;

function fakeChart(hits: {index: number; datasetIndex: number; element: {y: number}}[]): Chart {
  return {
    canvas: document.createElement('canvas'),
    data: {
      labels: ['Jan', 'Feb'],
      datasets: [
        {label: 'Banking', data: [100, 120]},
        {label: 'Crypto', data: [40, 55]},
      ],
    },
    getElementsAtEventForMode: () => hits,
  } as unknown as Chart;
}

function runClick(config: ChartConfiguration<'bar'>, chart: Chart): void {
  (config.options?.onClick as (e: ChartEvent, a: unknown[], c: Chart) => void)(EVENT, [], chart);
}

describe('resolveAreaClick', () => {
  const hits = [
    {index: 1, datasetIndex: 0, element: {y: 80}},
    {index: 1, datasetIndex: 1, element: {y: 50}},
  ];

  it('picks the band the pointer sits in when stacked', () => {
    const chart = fakeChart(hits);
    expect(resolveAreaClick(chart, {y: 90} as ChartEvent, true)?.seriesLabel).toBe('Banking');
    expect(resolveAreaClick(chart, {y: 60} as ChartEvent, true)?.seriesLabel).toBe('Crypto');
  });

  it('falls back to the topmost band when the pointer is above the stack', () => {
    expect(resolveAreaClick(fakeChart(hits), {y: 10} as ChartEvent, true)?.seriesLabel).toBe(
      'Crypto'
    );
  });

  it('reports the series own value, not the stacked position', () => {
    expect(resolveAreaClick(fakeChart(hits), {y: 60} as ChartEvent, true)).toEqual({
      index: 1,
      seriesIndex: 1,
      label: 'Feb',
      seriesLabel: 'Crypto',
      value: 55,
    });
  });

  it('picks the nearest line when unstacked', () => {
    expect(resolveAreaClick(fakeChart(hits), {y: 55} as ChartEvent, false)?.seriesLabel).toBe(
      'Crypto'
    );
    expect(resolveAreaClick(fakeChart(hits), {y: 75} as ChartEvent, false)?.seriesLabel).toBe(
      'Banking'
    );
  });

  it('is null when the pointer is over no column', () => {
    expect(resolveAreaClick(fakeChart([]), EVENT, true)).toBeNull();
  });
});

describe('bindChartClick', () => {
  const base: ChartConfiguration<'bar'> = {type: 'bar', data: {datasets: []}};

  it('emits what the binding resolves while active', () => {
    const emit = vi.fn();
    const config = bindChartClick(base, {resolve: () => 'hit', isActive: () => true, emit});
    runClick(config, fakeChart([]));
    expect(emit).toHaveBeenCalledExactlyOnceWith('hit');
  });

  it('emits nothing while inactive, and nothing for a click on no target', () => {
    const emit = vi.fn();
    let active = false;
    const config = bindChartClick(base, {resolve: () => 'hit', isActive: () => active, emit});
    runClick(config, fakeChart([]));

    active = true;
    const none = bindChartClick(base, {resolve: () => null, isActive: () => active, emit});
    runClick(none, fakeChart([]));
    expect(emit).not.toHaveBeenCalled();
  });

  it('keeps the config options and plugins it was given', () => {
    const plugin = {id: 'mine'};
    const config = bindChartClick(
      {...base, plugins: [plugin], options: {responsive: true}},
      {resolve: () => null, isActive: () => true, emit: vi.fn()}
    );
    expect(config.options?.responsive).toBe(true);
    expect(config.plugins?.map(p => p.id)).toEqual(['mine', 'chartClickCursor']);
  });

  it('sets the pointer cursor only over a target, and clears it elsewhere', () => {
    let target: string | null = 'hit';
    const config = bindChartClick(base, {
      resolve: () => target,
      isActive: () => true,
      emit: vi.fn(),
    });
    const cursor = config.plugins?.find(p => p.id === 'chartClickCursor');
    const chart = fakeChart([]);
    const move = (inChartArea: boolean, type = 'mousemove'): string => {
      const args: unknown = {event: {type, x: 1, y: 1}, inChartArea};
      (cursor?.afterEvent as (c: Chart, a: unknown) => void)(chart, args);
      return chart.canvas.style.cursor;
    };

    expect(move(true)).toBe('pointer');
    expect(move(false)).toBe('');
    expect(move(true, 'mouseout')).toBe('');
    target = null;
    expect(move(true)).toBe('');
  });
});
