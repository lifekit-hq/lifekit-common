import {Chart, type ChartConfiguration} from 'chart.js';
import {afterEach, describe, expect, it} from 'vitest';

import {buildBarChartConfig} from './bar';
import {buildDonutChartConfig} from './donut';
import {bindChartHighlight} from './highlight';
import {type BarSeries, type DonutSegment} from './types';

const BAR_TOKENS = {textSecondary: '#464555', borderDefault: '#c7c4d8'};
const SERIES: BarSeries[] = [
  {
    label: 'Spend',
    points: [
      {label: 'Jan', value: 100},
      {label: 'Feb', value: 200},
      {label: 'Mar', value: 150},
    ],
  },
];
const SEGMENTS: DonutSegment[] = [
  {label: 'Housing', value: 600},
  {label: 'Food', value: 300},
  {label: 'Fun', value: 100},
];

interface Harness {
  chart: Chart;
  canvas: HTMLCanvasElement;
  /** Every report in order: an index, or null for a release. */
  reads: (number | null)[];
  press: (key: string, modifiers?: KeyboardEventInit) => KeyboardEvent;
  /**
   * Moves a mouse to the centre of item `index`, or off the canvas for null; resolves once Chart.js
   * has handled it (it reads pointer events on the next animation frame).
   */
  hover: (index: number | null) => Promise<void>;
}

const mounted: Chart[] = [];

function mount(config: ChartConfiguration): Harness {
  const host = document.createElement('div');
  host.style.cssText = 'position:absolute;left:0;top:0;width:400px;height:300px';
  const canvas = document.createElement('canvas');
  host.appendChild(canvas);
  document.body.appendChild(host);
  const reads: (number | null)[] = [];
  const chart = new Chart(
    canvas,
    bindChartHighlight(config, {
      onHighlight: index => reads.push(index),
      onRelease: () => reads.push(null),
    })
  );
  mounted.push(chart);
  return {
    chart,
    canvas,
    reads,
    press: (key, modifiers) => {
      const event = new KeyboardEvent('keydown', {
        key,
        bubbles: true,
        cancelable: true,
        ...modifiers,
      });
      canvas.dispatchEvent(event);
      return event;
    },
    hover: async index => {
      const rect = canvas.getBoundingClientRect();
      // Bars and arcs both know their centre; the base Element type does not say so.
      const element = (index === null ? null : chart.getDatasetMeta(0).data[index]) as {
        getCenterPoint(): {x: number; y: number};
      } | null;
      const {x, y} = element ? element.getCenterPoint() : {x: -10, y: -10};
      canvas.dispatchEvent(
        new MouseEvent(index === null ? 'mouseout' : 'mousemove', {
          clientX: rect.left + x,
          clientY: rect.top + y,
          bubbles: true,
        })
      );
      await new Promise(resolve => requestAnimationFrame(resolve));
    },
  };
}

const bars = () =>
  mount(buildBarChartConfig(SERIES, BAR_TOKENS, 'USD', false, 'currency') as ChartConfiguration);
const donut = () =>
  mount(
    buildDonutChartConfig(SEGMENTS, {textSecondary: '#464555'}, 'USD', false) as ChartConfiguration
  );

afterEach(() => {
  mounted.splice(0).forEach(c => c.destroy());
  document.body.replaceChildren();
});

describe('highlight on a bar chart', () => {
  it('steps the bars by key and reads the ends on Home and End', () => {
    const h = bars();
    h.press('ArrowRight');
    h.press('ArrowRight');
    h.press('End');
    h.press('Home');
    expect(h.reads).toEqual([0, 1, 2, 0]);
  });

  it('highlights the bar a key reads, with its tooltip', () => {
    const h = bars();
    h.press('End');
    expect(h.chart.getActiveElements().map(e => e.index)).toEqual([2]);
    expect(h.chart.tooltip?.getActiveElements().map(e => e.index)).toEqual([2]);
  });

  it('reports the bar a mouse hovers, once, and releases when it leaves', async () => {
    const h = bars();
    await h.hover(1);
    await h.hover(1);
    await h.hover(null);
    expect(h.reads).toEqual([1, null]);
  });

  it('clears the highlight on Escape and on blur, reporting once each', () => {
    const h = bars();
    h.press('Home');
    h.press('Escape');
    h.press('Escape');
    expect(h.chart.getActiveElements()).toEqual([]);
    h.press('End');
    h.canvas.dispatchEvent(new FocusEvent('blur'));
    expect(h.reads).toEqual([0, null, 2, null]);
  });

  it('takes the scrub keys from the page and leaves the rest alone', () => {
    const h = bars();
    expect(h.press('ArrowLeft').defaultPrevented).toBe(true);
    expect(h.press('ArrowUp').defaultPrevented).toBe(false);
  });

  it('leaves a key chorded with a modifier to the browser and reads nothing', () => {
    const h = bars();
    expect(h.press('ArrowRight', {altKey: true}).defaultPrevented).toBe(false);
    expect(h.press('End', {ctrlKey: true}).defaultPrevented).toBe(false);
    expect(h.reads).toEqual([]);
  });

  it('lets a key read win over a mouse resting on another bar', async () => {
    const h = bars();
    await h.hover(0);
    h.press('End');
    await new Promise(resolve => requestAnimationFrame(resolve));
    expect(h.reads).toEqual([0, 2]);
    expect(h.chart.getActiveElements().map(e => e.index)).toEqual([2]);
    expect(h.chart.tooltip?.getActiveElements().map(e => e.index)).toEqual([2]);
    h.press('ArrowLeft');
    expect(h.reads).toEqual([0, 2, 1]);
  });

  it('keeps vertical drags for the page', () => {
    expect(bars().canvas.style.touchAction).toBe('pan-y');
  });

  it('releases when new data leaves the highlighted bar past the end', () => {
    const h = bars();
    h.press('End');
    h.chart.data.labels = ['Jan'];
    h.chart.data.datasets[0].data = [100];
    h.chart.update();
    expect(h.reads).toEqual([2, null]);
  });

  it('lets go of the canvas when destroyed', () => {
    const h = bars();
    h.chart.destroy();
    mounted.splice(0);
    h.press('Home');
    expect(h.reads).toEqual([]);
    expect(h.canvas.style.touchAction).toBe('');
  });

  it('keeps the plugins the config already had', () => {
    const config = buildBarChartConfig(SERIES, BAR_TOKENS, 'USD', false, 'currency');
    const bound = bindChartHighlight(config, {
      onHighlight: () => undefined,
      onRelease: () => undefined,
    });
    expect(bound.plugins?.map(p => p.id)).toEqual([
      ...(config.plugins ?? []).map(p => p.id),
      'highlight',
    ]);
  });
});

describe('highlight on a donut chart', () => {
  it('steps the segments by key', () => {
    const h = donut();
    h.press('ArrowLeft');
    h.press('ArrowLeft');
    expect(h.reads).toEqual([2, 1]);
    expect(h.chart.getActiveElements().map(e => e.index)).toEqual([1]);
  });

  it('reports the segment a mouse hovers', async () => {
    const h = donut();
    await h.hover(0);
    expect(h.reads).toEqual([0]);
  });
});
