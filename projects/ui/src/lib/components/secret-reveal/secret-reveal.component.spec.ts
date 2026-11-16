import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {CmnClipboardService} from '../../services/clipboard/clipboard.service';
import {SecretRevealComponent} from './secret-reveal.component';

describe('SecretRevealComponent', () => {
  let fixture: ComponentFixture<SecretRevealComponent>;
  const copy = vi.fn<(text: string) => Promise<boolean>>();

  beforeEach(() => {
    copy.mockReset().mockResolvedValue(true);
    TestBed.configureTestingModule({
      imports: [SecretRevealComponent],
      providers: [{provide: CmnClipboardService, useValue: {copy}}],
    });
    fixture = TestBed.createComponent(SecretRevealComponent);
    fixture.componentRef.setInput('secret', 'tok_abc123');
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const buttonByText = (text: string): HTMLButtonElement | undefined =>
    [...root().querySelectorAll('button')].find(b => b.textContent?.includes(text));

  it('shows the secret in a mono block with the will-not-be-shown-again warning', () => {
    expect(root().querySelector('code')?.textContent).toBe('tok_abc123');
    expect(root().textContent).toContain('It will not be shown again.');
    expect(root().querySelector('[role="alert"]')).not.toBeNull();
  });

  it('copies the secret through the clipboard service', () => {
    root().querySelector<HTMLButtonElement>('cmn-copy-button button')?.click();
    expect(copy).toHaveBeenCalledExactlyOnceWith('tok_abc123');
  });

  it('emits done when Done is pressed', () => {
    const done = vi.fn();
    fixture.componentInstance.done.subscribe(done);
    buttonByText('Done')?.click();
    expect(done).toHaveBeenCalledOnce();
  });

  it('has no Share unless asked for', () => {
    vi.stubGlobal('navigator', {share: vi.fn()});
    expect(buttonByText('Share')).toBeUndefined();
  });

  it('hides Share where the browser cannot share, even when asked for', () => {
    vi.stubGlobal('navigator', {});
    fixture = TestBed.createComponent(SecretRevealComponent);
    fixture.componentRef.setInput('secret', 'x');
    fixture.componentRef.setInput('shareable', true);
    fixture.detectChanges();
    expect(buttonByText('Share')).toBeUndefined();
  });

  it('shares the secret when asked for and supported, and survives a dismissed share sheet', async () => {
    const share = vi.fn().mockRejectedValue(new DOMException('dismissed', 'AbortError'));
    vi.stubGlobal('navigator', {share});
    fixture = TestBed.createComponent(SecretRevealComponent);
    fixture.componentRef.setInput('secret', 'tok_abc123');
    fixture.componentRef.setInput('shareable', true);
    fixture.detectChanges();
    buttonByText('Share')?.click();
    await fixture.whenStable();
    expect(share).toHaveBeenCalledExactlyOnceWith({text: 'tok_abc123'});
  });
});
