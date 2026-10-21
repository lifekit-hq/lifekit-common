import {OverlayContainer} from '@angular/cdk/overlay';
import {ChangeDetectionStrategy, Component} from '@angular/core';
import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {userEvent} from 'vitest/browser';

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

/** Drives the combobox (`showSearch` or `mode="multiple"`) the way a person would. */
class ComboboxHarness {
  constructor(
    private readonly fixture: ComponentFixture<unknown>,
    private readonly overlayContainer: OverlayContainer
  ) {}

  public get host(): HTMLElement {
    return this.fixture.nativeElement as HTMLElement;
  }

  public combobox(): HTMLElement {
    return this.host.querySelector('[role="combobox"]') as HTMLElement;
  }

  public field(): HTMLElement {
    return this.host.querySelector('[cdkoverlayorigin]') as HTMLElement;
  }

  public listbox(): HTMLElement | null {
    return this.overlayContainer.getContainerElement().querySelector('[role="listbox"]');
  }

  public panelText(): string {
    return this.overlayContainer.getContainerElement().textContent ?? '';
  }

  public options(): HTMLElement[] {
    return Array.from(
      this.overlayContainer.getContainerElement().querySelectorAll('[role="option"]')
    );
  }

  public optionLabels(): string[] {
    return this.options().map(o => o.textContent?.trim() ?? '');
  }

  public activeLabel(): string | null {
    const id = this.combobox().getAttribute('aria-activedescendant');
    return id ? (document.getElementById(id)?.textContent?.trim() ?? null) : null;
  }

  public chips(): string[] {
    return Array.from(this.host.querySelectorAll('cmn-chip')).map(c => c.textContent?.trim() ?? '');
  }

  public button(label: string): HTMLButtonElement | undefined {
    return Array.from(this.host.querySelectorAll('button')).find(
      b => b.getAttribute('aria-label') === label
    );
  }

  public click(el: HTMLElement): void {
    el.click();
    this.fixture.detectChanges();
  }

  public key(key: string, init: KeyboardEventInit = {}): KeyboardEvent {
    const event = new KeyboardEvent('keydown', {key, bubbles: true, cancelable: true, ...init});
    this.combobox().dispatchEvent(event);
    this.fixture.detectChanges();
    return event;
  }

  public type(text: string): void {
    const input = this.combobox() as HTMLInputElement;
    input.value = text;
    input.dispatchEvent(new Event('input'));
    this.fixture.detectChanges();
  }
}

describe('SelectComponent multiple mode', () => {
  let fixture: ComponentFixture<SelectComponent>;
  let overlayContainer: OverlayContainer;
  let ui: ComboboxHarness;
  let seen: SelectOptionValue[][];

  beforeEach(async () => {
    await TestBed.configureTestingModule({imports: [SelectComponent]}).compileComponents();
    fixture = TestBed.createComponent(SelectComponent);
    overlayContainer = TestBed.inject(OverlayContainer);
    ui = new ComboboxHarness(fixture, overlayContainer);
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

  function open(): void {
    ui.click(ui.combobox());
  }

  it('renders a select-only combobox, not a native multi-select box', () => {
    expect(fixture.nativeElement.querySelector('select')).toBeNull();
    expect(ui.combobox().tagName).toBe('DIV');
    expect(ui.combobox().getAttribute('tabindex')).toBe('0');
    expect(ui.combobox().getAttribute('aria-haspopup')).toBe('listbox');
    expect(ui.combobox().getAttribute('aria-expanded')).toBe('false');
  });

  it('shows the placeholder when nothing is selected', () => {
    expect(ui.combobox().textContent).toContain('All categories');
    expect(fixture.componentInstance.hasSelection()).toBe(false);
    // The Placeholder Rule: placeholder text is text-placeholder (4.5:1), never text-disabled.
    const placeholder = ui.combobox().querySelector('span');
    expect(placeholder?.classList).toContain('text-text-placeholder');
    expect(placeholder?.classList).not.toContain('text-text-disabled');
  });

  it('shows each selection as a removable chip', () => {
    fixture.componentInstance.writeValue(['rent', 'groceries']);
    fixture.detectChanges();

    expect(ui.chips()).toEqual(['Rent', 'Groceries']);
    expect(ui.button('Remove Rent')).toBeDefined();
    expect(ui.combobox().textContent).not.toContain('All categories');
  });

  it('removes one value when its chip × is pressed', () => {
    fixture.componentInstance.writeValue(['rent', 'groceries']);
    fixture.detectChanges();

    ui.click(ui.button('Remove Rent') as HTMLButtonElement);

    expect(seen).toEqual([['groceries']]);
    expect(ui.chips()).toEqual(['Groceries']);
  });

  it('closes when the chevron of the open field is clicked', async () => {
    open();
    expect(fixture.componentInstance.isOpen()).toBe(true);

    await userEvent.click(ui.host.querySelector('cmn-icon[name="ChevronDown"]') as HTMLElement);
    fixture.detectChanges();

    expect(fixture.componentInstance.isOpen()).toBe(false);
    expect(document.activeElement).toBe(ui.combobox());
  });

  it('keeps focus on the combobox for presses on the field, not on its buttons', () => {
    fixture.componentInstance.writeValue(['rent']);
    fixture.detectChanges();
    const press = (el: HTMLElement): MouseEvent => {
      const event = new MouseEvent('mousedown', {bubbles: true, cancelable: true});
      el.dispatchEvent(event);
      return event;
    };

    const chevron = ui.host.querySelector('cmn-icon[name="ChevronDown"]') as HTMLElement;
    expect(press(chevron).defaultPrevented).toBe(true);
    expect(press(ui.host.querySelector('cmn-chip') as HTMLElement).defaultPrevented).toBe(true);
    expect(press(ui.button('Remove Rent') as HTMLButtonElement).defaultPrevented).toBe(false);
  });

  it('names the chip × from removeLabelPrefix', () => {
    fixture.componentRef.setInput('removeLabelPrefix', 'Unselect');
    fixture.componentInstance.writeValue(['rent']);
    fixture.detectChanges();

    expect(ui.button('Unselect Rent')).toBeDefined();
  });

  it('summarises the selection for screen readers by label or count', () => {
    fixture.componentInstance.writeValue(['rent']);
    expect(fixture.componentInstance.summary()).toBe('Rent');

    fixture.componentInstance.writeValue(['rent', 'groceries']);
    fixture.detectChanges();
    expect(fixture.componentInstance.summary()).toBe('2 selected');
    expect(ui.combobox().querySelector('.sr-only')?.textContent).toContain('2 selected');
  });

  it('never shows the placeholder while values outside the options are selected', () => {
    fixture.componentInstance.writeValue(['unknown']);
    fixture.detectChanges();

    expect(fixture.componentInstance.summary()).toBe('1 selected');
    expect(ui.combobox().textContent).not.toContain('All categories');
    expect(ui.chips()).toEqual([]);

    fixture.componentInstance.writeValue(['rent', 'unknown']);
    expect(fixture.componentInstance.summary()).toBe('2 selected');
  });

  it('opens a multiselectable listbox of every option and sets aria-expanded', () => {
    open();

    expect(ui.optionLabels()).toEqual(['Groceries', 'Rent', 'Travel']);
    expect(ui.listbox()?.getAttribute('aria-multiselectable')).toBe('true');
    expect(ui.combobox().getAttribute('aria-expanded')).toBe('true');
    expect(ui.combobox().getAttribute('aria-controls')).toBe(ui.listbox()?.id);
    expect(ui.options()[2].getAttribute('aria-disabled')).toBe('true');
  });

  it('floats its panel on its shadow alone, with no border', () => {
    open();

    const panel = ui.listbox()?.parentElement;
    expect(panel?.classList).toContain('shadow-cmn-lg');
    expect(panel?.classList).not.toContain('border');
    // The CDK pane is a flex row; the panel must fill it to reach the field's width.
    expect(panel?.classList).toContain('w-full');
  });

  it('toggles values as options are clicked and keeps the popup open', () => {
    open();

    ui.click(ui.options()[0]);
    ui.click(ui.options()[1]);
    ui.click(ui.options()[0]);

    expect(seen).toEqual([['groceries'], ['groceries', 'rent'], ['rent']]);
    expect(fixture.componentInstance.isOpen()).toBe(true);
    expect(ui.options()[1].getAttribute('aria-selected')).toBe('true');
    expect(ui.options()[0].getAttribute('aria-selected')).toBe('false');
  });

  it('does not toggle disabled options', () => {
    open();

    ui.click(ui.options()[2]);

    expect(seen).toEqual([]);
  });

  it('clears the selection from the field', () => {
    fixture.componentInstance.writeValue(['rent']);
    fixture.detectChanges();

    ui.click(ui.button('Clear selection') as HTMLButtonElement);

    expect(seen).toEqual([[]]);
    expect(ui.combobox().textContent).toContain('All categories');
    expect(ui.button('Clear selection')).toBeUndefined();
  });

  it('hides the clear action when nothing is selected', () => {
    expect(ui.button('Clear selection')).toBeUndefined();
  });

  it('closes on Escape and marks touched', () => {
    let touched = 0;
    fixture.componentInstance.registerOnTouched(() => touched++);
    open();

    const event = ui.key('Escape');

    expect(event.defaultPrevented).toBe(true);
    expect(fixture.componentInstance.isOpen()).toBe(false);
    expect(touched).toBe(1);
  });

  it('toggles closed on a second click and ignores Escape from the overlay for other keys', () => {
    open();
    fixture.componentInstance.onOverlayKeydown(new KeyboardEvent('keydown', {key: 'a'}));
    expect(fixture.componentInstance.isOpen()).toBe(true);

    ui.click(ui.combobox());
    expect(fixture.componentInstance.isOpen()).toBe(false);
  });

  it('shows the empty label when there are no options', () => {
    fixture.componentRef.setInput('options', []);
    fixture.componentRef.setInput('emptyLabel', 'Nothing here');
    open();

    expect(ui.panelText()).toContain('Nothing here');
  });

  it('normalises null writes and honours disabled state', () => {
    fixture.componentInstance.writeValue(['rent']);
    fixture.componentInstance.setDisabledState(true);
    fixture.detectChanges();

    expect(ui.combobox().hasAttribute('tabindex')).toBe(false);
    expect(ui.combobox().getAttribute('aria-disabled')).toBe('true');
    expect(ui.button('Remove Rent')?.disabled).toBe(true);
    expect(ui.button('Clear selection')).toBeUndefined();
    ui.click(ui.field());
    ui.key('ArrowDown');
    expect(fixture.componentInstance.isOpen()).toBe(false);

    fixture.componentInstance.writeValue(null);
    expect(fixture.componentInstance.hasSelection()).toBe(false);
  });

  describe('keyboard', () => {
    it('opens on ArrowDown with the first enabled option active', () => {
      ui.key('ArrowDown');

      expect(fixture.componentInstance.isOpen()).toBe(true);
      expect(ui.activeLabel()).toBe('Groceries');
    });

    it('opens on ArrowUp with the last enabled option active', () => {
      ui.key('ArrowUp');

      expect(ui.activeLabel()).toBe('Rent');
    });

    it('opens on the first selected option', () => {
      fixture.componentInstance.writeValue(['rent']);
      ui.key('Enter');

      expect(ui.activeLabel()).toBe('Rent');
    });

    it('moves with the arrows, skips disabled options and stops at the ends', () => {
      ui.key('ArrowDown');
      ui.key('ArrowDown');
      expect(ui.activeLabel()).toBe('Rent');

      ui.key('ArrowDown');
      expect(ui.activeLabel()).toBe('Rent');

      ui.key('ArrowUp');
      ui.key('ArrowUp');
      expect(ui.activeLabel()).toBe('Groceries');
    });

    it('jumps with Home and End', () => {
      ui.key('End');
      expect(ui.activeLabel()).toBe('Rent');

      ui.key('Home');
      expect(ui.activeLabel()).toBe('Groceries');
    });

    it('toggles the active option with Enter and Space, staying open', () => {
      ui.key('ArrowDown');
      ui.key('Enter');
      ui.key('ArrowDown');
      ui.key(' ');
      ui.key(' ');

      expect(seen).toEqual([['groceries'], ['groceries', 'rent'], ['groceries']]);
      expect(fixture.componentInstance.isOpen()).toBe(true);
    });

    it('moves by type-ahead on the option labels', () => {
      const now = vi.spyOn(Date, 'now').mockReturnValue(1000);
      ui.key('r');
      ui.key('e');
      expect(fixture.componentInstance.isOpen()).toBe(true);
      expect(ui.activeLabel()).toBe('Rent');

      // A pause starts a fresh search.
      now.mockReturnValue(2000);
      ui.key('g');
      expect(ui.activeLabel()).toBe('Groceries');
      now.mockRestore();
    });

    it('lands type-ahead on the first match when the popup was closed', () => {
      fixture.componentRef.setInput('options', [
        {label: 'Apple', value: 'apple'},
        {label: 'Avocado', value: 'avocado'},
      ]);
      fixture.detectChanges();

      ui.key('a');

      expect(fixture.componentInstance.isOpen()).toBe(true);
      expect(ui.activeLabel()).toBe('Apple');
    });

    it('lands type-ahead on a matching selected option when the popup was closed', () => {
      fixture.componentRef.setInput('options', [
        {label: 'Rent', value: 'rent'},
        {label: 'Repairs', value: 'repairs'},
        {label: 'Refunds', value: 'refunds'},
      ]);
      fixture.componentInstance.writeValue(['repairs']);
      fixture.detectChanges();

      ui.key('r');

      expect(ui.activeLabel()).toBe('Rent');
    });

    it('cycles a repeated key through the matches once the popup is open', () => {
      fixture.componentRef.setInput('options', [
        {label: 'Apple', value: 'apple'},
        {label: 'Avocado', value: 'avocado'},
      ]);
      fixture.detectChanges();

      const now = vi.spyOn(Date, 'now').mockReturnValue(1000);
      ui.key('a');
      now.mockReturnValue(2000);
      ui.key('a');
      expect(ui.activeLabel()).toBe('Avocado');
      now.mockRestore();
    });

    it('closes on Alt+ArrowUp and on Tab', () => {
      ui.key('ArrowDown');
      ui.key('ArrowUp', {altKey: true});
      expect(fixture.componentInstance.isOpen()).toBe(false);

      ui.key('ArrowDown');
      ui.key('Tab');
      expect(fixture.componentInstance.isOpen()).toBe(false);
    });

    it('drops aria-activedescendant once closed', () => {
      ui.key('ArrowDown');
      expect(ui.combobox().getAttribute('aria-activedescendant')).not.toBeNull();

      ui.key('Escape');
      expect(ui.combobox().getAttribute('aria-activedescendant')).toBeNull();
    });
  });
});

describe('SelectComponent showSearch', () => {
  let fixture: ComponentFixture<SelectComponent>;
  let overlayContainer: OverlayContainer;
  let ui: ComboboxHarness;
  let seen: SelectValue[];

  beforeEach(async () => {
    await TestBed.configureTestingModule({imports: [SelectComponent]}).compileComponents();
    fixture = TestBed.createComponent(SelectComponent);
    overlayContainer = TestBed.inject(OverlayContainer);
    ui = new ComboboxHarness(fixture, overlayContainer);
    seen = [];
    fixture.componentInstance.registerOnChange(v => seen.push(v));
    fixture.componentRef.setInput('showSearch', true);
    fixture.componentRef.setInput('options', [
      ...OPTIONS,
      {label: 'Restaurants', value: 'restaurants'},
    ]);
    fixture.componentRef.setInput('placeholder', 'Category');
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    overlayContainer.ngOnDestroy();
  });

  const input = (): HTMLInputElement => ui.combobox() as HTMLInputElement;

  it('renders an editable combobox with list autocomplete', () => {
    expect(fixture.nativeElement.querySelector('select')).toBeNull();
    expect(input().tagName).toBe('INPUT');
    expect(input().getAttribute('aria-autocomplete')).toBe('list');
    expect(input().getAttribute('aria-expanded')).toBe('false');
    expect(input().getAttribute('aria-label')).toBe('Category');
    expect(input().placeholder).toBe('Category');
  });

  it('filters the options by label as you type, ignoring case', () => {
    ui.type('RE');

    expect(fixture.componentInstance.isOpen()).toBe(true);
    expect(ui.optionLabels()).toEqual(['Rent', 'Restaurants']);
    expect(ui.activeLabel()).toBe('Rent');

    ui.type('res');
    expect(ui.optionLabels()).toEqual(['Restaurants']);
    expect(ui.activeLabel()).toBe('Restaurants');
  });

  it('says so when nothing matches', () => {
    fixture.componentRef.setInput('noMatchesLabel', 'Nothing matches');
    ui.type('zzz');

    expect(ui.options()).toEqual([]);
    expect(ui.panelText()).toContain('Nothing matches');
    expect(ui.combobox().getAttribute('aria-activedescendant')).toBeNull();
  });

  it('picks the active match with Enter, closes and shows its label', () => {
    ui.type('ren');
    ui.key('Enter');

    expect(seen).toEqual(['rent']);
    expect(fixture.componentInstance.isOpen()).toBe(false);
    expect(input().value).toBe('Rent');
  });

  it('picks a clicked option', () => {
    ui.click(ui.field());
    ui.click(ui.options()[3]);

    expect(seen).toEqual(['restaurants']);
    expect(input().value).toBe('Restaurants');
  });

  it('shows the picked label as the placeholder while searching', () => {
    fixture.componentInstance.writeValue('rent');
    fixture.detectChanges();
    expect(input().value).toBe('Rent');

    ui.key('ArrowDown');

    expect(input().value).toBe('');
    expect(input().placeholder).toBe('Rent');
    expect(ui.activeLabel()).toBe('Rent');
  });

  it('leaves Home, End and Space to the text field', () => {
    ui.type('re');
    expect(ui.key('Home').defaultPrevented).toBe(false);
    expect(ui.key(' ').defaultPrevented).toBe(false);
    expect(seen).toEqual([]);
  });

  it('closes on Escape, discarding the search', () => {
    ui.type('ren');
    ui.key('Escape');

    expect(fixture.componentInstance.isOpen()).toBe(false);
    expect(input().value).toBe('');
    expect(seen).toEqual([]);
  });

  it('closes and marks touched when focus leaves the field', () => {
    let touched = 0;
    fixture.componentInstance.registerOnTouched(() => touched++);
    ui.type('ren');

    input().dispatchEvent(new FocusEvent('focusout', {bubbles: true, relatedTarget: null}));
    fixture.detectChanges();

    expect(fixture.componentInstance.isOpen()).toBe(false);
    expect(touched).toBe(1);
  });

  it('offers a clear × only with allowClear and a value', () => {
    fixture.componentInstance.writeValue('rent');
    fixture.detectChanges();
    expect(ui.button('Clear selection')).toBeUndefined();

    fixture.componentRef.setInput('allowClear', true);
    fixture.detectChanges();
    ui.click(ui.button('Clear selection') as HTMLButtonElement);

    expect(seen).toEqual([null]);
    expect(input().value).toBe('');
  });

  it('disables the search field', () => {
    fixture.componentInstance.setDisabledState(true);
    fixture.detectChanges();

    expect(input().disabled).toBe(true);
  });

  it('filters in multiple mode and removes the last chip on Backspace in an empty field', () => {
    let values: SelectValue[] = [];
    fixture.componentInstance.registerOnChange(v => (values = [...values, v]));
    fixture.componentRef.setInput('mode', 'multiple');
    fixture.componentInstance.writeValue(['groceries']);
    fixture.detectChanges();

    ui.type('ren');
    expect(ui.optionLabels()).toEqual(['Rent']);
    ui.key('Enter');
    expect(values).toEqual([['groceries', 'rent']]);
    expect(input().value).toBe('');
    expect(fixture.componentInstance.isOpen()).toBe(true);

    ui.key('Backspace');
    expect(values.at(-1)).toEqual(['groceries']);
    expect(ui.chips()).toEqual(['Groceries']);
  });
});

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SelectComponent, ReactiveFormsModule],
  template: `
    <cmn-select
      [formControl]="control"
      [options]="options"
      [showSearch]="true"
      mode="multiple"
      aria-label="Categories"
    />
  `,
})
class FormHostComponent {
  public readonly options = OPTIONS;
  public readonly control = new FormControl<SelectOptionValue[]>(['rent'], {nonNullable: true});
}

describe('SelectComponent forms integration', () => {
  it('reads, writes, touches and disables through a FormControl', async () => {
    await TestBed.configureTestingModule({imports: [FormHostComponent]}).compileComponents();
    const fixture = TestBed.createComponent(FormHostComponent);
    const overlayContainer = TestBed.inject(OverlayContainer);
    const ui = new ComboboxHarness(fixture, overlayContainer);
    const {control} = fixture.componentInstance;
    fixture.detectChanges();

    expect(ui.chips()).toEqual(['Rent']);

    // Opens on the selected Rent; Groceries sits above it.
    ui.key('ArrowDown');
    ui.key('ArrowUp');
    ui.key('Enter');
    expect(control.value).toEqual(['rent', 'groceries']);

    ui.combobox().dispatchEvent(new FocusEvent('focusout', {bubbles: true, relatedTarget: null}));
    expect(control.touched).toBe(true);

    control.setValue(['groceries']);
    fixture.detectChanges();
    expect(ui.chips()).toEqual(['Groceries']);

    control.disable();
    fixture.detectChanges();
    expect((ui.combobox() as HTMLInputElement).disabled).toBe(true);

    fixture.destroy();
    overlayContainer.ngOnDestroy();
  });
});
