import {OverlayContainer} from '@angular/cdk/overlay';
import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';

import {
  SelectComponent,
  type SelectOption,
  type SelectOptionValue,
  type SelectValue,
} from './select.component';

const OPTIONS: SelectOption[] = [
  {label: 'Groceries', value: 'groceries'},
  {label: 'Rent', value: 'rent'},
  {label: 'Travel', value: 'travel', disabled: true},
];

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

describe('SelectComponent multiple mode', () => {
  let fixture: ComponentFixture<SelectComponent>;
  let overlayContainer: OverlayContainer;
  let seen: SelectOptionValue[][];

  beforeEach(async () => {
    await TestBed.configureTestingModule({imports: [SelectComponent]}).compileComponents();
    fixture = TestBed.createComponent(SelectComponent);
    overlayContainer = TestBed.inject(OverlayContainer);
    seen = [];
    fixture.componentInstance.registerOnChange(v => seen.push(v as SelectOptionValue[]));
    fixture.componentRef.setInput('mode', 'multiple');
    fixture.componentRef.setInput('options', OPTIONS);
    fixture.componentRef.setInput('placeholder', 'All categories');
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    overlayContainer.ngOnDestroy();
  });

  const trigger = (): HTMLButtonElement => fixture.nativeElement.querySelector('button');
  const panel = (): HTMLElement => overlayContainer.getContainerElement();

  function open(): void {
    trigger().click();
    fixture.detectChanges();
  }

  function checkboxes(): HTMLButtonElement[] {
    return Array.from(panel().querySelectorAll('[role="checkbox"]'));
  }

  it('shows the placeholder when nothing is selected', () => {
    expect(trigger().textContent).toContain('All categories');
    expect(fixture.componentInstance.hasSelection()).toBe(false);
    // The Placeholder Rule: placeholder text is text-placeholder (4.5:1), never text-disabled.
    const summary = trigger().querySelector('span.truncate');
    expect(summary?.classList).toContain('text-text-placeholder');
    expect(summary?.classList).not.toContain('text-text-disabled');
  });

  it('summarises one selection by label and several by count', () => {
    fixture.componentInstance.writeValue(['rent']);
    expect(fixture.componentInstance.summary()).toBe('Rent');

    fixture.componentInstance.writeValue(['rent', 'groceries']);
    expect(fixture.componentInstance.summary()).toBe('2 selected');
  });

  it('never shows the placeholder while values outside the options are selected', () => {
    fixture.componentInstance.writeValue(['unknown']);
    fixture.detectChanges();

    expect(fixture.componentInstance.summary()).toBe('1 selected');
    expect(trigger().textContent).not.toContain('All categories');

    fixture.componentInstance.writeValue(['rent', 'unknown']);
    expect(fixture.componentInstance.summary()).toBe('2 selected');
  });

  it('opens a panel listing every option and toggles aria-expanded', () => {
    open();

    expect(panel().textContent).toContain('Groceries');
    expect(panel().textContent).toContain('Travel');
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
  });

  it('floats its panel on its shadow alone, with no border', () => {
    open();

    const listbox = panel().querySelector('[role="listbox"]');
    expect(listbox?.classList).toContain('shadow-cmn-lg');
    expect(listbox?.classList).not.toContain('border');
  });

  it('adds and removes values as options are toggled', () => {
    open();

    checkboxes()[0].click();
    fixture.detectChanges();
    checkboxes()[1].click();
    fixture.detectChanges();
    checkboxes()[0].click();
    fixture.detectChanges();

    expect(seen).toEqual([['groceries'], ['groceries', 'rent'], ['rent']]);
  });

  it('does not toggle disabled options', () => {
    open();

    checkboxes()[2].click();

    expect(seen).toEqual([]);
  });

  it('clears the selection from the panel', () => {
    fixture.componentInstance.writeValue(['rent']);
    open();

    const clear = Array.from(panel().querySelectorAll('button')).find(b =>
      b.textContent?.includes('Clear selection')
    );
    clear?.click();
    fixture.detectChanges();

    expect(seen).toEqual([[]]);
    expect(trigger().textContent).toContain('All categories');
  });

  it('hides the clear action when nothing is selected', () => {
    open();

    expect(panel().textContent).not.toContain('Clear selection');
  });

  it('closes on Escape and marks touched', () => {
    let touched = 0;
    fixture.componentInstance.registerOnTouched(() => touched++);
    open();

    fixture.componentInstance.onOverlayKeydown(new KeyboardEvent('keydown', {key: 'Escape'}));
    fixture.detectChanges();

    expect(fixture.componentInstance.isOpen()).toBe(false);
    expect(touched).toBe(1);
  });

  it('toggles closed on a second trigger click and ignores other keys', () => {
    open();
    fixture.componentInstance.onOverlayKeydown(new KeyboardEvent('keydown', {key: 'a'}));
    expect(fixture.componentInstance.isOpen()).toBe(true);

    trigger().click();
    expect(fixture.componentInstance.isOpen()).toBe(false);
  });

  it('shows the empty label when there are no options', () => {
    fixture.componentRef.setInput('options', []);
    fixture.componentRef.setInput('emptyLabel', 'Nothing here');
    open();

    expect(panel().textContent).toContain('Nothing here');
  });

  it('normalises null writes and honours disabled state', () => {
    fixture.componentInstance.writeValue(null);
    expect(fixture.componentInstance.hasSelection()).toBe(false);

    fixture.componentInstance.setDisabledState(true);
    fixture.detectChanges();
    expect(trigger().disabled).toBe(true);
  });
});
