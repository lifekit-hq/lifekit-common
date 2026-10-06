import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {beforeEach, describe, expect, it} from 'vitest';

import {type DateRange, DateRangeComponent} from './date-range.component';

describe('DateRangeComponent', () => {
  let fixture: ComponentFixture<DateRangeComponent>;
  let seen: DateRange[];

  beforeEach(async () => {
    await TestBed.configureTestingModule({imports: [DateRangeComponent]}).compileComponents();
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
});
