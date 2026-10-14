import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {beforeEach, describe, expect, it} from 'vitest';

import {SegmentedComponent, type SegmentedOption} from './segmented.component';

const MODES: SegmentedOption[] = [
  {value: 'system', label: 'System'},
  {value: 'light', label: 'Light'},
  {value: 'dark', label: 'Dark'},
];

describe('SegmentedComponent', () => {
  let fixture: ComponentFixture<SegmentedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SegmentedComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SegmentedComponent);
    fixture.componentRef.setInput('options', MODES);
    fixture.componentRef.setInput('value', 'light');
    fixture.componentRef.setInput('label', 'Appearance');
    fixture.detectChanges();
  });

  function group(): HTMLElement {
    return (fixture.nativeElement as HTMLElement).querySelector(
      '[role="radiogroup"]'
    ) as HTMLElement;
  }

  function cells(): HTMLButtonElement[] {
    return Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('[role="radio"]')
    );
  }

  function press(cell: HTMLButtonElement, key: string): KeyboardEvent {
    const event = new KeyboardEvent('keydown', {key, bubbles: true, cancelable: true});
    cell.dispatchEvent(event);
    fixture.detectChanges();
    return event;
  }

  function checkedLabels(): string[] {
    return cells()
      .filter(c => c.getAttribute('aria-checked') === 'true')
      .map(c => c.textContent?.trim() ?? '');
  }

  it('renders a named radiogroup with one radio per option', () => {
    expect(group().getAttribute('aria-label')).toBe('Appearance');
    expect(cells().map(c => c.textContent?.trim())).toEqual(['System', 'Light', 'Dark']);
  });

  it('marks only the chosen option as checked', () => {
    expect(checkedLabels()).toEqual(['Light']);
  });

  it('leaves every cell unchecked for a value no option has', () => {
    fixture.componentRef.setInput('value', 'sepia');
    fixture.detectChanges();
    expect(checkedLabels()).toEqual([]);
  });

  it('puts only the chosen cell in the tab order', () => {
    expect(cells().map(c => c.getAttribute('tabindex'))).toEqual(['-1', '0', '-1']);
  });

  it('falls back to the first enabled cell as the tab stop when nothing is chosen', () => {
    fixture.componentRef.setInput('options', [{...MODES[0], disabled: true}, MODES[1], MODES[2]]);
    fixture.componentRef.setInput('value', '');
    fixture.detectChanges();
    expect(cells().map(c => c.getAttribute('tabindex'))).toEqual(['-1', '0', '-1']);
  });

  it('chooses a cell on click and reports it through value', () => {
    const emitted: string[] = [];
    fixture.componentInstance.value.subscribe(v => emitted.push(v));

    cells()[2].click();
    fixture.detectChanges();

    expect(emitted).toEqual(['dark']);
    expect(checkedLabels()).toEqual(['Dark']);
  });

  it('does not re-emit when the chosen cell is clicked again', () => {
    const emitted: string[] = [];
    fixture.componentInstance.value.subscribe(v => emitted.push(v));

    cells()[1].click();

    expect(emitted).toEqual([]);
  });

  it('moves the choice and the focus with the arrow keys, wrapping at the ends', () => {
    press(cells()[1], 'ArrowRight');
    expect(checkedLabels()).toEqual(['Dark']);
    expect(document.activeElement).toBe(cells()[2]);

    press(cells()[2], 'ArrowRight');
    expect(checkedLabels()).toEqual(['System']);

    press(cells()[0], 'ArrowLeft');
    expect(checkedLabels()).toEqual(['Dark']);
  });

  it('jumps to the ends with Home and End', () => {
    press(cells()[1], 'End');
    expect(checkedLabels()).toEqual(['Dark']);

    press(cells()[2], 'Home');
    expect(checkedLabels()).toEqual(['System']);
  });

  it('claims the keys it handles and leaves the rest alone', () => {
    expect(press(cells()[1], 'ArrowRight').defaultPrevented).toBe(true);
    expect(press(cells()[2], 'a').defaultPrevented).toBe(false);
  });

  it('skips disabled cells when moving by key', () => {
    fixture.componentRef.setInput('options', [MODES[0], {...MODES[1], disabled: true}, MODES[2]]);
    fixture.componentRef.setInput('value', 'system');
    fixture.detectChanges();

    press(cells()[0], 'ArrowRight');
    expect(checkedLabels()).toEqual(['Dark']);
  });

  it('blocks a disabled cell from being chosen by click', () => {
    fixture.componentRef.setInput('options', [MODES[0], {...MODES[1], disabled: true}, MODES[2]]);
    fixture.componentRef.setInput('value', 'system');
    fixture.detectChanges();
    const emitted: string[] = [];
    fixture.componentInstance.value.subscribe(v => emitted.push(v));

    expect(cells()[1].disabled).toBe(true);
    cells()[1].click();

    expect(emitted).toEqual([]);
  });

  it('disables the whole group', () => {
    const emitted: string[] = [];
    fixture.componentInstance.value.subscribe(v => emitted.push(v));
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();

    expect(group().getAttribute('aria-disabled')).toBe('true');
    expect(cells().every(c => c.disabled)).toBe(true);
    expect(cells().every(c => c.getAttribute('tabindex') === '-1')).toBe(true);

    cells()[0].click();
    press(cells()[1], 'ArrowRight');
    expect(emitted).toEqual([]);
  });

  it('drops aria-label when no label is given', () => {
    fixture.componentRef.setInput('label', '');
    fixture.detectChanges();
    expect(group().hasAttribute('aria-label')).toBe(false);
  });

  it('clips to its container and scrolls the row sideways inside it', () => {
    const host = fixture.nativeElement as HTMLElement;
    for (const cls of ['max-w-full', 'overflow-x-auto']) {
      expect(host.classList).toContain(cls);
    }
  });

  it('scrolls the chosen cell into view when the value changes', () => {
    const host = fixture.nativeElement as HTMLElement;
    host.style.cssText = 'display: block; width: 120px; overflow-x: auto';
    group().style.cssText = 'display: flex; width: max-content';
    cells().forEach(cell => (cell.style.cssText = 'white-space: nowrap; min-width: max-content'));
    fixture.componentRef.setInput('value', 'dark');
    fixture.detectChanges();

    const box = host.getBoundingClientRect();
    const chosen = cells()[2].getBoundingClientRect();
    expect(host.scrollWidth).toBeGreaterThan(host.clientWidth);
    expect(chosen.left).toBeGreaterThanOrEqual(box.left - 0.5);
    expect(chosen.right).toBeLessThanOrEqual(box.right + 0.5);
  });

  it('scrolls the chosen cell into view when the options change under an unchanged value', () => {
    const host = fixture.nativeElement as HTMLElement;
    host.style.cssText = 'display: block; width: 120px; overflow-x: auto';
    group().style.cssText = 'display: flex; width: max-content';
    cells().forEach(cell => (cell.style.cssText = 'white-space: nowrap; min-width: max-content'));
    fixture.componentRef.setInput('value', 'dark');
    fixture.detectChanges();
    host.scrollLeft = 0;

    fixture.componentRef.setInput('options', [...MODES]);
    fixture.detectChanges();

    const box = host.getBoundingClientRect();
    const chosen = cells()[2].getBoundingClientRect();
    expect(host.scrollWidth).toBeGreaterThan(host.clientWidth);
    expect(chosen.left).toBeGreaterThanOrEqual(box.left - 0.5);
    expect(chosen.right).toBeLessThanOrEqual(box.right + 0.5);
  });
});
