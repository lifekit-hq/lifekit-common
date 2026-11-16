import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {CmnClipboardService} from '../../services/clipboard/clipboard.service';
import {COPY_FEEDBACK_MS, CopyButtonComponent} from './copy-button.component';

describe('CopyButtonComponent', () => {
  let fixture: ComponentFixture<CopyButtonComponent>;
  const copy = vi.fn<(text: string) => Promise<boolean>>();

  beforeEach(() => {
    vi.useFakeTimers();
    copy.mockReset().mockResolvedValue(true);
    TestBed.configureTestingModule({
      imports: [CopyButtonComponent],
      providers: [{provide: CmnClipboardService, useValue: {copy}}],
    });
    fixture = TestBed.createComponent(CopyButtonComponent);
    fixture.componentRef.setInput('text', 'secret');
    fixture.componentRef.setInput('label', 'Copy link');
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const button = (): HTMLButtonElement =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      'button'
    ) as HTMLButtonElement;

  async function press(): Promise<void> {
    button().click();
    await vi.advanceTimersByTimeAsync(0);
    fixture.detectChanges();
  }

  it('is idle at first, named by its label, with no feedback text', () => {
    expect(button().getAttribute('aria-label')).toBe('Copy link');
    expect(button().textContent?.trim()).toBe('');
  });

  it('shows Copied for two seconds, then returns to idle', async () => {
    await press();
    expect(copy).toHaveBeenCalledWith('secret');
    expect(button().textContent).toContain('Copied');
    expect(button().getAttribute('aria-label')).toBe('Copied');

    await vi.advanceTimersByTimeAsync(COPY_FEEDBACK_MS);
    fixture.detectChanges();
    expect(button().getAttribute('aria-label')).toBe('Copy link');
    expect(button().textContent?.trim()).toBe('');
  });

  it('shows Copy failed with the hand-copy hint when the copy does not work', async () => {
    copy.mockResolvedValue(false);
    await press();
    expect(button().textContent).toContain('Copy failed');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('cmn-button')?.getAttribute('title')
    ).toContain('copy it yourself');
  });

  it('restarts the two seconds when pressed again', async () => {
    await press();
    await vi.advanceTimersByTimeAsync(COPY_FEEDBACK_MS - 1);
    await press();
    await vi.advanceTimersByTimeAsync(COPY_FEEDBACK_MS - 1);
    fixture.detectChanges();
    expect(button().getAttribute('aria-label')).toBe('Copied');
  });
});
