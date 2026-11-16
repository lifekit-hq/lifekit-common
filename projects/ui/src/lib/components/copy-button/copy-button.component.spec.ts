import {Clipboard} from '@angular/cdk/clipboard';
import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {
  CMN_COPY_FALLBACK_HINT,
  CmnClipboardService,
} from '../../services/clipboard/clipboard.service';
import {ToastService} from '../toast/toast.service';
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

  it('shows Copy failed, announced once, when the copy does not work', async () => {
    copy.mockResolvedValue(false);
    await press();
    expect(button().textContent).toContain('Copy failed');
    expect(button().getAttribute('aria-label')).toBe('Copy failed');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('[role="status"]')?.textContent
    ).toBe('Copy failed');
  });

  it('leaves the failure hint to the service and passes it no message of its own', async () => {
    copy.mockResolvedValue(false);
    await press();
    expect(copy).toHaveBeenCalledExactlyOnceWith('secret');
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

describe('CopyButtonComponent with the real clipboard service', () => {
  const error = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('navigator', {clipboard: undefined});
    error.mockReset();
    TestBed.configureTestingModule({
      imports: [CopyButtonComponent],
      providers: [
        {provide: Clipboard, useValue: {copy: () => false}},
        {provide: ToastService, useValue: {success: vi.fn(), error}},
      ],
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('toasts the hand-copy hint exactly once when both copy paths fail', async () => {
    const fixture = TestBed.createComponent(CopyButtonComponent);
    fixture.componentRef.setInput('text', 'secret');
    fixture.detectChanges();
    (fixture.nativeElement as HTMLElement).querySelector('button')?.click();
    await vi.advanceTimersByTimeAsync(0);
    fixture.detectChanges();
    expect(error).toHaveBeenCalledExactlyOnceWith(CMN_COPY_FALLBACK_HINT);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Copy failed');
  });
});
