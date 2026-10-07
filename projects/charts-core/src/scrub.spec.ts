import {Chart} from 'chart.js';
import {afterEach, describe, expect, it, vi} from 'vitest';

import {buildAreaChartConfig} from './area';
import {buildLineChartConfig} from './line';
import {nearestIndex, scrubPointAt} from './scrub';
import {
  type AreaSeries,
  type ChartPoint,
  type ChartScrubHandlers,
  type ChartScrubPoint,
} from './types';
import {chartDelta} from './utils';

const TOKENS = {accent: '#4f46e5', textSecondary: '#464555', borderDefault: '#c7c4d8'};
const POINTS: ChartPoint[] = [
  {label: 'Jan', value: 100, time: 1_000},
  {label: 'Feb', value: 200, time: 2_000},
  {label: 'Mar', value: 150, time: 3_000},
  {label: 'Apr', value: 180, time: 4_000},
];
const SERIES: AreaSeries[] = [
  {label: 'Cash', points: POINTS.map(p => ({...p, value: p.value}))},
  {label: 'Stocks', points: POINTS.map(p => ({...p, value: p.value * 2}))},
];
const WIDTH = 400;

interface Harness {
  chart: Chart;
  canvas: HTMLCanvasElement;
  scrubs: ChartScrubPoint[];
  releases: number;
  /** Fires a pointer event at `x` CSS px from the canvas' left edge. */
  fire: (type: string, x: number, init?: PointerEventInit) => PointerEvent;
  xOf: (index: number) => number;
}

const mounted: Chart[] = [];

function mount(
  build: (handlers: ChartScrubHandlers) => ReturnType<typeof buildLineChartConfig>
): Harness {
  const host = document.createElement('div');
  host.style.cssText = `position:absolute;left:0;top:0;width:${WIDTH}px;height:200px`;
  const canvas = document.createElement('canvas');
  host.appendChild(canvas);
  document.body.appendChild(host);
  const scrubs: ChartScrubPoint[] = [];
  const harness: Harness = {
    scrubs,
    releases: 0,
    fire: (type, x, init) => {
      const rect = canvas.getBoundingClientRect();
      const event = new PointerEvent(type, {
        clientX: rect.left + x,
        clientY: rect.top + 50,
        pointerId: 1,
        pointerType: 'mouse',
        bubbles: true,
        cancelable: true,
        ...init,
      });
      canvas.dispatchEvent(event);
      return event;
    },
    xOf: index => harness.chart.getDatasetMeta(0).data[index].x,
    canvas,
    chart: undefined as unknown as Chart,
  };
  harness.chart = new Chart(
    canvas,
    build({
      onScrub: point => scrubs.push(point),
      onRelease: () => {
        harness.releases++;
      },
    })
  );
  mounted.push(harness.chart);
  return harness;
}

const line = () =>
  mount(h => buildLineChartConfig(POINTS, TOKENS, 'USD', 'currency', false, {}, h));

afterEach(() => {
  mounted.splice(0).forEach(c => c.destroy());
  document.body.replaceChildren();
});

describe('nearestIndex', () => {
  it('picks the closest entry', () => {
    expect(nearestIndex([0, 10, 20], 4)).toBe(0);
    expect(nearestIndex([0, 10, 20], 6)).toBe(1);
    expect(nearestIndex([0, 10, 20], 99)).toBe(2);
  });

  it('is -1 for nothing to point at', () => {
    expect(nearestIndex([], 5)).toBe(-1);
  });
});

describe('chartDelta', () => {
  it('reports the change and its percent of the start', () => {
    expect(chartDelta(200, 250)).toEqual({change: 50, percent: 25});
    expect(chartDelta(200, 150)).toEqual({change: -50, percent: -25});
  });

  it('reads a fall from a negative start against its magnitude', () => {
    expect(chartDelta(-100, -50)).toEqual({change: 50, percent: 50});
  });

  it('has no percent from a zero start', () => {
    expect(chartDelta(0, 30)).toEqual({change: 30, percent: null});
  });
});

describe('scrub on a line chart', () => {
  it('reports the point under a hovering mouse, with index, x, y and series values', () => {
    const h = line();
    h.fire('pointermove', h.xOf(1));
    expect(h.scrubs).toEqual([
      {
        index: 1,
        label: 'Feb',
        x: 'Feb',
        y: 200,
        total: 200,
        values: [{label: '', value: 200}],
      },
    ]);
  });

  it('only reports when the point changes', () => {
    const h = line();
    h.fire('pointermove', h.xOf(1));
    h.fire('pointermove', h.xOf(1) + 2);
    h.fire('pointermove', h.xOf(2));
    expect(h.scrubs.map(p => p.index)).toEqual([1, 2]);
  });

  it('clamps a pointer past the plot to the nearest end', () => {
    const h = line();
    h.fire('pointermove', 0);
    h.fire('pointermove', WIDTH);
    expect(h.scrubs.map(p => p.index)).toEqual([0, 3]);
  });

  it('releases when the mouse leaves, once', () => {
    const h = line();
    h.fire('pointermove', h.xOf(1));
    h.fire('pointerleave', 0);
    h.fire('pointerleave', 0);
    expect(h.releases).toBe(1);
  });

  it('does not release for a pointer that never scrubbed', () => {
    const h = line();
    h.fire('pointerleave', 0);
    expect(h.releases).toBe(0);
  });

  it('reads a touch only while the finger is down, and releases on lift', () => {
    const h = line();
    const touch = {pointerType: 'touch'};
    h.fire('pointermove', h.xOf(1), touch);
    expect(h.scrubs).toEqual([]);
    h.fire('pointerdown', h.xOf(1), touch);
    h.fire('pointermove', h.xOf(2), touch);
    expect(h.scrubs.map(p => p.index)).toEqual([1, 2]);
    h.fire('pointerup', h.xOf(2), touch);
    expect(h.releases).toBe(1);
    h.fire('pointermove', h.xOf(3), touch);
    expect(h.scrubs.map(p => p.index)).toEqual([1, 2]);
  });

  it('ignores a second touch and a leave while the finger is held', () => {
    const h = line();
    h.fire('pointerdown', h.xOf(1), {pointerType: 'touch', pointerId: 1});
    h.fire('pointermove', h.xOf(3), {pointerType: 'touch', pointerId: 2});
    h.fire('pointerup', h.xOf(3), {pointerType: 'touch', pointerId: 2});
    h.fire('pointerleave', 0, {pointerType: 'touch', pointerId: 1});
    expect(h.scrubs.map(p => p.index)).toEqual([1]);
    expect(h.releases).toBe(0);
  });

  it('releases when the browser takes the gesture over (a vertical pan)', () => {
    const h = line();
    h.fire('pointerdown', h.xOf(1), {pointerType: 'touch'});
    h.fire('pointercancel', h.xOf(1), {pointerType: 'touch'});
    expect(h.releases).toBe(1);
  });

  it('keeps the page scrollable vertically and the browser from opening a menu mid-scrub', () => {
    const h = line();
    expect(h.canvas.style.touchAction).toBe('pan-y');
    expect(h.fire('contextmenu', 10).defaultPrevented).toBe(false);
    h.fire('pointerdown', h.xOf(1), {pointerType: 'touch'});
    expect(h.fire('contextmenu', 10).defaultPrevented).toBe(true);
  });

  it('draws a crosshair at the scrubbed point and none after release', () => {
    const h = line();
    const stroke = vi.spyOn(h.chart.ctx, 'stroke');
    h.fire('pointermove', h.xOf(2));
    expect(stroke).toHaveBeenCalled();
    const moveTo = vi.spyOn(h.chart.ctx, 'moveTo');
    h.chart.draw();
    expect(moveTo).toHaveBeenCalledWith(h.xOf(2), h.chart.chartArea.top);
    h.fire('pointerleave', 0);
    moveTo.mockClear();
    h.chart.draw();
    expect(moveTo).not.toHaveBeenCalledWith(h.xOf(2), h.chart.chartArea.top);
  });

  it('marks the scrubbed point with a dot in the series colour', () => {
    const h = line();
    const arc = vi.spyOn(h.chart.ctx, 'arc');
    h.fire('pointermove', h.xOf(2));
    expect(arc).toHaveBeenCalledWith(
      h.xOf(2),
      h.chart.getDatasetMeta(0).data[2].y,
      expect.any(Number),
      0,
      expect.any(Number)
    );
    arc.mockClear();
    h.fire('pointerleave', 0);
    expect(arc).not.toHaveBeenCalled();
  });

  it('steps the tooltip aside while scrubbing', () => {
    const h = line();
    expect(h.chart.options.plugins?.tooltip?.enabled).toBe(false);
  });

  it('releases when new data leaves the scrubbed point past the end', () => {
    const h = line();
    h.fire('pointermove', h.xOf(3));
    h.chart.data.labels = ['Jan', 'Feb'];
    h.chart.data.datasets[0].data = [100, 200];
    h.chart.update('none');
    expect(h.releases).toBe(1);
  });

  it('lets go of the canvas when destroyed', () => {
    const h = line();
    h.chart.destroy();
    expect(h.canvas.style.touchAction).toBe('');
    h.fire('pointermove', 100);
    expect(h.scrubs).toEqual([]);
  });

  it('reads a time-spaced chart by its timestamp and keeps the label', () => {
    const h = mount(handlers =>
      buildLineChartConfig(POINTS, TOKENS, 'USD', 'currency', false, {xSpacing: 'time'}, handlers)
    );
    h.fire('pointermove', h.xOf(2));
    expect(h.scrubs[0]).toMatchObject({index: 2, label: 'Mar', x: 3_000, y: 150});
  });
});

describe('scrub defaults', () => {
  it('adds no plugin and keeps the tooltip when no handlers are given', () => {
    const config = buildLineChartConfig(POINTS, TOKENS, 'USD');
    expect(config.plugins).toBeUndefined();
    expect(config.options?.plugins?.tooltip?.enabled).toBe(true);
    const area = buildAreaChartConfig(SERIES, TOKENS, 'USD');
    expect(area.plugins?.map(p => p.id)).toEqual(['xTickLimit']);
    expect(area.options?.plugins?.tooltip?.enabled).toBe(true);
  });

  it('ignores scrub on a compact chart', () => {
    const config = buildLineChartConfig(
      POINTS,
      TOKENS,
      'USD',
      'currency',
      true,
      {},
      {
        onScrub: vi.fn(),
        onRelease: vi.fn(),
      }
    );
    expect(config.plugins).toBeUndefined();
  });
});

describe('scrub on an area chart', () => {
  const area = (stacked: boolean) =>
    mount(h => buildAreaChartConfig(SERIES, TOKENS, 'USD', stacked, h));

  it('reports every band and the stacked total as the headline', () => {
    const h = area(true);
    h.fire('pointermove', h.xOf(1));
    expect(h.scrubs[0]).toEqual({
      index: 1,
      label: 'Feb',
      x: 'Feb',
      y: 600,
      total: 600,
      values: [
        {label: 'Cash', value: 200},
        {label: 'Stocks', value: 400},
      ],
    });
  });

  it('reads the first series as the headline when the bands are not stacked', () => {
    const h = area(false);
    h.fire('pointermove', h.xOf(1));
    expect(h.scrubs[0].y).toBe(200);
    expect(h.scrubs[0].total).toBe(600);
  });

  it('leaves a hidden band out of the reading', () => {
    const h = area(true);
    h.chart.setDatasetVisibility(1, false);
    h.chart.update('none');
    h.fire('pointermove', h.xOf(1));
    expect(h.scrubs[0].values).toEqual([{label: 'Cash', value: 200}]);
    expect(h.scrubs[0].y).toBe(200);
  });

  it('keeps the tick-limit plugin beside the scrub plugin', () => {
    const config = buildAreaChartConfig(SERIES, TOKENS, 'USD', true, {
      onScrub: vi.fn(),
      onRelease: vi.fn(),
    });
    expect(config.plugins?.map(p => p.id)).toEqual(['xTickLimit', 'scrub']);
  });
});

describe('scrubPointAt', () => {
  it('is null when no visible series has a value at the index', () => {
    const h = line();
    expect(scrubPointAt(h.chart, 99)).toBeNull();
  });

  it('skips a null value rather than reading it as zero', () => {
    const h = line();
    h.chart.data.datasets[0].data = [100, null, 150, 180];
    expect(scrubPointAt(h.chart, 1)).toBeNull();
  });
});
