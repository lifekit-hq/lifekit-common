import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {beforeEach, describe, expect, it} from 'vitest';

import {SearchInputComponent} from './search-input.component';

describe('SearchInputComponent', () => {
  let fixture: ComponentFixture<SearchInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({imports: [SearchInputComponent]}).compileComponents();
    fixture = TestBed.createComponent(SearchInputComponent);
    fixture.detectChanges();
  });

  const input = (): HTMLInputElement => fixture.nativeElement.querySelector('input');
  const clearButton = (): HTMLButtonElement | null => fixture.nativeElement.querySelector('button');

  function type(text: string): void {
    input().value = text;
    input().dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  it('hides the clear button while empty', () => {
    expect(clearButton()).toBeNull();
  });

  it('propagates typed text to the form control and shows the clear button', () => {
    const seen: string[] = [];
    fixture.componentInstance.registerOnChange(v => seen.push(v));

    type('coffee');

    expect(seen).toEqual(['coffee']);
    expect(clearButton()).not.toBeNull();
  });

  it('writes external values, normalising null to empty', () => {
    fixture.componentInstance.writeValue('rent');
    fixture.detectChanges();
    expect(input().value).toBe('rent');

    fixture.componentInstance.writeValue(null);
    fixture.detectChanges();
    expect(input().value).toBe('');
  });

  it('clears via the button, notifying the control and emitting cleared', () => {
    const seen: string[] = [];
    let cleared = 0;
    fixture.componentInstance.registerOnChange(v => seen.push(v));
    fixture.componentInstance.cleared.subscribe(() => cleared++);
    type('abc');

    clearButton()?.click();
    fixture.detectChanges();

    expect(seen).toEqual(['abc', '']);
    expect(cleared).toBe(1);
    expect(input().value).toBe('');
  });

  it('clears on Escape but is a no-op when already empty', () => {
    let cleared = 0;
    fixture.componentInstance.cleared.subscribe(() => cleared++);

    input().dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}));
    expect(cleared).toBe(0);

    type('abc');
    input().dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}));
    expect(cleared).toBe(1);
  });

  it('disables the field and drops the clear button when disabled', () => {
    fixture.componentInstance.writeValue('abc');
    fixture.componentInstance.setDisabledState(true);
    fixture.detectChanges();

    expect(input().disabled).toBe(true);
    expect(clearButton()).toBeNull();
  });

  it('marks the control touched on blur', () => {
    let touched = 0;
    fixture.componentInstance.registerOnTouched(() => touched++);

    input().dispatchEvent(new Event('blur'));

    expect(touched).toBe(1);
  });

  it('applies size classes', () => {
    fixture.componentRef.setInput('size', 'lg');
    fixture.detectChanges();

    expect(input().className).toContain('text-cmn-lg');
  });
});
