import {afterEach, describe, expect, it, vi} from 'vitest';

// Value import - forces module evaluation so customElements.define('lk-segmented', ...) runs
// (package.json has sideEffects pointing at the built bundle only).
import {LkSegmented, type SegmentedOption} from './lk-segmented';

const PERIODS: SegmentedOption[] = ['1D', '1W', '1M', '3M', 'YTD', '1Y', 'MAX'].map(p => ({
  value: p,
  label: p,
}));

async function mount(
  props: Partial<Pick<LkSegmented, 'options' | 'value' | 'label' | 'disabled'>> = {}
): Promise<LkSegmented> {
  const el = document.createElement('lk-segmented') as LkSegmented;
  Object.assign(el, {options: PERIODS, value: '1M', label: 'History range', ...props});
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

function cells(el: LkSegmented): HTMLButtonElement[] {
  return Array.from(el.shadowRoot?.querySelectorAll<HTMLButtonElement>('.cell') ?? []);
}

function press(el: LkSegmented, key: string, from: number): void {
  cells(el)[from].dispatchEvent(
    new KeyboardEvent('keydown', {key, bubbles: true, cancelable: true})
  );
}

function changes(el: LkSegmented): string[] {
  const seen: string[] = [];
  el.addEventListener('lk-segmented-change', e => seen.push((e as CustomEvent).detail.value));
  return seen;
}

describe('LkSegmented', () => {
  afterEach(() => document.body.replaceChildren());

  it('registers as lk-segmented', () => {
    expect(customElements.get('lk-segmented')).toBe(LkSegmented);
  });

  it('is a labelled radiogroup of radios with the value checked', async () => {
    const el = await mount();
    const group = el.shadowRoot?.querySelector('.group');
    expect(group?.getAttribute('role')).toBe('radiogroup');
    expect(group?.getAttribute('aria-label')).toBe('History range');
    expect(cells(el).every(c => c.getAttribute('role') === 'radio')).toBe(true);
    expect(cells(el).map(c => c.getAttribute('aria-checked'))).toEqual(
      PERIODS.map(p => String(p.value === '1M'))
    );
  });

  it('marks the chosen cell with the accent tint and a strong edge, not the card surface', async () => {
    const el = await mount();
    el.style.setProperty('--color-accent-subtle', 'rgb(1, 2, 3)');
    el.style.setProperty('--color-accent-default', 'rgb(4, 5, 6)');
    el.style.setProperty('--color-border-strong', 'rgb(7, 8, 9)');
    const chosen = getComputedStyle(cells(el)[2]);
    expect(chosen.backgroundColor).toBe('rgb(1, 2, 3)');
    expect(chosen.color).toBe('rgb(4, 5, 6)');
    expect(chosen.boxShadow).toContain('rgb(7, 8, 9)');
    expect(chosen.boxShadow).toContain('inset');
  });

  it('leaves the group unnamed when there is no label', async () => {
    const el = await mount({label: ''});
    expect(el.shadowRoot?.querySelector('.group')?.hasAttribute('aria-label')).toBe(false);
  });

  it('renders one row of cells that are at least 44px square', async () => {
    const el = await mount();
    el.style.width = '326px';
    const rects = cells(el).map(c => c.getBoundingClientRect());
    expect(rects).toHaveLength(7);
    expect(new Set(rects.map(r => Math.round(r.top))).size).toBe(1);
    rects.forEach(r => {
      expect(r.width).toBeGreaterThanOrEqual(44);
      expect(r.height).toBeGreaterThanOrEqual(44);
    });
  });

  it('keeps a row of seven inside a 390px phone card (326px)', async () => {
    const el = await mount();
    el.style.width = '326px';
    const last = cells(el)[6].getBoundingClientRect();
    expect(last.right).toBeLessThanOrEqual(el.getBoundingClientRect().right);
  });

  describe('a row wider than its container', () => {
    const LONG: SegmentedOption[] = [
      'Next charge date',
      'Amount per month',
      'Billing frequency',
      'Account name',
    ].map(label => ({value: label, label}));
    const NARROW_PX = 200;

    async function mountNarrow(
      value: string,
      options: SegmentedOption[] = LONG
    ): Promise<LkSegmented> {
      const frame = document.createElement('div');
      frame.style.width = `${NARROW_PX}px`;
      document.body.appendChild(frame);
      const el = document.createElement('lk-segmented') as LkSegmented;
      Object.assign(el, {options, value, label: 'Sort by'});
      frame.appendChild(el);
      await el.updateComplete;
      return el;
    }

    it('scrolls inside the host and does not widen its container or the page', async () => {
      const el = await mountNarrow(LONG[0].value);
      expect(el.getBoundingClientRect().width).toBeLessThanOrEqual(NARROW_PX);
      expect(el.scrollWidth).toBeGreaterThan(el.clientWidth);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
    });

    it('keeps every label whole', async () => {
      const el = await mountNarrow(LONG[0].value);
      for (const cell of cells(el)) {
        expect(cell.scrollWidth).toBeLessThanOrEqual(cell.clientWidth);
      }
    });

    it('scrolls the chosen cell into view when the value changes', async () => {
      const el = await mountNarrow(LONG[0].value);
      el.value = LONG[3].value;
      await el.updateComplete;
      const host = el.getBoundingClientRect();
      const chosen = cells(el)[3].getBoundingClientRect();
      expect(chosen.left).toBeGreaterThanOrEqual(host.left - 0.5);
      expect(chosen.right).toBeLessThanOrEqual(host.right + 0.5);
    });

    it('warns when over-long options arrive after the first render', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const el = await mountNarrow('', []);
      expect(warn).not.toHaveBeenCalled();
      el.options = LONG;
      await el.updateComplete;
      expect(warn).toHaveBeenCalledTimes(1);
      warn.mockRestore();
    });

    it('scrolls the chosen cell into view when the options arrive later', async () => {
      const el = await mountNarrow(LONG[3].value, []);
      el.options = LONG;
      await el.updateComplete;
      const host = el.getBoundingClientRect();
      const chosen = cells(el)[3].getBoundingClientRect();
      expect(chosen.left).toBeGreaterThanOrEqual(host.left - 0.5);
      expect(chosen.right).toBeLessThanOrEqual(host.right + 0.5);
    });

    it('stays silent when the build is a production build', async () => {
      const scope = globalThis as {ngDevMode?: unknown};
      const original = scope.ngDevMode;
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      scope.ngDevMode = false;
      try {
        const el = await mountNarrow(LONG[0].value);
        el.options = LONG.map(option => ({...option}));
        await el.updateComplete;
        expect(warn).not.toHaveBeenCalled();
        expect(el.scrollWidth).toBeGreaterThan(el.clientWidth);
      } finally {
        scope.ngDevMode = original;
        warn.mockRestore();
      }
    });

    it('warns once in development that the row has to scroll', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      await mountNarrow(LONG[0].value);
      await vi.waitFor(() => expect(warn).toHaveBeenCalledTimes(1));
      warn.mockRestore();
    });
  });

  it('puts only the chosen cell in the tab order', async () => {
    const el = await mount();
    expect(cells(el).map(c => c.tabIndex)).toEqual([-1, -1, 0, -1, -1, -1, -1]);
  });

  it('falls back to the first enabled cell when the value matches nothing', async () => {
    const el = await mount({
      value: 'nope',
      options: PERIODS.map((p, i) => ({...p, disabled: i === 0})),
    });
    expect(cells(el).map(c => c.tabIndex)).toEqual([-1, 0, -1, -1, -1, -1, -1]);
  });

  it('chooses a clicked cell and reports it once', async () => {
    const el = await mount();
    const seen = changes(el);
    cells(el)[4].click();
    await el.updateComplete;
    expect(el.value).toBe('YTD');
    expect(seen).toEqual(['YTD']);
    expect(cells(el)[4].getAttribute('aria-checked')).toBe('true');
    expect(cells(el)[4].tabIndex).toBe(0);
  });

  it('does not report a click on the chosen cell', async () => {
    const el = await mount();
    const seen = changes(el);
    cells(el)[2].click();
    expect(seen).toEqual([]);
  });

  it('does not report a value the host sets itself', async () => {
    const el = await mount();
    const seen = changes(el);
    el.value = '1Y';
    await el.updateComplete;
    expect(seen).toEqual([]);
    expect(cells(el)[5].getAttribute('aria-checked')).toBe('true');
  });

  it('moves focus and choice with the arrow keys, wrapping at the ends', async () => {
    const el = await mount({value: 'MAX'});
    const seen = changes(el);
    press(el, 'ArrowRight', 6);
    await el.updateComplete;
    expect(el.value).toBe('1D');
    expect(el.shadowRoot?.activeElement).toBe(cells(el)[0]);
    press(el, 'ArrowLeft', 0);
    await el.updateComplete;
    expect(el.value).toBe('MAX');
    press(el, 'ArrowDown', 6);
    press(el, 'ArrowUp', 0);
    expect(seen).toEqual(['1D', 'MAX', '1D', 'MAX']);
  });

  it('jumps to the ends with Home and End', async () => {
    const el = await mount();
    press(el, 'End', 2);
    expect(el.value).toBe('MAX');
    press(el, 'Home', 6);
    expect(el.value).toBe('1D');
  });

  it('skips disabled cells when travelling', async () => {
    const options = PERIODS.map(p => ({...p, disabled: p.value === '3M' || p.value === 'MAX'}));
    const el = await mount({options, value: '1M'});
    press(el, 'ArrowRight', 2);
    expect(el.value).toBe('YTD');
    press(el, 'End', 4);
    expect(el.value).toBe('1Y');
    press(el, 'ArrowRight', 5);
    expect(el.value).toBe('1D');
  });

  it('ignores other keys and does not prevent them', async () => {
    const el = await mount();
    const event = new KeyboardEvent('keydown', {key: 'a', bubbles: true, cancelable: true});
    cells(el)[2].dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(el.value).toBe('1M');
  });

  it('cannot choose a disabled cell by click', async () => {
    const el = await mount({options: PERIODS.map(p => ({...p, disabled: p.value === '1Y'}))});
    const seen = changes(el);
    expect(cells(el)[5].disabled).toBe(true);
    cells(el)[5].click();
    expect(seen).toEqual([]);
  });

  it('takes every cell out of play when the whole control is disabled', async () => {
    const el = await mount({disabled: true});
    const seen = changes(el);
    expect(el.shadowRoot?.querySelector('.group')?.getAttribute('aria-disabled')).toBe('true');
    expect(cells(el).every(c => c.disabled && c.tabIndex === -1)).toBe(true);
    press(el, 'ArrowRight', 2);
    expect(seen).toEqual([]);
  });

  it('renders nothing but the group for an empty list', async () => {
    const el = await mount({options: []});
    expect(cells(el)).toHaveLength(0);
    expect(el.shadowRoot?.querySelector('.group')).not.toBeNull();
  });
});
