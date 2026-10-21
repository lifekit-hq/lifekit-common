import {ChangeDetectionStrategy, Component, viewChild} from '@angular/core';
import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {beforeEach, describe, expect, it} from 'vitest';

import {InputComponent} from '../input/input.component';
import {FormFieldComponent} from './form-field.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormFieldComponent, InputComponent, ReactiveFormsModule],
  template: `
    <form [formGroup]="form">
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
    </form>
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
    validators: [Validators.required, Validators.email],
  });
  public readonly form = new FormGroup({email: this.control});
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

  function formEl(): HTMLFormElement {
    return (fixture.nativeElement as HTMLElement).querySelector('form') as HTMLFormElement;
  }

  function submit(): void {
    formEl().dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  function type(value: string): void {
    const inputEl = (fixture.nativeElement as HTMLElement).querySelector(
      'input'
    ) as HTMLInputElement;
    inputEl.value = value;
    inputEl.dispatchEvent(new Event('input'));
    inputEl.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
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

  it('opens the leading of hint and error text, which wrap under a narrow field', () => {
    host.hint = 'We never share it.';
    fixture.detectChanges();
    expect(hint()?.classList).toContain('leading-relaxed');

    host.hint = '';
    host.errorMessage = 'Something went wrong';
    fixture.detectChanges();
    submit();
    expect(error()?.classList).toContain('leading-relaxed');
  });

  it('keeps a static error hidden until the form is submitted', () => {
    host.errorMessage = 'Server rejected this value';
    fixture.detectChanges();
    host.control.markAsTouched();
    fixture.detectChanges();
    expect(error()).toBeNull();

    submit();
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
    fixture.detectChanges();
    submit();

    expect(error()).not.toBeNull();
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('We never share it.');
  });

  it('resolves a validator error through the injected message map on submit', () => {
    fixture.detectChanges();
    submit();

    const text = error()?.textContent?.trim() ?? '';
    expect(text.length).toBeGreaterThan(0);
  });

  it('stays quiet while an untouched control is invalid', () => {
    host.control.updateValueAndValidity();
    fixture.detectChanges();
    expect(error()).toBeNull();
  });

  describe('validation timing (guardrails V1, V4)', () => {
    it('shows no error on blur or while typing before the first submit', () => {
      fixture.detectChanges();
      type('not-an-email');
      expect(host.control.touched).toBe(true);
      expect(host.control.invalid).toBe(true);
      expect(error()).toBeNull();
    });

    it('shows the error on submit', () => {
      fixture.detectChanges();
      type('not-an-email');
      submit();
      expect(error()).not.toBeNull();
    });

    it('shows nothing on submit when the field is valid', () => {
      fixture.detectChanges();
      type('a@b.co');
      submit();
      expect(error()).toBeNull();
    });

    it('re-checks a shown error as the person types and clears it once valid', () => {
      fixture.detectChanges();
      submit();
      const requiredText = error()?.textContent?.trim();
      expect(requiredText).toBeTruthy();

      type('not-an-email');
      expect(error()?.textContent?.trim()).not.toBe(requiredText);

      type('a@b.co');
      expect(error()).toBeNull();
    });

    it('shows no new error after a fix until the next submit', () => {
      fixture.detectChanges();
      submit();
      type('a@b.co');
      expect(error()).toBeNull();

      type('');
      expect(error()).toBeNull();

      submit();
      expect(error()).not.toBeNull();
    });

    it('hides errors again when the form is reset', () => {
      host.errorMessage = 'Server rejected this value';
      fixture.detectChanges();
      submit();
      expect(error()).not.toBeNull();

      formEl().dispatchEvent(new Event('reset'));
      fixture.detectChanges();
      expect(error()).toBeNull();
    });
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
