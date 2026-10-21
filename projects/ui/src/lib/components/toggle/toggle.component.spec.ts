import {ChangeDetectionStrategy, Component, signal} from '@angular/core';
import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {FormControl, FormsModule, ReactiveFormsModule} from '@angular/forms';
import {beforeEach, describe, expect, it} from 'vitest';

import {ToggleComponent} from './toggle.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToggleComponent, ReactiveFormsModule],
  template: '<cmn-toggle [formControl]="control" [loading]="loading()" label="Email alerts" />',
})
class ReactiveHostComponent {
  public readonly control = new FormControl(false, {nonNullable: true});
  public readonly loading = signal(false);
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToggleComponent, FormsModule],
  template: '<cmn-toggle [(ngModel)]="alerts" label="Email alerts" />',
})
class TemplateHostComponent {
  public readonly alerts = signal(true);
}

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

  function switchIn(host: ComponentFixture<unknown>): HTMLButtonElement {
    return (host.nativeElement as HTMLElement).querySelector('button') as HTMLButtonElement;
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

  describe('loading (instant-apply save in flight)', () => {
    function spinner(): HTMLElement | null {
      return (fixture.nativeElement as HTMLElement).querySelector('.animate-spin');
    }

    it('spins the thumb and sets aria-busy only while loading', () => {
      fixture.detectChanges();
      expect(spinner()).toBeNull();
      expect(button()?.getAttribute('aria-busy')).toBeNull();

      fixture.componentRef.setInput('loading', true);
      fixture.detectChanges();
      expect(spinner()).not.toBeNull();
      expect(button()?.getAttribute('aria-busy')).toBe('true');
    });

    it('ignores clicks but stays focusable and undimmed', () => {
      const emitted: boolean[] = [];
      fixture.componentInstance.toggled.subscribe(v => emitted.push(v));
      fixture.componentRef.setInput('loading', true);
      fixture.detectChanges();

      button()?.click();
      expect(emitted).toEqual([]);
      expect(button()?.disabled).toBe(false);
      expect(button()?.className).not.toContain('opacity-50');
    });

    it('keeps the form value while a save is in flight', () => {
      const host = TestBed.createComponent(ReactiveHostComponent);
      host.componentInstance.loading.set(true);
      host.detectChanges();

      switchIn(host).click();
      expect(host.componentInstance.control.value).toBe(false);
    });
  });

  describe('Angular forms (guardrails V8)', () => {
    it('takes its value from a reactive control and writes clicks back', () => {
      const host = TestBed.createComponent(ReactiveHostComponent);
      const {control} = host.componentInstance;
      control.setValue(true);
      host.detectChanges();
      expect(switchIn(host).getAttribute('aria-checked')).toBe('true');

      switchIn(host).click();
      host.detectChanges();
      expect(control.value).toBe(false);
      expect(control.dirty).toBe(true);
      expect(switchIn(host).getAttribute('aria-checked')).toBe('false');
    });

    it('marks the control touched on blur', () => {
      const host = TestBed.createComponent(ReactiveHostComponent);
      host.detectChanges();
      switchIn(host).dispatchEvent(new Event('blur'));
      expect(host.componentInstance.control.touched).toBe(true);
    });

    it('follows the control disabled state', () => {
      const host = TestBed.createComponent(ReactiveHostComponent);
      const {control} = host.componentInstance;
      host.detectChanges();

      control.disable();
      host.detectChanges();
      expect(switchIn(host).disabled).toBe(true);
      expect(switchIn(host).getAttribute('aria-disabled')).toBe('true');

      control.enable();
      host.detectChanges();
      expect(switchIn(host).disabled).toBe(false);
    });

    it('binds two ways through ngModel', async () => {
      const host = TestBed.createComponent(TemplateHostComponent);
      host.detectChanges();
      await host.whenStable();
      host.detectChanges();
      expect(switchIn(host).getAttribute('aria-checked')).toBe('true');

      switchIn(host).click();
      host.detectChanges();
      expect(host.componentInstance.alerts()).toBe(false);
    });

    it('leaves the value to `checked` when no forms directive binds', () => {
      const emitted: boolean[] = [];
      fixture.componentInstance.toggled.subscribe(v => emitted.push(v));
      fixture.detectChanges();

      button()?.click();
      fixture.detectChanges();
      expect(emitted).toEqual([true]);
      expect(button()?.getAttribute('aria-checked')).toBe('false');
    });
  });
});
