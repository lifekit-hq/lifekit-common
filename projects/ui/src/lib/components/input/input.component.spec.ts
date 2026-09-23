import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {beforeEach, describe, expect, it} from 'vitest';

import {InputComponent, type InputSize, type InputType} from './input.component';

describe('InputComponent', () => {
  let fixture: ComponentFixture<InputComponent>;
  let component: InputComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InputComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InputComponent);
    component = fixture.componentInstance;
  });

  function input(): HTMLInputElement {
    return (fixture.nativeElement as HTMLElement).querySelector('input') as HTMLInputElement;
  }

  function type(value: string): void {
    const el = input();
    el.value = value;
    el.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  it.each<InputType>(['text', 'email', 'password', 'number', 'tel', 'search'])(
    'forwards the "%s" input type',
    inputType => {
      fixture.componentRef.setInput('type', inputType);
      fixture.detectChanges();
      expect(input().type).toBe(inputType);
    }
  );

  it.each<[InputSize, string]>([
    ['sm', 'text-cmn-sm'],
    ['md', 'text-cmn-md'],
    ['lg', 'text-cmn-lg'],
  ])('applies the "%s" size classes', (size, expected) => {
    fixture.componentRef.setInput('size', size);
    fixture.detectChanges();
    expect(input().className).toContain(expected);
  });

  it('writes a value from the form model', () => {
    component.writeValue('hello');
    fixture.detectChanges();
    expect(input().value).toBe('hello');
  });

  it('treats null and undefined from the form model as empty', () => {
    component.writeValue('seed');
    fixture.detectChanges();
    component.writeValue(null);
    fixture.detectChanges();
    expect(input().value).toBe('');

    component.writeValue(undefined);
    fixture.detectChanges();
    expect(input().value).toBe('');
  });

  it('propagates typing to the registered onChange', () => {
    const seen: string[] = [];
    component.registerOnChange(v => seen.push(v));
    fixture.detectChanges();

    type('abc');
    expect(seen).toEqual(['abc']);
    expect(input().value).toBe('abc');
  });

  it('calls the registered onTouched on blur', () => {
    let touched = 0;
    component.registerOnTouched(() => touched++);
    fixture.detectChanges();

    input().dispatchEvent(new Event('blur'));
    expect(touched).toBe(1);
  });

  it('reflects the disabled state set by the form model', () => {
    fixture.detectChanges();
    expect(input().disabled).toBe(false);

    component.setDisabledState(true);
    fixture.detectChanges();
    expect(input().disabled).toBe(true);
  });

  it('marks the field invalid and swaps the border when hasError is set', () => {
    fixture.detectChanges();
    expect(input().getAttribute('aria-invalid')).toBeNull();
    expect(input().className).toContain('border-border-default');

    fixture.componentRef.setInput('hasError', true);
    fixture.detectChanges();
    expect(input().getAttribute('aria-invalid')).toBe('true');
    expect(input().className).toContain('border-status-error');
  });

  it('adopts the id handed down by a form field', () => {
    component.setInputId('cmn-field-42');
    fixture.detectChanges();
    expect(input().id).toBe('cmn-field-42');
  });

  it('renders readonly and autocomplete only when asked', () => {
    fixture.detectChanges();
    expect(input().readOnly).toBe(false);
    expect(input().getAttribute('autocomplete')).toBeNull();

    fixture.componentRef.setInput('readonly', true);
    fixture.componentRef.setInput('autocomplete', 'one-time-code');
    fixture.componentRef.setInput('placeholder', 'Code');
    fixture.detectChanges();
    expect(input().readOnly).toBe(true);
    expect(input().getAttribute('autocomplete')).toBe('one-time-code');
    expect(input().placeholder).toBe('Code');
  });
});
