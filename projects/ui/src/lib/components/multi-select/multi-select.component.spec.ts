import {OverlayContainer} from '@angular/cdk/overlay';
import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';

import type {SelectOption, SelectOptionValue} from '../select/select.component';
import {MultiSelectComponent} from './multi-select.component';

const OPTIONS: SelectOption[] = [
  {label: 'Groceries', value: 'groceries'},
  {label: 'Rent', value: 'rent'},
  {label: 'Travel', value: 'travel', disabled: true},
];

describe('MultiSelectComponent', () => {
  let fixture: ComponentFixture<MultiSelectComponent>;
  let overlayContainer: OverlayContainer;
  let seen: SelectOptionValue[][];

  beforeEach(async () => {
    await TestBed.configureTestingModule({imports: [MultiSelectComponent]}).compileComponents();
    fixture = TestBed.createComponent(MultiSelectComponent);
    overlayContainer = TestBed.inject(OverlayContainer);
    seen = [];
    fixture.componentInstance.registerOnChange(v => seen.push(v));
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
