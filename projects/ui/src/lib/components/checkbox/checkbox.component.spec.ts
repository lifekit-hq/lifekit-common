import {ChangeDetectionStrategy, Component, signal} from '@angular/core';
import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {beforeEach, describe, expect, it} from 'vitest';

import {CheckboxComponent} from './checkbox.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CheckboxComponent],
  template: `
    <cmn-checkbox [checked]="checked()" [disabled]="disabled()" (changed)="emitted.push($event)">
      <span class="text">Keep me signed in</span>
    </cmn-checkbox>
  `,
})
class LabelHostComponent {
  public readonly checked = signal(false);
  public readonly disabled = signal(false);
  public readonly emitted: boolean[] = [];
}

describe('CheckboxComponent', () => {
  let fixture: ComponentFixture<CheckboxComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({imports: [CheckboxComponent]}).compileComponents();
    fixture = TestBed.createComponent(CheckboxComponent);
  });

  const box = (): HTMLButtonElement =>
    (fixture.nativeElement as HTMLElement).querySelector('button') as HTMLButtonElement;

  it('exposes unchecked, checked and mixed states through aria-checked', () => {
    fixture.detectChanges();
    expect(box().getAttribute('role')).toBe('checkbox');
    expect(box().getAttribute('aria-checked')).toBe('false');

    fixture.componentRef.setInput('checked', true);
    fixture.detectChanges();
    expect(box().getAttribute('aria-checked')).toBe('true');
    expect(box().className).toContain('bg-accent-default');

    fixture.componentRef.setInput('indeterminate', true);
    fixture.detectChanges();
    expect(box().getAttribute('aria-checked')).toBe('mixed');
  });

  it('shows a check mark only when checked', () => {
    fixture.detectChanges();
    expect(box().querySelector('cmn-icon')).toBeNull();
    fixture.componentRef.setInput('checked', true);
    fixture.detectChanges();
    expect(box().querySelector('cmn-icon')).not.toBeNull();
  });

  it('emits the negated value on click', () => {
    const emitted: boolean[] = [];
    fixture.componentInstance.changed.subscribe(v => emitted.push(v));
    fixture.detectChanges();

    box().click();
    fixture.componentRef.setInput('checked', true);
    fixture.detectChanges();
    box().click();
    expect(emitted).toEqual([true, false]);
  });

  it('forwards the accessible label', () => {
    fixture.componentRef.setInput('label', 'Remember me');
    fixture.detectChanges();
    expect(box().getAttribute('aria-label')).toBe('Remember me');
  });

  it('blocks activation when disabled', () => {
    const emitted: boolean[] = [];
    fixture.componentInstance.changed.subscribe(v => emitted.push(v));
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();

    expect(box().disabled).toBe(true);
    expect(box().getAttribute('aria-disabled')).toBe('true');
    box().click();
    expect(emitted).toEqual([]);
  });

  describe('projected label', () => {
    let host: ComponentFixture<LabelHostComponent>;

    beforeEach(() => {
      host = TestBed.createComponent(LabelHostComponent);
      host.detectChanges();
    });

    const text = (): HTMLElement =>
      (host.nativeElement as HTMLElement).querySelector('.text') as HTMLElement;

    it('toggles when the label text is clicked', () => {
      text().click();
      expect(host.componentInstance.emitted).toEqual([true]);
    });

    it('does not toggle from label text when disabled', () => {
      host.componentInstance.disabled.set(true);
      host.detectChanges();
      text().click();
      expect(host.componentInstance.emitted).toEqual([]);
    });

    it('emits once when the box itself is clicked', () => {
      ((host.nativeElement as HTMLElement).querySelector('button') as HTMLElement).click();
      expect(host.componentInstance.emitted).toEqual([true]);
    });
  });
});
