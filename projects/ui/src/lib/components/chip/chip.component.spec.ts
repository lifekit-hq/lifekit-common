import {ChangeDetectionStrategy, Component} from '@angular/core';
import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {beforeEach, describe, expect, it} from 'vitest';

import {ChipComponent} from './chip.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ChipComponent],
  template: '<cmn-chip>3M</cmn-chip>',
})
class ChipHostComponent {}

describe('ChipComponent', () => {
  let fixture: ComponentFixture<ChipComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChipComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ChipComponent);
  });

  it('reflects the selected state via aria-pressed', () => {
    fixture.componentRef.setInput('selected', true);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    const button = element.querySelector('button');
    expect(button?.getAttribute('aria-pressed')).toBe('true');
  });

  it('presses as a touch-sized button below md around a pill that keeps its size', () => {
    fixture.componentRef.setInput('selected', true);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    const button = element.querySelector('button');
    expect(button?.classList).toContain('max-md:min-h-cmn-touch');
    expect(button?.classList).toContain('max-md:min-w-cmn-touch');
    const pill = button?.querySelector('span');
    expect(pill?.classList).toContain('py-cmn-1');
    expect(pill?.classList).toContain('bg-accent-default');
  });

  it('rings the pill on keyboard focus only, never after a mouse click', () => {
    fixture.detectChanges();
    const pill = (fixture.nativeElement as HTMLElement).querySelector('button > span');
    expect(pill?.classList).toContain('group-focus-visible:ring-2');
    expect(pill?.classList).not.toContain('group-focus:ring-2');
  });

  it('projects its label into the pill', () => {
    const host = TestBed.createComponent(ChipHostComponent);
    host.detectChanges();
    const pill = (host.nativeElement as HTMLElement).querySelector('button > span');
    expect(pill?.textContent?.trim()).toBe('3M');
  });

  it('emits clicked when the button is pressed', () => {
    let count = 0;
    fixture.componentInstance.clicked.subscribe(() => count++);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    const button = element.querySelector<HTMLButtonElement>('button');
    button?.click();
    expect(count).toBe(1);
  });
});

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ChipComponent],
  template: '<cmn-chip removable removeLabel="Remove Rent">Rent</cmn-chip>',
})
class RemovableChipHostComponent {}

describe('ChipComponent removable', () => {
  let fixture: ComponentFixture<ChipComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({imports: [ChipComponent]}).compileComponents();
    fixture = TestBed.createComponent(ChipComponent);
    fixture.componentRef.setInput('removable', true);
    fixture.componentRef.setInput('removeLabel', 'Remove Rent');
  });

  const buttons = (): HTMLButtonElement[] =>
    Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));

  it('renders the label beside a single named × button, not a toggle', () => {
    const host = TestBed.createComponent(RemovableChipHostComponent);
    host.detectChanges();
    const element = host.nativeElement as HTMLElement;
    const remove = element.querySelectorAll('button');

    expect(remove.length).toBe(1);
    expect(remove[0].getAttribute('aria-label')).toBe('Remove Rent');
    expect(remove[0].hasAttribute('aria-pressed')).toBe(false);
    expect(element.textContent?.trim()).toBe('Rent');
  });

  it('emits removed, not clicked, when the × is pressed', () => {
    let removed = 0;
    let clicked = 0;
    fixture.componentInstance.removed.subscribe(() => removed++);
    fixture.componentInstance.clicked.subscribe(() => clicked++);
    fixture.detectChanges();

    buttons()[0].click();

    expect(removed).toBe(1);
    expect(clicked).toBe(0);
  });

  it('grows the × to a touch-sized target below md', () => {
    fixture.detectChanges();

    expect(buttons()[0].classList).toContain('max-md:after:h-cmn-touch');
  });

  it('disables the × when disabled', () => {
    let removed = 0;
    fixture.componentInstance.removed.subscribe(() => removed++);
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();

    buttons()[0].click();

    expect(buttons()[0].disabled).toBe(true);
    expect(removed).toBe(0);
  });

  it('marks the pill aria-disabled when disabled so the label is exempt from contrast checks', () => {
    fixture.detectChanges();
    const pill = buttons()[0].parentElement as HTMLElement;
    expect(pill.hasAttribute('aria-disabled')).toBe(false);

    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();

    expect(pill.getAttribute('aria-disabled')).toBe('true');
  });
});

describe('ChipComponent disabled', () => {
  it('disables the toggle button', async () => {
    await TestBed.configureTestingModule({imports: [ChipComponent]}).compileComponents();
    const fixture = TestBed.createComponent(ChipComponent);
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();

    const button = (fixture.nativeElement as HTMLElement).querySelector('button');
    expect(button?.disabled).toBe(true);
  });
});
