import {afterEach, describe, expect, it} from 'vitest';

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
