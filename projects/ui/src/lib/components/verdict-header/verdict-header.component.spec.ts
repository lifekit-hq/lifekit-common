import {type ComponentFixture, TestBed} from '@angular/core/testing';

import {VerdictHeaderComponent, type VerdictPill} from './verdict-header.component';

describe('VerdictHeaderComponent', () => {
  let fixture: ComponentFixture<VerdictHeaderComponent>;

  const text = (): string => (fixture.nativeElement as HTMLElement).textContent ?? '';
  const element = (selector: string): HTMLElement | null =>
    (fixture.nativeElement as HTMLElement).querySelector(selector);
  const set = (name: string, value: unknown): void => {
    fixture.componentRef.setInput(name, value);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({imports: [VerdictHeaderComponent]}).compileComponents();
    fixture = TestBed.createComponent(VerdictHeaderComponent);
    fixture.componentRef.setInput('status', {tone: 'success', label: 'Strong buy'});
    fixture.detectChanges();
  });

  it('shows the status as a word, coloured by its tone', () => {
    const word = element('p');
    expect(word?.textContent?.trim()).toBe('Strong buy');
    expect(word?.classList).toContain('text-status-success');
    expect(word?.classList).toContain('text-cmn-4xl');
  });

  it.each([
    ['success', 'text-status-success'],
    ['warning', 'text-status-warning'],
    ['error', 'text-status-error'],
    ['info', 'text-status-info'],
    ['neutral', 'text-text-primary'],
  ] as const)('colours a %s status with %s', (tone, expected) => {
    set('status', {tone, label: 'Hold'});
    expect(element('p')?.classList).toContain(expected);
  });

  it('takes any vocabulary: the word is the input, not a built-in', () => {
    set('status', {tone: 'warning', label: 'Overheated'});
    expect(element('p')?.textContent?.trim()).toBe('Overheated');
  });

  it('draws no pills, caveat or price when none are given', () => {
    expect(element('ul')).toBeNull();
    expect(element('cmn-tag')).toBeNull();
    expect(element('p.font-semibold')).toBeNull();
    expect(text()).not.toContain('—');
  });

  it('draws only the first two pills', () => {
    const pills: VerdictPill[] = [
      {label: 'High conviction', tone: 'info'},
      {label: '12 months'},
      {label: 'Third pill'},
    ];
    set('pills', pills);
    const drawn = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('li cmn-tag')
    ).map(tag => tag.textContent?.trim());
    expect(drawn).toEqual(['High conviction', '12 months']);
  });

  it('falls back to a neutral pill when a pill names no tone', () => {
    set('pills', [{label: '12 months'}]);
    expect(element('li cmn-tag span')?.classList).toContain('text-text-secondary');
  });

  it('shows the caveat in bold under the verdict', () => {
    set('caveat', 'Priced for perfection; wait for a pullback.');
    const caveat = element('p.font-semibold');
    expect(caveat?.textContent?.trim()).toBe('Priced for perfection; wait for a pullback.');
  });

  describe('price', () => {
    it('formats a number as money in the locale when a currency is set', () => {
      set('price', 1234.5);
      set('currency', 'EUR');
      expect(text()).toContain('€1,234.50');
    });

    it('formats a number with no currency as a plain number', () => {
      set('price', 1234.5);
      expect(text()).toContain('1,234.5');
    });

    it('shows a string as given', () => {
      set('price', 'n/a');
      set('currency', 'EUR');
      expect(text()).toContain('n/a');
    });

    it('shows a dash for a non-finite number', () => {
      set('price', Number.NaN);
      set('currency', 'EUR');
      expect(text()).toContain('—');
    });

    it('draws the change alone when there is no price', () => {
      set('change', {percent: 0.018, amount: 3.2});
      expect(element('cmn-tag')).not.toBeNull();
      expect(text()).toContain('—');
    });
  });

  describe('day change', () => {
    beforeEach(() => {
      set('price', 182.4);
      set('currency', 'EUR');
    });

    it('shows the percent and the amount together, both signed, on a gain', () => {
      set('change', {percent: 0.018, amount: 3.2});
      const pill = element('cmn-tag');
      expect(pill?.textContent).toContain('+1.80% · +€3.20');
      expect(pill?.querySelector('span')?.classList).toContain('bg-status-success-subtle');
      expect(pill?.querySelector('cmn-icon')).not.toBeNull();
    });

    it('shows the minus on a loss and tints it as an error', () => {
      set('change', {percent: -0.0234, amount: -4.37});
      const pill = element('cmn-tag');
      expect(pill?.textContent).toContain('-2.34% · -€4.37');
      expect(pill?.querySelector('span')?.classList).toContain('bg-status-error-subtle');
    });

    it('reads a zero move as neutral and unsigned', () => {
      set('change', {percent: 0, amount: 0});
      const pill = element('cmn-tag');
      expect(pill?.textContent).toContain('0.00% · €0.00');
      expect(pill?.querySelector('span')?.classList).toContain('bg-surface-raised');
    });

    it('reads a move that rounds to zero as neutral, not as a gain', () => {
      set('change', {percent: 0.00004, amount: 0.003});
      const pill = element('cmn-tag');
      expect(pill?.textContent).toContain('0.00% · €0.00');
      expect(pill?.querySelector('span')?.classList).toContain('bg-surface-raised');
      const rounded = pill?.querySelector('cmn-icon')?.innerHTML;
      set('change', {percent: 0, amount: 0});
      expect(element('cmn-tag cmn-icon')?.innerHTML).toBe(rounded);
    });

    it('follows the signed percent when only the amount rounds to zero', () => {
      set('change', {percent: 0.01, amount: 0});
      const pill = element('cmn-tag');
      expect(pill?.textContent).toContain('+1.00% · €0.00');
      expect(pill?.querySelector('span')?.classList).toContain('bg-status-success-subtle');
    });

    it('formats the amount as a plain number when the price has no currency', () => {
      set('currency', null);
      set('change', {percent: 0.01, amount: 2});
      expect(element('cmn-tag')?.textContent).toContain('+1.00% · +2');
    });

    it('names the pill for assistive technology, not only by colour', () => {
      set('change', {percent: 0.018, amount: 3.2});
      const hidden = element('cmn-tag .sr-only');
      expect(hidden?.textContent).toContain('Day change');
      set('changeLabel', 'Variation du jour');
      expect(element('cmn-tag .sr-only')?.textContent).toContain('Variation du jour');
    });

    it('draws no pill for a change that cannot be formatted', () => {
      set('change', {percent: Number.NaN, amount: 1});
      expect(element('cmn-tag')).toBeNull();
    });
  });
});
