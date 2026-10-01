import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {beforeEach, describe, expect, it} from 'vitest';

import {MonthStepperComponent} from './month-stepper.component';

const OCT_2026 = new Date(2026, 9, 15);

describe('MonthStepperComponent', () => {
  let fixture: ComponentFixture<MonthStepperComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({imports: [MonthStepperComponent]}).compileComponents();
    fixture = TestBed.createComponent(MonthStepperComponent);
    fixture.componentRef.setInput('locale', 'en-US');
    fixture.componentRef.setInput('value', OCT_2026);
  });

  const host = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const button = (name: string): HTMLButtonElement =>
    host().querySelector(`button[aria-label="${name}"]`) as HTMLButtonElement;

  it('renders the month and year', () => {
    fixture.detectChanges();
    expect(host().textContent).toContain('October 2026');
  });

  it('exposes a labelled group with a polite live label', () => {
    fixture.detectChanges();
    expect(host().getAttribute('role')).toBe('group');
    expect(host().getAttribute('aria-label')).toBe('Month');
    expect(host().querySelector('[aria-live="polite"]')).not.toBeNull();
  });

  it('steps to the first day of the previous and next month', () => {
    fixture.detectChanges();
    button('Previous month').click();
    expect(fixture.componentInstance.value()).toEqual(new Date(2026, 8, 1));
    button('Next month').click();
    button('Next month').click();
    expect(fixture.componentInstance.value()).toEqual(new Date(2026, 10, 1));
  });

  it('rolls over the year boundary', () => {
    fixture.componentRef.setInput('value', new Date(2026, 0, 31));
    fixture.detectChanges();
    button('Previous month').click();
    expect(fixture.componentInstance.value()).toEqual(new Date(2025, 11, 1));
  });

  it('steps with the arrow keys', () => {
    fixture.detectChanges();
    host().dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowRight'}));
    expect(fixture.componentInstance.value()).toEqual(new Date(2026, 10, 1));
    host().dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowLeft'}));
    expect(fixture.componentInstance.value()).toEqual(new Date(2026, 9, 1));
  });

  it('disables a control at its bound and ignores steps past it', () => {
    fixture.componentRef.setInput('min', new Date(2026, 9, 1));
    fixture.componentRef.setInput('max', new Date(2026, 10, 30));
    fixture.detectChanges();

    expect(button('Previous month').disabled).toBe(true);
    expect(button('Next month').disabled).toBe(false);

    fixture.componentInstance.step(-1);
    expect(fixture.componentInstance.value()).toEqual(OCT_2026);

    button('Next month').click();
    fixture.detectChanges();
    expect(button('Next month').disabled).toBe(true);
    host().dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowRight'}));
    expect(fixture.componentInstance.value()).toEqual(new Date(2026, 10, 1));
  });

  it('formats the label in the requested locale', () => {
    fixture.componentRef.setInput('locale', 'de-DE');
    fixture.detectChanges();
    expect(host().textContent).toContain('Oktober 2026');
  });
});
