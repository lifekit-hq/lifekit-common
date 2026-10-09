import {ChangeDetectionStrategy, Component, viewChild} from '@angular/core';
import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {beforeEach, describe, expect, it} from 'vitest';

import {FormFieldComponent} from '../form-field/form-field.component';
import {type InputSize} from '../input/input.component';
import {TextareaComponent} from './textarea.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormFieldComponent, TextareaComponent, ReactiveFormsModule],
  template: `
    <cmn-form-field [control]="control" label="Details" hint="Describe what happened.">
      <cmn-textarea [formControl]="control" [maxlength]="20" />
    </cmn-form-field>
  `,
})
class FormFieldHostComponent {
  public readonly textarea = viewChild.required(TextareaComponent);
  public readonly control = new FormControl('', {nonNullable: true});
}

describe('TextareaComponent', () => {
  let fixture: ComponentFixture<TextareaComponent>;
  let component: TextareaComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TextareaComponent, FormFieldHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TextareaComponent);
    component = fixture.componentInstance;
  });

  function textarea(): HTMLTextAreaElement {
    return (fixture.nativeElement as HTMLElement).querySelector('textarea') as HTMLTextAreaElement;
  }

  function counter(): HTMLElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector('span');
  }

  function type(value: string): void {
    const el = textarea();
    el.value = value;
    el.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  it('renders a multi-line field with three rows by default', () => {
    fixture.detectChanges();
    expect(textarea().rows).toBe(3);

    fixture.componentRef.setInput('rows', 6);
    fixture.detectChanges();
    expect(textarea().rows).toBe(6);
  });

  it.each<[InputSize, string]>([
    ['sm', 'text-cmn-sm'],
    ['md', 'text-cmn-md'],
    ['lg', 'text-cmn-lg'],
  ])('applies the "%s" size classes', (size, expected) => {
    fixture.componentRef.setInput('size', size);
    fixture.detectChanges();
    expect(textarea().className).toContain(expected);
  });

  it('writes a value from the form model, treating null and undefined as empty', () => {
    component.writeValue('line one\nline two');
    fixture.detectChanges();
    expect(textarea().value).toBe('line one\nline two');

    component.writeValue(null);
    fixture.detectChanges();
    expect(textarea().value).toBe('');

    component.writeValue('seed');
    component.writeValue(undefined);
    fixture.detectChanges();
    expect(textarea().value).toBe('');
  });

  it('propagates typing, line breaks included, to the registered onChange', () => {
    const seen: string[] = [];
    component.registerOnChange(v => seen.push(v));
    fixture.detectChanges();

    type('a\nb');
    expect(seen).toEqual(['a\nb']);
  });

  it('calls the registered onTouched on blur', () => {
    let touched = 0;
    component.registerOnTouched(() => touched++);
    fixture.detectChanges();

    textarea().dispatchEvent(new Event('blur'));
    expect(touched).toBe(1);
  });

  it('reflects the disabled state set by the form model', () => {
    fixture.detectChanges();
    expect(textarea().disabled).toBe(false);

    component.setDisabledState(true);
    fixture.detectChanges();
    expect(textarea().disabled).toBe(true);
  });

  it('marks the field invalid and swaps the border when hasError is set', () => {
    fixture.detectChanges();
    expect(textarea().getAttribute('aria-invalid')).toBeNull();
    expect(textarea().className).toContain('border-border-default');

    fixture.componentRef.setInput('hasError', true);
    fixture.detectChanges();
    expect(textarea().getAttribute('aria-invalid')).toBe('true');
    expect(textarea().className).toContain('border-status-error');
  });

  it('renders readonly, placeholder and autocomplete only when asked', () => {
    fixture.detectChanges();
    expect(textarea().readOnly).toBe(false);
    expect(textarea().getAttribute('autocomplete')).toBeNull();

    fixture.componentRef.setInput('readonly', true);
    fixture.componentRef.setInput('autocomplete', 'off');
    fixture.componentRef.setInput('placeholder', 'Tell us more');
    fixture.detectChanges();
    expect(textarea().readOnly).toBe(true);
    expect(textarea().getAttribute('autocomplete')).toBe('off');
    expect(textarea().placeholder).toBe('Tell us more');
  });

  describe('with a maxlength', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('maxlength', 10);
      fixture.detectChanges();
    });

    it('caps the text and shows a counter that follows typing', () => {
      expect(textarea().getAttribute('maxlength')).toBe('10');
      expect(counter()?.textContent?.trim()).toBe('0 / 10');

      type('hello');
      expect(counter()?.textContent?.trim()).toBe('5 / 10');
    });

    it('counts a value written from the form model', () => {
      component.writeValue('abc');
      fixture.detectChanges();
      expect(counter()?.textContent?.trim()).toBe('3 / 10');
    });

    it('describes the field by its counter', () => {
      expect(textarea().getAttribute('aria-describedby')).toBe(counter()?.id);
    });
  });

  it('shows no counter and no cap without a maxlength', () => {
    fixture.detectChanges();
    expect(counter()).toBeNull();
    expect(textarea().getAttribute('maxlength')).toBeNull();
    expect(textarea().getAttribute('aria-describedby')).toBeNull();
  });

  describe('inside a form field', () => {
    it('takes the field id, so the label targets it, and the value from the control', () => {
      const hostFixture = TestBed.createComponent(FormFieldHostComponent);
      hostFixture.componentInstance.control.setValue('from the model');
      hostFixture.detectChanges();

      const el = (hostFixture.nativeElement as HTMLElement).querySelector('textarea');
      const label = (hostFixture.nativeElement as HTMLElement).querySelector('label');
      expect(el?.id).toMatch(/^cmn-field-/);
      expect(label?.htmlFor).toBe(el?.id);
      expect(el?.value).toBe('from the model');
      expect(el?.getAttribute('aria-describedby')).toBe(`${el?.id}-count`);
    });

    it('reports typing to the control and touches it on blur', () => {
      const hostFixture = TestBed.createComponent(FormFieldHostComponent);
      hostFixture.detectChanges();
      const el = (hostFixture.nativeElement as HTMLElement).querySelector(
        'textarea'
      ) as HTMLTextAreaElement;

      el.value = 'typed';
      el.dispatchEvent(new Event('input'));
      el.dispatchEvent(new Event('blur'));
      expect(hostFixture.componentInstance.control.value).toBe('typed');
      expect(hostFixture.componentInstance.control.touched).toBe(true);
    });

    it('follows the control being disabled', () => {
      const hostFixture = TestBed.createComponent(FormFieldHostComponent);
      hostFixture.detectChanges();
      hostFixture.componentInstance.control.disable();
      hostFixture.detectChanges();
      expect((hostFixture.nativeElement as HTMLElement).querySelector('textarea')?.disabled).toBe(
        true
      );
    });
  });
});
