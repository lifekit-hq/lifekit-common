import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {beforeEach, describe, expect, it} from 'vitest';

import {
  STATUS_PAGE_COPY,
  StatusPageComponent,
  type StatusPagePreset,
} from './status-page.component';

const PRESETS: StatusPagePreset[] = ['signed-out', 'no-access', 'unreachable', 'not-found'];

describe('StatusPageComponent', () => {
  let fixture: ComponentFixture<StatusPageComponent>;
  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const buttons = (): HTMLButtonElement[] => Array.from(el().querySelectorAll('button'));

  function setup(preset: StatusPagePreset, inputs: Record<string, string> = {}): void {
    fixture = TestBed.createComponent(StatusPageComponent);
    fixture.componentRef.setInput('preset', preset);
    for (const [name, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(name, value);
    }
    fixture.detectChanges();
  }

  beforeEach(() => TestBed.configureTestingModule({imports: [StatusPageComponent]}));

  it.each(PRESETS)('%s shows its own title, lead and primary action', preset => {
    setup(preset);
    const copy = STATUS_PAGE_COPY[preset];
    expect(el().querySelector('h1')?.textContent?.trim()).toBe(copy.title);
    expect(el().querySelector('p')?.textContent?.trim()).toBe(copy.lead);
    expect(buttons()[0].textContent?.trim()).toBe(copy.primary);
    expect(el().getAttribute('data-preset')).toBe(preset);
  });

  it('shows a secondary action only where the preset has one or it is given', () => {
    setup('signed-out');
    expect(buttons().length).toBe(1);
    setup('not-found');
    expect(buttons().length).toBe(2);
    setup('unreachable', {secondaryLabel: 'Work offline'});
    expect(buttons()[1].textContent?.trim()).toBe('Work offline');
  });

  it('lets the page replace the words', () => {
    setup('no-access', {title: 'Not on the list', lead: 'Ask Denys.', primaryLabel: 'Switch'});
    expect(el().querySelector('h1')?.textContent?.trim()).toBe('Not on the list');
    expect(el().querySelector('p')?.textContent?.trim()).toBe('Ask Denys.');
    expect(buttons()[0].textContent?.trim()).toBe('Switch');
  });

  it('emits action and secondaryAction and navigates nothing itself', () => {
    setup('not-found');
    const calls: string[] = [];
    fixture.componentInstance.action.subscribe(() => calls.push('primary'));
    fixture.componentInstance.secondaryAction.subscribe(() => calls.push('secondary'));
    buttons()[0].click();
    buttons()[1].click();
    expect(calls).toEqual(['primary', 'secondary']);
  });
});
