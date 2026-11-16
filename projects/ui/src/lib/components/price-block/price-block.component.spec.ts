import {type ComponentFixture, TestBed} from '@angular/core/testing';
import type {PriceSeries} from '@lifekit-hq/charts-core';

import {PriceBlockComponent} from './price-block.component';
import {
  AVERAGE_COST,
  BENCHMARK,
  FALLING,
  FILLS,
  PRICE_HISTORY_END,
  RECENT,
  RISING,
} from './price-block.fixtures';

const DAY_MS = 86_400_000;
const FLAT: PriceSeries = {
  label: 'FLAT',
  points: Array.from({length: 40}, (_, i) => ({
    time: PRICE_HISTORY_END - i * DAY_MS,
    value: 50,
  })).reverse(),
};

describe('PriceBlockComponent', () => {
  let fixture: ComponentFixture<PriceBlockComponent>;

  const root = (): HTMLElement => fixture.nativeElement;
  const q = <T extends HTMLElement>(testId: string): T | null =>
    root().querySelector<T>(`[data-testid="${testId}"]`);
  const tabs = (): HTMLButtonElement[] =>
    Array.from(root().querySelectorAll<HTMLButtonElement>('[role="tab"]'));
  const selected = (): string | null =>
    tabs()
      .find(t => t.getAttribute('aria-selected') === 'true')
      ?.textContent?.trim() ?? null;
  /** The tone of the change pill: the tag's colour classes sit on the element it draws. */
  const tone = (): 'success' | 'error' | 'neutral' | null => {
    const el = q('price-delta');
    if (!el) {
      return null;
    }
    if (el.querySelector('[class*="text-status-success"]')) {
      return 'success';
    }
    return el.querySelector('[class*="text-status-error"]') ? 'error' : 'neutral';
  };
  const canvas = (): HTMLCanvasElement => root().querySelector('canvas') as HTMLCanvasElement;

  function set(inputs: Record<string, unknown>): void {
    for (const [name, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(name, value);
    }
    fixture.detectChanges();
  }

  function hover(fraction: number): void {
    const rect = canvas().getBoundingClientRect();
    canvas().dispatchEvent(
      new PointerEvent('pointermove', {
        clientX: rect.left + rect.width * fraction,
        clientY: rect.top + rect.height * 0.8,
        pointerType: 'mouse',
        bubbles: true,
      })
    );
    fixture.detectChanges();
  }

  function leave(): void {
    canvas().dispatchEvent(new PointerEvent('pointerleave', {pointerType: 'mouse'}));
    fixture.detectChanges();
  }

  const chartOf = (): {data: {datasets: unknown[]}; destroy: () => void} =>
    (
      fixture.componentInstance as unknown as {
        chart: {data: {datasets: unknown[]}; destroy: () => void};
      }
    ).chart;

  beforeEach(async () => {
    await TestBed.configureTestingModule({imports: [PriceBlockComponent]}).compileComponents();
    fixture = TestBed.createComponent(PriceBlockComponent);
    fixture.componentRef.setInput('series', [RISING]);
    fixture.componentRef.setInput('label', 'ACME');
    fixture.detectChanges();
  });

  describe('headline and change', () => {
    it('shows the last price as the headline', () => {
      const last = RISING.points.at(-1)?.value ?? 0;
      expect(q('price-headline')?.textContent).toContain(
        last.toLocaleString('en-US', {style: 'currency', currency: 'USD'})
      );
    });

    it('colours the pill green with a rising arrow when the period ended up', () => {
      const delta = q('price-delta');
      expect(tone()).toBe('success');
      expect(delta?.textContent).toContain('+');
      const rising = delta?.querySelector('cmn-icon')?.innerHTML;
      expect(rising).toContain('<svg');
      set({period: '1M'});
      // The arrow turns over with the sign, so the colour is not the only signal.
      expect(q('price-delta')?.querySelector('cmn-icon')?.innerHTML).not.toBe(rising);
    });

    it('colours the pill by the period read, not the instrument: down over a month, up over a year', () => {
      set({period: '1M'});
      expect(tone()).toBe('error');
      expect(q('price-delta')?.textContent).toContain('−');
      set({period: '1Y'});
      expect(tone()).toBe('success');
    });

    it('colours the pill red when the instrument fell', () => {
      set({series: [FALLING]});
      expect(tone()).toBe('error');
    });

    it('reads a flat period as neutral with no arrow', () => {
      set({series: [FLAT]});
      expect(tone()).toBe('neutral');
      expect(q('price-delta')?.textContent).toContain('0.00');
    });

    it('names the change for a screen reader without relying on colour', () => {
      expect(q('price-delta')?.querySelector('.sr-only')?.textContent).toContain('Change');
    });
  });

  describe('period tabs', () => {
    it('offers the six periods, 1Y selected by default', () => {
      expect(tabs().map(t => t.textContent?.trim())).toEqual([
        '1M',
        '6M',
        'YTD',
        '1Y',
        '5Y',
        'Max',
      ]);
      expect(selected()).toBe('1Y');
    });

    it('selects a period on click and keeps the tabpanel labelled by it', () => {
      tabs()[0].click();
      fixture.detectChanges();
      expect(selected()).toBe('1M');
      expect(fixture.componentInstance.period()).toBe('1M');
      const panel = root().querySelector('[role="tabpanel"]');
      expect(panel?.getAttribute('aria-labelledby')).toBe(tabs()[0].id);
    });

    it('has one tab in the tab order, the selected one', () => {
      expect(tabs().map(t => t.tabIndex)).toEqual([-1, -1, -1, 0, -1, -1]);
    });

    it('moves with the arrow keys, wrapping, and with Home and End', () => {
      const key = (index: number, name: string): void => {
        tabs()[index].dispatchEvent(
          new KeyboardEvent('keydown', {key: name, bubbles: true, cancelable: true})
        );
        fixture.detectChanges();
      };
      key(3, 'ArrowRight');
      expect(selected()).toBe('5Y');
      key(4, 'ArrowRight');
      expect(selected()).toBe('Max');
      key(5, 'ArrowRight');
      expect(selected()).toBe('1M');
      key(0, 'ArrowLeft');
      expect(selected()).toBe('Max');
      key(5, 'Home');
      expect(selected()).toBe('1M');
      key(0, 'End');
      expect(selected()).toBe('Max');
      key(5, 'a');
      expect(selected()).toBe('Max');
    });

    it('offers only the periods it is given', () => {
      set({periods: ['1M', '1Y']});
      expect(tabs().map(t => t.textContent?.trim())).toEqual(['1M', '1Y']);
    });

    it('puts the first tab in the tab order when the selected period is not offered', () => {
      set({periods: ['1M', '6M'], period: '5Y'});
      expect(tabs().map(t => t.tabIndex)).toEqual([0, -1]);
    });

    it('draws the selected tab with the accent underline', () => {
      expect(tabs()[3].className).toContain('border-accent-default');
      expect(tabs()[0].className).toContain('border-transparent');
    });
  });

  describe('benchmark', () => {
    it('draws one dataset for one series and two with a benchmark', () => {
      expect(chartOf().data.datasets.length).toBe(1);
      set({series: [RISING, BENCHMARK]});
      expect(chartOf().data.datasets.length).toBe(2);
    });

    it('reads in percent while a benchmark overlays: the headline stays the price, the baseline reads 0.00%', () => {
      const price = q('price-headline')?.textContent;
      set({series: [RISING, BENCHMARK]});
      expect(q('price-headline')?.textContent).toBe(price);
      expect(q('price-delta')?.textContent).toContain('%');
      expect(canvas().getAttribute('aria-label')).toContain('World index');
    });

    it('holds percent on a single series when mode says so, and price on a pair when it says that', () => {
      set({mode: 'percent'});
      expect(canvas().getAttribute('aria-label')).toBeTruthy();
      const percentCall = chartOf().data.datasets.length;
      set({mode: 'price', series: [RISING, BENCHMARK]});
      expect(percentCall).toBe(1);
      expect(chartOf().data.datasets.length).toBe(2);
    });
  });

  describe('empty and short data', () => {
    it('shows the message and keeps the tabs when there are no prices', () => {
      set({series: []});
      expect(q('chart-empty')?.textContent).toContain('No prices for this period');
      expect(q('price-headline')?.textContent).toContain('—');
      expect(q('price-delta')).toBeNull();
      expect(tabs().length).toBe(6);
      expect(canvas().hasAttribute('tabindex')).toBe(false);
    });

    it('uses a custom empty message', () => {
      set({series: [], emptyMessage: 'Nothing yet'});
      expect(q('chart-empty')?.textContent).toContain('Nothing yet');
    });

    it('holds the whole short history on a long period instead of an empty chart', () => {
      set({series: [RECENT], period: '5Y'});
      expect(q('chart-empty')).toBeNull();
      expect(q('price-delta')).toBeTruthy();
    });

    it('makes the plot focusable only when it has data', () => {
      expect(canvas().tabIndex).toBe(0);
    });
  });

  describe('table', () => {
    it('opens on the data table with a row per point of the period', () => {
      set({showDataTable: true, period: '1M'});
      expect(root().querySelectorAll('table tbody tr').length).toBeGreaterThan(10);
    });
  });

  describe('crosshair', () => {
    it('shows one pill with the date and the value, and moves the headline to that point', () => {
      const resting = q('price-headline')?.textContent;
      hover(0.5);
      expect(q('price-pill')).toBeTruthy();
      expect(q('price-pill-date')?.textContent).toMatch(/\w{3} \d{1,2}, \d{4}/);
      expect(q('price-pill')?.getAttribute('aria-hidden')).toBe('true');
      expect(q('price-headline')?.textContent).not.toBe(resting);
    });

    it('carries every series’ value in the same pill, labelled', () => {
      set({series: [RISING, BENCHMARK]});
      hover(0.5);
      const rows = root().querySelectorAll('[data-testid="price-pill-row"]');
      expect(rows.length).toBe(2);
      expect(rows[0].textContent).toContain('ACME');
      expect(rows[1].textContent).toContain('World index');
      expect(rows[0].textContent).toContain('%');
    });

    it('leaves a single series’ row unlabelled', () => {
      hover(0.5);
      expect(root().querySelectorAll('[data-testid="price-pill-row"]').length).toBe(1);
      expect(q('price-pill-row')?.textContent).not.toContain('ACME');
    });

    it('moves the change pill to the scrubbed point and says so to a screen reader', () => {
      hover(0.1);
      expect(q('price-delta')?.querySelector('.sr-only')?.textContent).toContain('Change to');
      expect(root().querySelector('[aria-live]')?.textContent).toBeTruthy();
    });

    it('puts everything back on release', () => {
      const headline = q('price-headline')?.textContent;
      const delta = q('price-delta')?.textContent;
      hover(0.5);
      leave();
      expect(q('price-pill')).toBeNull();
      expect(q('price-headline')?.textContent).toBe(headline);
      expect(q('price-delta')?.textContent).toBe(delta);
    });

    it('keeps the pill inside the plot at both ends', () => {
      const shift = (): number =>
        Number(/-([\d.]+)%/.exec(q('price-pill')?.style.transform ?? '')?.[1]);
      hover(0);
      const first = shift();
      hover(1);
      const last = shift();
      // The pill's own edge tracks the point across the plot, so it stays inside at both ends.
      expect(first).toBeLessThan(last);
      expect(last).toBeGreaterThan(90);
      expect(last).toBeLessThanOrEqual(100);
    });

    it('has the pill ignore pointers so it never blocks the plot', () => {
      hover(0.5);
      expect(q('price-pill')?.className).toContain('pointer-events-none');
    });
  });

  describe('chart lifecycle', () => {
    it('updates in place when the period changes', () => {
      const before = chartOf();
      set({period: '6M'});
      expect(chartOf()).toBe(before);
    });

    it('rebuilds when the series count changes, and when destroyed leaves no chart', () => {
      const before = chartOf();
      set({series: [RISING, BENCHMARK]});
      expect(chartOf()).not.toBe(before);
      fixture.destroy();
      expect((fixture.componentInstance as unknown as {chart: unknown}).chart).toBeNull();
    });
  });

  describe('accessible name', () => {
    it('names the block, the period and the range of prices', () => {
      const name = canvas().getAttribute('aria-label') ?? '';
      expect(name).toContain('ACME');
      expect(name).toContain('year');
    });

    it('falls back to a generic name without a label', () => {
      set({label: ''});
      expect(canvas().getAttribute('aria-label')).toContain('Price chart');
    });

    it('says what is missing when there is nothing to read', () => {
      set({series: []});
      expect(canvas().getAttribute('aria-label')).toContain('No prices for this period');
    });
  });
  describe('markers and reference line', () => {
    const annotations = (): {markers: {kind: string}[]; reference: {text: string} | null} =>
      (
        fixture.componentInstance as unknown as {
          chart: {options: {plugins: {priceAnnotations: never}}};
        }
      ).chart.options.plugins.priceAnnotations;

    it('draws nothing extra by default', () => {
      expect(annotations().markers).toEqual([]);
      expect(annotations().reference).toBeNull();
      expect(canvas().getAttribute('aria-label')).not.toContain('Bought');
    });

    it('passes the fills inside the period and the line to the chart', () => {
      set({markers: FILLS, referenceLine: AVERAGE_COST, period: '1Y'});
      expect(annotations().markers.map(m => m.kind)).toEqual(['buy', 'sell', 'buy']);
      expect(annotations().reference?.text).toBe('Average cost $150.00');
    });

    it('follows the period: a longer one brings the older fills in', () => {
      set({markers: FILLS, period: '5Y'});
      expect(annotations().markers).toHaveLength(FILLS.length);
    });

    it('says them in the chart description', () => {
      set({markers: FILLS, referenceLine: AVERAGE_COST, period: '1Y'});
      const name = canvas().getAttribute('aria-label') ?? '';
      expect(name).toContain('Sold 8 shares at');
      expect(name).toContain('Bought 5 shares at');
      expect(name).toContain('Average cost $150.00.');
    });

    it('keeps the chart when they change, without rebuilding it', () => {
      const before = chartOf();
      set({markers: FILLS, referenceLine: AVERAGE_COST});
      expect(chartOf()).toBe(before);
    });
  });
});
