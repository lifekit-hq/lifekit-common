import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  signal,
} from '@angular/core';

import {CmnClipboardService} from '../../services/clipboard/clipboard.service';
import {ButtonComponent} from '../button/button.component';

export type CopyButtonState = 'idle' | 'copied' | 'failed';

/** How long "Copied" stays before the button returns to idle (Carbon's copy button). */
export const COPY_FEEDBACK_MS = 2000;

/**
 * An icon button that copies `text` and says so on itself, not in a toast (Carbon's copy button
 * and code-snippet feedback): the icon turns to a check and "Copied" shows for two seconds. A copy
 * that fails shows "Copy failed" the same way, and the clipboard service toasts the hand-copy hint.
 * Presses as 44px on a phone through `cmn-button`.
 */
@Component({
  selector: 'cmn-copy-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent],
  template: `
    <cmn-button
      [icon]="icon()"
      [aria-label]="ariaLabel()"
      (clicked)="copy()"
      variant="ghost"
      size="sm"
    >
      @if (state() !== 'idle') {
        {{ visibleLabel() }}
      }
    </cmn-button>
    <span class="sr-only" role="status">{{ state() === 'idle' ? '' : visibleLabel() }}</span>
  `,
})
export class CopyButtonComponent {
  private readonly clipboard = inject(CmnClipboardService);
  private timer: ReturnType<typeof setTimeout> | undefined;

  /** What is copied. */
  public readonly text = input.required<string>();
  /** Names the button while idle, e.g. "Copy invite link". */
  public readonly label = input('Copy');

  protected readonly state = signal<CopyButtonState>('idle');
  protected readonly icon = computed(() => (this.state() === 'copied' ? 'Check' : 'Copy'));
  protected readonly visibleLabel = computed(() =>
    this.state() === 'copied' ? 'Copied' : 'Copy failed'
  );
  protected readonly ariaLabel = computed(() =>
    this.state() === 'idle' ? this.label() : this.visibleLabel()
  );

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
  }

  protected async copy(): Promise<void> {
    const copied = await this.clipboard.copy(this.text());
    this.state.set(copied ? 'copied' : 'failed');
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.state.set('idle'), COPY_FEEDBACK_MS);
  }
}
