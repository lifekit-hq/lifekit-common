import {type ComponentFixture, TestBed} from '@angular/core/testing';

import {SelectComponent, type SelectValue} from './select.component';

interface SelectInternals {
  value(): SelectValue;
  onBlur(): void;
  disabled(): boolean;
}

describe('SelectComponent', () => {
  let fixture: ComponentFixture<SelectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(SelectComponent);
  });

  function nativeSelect(): HTMLSelectElement | null {
    return fixture.nativeElement.querySelector('select');
  }

  function internals(): SelectInternals {
    return fixture.componentInstance as unknown as SelectInternals;
  }

  it('renders the configured options as native <option> elements', () => {
    fixture.componentRef.setInput('options', [
      {label: 'Euro', value: 'eur'},
      {label: 'US Dollar', value: 'usd', disabled: true},
    ]);
    fixture.detectChanges();

    const options = fixture.nativeElement.querySelectorAll('select option');
    // options + the placeholder option
    expect(options.length).toBe(3);
    expect(nativeSelect()).not.toBeNull();
  });

  it('applies size classes', () => {
    fixture.componentRef.setInput('size', 'lg');
    fixture.detectChanges();

    expect(nativeSelect()?.className).toContain('text-cmn-md');
  });

  it('bounds the field with the 3:1 border and a focus ring', () => {
    fixture.detectChanges();

    expect(nativeSelect()?.classList).toContain('border-border-strong');
    expect(nativeSelect()?.classList).toContain('focus-visible:ring-2');
    expect(nativeSelect()?.classList).toContain('focus-visible:ring-border-focus');
  });

  it('swaps to the error border when hasError is set', () => {
    fixture.componentRef.setInput('hasError', true);
    fixture.detectChanges();

    expect(nativeSelect()?.classList).toContain('border-status-error');
    expect(nativeSelect()?.classList).not.toContain('border-border-strong');
  });

  it('writes external form values', () => {
    fixture.componentInstance.writeValue('eur');
    fixture.detectChanges();

    expect(internals().value()).toBe('eur');
  });

  it('normalizes undefined form values to null', () => {
    fixture.componentInstance.writeValue(undefined);
    fixture.detectChanges();

    expect(internals().value()).toBeNull();
  });

  it('emits form changes when the native selection changes', () => {
    fixture.componentRef.setInput('options', [
      {label: 'Euro', value: 'eur'},
      {label: 'US Dollar', value: 'usd'},
    ]);
    fixture.detectChanges();

    let emitted: SelectValue = null;
    fixture.componentInstance.registerOnChange(value => {
      emitted = value;
    });

    const el = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    el.value = 'usd';
    el.dispatchEvent(new Event('change'));

    expect(emitted).toBe('usd');
    expect(internals().value()).toBe('usd');
  });

  it('marks the control as touched on blur', () => {
    let touched = false;
    fixture.componentInstance.registerOnTouched(() => {
      touched = true;
    });

    internals().onBlur();

    expect(touched).toBe(true);
  });

  it('updates disabled state from forms API', () => {
    fixture.componentInstance.setDisabledState(true);
    fixture.detectChanges();

    expect(internals().disabled()).toBe(true);
  });

  it('names the native select from aria-label, falling back to the placeholder', () => {
    fixture.componentRef.setInput('options', [{label: 'One', value: 1}]);
    fixture.componentRef.setInput('placeholder', 'Pick one');
    fixture.detectChanges();
    expect(nativeSelect()?.getAttribute('aria-label')).toBe('Pick one');

    fixture.componentRef.setInput('aria-label', 'Currency');
    fixture.detectChanges();
    expect(nativeSelect()?.getAttribute('aria-label')).toBe('Currency');
  });
});
