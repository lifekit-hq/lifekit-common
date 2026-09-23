import {DialogConfig, DialogRef} from '@angular/cdk/dialog';
import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {CmnDialogConfig, type CmnDialogSize} from './dialog-config';
import {CmnDialogContainerComponent} from './dialog-container.component';

function makeConfig(overrides: Partial<CmnDialogConfig> = {}): CmnDialogConfig {
  const config = new CmnDialogConfig();
  Object.assign(config, overrides);
  return config;
}

describe('CmnDialogContainerComponent', () => {
  let fixture: ComponentFixture<CmnDialogContainerComponent>;
  let close: ReturnType<typeof vi.fn>;

  function setup(config: CmnDialogConfig): void {
    close = vi.fn();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [CmnDialogContainerComponent],
      providers: [
        {provide: DialogConfig, useValue: config},
        {provide: DialogRef, useValue: {close}},
      ],
    });
    fixture = TestBed.createComponent(CmnDialogContainerComponent);
    fixture.detectChanges();
  }

  function shell(): HTMLElement {
    return (fixture.nativeElement as HTMLElement).querySelector('section') as HTMLElement;
  }

  beforeEach(() => {
    setup(makeConfig());
  });

  it('marks the shell as a modal dialog', () => {
    expect(shell().getAttribute('role')).toBe('dialog');
    expect(shell().getAttribute('aria-modal')).toBe('true');
  });

  it('omits aria-label when none is configured', () => {
    expect(shell().getAttribute('aria-label')).toBeNull();
  });

  it('applies a configured aria-label', () => {
    setup(makeConfig({ariaLabel: 'Connect an account'}));
    expect(shell().getAttribute('aria-label')).toBe('Connect an account');
  });

  it('renders no header when the config carries no title', () => {
    expect((fixture.nativeElement as HTMLElement).querySelector('header')).toBeNull();
  });

  it('renders a titled header with a close button', () => {
    setup(makeConfig({title: 'Settings'}));
    expect((fixture.nativeElement as HTMLElement).querySelector('h2')?.textContent?.trim()).toBe(
      'Settings'
    );
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('button[aria-label="Close dialog"]')
    ).not.toBeNull();
  });

  it.each<[CmnDialogSize, string]>([
    ['sm', 'max-w-md'],
    ['md', 'max-w-xl'],
    ['lg', 'max-w-3xl'],
    ['full', 'h-[95vh]'],
  ])('applies the "%s" size classes', (size, expected) => {
    setup(makeConfig({title: 'Sized', size}));
    expect(shell().className).toContain(expected);
  });

  it('closes when the header close button is pressed', () => {
    setup(makeConfig({title: 'Settings'}));
    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('button[aria-label="Close dialog"]')
      ?.click();
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('ignores the close button when the dialog disables closing', () => {
    setup(makeConfig({title: 'Settings', disableClose: true}));
    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('button[aria-label="Close dialog"]')
      ?.click();
    expect(close).not.toHaveBeenCalled();
  });
});
