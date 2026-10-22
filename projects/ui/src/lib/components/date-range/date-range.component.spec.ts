import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {beforeEach, describe, expect, it} from 'vitest';

import {type DateRange, DateRangeComponent} from './date-range.component';
import {DATE_RANGE_PRESETS, DATE_RANGE_TODAY, type DateRangePreset} from './date-range-presets';

describe('DateRangeComponent', () => {
  let fixture: ComponentFixture<DateRangeComponent>;
  let seen: DateRange[];
  let now: Date;

  beforeEach(async () => {
    now = new Date(2026, 9, 22);
    await TestBed.configureTestingModule({
      imports: [DateRangeComponent],
      providers: [{provide: DATE_RANGE_TODAY, useValue: () => now}],
    }).compileComponents();
    fixture = TestBed.createComponent(DateRangeComponent);
    seen = [];
    fixture.componentInstance.registerOnChange(v => seen.push(v));
    fixture.detectChanges();
  });

  const fields = (): HTMLInputElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('input'));

  function enter(index: number, value: string): void {
    const field = fields()[index];
    field.value = value;
    field.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  it('renders two date inputs', () => {
    expect(fields().map(f => f.type)).toEqual(['date', 'date']);
  });

  it('emits the range as each bound changes, keeping the other bound', () => {
    enter(0, '2026-01-01');
    enter(1, '2026-01-31');

    expect(seen).toEqual([
      {from: '2026-01-01', to: null},
      {from: '2026-01-01', to: '2026-01-31'},
    ]);
  });

  it('emits null for a cleared bound', () => {
    fixture.componentInstance.writeValue({from: '2026-01-01', to: '2026-01-31'});
    fixture.detectChanges();

    enter(1, '');

    expect(seen).toEqual([{from: '2026-01-01', to: null}]);
  });

  it('writes external values and normalises null to an open range', () => {
    fixture.componentInstance.writeValue({from: '2026-02-01', to: '2026-02-28'});
    fixture.detectChanges();
    expect(fields().map(f => f.value)).toEqual(['2026-02-01', '2026-02-28']);

    fixture.componentInstance.writeValue(null);
    fixture.detectChanges();
    expect(fields().map(f => f.value)).toEqual(['', '']);
  });

  it('constrains each field by the opposite bound', () => {
    fixture.componentInstance.writeValue({from: '2026-02-01', to: '2026-02-28'});
    fixture.detectChanges();

    expect(fields()[0].max).toBe('2026-02-28');
    expect(fields()[1].min).toBe('2026-02-01');
  });

  it('flags an inverted range as invalid', () => {
    fixture.componentInstance.writeValue({from: '2026-03-10', to: '2026-03-01'});
    fixture.detectChanges();

    expect(fixture.componentInstance.invalid()).toBe(true);
    expect(fields()[0].getAttribute('aria-invalid')).toBe('true');
  });

  it('treats open or ordered ranges as valid', () => {
    fixture.componentInstance.writeValue({from: '2026-03-01', to: null});
    expect(fixture.componentInstance.invalid()).toBe(false);

    fixture.componentInstance.writeValue({from: '2026-03-01', to: '2026-03-01'});
    expect(fixture.componentInstance.invalid()).toBe(false);
  });

  it('disables both fields and reports touched on blur', () => {
    let touched = 0;
    fixture.componentInstance.registerOnTouched(() => touched++);
    fields()[0].dispatchEvent(new Event('blur'));
    fixture.componentInstance.setDisabledState(true);
    fixture.detectChanges();

    expect(touched).toBe(1);
    expect(fields().every(f => f.disabled)).toBe(true);
  });

  describe('presets', () => {
    const chips = (): HTMLButtonElement[] =>
      Array.from(fixture.nativeElement.querySelectorAll('cmn-chip button'));

    const pressed = (): string[] =>
      chips()
        .filter(c => c.getAttribute('aria-pressed') === 'true')
        .map(c => c.textContent?.trim() ?? '');

    function usePresets(presets: readonly DateRangePreset[]): void {
      fixture.componentRef.setInput('presets', presets);
      fixture.detectChanges();
    }

    it('renders no preset row unless presets are passed', () => {
      expect(fixture.nativeElement.querySelector('cmn-chip')).toBeNull();
      expect(fixture.nativeElement.querySelectorAll('[role="group"]')).toHaveLength(1);
    });

    it('renders one chip per preset in a named group', () => {
      usePresets(DATE_RANGE_PRESETS);

      const group = fixture.nativeElement.querySelector('[aria-label="Date range presets"]');
      expect(group.getAttribute('role')).toBe('group');
      expect(chips().map(c => c.textContent?.trim())).toEqual([
        'This month',
        'Last month',
        'Last 30 days',
        'Last 90 days',
        'Year to date',
      ]);
    });

    it('sets both bounds from the injected today, emits and marks touched', () => {
      let touched = 0;
      fixture.componentInstance.registerOnTouched(() => touched++);
      usePresets(DATE_RANGE_PRESETS);

      chips()[1].click();
      fixture.detectChanges();

      expect(seen).toEqual([{from: '2026-09-01', to: '2026-09-30'}]);
      expect(touched).toBe(1);
      expect(fields().map(f => f.value)).toEqual(['2026-09-01', '2026-09-30']);
      expect(pressed()).toEqual(['Last month']);
    });

    it('resolves the chosen preset against the clock at click time, not at render time', () => {
      usePresets(DATE_RANGE_PRESETS);

      now = new Date(2026, 10, 1);
      chips()[0].click();

      expect(seen).toEqual([{from: '2026-11-01', to: '2026-11-01'}]);
    });

    it('shows a written value that matches a preset as selected', () => {
      usePresets(DATE_RANGE_PRESETS);
      fixture.componentInstance.writeValue({from: '2026-01-01', to: '2026-10-22'});
      fixture.detectChanges();

      expect(pressed()).toEqual(['Year to date']);
    });

    it('clears the selection when a field is edited away from the preset', () => {
      usePresets(DATE_RANGE_PRESETS);
      chips()[0].click();
      fixture.detectChanges();

      enter(0, '2026-10-02');

      expect(pressed()).toEqual([]);
    });

    it('accepts fixed ranges alongside resolvers', () => {
      usePresets([{label: 'Q1', range: {from: '2026-01-01', to: '2026-03-31'}}]);

      chips()[0].click();
      fixture.detectChanges();

      expect(seen).toEqual([{from: '2026-01-01', to: '2026-03-31'}]);
      expect(pressed()).toEqual(['Q1']);
    });

    it('keeps chips as native buttons in the tab order, disabled with the control', () => {
      usePresets(DATE_RANGE_PRESETS);
      expect(chips().every(c => c.type === 'button' && c.tabIndex === 0)).toBe(true);

      fixture.componentInstance.setDisabledState(true);
      fixture.detectChanges();

      expect(chips().every(c => c.disabled)).toBe(true);
    });
  });
});
