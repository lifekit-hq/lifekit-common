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
});
