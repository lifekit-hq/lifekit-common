import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {beforeEach, describe, expect, it} from 'vitest';

import {ToggleComponent} from './toggle.component';

describe('ToggleComponent', () => {
  let fixture: ComponentFixture<ToggleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToggleComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ToggleComponent);
  });

  function button(): HTMLButtonElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector('button');
  }

  function thumb(): HTMLElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector('button > span');
  }

  it('exposes the unchecked state through aria-checked', () => {
    fixture.detectChanges();
    expect(button()?.getAttribute('aria-checked')).toBe('false');
  });

  it('exposes the checked state through aria-checked and the accent track', () => {
    fixture.componentRef.setInput('checked', true);
    fixture.detectChanges();
    expect(button()?.getAttribute('aria-checked')).toBe('true');
    expect(button()?.className).toContain('bg-accent-default');
  });

  it('slides the thumb across when checked', () => {
    fixture.detectChanges();
    expect(thumb()?.className).toContain('translate-x-0');

    fixture.componentRef.setInput('checked', true);
    fixture.detectChanges();
    expect(thumb()?.className).toContain('translate-x-5');
  });

  it('emits the negated value on click', () => {
    const emitted: boolean[] = [];
    fixture.componentInstance.toggled.subscribe(v => emitted.push(v));
    fixture.detectChanges();

    button()?.click();
    expect(emitted).toEqual([true]);

    fixture.componentRef.setInput('checked', true);
    fixture.detectChanges();
    button()?.click();
    expect(emitted).toEqual([true, false]);
  });

  it('forwards the accessible label', () => {
    fixture.componentRef.setInput('label', 'Dark mode');
    fixture.detectChanges();
    expect(button()?.getAttribute('aria-label')).toBe('Dark mode');
  });

  it('blocks activation when disabled, not just pointer events', () => {
    const emitted: boolean[] = [];
    fixture.componentInstance.toggled.subscribe(v => emitted.push(v));
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();

    expect(button()?.disabled).toBe(true);
    expect(button()?.getAttribute('aria-disabled')).toBe('true');
    expect(button()?.className).toContain('opacity-50');

    button()?.click();
    expect(emitted).toEqual([]);
  });

  it('drops aria-disabled when enabled again', () => {
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    fixture.componentRef.setInput('disabled', false);
    fixture.detectChanges();

    expect(button()?.disabled).toBe(false);
    expect(button()?.getAttribute('aria-disabled')).toBeNull();
  });
});
