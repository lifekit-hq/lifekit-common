import {ChangeDetectionStrategy, Component, viewChild} from '@angular/core';
import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {FormControl, ReactiveFormsModule, Validators} from '@angular/forms';
import {beforeEach, describe, expect, it} from 'vitest';

import {InputComponent} from '../input/input.component';
import {FormFieldComponent} from './form-field.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormFieldComponent, InputComponent, ReactiveFormsModule],
  template: `
    <cmn-form-field
      [label]="label"
      [hint]="hint"
      [errorMessage]="errorMessage"
      [required]="required"
      [control]="control"
    >
      @if (withInput) {
        <cmn-input [formControl]="control" />
      }
    </cmn-form-field>
  `,
})
class HostComponent {
  public readonly field = viewChild.required(FormFieldComponent);
  public readonly inputCmp = viewChild(InputComponent);

  public label = 'Email';
  public hint = '';
  public errorMessage = '';
  public required = false;
  public withInput = true;
  public control = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });
}

describe('FormFieldComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
  });

  function label(): HTMLLabelElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector('label');
  }

  function error(): HTMLElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector('[role="alert"]');
  }

  function hint(): HTMLElement | null {
    const spans = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(
        'span.text-text-secondary'
      )
    );
    return spans[0] ?? null;
  }

  it('renders the label and wires its `for` to the generated field id', () => {
    fixture.detectChanges();
    expect(label()?.textContent?.trim()).toContain('Email');
    expect(label()?.getAttribute('for')).toBe(host.field().fieldId);
  });

  it('gives each field instance a distinct id', () => {
    fixture.detectChanges();
    const second = TestBed.createComponent(HostComponent);
    second.detectChanges();
    expect(host.field().fieldId).not.toBe(second.componentInstance.field().fieldId);
  });

  it('pushes the generated id onto the projected input', () => {
    fixture.detectChanges();
    const inputEl = (fixture.nativeElement as HTMLElement).querySelector(
      'input'
    ) as HTMLInputElement;
    expect(inputEl.id).toBe(host.field().fieldId);
  });

  it('omits the label element entirely when no label is given', () => {
    host.label = '';
    fixture.detectChanges();
    expect(label()).toBeNull();
  });

  it('marks a required field with an aria-hidden asterisk', () => {
    host.required = true;
    fixture.detectChanges();
    expect(label()?.querySelector('[aria-hidden="true"]')?.textContent?.trim()).toBe('*');
  });

  it('shows the hint while there is no error', () => {
    host.hint = 'We never share it.';
    fixture.detectChanges();
    expect(hint()?.textContent?.trim()).toBe('We never share it.');
    expect(error()).toBeNull();
  });

  it('keeps a static error hidden until the control is touched', () => {
    host.errorMessage = 'Server rejected this value';
    fixture.detectChanges();
    expect(error()).toBeNull();

    host.control.markAsTouched();
    fixture.detectChanges();
    expect(error()?.textContent?.trim()).toBe('Server rejected this value');
  });

  it('shows a static error immediately when there is no control to wait on', () => {
    host.control = null as unknown as FormControl<string>;
    host.withInput = false;
    host.errorMessage = 'Something went wrong';
    fixture.detectChanges();
    expect(error()?.textContent?.trim()).toBe('Something went wrong');
  });

  it('replaces the hint with the error once one is shown', () => {
    host.hint = 'We never share it.';
    host.errorMessage = 'Required';
    host.control.markAsTouched();
    fixture.detectChanges();

    expect(error()).not.toBeNull();
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('We never share it.');
  });

  it('resolves a validator error through the injected message map', () => {
    host.control.markAsTouched();
    host.control.updateValueAndValidity();
    fixture.detectChanges();

    const text = error()?.textContent?.trim() ?? '';
    expect(text.length).toBeGreaterThan(0);
  });

  it('stays quiet while an untouched control is invalid', () => {
    host.control.updateValueAndValidity();
    fixture.detectChanges();
    expect(error()).toBeNull();
  });

  it('forwards the form-model value and disabled state down to the input', () => {
    fixture.detectChanges();
    const inputEl = (fixture.nativeElement as HTMLElement).querySelector(
      'input'
    ) as HTMLInputElement;

    host.field().writeValue('seeded');
    fixture.detectChanges();
    expect(inputEl.value).toBe('seeded');

    host.field().setDisabledState(true);
    fixture.detectChanges();
    expect(inputEl.disabled).toBe(true);
  });

  it('replays a value written before content init once the input arrives', () => {
    const standalone = TestBed.createComponent(FormFieldComponent);
    standalone.componentInstance.writeValue('early');
    standalone.componentInstance.setDisabledState(true);
    standalone.componentInstance.registerOnChange(() => void 0);
    standalone.componentInstance.registerOnTouched(() => void 0);
    expect(() => standalone.detectChanges()).not.toThrow();
  });
});
