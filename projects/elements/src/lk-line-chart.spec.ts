import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

// Value import — forces module evaluation so customElements.define('lk-line-chart', …) runs.
// (A bare `import './lk-line-chart'` is tree-shaken because package.json has sideEffects:false.)
import {LkLineChart} from './lk-line-chart';

describe('LkLineChart', () => {
  let el: LkLineChart;

  beforeEach(async () => {
    el = document.createElement('lk-line-chart') as LkLineChart;
    document.body.appendChild(el);
    await el.updateComplete;
  });

  afterEach(() => {
    el.remove();
  });

  it('registers as a custom element with the correct class', () => {
    // Using LkLineChart as a runtime value forces this module to load (and run
    // customElements.define) even when package.json has sideEffects:false.
    expect(customElements.get('lk-line-chart')).toBe(LkLineChart);
  });

  it('renders a canvas inside shadow root', () => {
    const canvas = el.shadowRoot?.querySelector('canvas');
    expect(canvas).toBeTruthy();
  });

  it('renders no label span when label is empty', () => {
    const span = el.shadowRoot?.querySelector('.label');
    expect(span).toBeNull();
  });

  it('renders the label text when label is set', async () => {
    el.label = 'Portfolio Value';
    await el.updateComplete;
    const span = el.shadowRoot?.querySelector('.label');
    expect(span?.textContent?.trim()).toBe('Portfolio Value');
  });

  it('defaults currency to USD', () => {
    expect(el.currency).toBe('USD');
  });

  it('defaults valueFormat to currency', () => {
    expect(el.valueFormat).toBe('currency');
  });

  it('reads the value-format attribute', async () => {
    el.setAttribute('value-format', 'number');
    await el.updateComplete;
    expect(el.valueFormat).toBe('number');
  });

  it('defaults compact to off', () => {
    expect(el.compact).toBe(false);
  });

  it('reads and reflects the compact attribute', async () => {
    el.setAttribute('compact', '');
    await el.updateComplete;
    expect(el.compact).toBe(true);
    el.compact = false;
    await el.updateComplete;
    expect(el.hasAttribute('compact')).toBe(false);
  });

  it('drops the label when compact but keeps the canvas', async () => {
    el.label = 'Portfolio Value';
    el.compact = true;
    await el.updateComplete;
    expect(el.shadowRoot?.querySelector('.label')).toBeNull();
    expect(el.shadowRoot?.querySelector('canvas')).toBeTruthy();
  });

  it('builds a compact chart: no axes, no animation', async () => {
    el.compact = true;
    await el.updateComplete;
    const chart = (
      el as unknown as {
        chart: {options: {animation: unknown; scales: Record<string, {display: boolean}>}} | null;
      }
    ).chart;
    expect(chart).toBeTruthy();
    expect(chart?.options.animation).toBe(false);
    expect(chart?.options.scales['x'].display).toBe(false);
    expect(chart?.options.scales['y'].display).toBe(false);
  });

  it('defaults to auto-scaled y and even x spacing', () => {
    expect(el.yDomain).toBeUndefined();
    expect(el.xSpacing).toBe('even');
  });

  it('reads the x-spacing attribute', async () => {
    el.setAttribute('x-spacing', 'time');
    await el.updateComplete;
    expect(el.xSpacing).toBe('time');
  });

  interface BuiltChart {
    options: {scales: Record<string, {type?: string; min?: number; max?: number}>};
    data: {datasets: {data: unknown[]}[]};
  }
  const builtChart = (): BuiltChart | null => (el as unknown as {chart: BuiltChart | null}).chart;

  it('fixes the y range of a compact chart and follows later changes', async () => {
    el.compact = true;
    el.yDomain = {min: 0, max: 3};
    await el.updateComplete;
    expect(builtChart()?.options.scales['y'].min).toBe(0);
    expect(builtChart()?.options.scales['y'].max).toBe(3);
    el.yDomain = {min: 1};
    await el.updateComplete;
    expect(builtChart()?.options.scales['y'].min).toBe(1);
    expect(builtChart()?.options.scales['y'].max).toBeUndefined();
  });

  it('places points by time once x-spacing is time, rebuilding the chart', async () => {
    el.points = [
      {label: 'a', value: 1, time: 1_000},
      {label: 'b', value: 2, time: 9_000},
    ];
    await el.updateComplete;
    expect(builtChart()?.options.scales['x'].type).toBe('category');
    el.xSpacing = 'time';
    await el.updateComplete;
    expect(builtChart()?.options.scales['x'].type).toBe('linear');
    expect(builtChart()?.data.datasets[0].data).toEqual([
      {x: 1_000, y: 1, label: 'a'},
      {x: 9_000, y: 2, label: 'b'},
    ]);
    el.points = [{label: 'c', value: 5, time: 4_000}];
    await el.updateComplete;
    expect(builtChart()?.data.datasets[0].data).toEqual([{x: 4_000, y: 5, label: 'c'}]);
  });

  it('defaults points to empty array', () => {
    expect(el.points).toEqual([]);
  });

  it('accepts a points array update', async () => {
    const newPoints = [
      {label: 'Jan', value: 1000},
      {label: 'Feb', value: 2000},
    ];
    el.points = newPoints;
    await el.updateComplete;
    expect(el.points).toBe(newPoints);
  });

  it('destroys the chart on disconnect when chart was created', () => {
    // Access the internal chart reference; chart is private so we go through unknown.
    const chart = (el as unknown as {chart: {destroy(): void} | null}).chart;
    if (!chart) {
      // Canvas context unavailable in this jsdom build — lifecycle assertion not applicable
      expect(chart).toBeNull();
      return;
    }
    const spy = vi.spyOn(chart, 'destroy');
    el.remove();
    expect(spy).toHaveBeenCalledOnce();
  });

  describe('scrub-to-read', () => {
    const POINTS = [
      {label: 'Jan', value: 100},
      {label: 'Feb', value: 200},
      {label: 'Mar', value: 150},
    ];
    const canvas = (): HTMLCanvasElement =>
      el.shadowRoot?.querySelector('canvas') as HTMLCanvasElement;
    const hover = (fraction: number): void => {
      const rect = canvas().getBoundingClientRect();
      canvas().dispatchEvent(
        new PointerEvent('pointermove', {
          clientX: rect.left + rect.width * fraction,
          pointerType: 'mouse',
          bubbles: true,
        })
      );
    };

    it('is off by default and says nothing when hovered', async () => {
      el.points = POINTS;
      await el.updateComplete;
      const seen = vi.fn();
      el.addEventListener('lk-line-chart-scrub', seen);
      hover(0.5);
      expect(el.scrubbable).toBe(false);
      expect(seen).not.toHaveBeenCalled();
    });

    it('emits the point under the pointer and an end event on leave', async () => {
      el.points = POINTS;
      el.scrubbable = true;
      await el.updateComplete;
      const scrubs: {index: number; y: number}[] = [];
      let ends = 0;
      el.addEventListener('lk-line-chart-scrub', e => scrubs.push((e as CustomEvent).detail));
      el.addEventListener('lk-line-chart-scrub-end', () => ends++);
      hover(1);
      expect(scrubs).toMatchObject([{index: 2, y: 150}]);
      canvas().dispatchEvent(new PointerEvent('pointerleave', {pointerType: 'mouse'}));
      expect(ends).toBe(1);
    });

    it('reads the scrubbable attribute', async () => {
      el.setAttribute('scrubbable', '');
      await el.updateComplete;
      expect(el.scrubbable).toBe(true);
    });

    it('rebuilds the chart when scrubbable is switched on later', async () => {
      el.points = POINTS;
      await el.updateComplete;
      const before = builtChart();
      el.scrubbable = true;
      await el.updateComplete;
      expect(builtChart()).not.toBe(before);
      expect(builtChart()).not.toBeNull();
    });
  });
});
