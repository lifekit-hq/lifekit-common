import {afterEach, describe, expect, it} from 'vitest';
import {userEvent} from 'vitest/browser';

// Value import - forces module evaluation so customElements.define('lk-chip-row', ...)
// runs (package.json has sideEffects pointing at the built bundle only).
import {type ChipRowChangeDetail, type ChipRowOption, LkChipRow} from './lk-chip-row';

const PERIODS: ChipRowOption[] = [
  {value: 'week', label: 'This week'},
  {value: 'month', label: 'This month', count: 12},
  {value: 'quarter', label: 'Last three months'},
  {value: 'year', label: 'This year', disabled: true},
];

const NARROW_WIDTH = '8rem';
const TOUCH_PX = 44;

async function mount(
  props: Partial<Pick<LkChipRow, 'options' | 'selected' | 'mode' | 'label'>> = {}
): Promise<LkChipRow> {
  const el = document.createElement('lk-chip-row') as LkChipRow;
  Object.assign(el, {options: PERIODS, label: 'Period', ...props});
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

function chips(el: LkChipRow): HTMLButtonElement[] {
  return Array.from(el.shadowRoot?.querySelectorAll<HTMLButtonElement>('button.chip') ?? []);
}

function row(el: LkChipRow): HTMLElement {
  const found = el.shadowRoot?.querySelector<HTMLElement>('.row');
  if (!found) {
    throw new Error('no row');
  }
  return found;
}

function changes(el: LkChipRow): ChipRowChangeDetail[] {
  const seen: ChipRowChangeDetail[] = [];
  el.addEventListener('lk-chip-row-change', e =>
    seen.push((e as CustomEvent<ChipRowChangeDetail>).detail)
  );
  return seen;
}

describe('LkChipRow', () => {
  afterEach(() => document.body.replaceChildren());

  it('registers as lk-chip-row', () => {
    expect(customElements.get('lk-chip-row')).toBe(LkChipRow);
  });

  it('renders one toggle button per option in a named group', async () => {
    const el = await mount({selected: ['month']});
    expect(row(el).getAttribute('role')).toBe('group');
    expect(row(el).getAttribute('aria-label')).toBe('Period');
    expect(chips(el).map(c => c.getAttribute('aria-pressed'))).toEqual([
      'false',
      'true',
      'false',
      'false',
    ]);
  });

  it('shows a count badge only on options that carry a count', async () => {
    const el = await mount();
    const counts = chips(el).map(c => c.querySelector('.count')?.textContent ?? null);
    expect(counts).toEqual([null, '12', null, null]);
  });

  it('moves the single selection to the pressed chip and reports it', async () => {
    const el = await mount({selected: ['week']});
    const seen = changes(el);
    await userEvent.click(chips(el)[2]);
    expect(el.selected).toEqual(['quarter']);
    expect(seen).toEqual([{selected: ['quarter'], value: 'quarter'}]);
  });

  it('keeps the single selection when the chip that is on is pressed again', async () => {
    const el = await mount({selected: ['week']});
    const seen = changes(el);
    await userEvent.click(chips(el)[0]);
    expect(el.selected).toEqual(['week']);
    expect(seen).toEqual([]);
  });

  it('toggles chips independently in multi mode, in option order', async () => {
    const el = await mount({mode: 'multi', selected: ['quarter']});
    const seen = changes(el);
    await userEvent.click(chips(el)[0]);
    expect(el.selected).toEqual(['week', 'quarter']);
    await userEvent.click(chips(el)[2]);
    expect(el.selected).toEqual(['week']);
    expect(seen.map(d => d.value)).toEqual(['week', 'quarter']);
  });

  it('ignores a disabled chip', async () => {
    const el = await mount({selected: ['week']});
    const seen = changes(el);
    const disabled = chips(el)[3];
    expect(disabled.disabled).toBe(true);
    disabled.click();
    expect(el.selected).toEqual(['week']);
    expect(seen).toEqual([]);
  });

  it('gives every chip a touch-sized hit area', async () => {
    const el = await mount();
    for (const chip of chips(el)) {
      const box = chip.getBoundingClientRect();
      expect(box.height).toBeGreaterThanOrEqual(TOUCH_PX);
      expect(box.width).toBeGreaterThanOrEqual(TOUCH_PX);
    }
  });

  it('never truncates a label in a row narrower than its chips', async () => {
    const el = await mount();
    el.style.width = NARROW_WIDTH;
    await el.updateComplete;
    for (const chip of chips(el)) {
      const pill = chip.querySelector<HTMLElement>('.pill');
      expect(pill?.scrollWidth).toBeLessThanOrEqual(pill?.clientWidth ?? 0);
    }
    expect(row(el).scrollWidth).toBeGreaterThan(row(el).clientWidth);
  });

  it('fades only the edges the row can still scroll towards', async () => {
    const el = await mount();
    el.style.width = NARROW_WIDTH;
    el.requestUpdate();
    await el.updateComplete;
    expect(row(el).hasAttribute('data-fade-start')).toBe(false);
    expect(row(el).hasAttribute('data-fade-end')).toBe(true);

    row(el).scrollLeft = row(el).scrollWidth;
    row(el).dispatchEvent(new Event('scroll'));
    expect(row(el).hasAttribute('data-fade-start')).toBe(true);
    expect(row(el).hasAttribute('data-fade-end')).toBe(false);
  });

  it('refreshes the fades when the row is resized without a re-render', async () => {
    const el = await mount();
    el.style.width = NARROW_WIDTH;
    await expect.poll(() => row(el).hasAttribute('data-fade-end')).toBe(true);
    el.style.width = '';
    await expect.poll(() => row(el).hasAttribute('data-fade-end')).toBe(false);
  });

  it('keeps watching the row after being moved in the document', async () => {
    const el = await mount();
    document.body.appendChild(el);
    el.style.width = NARROW_WIDTH;
    await expect.poll(() => row(el).hasAttribute('data-fade-end')).toBe(true);
    document.body.removeChild(el);
    document.body.appendChild(el);
    el.style.width = '';
    await expect.poll(() => row(el).hasAttribute('data-fade-end')).toBe(false);
  });

  it('scrolls the row so a selected chip off the end comes into view', async () => {
    const el = await mount();
    el.style.width = NARROW_WIDTH;
    el.selected = ['quarter'];
    await el.updateComplete;
    const scroller = row(el).getBoundingClientRect();
    const chip = chips(el)[2].getBoundingClientRect();
    expect(chip.left).toBeGreaterThanOrEqual(scroller.left - 1);
    expect(chip.right).toBeLessThanOrEqual(scroller.right + 1);
  });

  it('scrolls back when the selection moves to a chip before the view', async () => {
    const el = await mount({selected: ['quarter']});
    el.style.width = NARROW_WIDTH;
    el.selected = ['quarter'];
    await el.updateComplete;
    expect(row(el).scrollLeft).toBeGreaterThan(0);
    el.selected = ['week'];
    await el.updateComplete;
    expect(row(el).scrollLeft).toBe(0);
  });
});
