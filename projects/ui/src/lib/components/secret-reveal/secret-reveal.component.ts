import {ChangeDetectionStrategy, Component, computed, input, output} from '@angular/core';

import {AlertComponent} from '../alert/alert.component';
import {ButtonComponent} from '../button/button.component';
import {CopyButtonComponent} from '../copy-button/copy-button.component';

/**
 * A secret shown exactly once, right after it is created (Carbon's code snippet inside an inline
 * notification): a warning that it will not be shown again, the secret in a mono block with Copy,
 * an optional Share and Done. The host owns where it lives: inline on desktop, or as the body of a
 * bottom sheet on a phone. The secret is never stored here, so Done is the host's cue to drop it.
 */
@Component({
  selector: 'cmn-secret-reveal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AlertComponent, ButtonComponent, CopyButtonComponent],
  template: `
    <cmn-alert [title]="title()" variant="warning">
      <p class="text-cmn-sm text-text-secondary">{{ warning() }}</p>
      <div
        class="mt-cmn-3 flex items-center gap-cmn-2 rounded-cmn-role-inset border border-border-subtle bg-surface-raised ps-cmn-3"
      >
        <code
          class="min-w-0 flex-1 select-all break-all py-cmn-2 font-mono text-cmn-sm text-text-primary"
          >{{ secret() }}</code
        >
        <cmn-copy-button [text]="secret()" [label]="copyLabel()" />
      </div>
      <div class="mt-cmn-3 flex flex-wrap justify-end gap-cmn-2">
        @if (canShare()) {
          <cmn-button (clicked)="share()" variant="tertiary" size="sm" icon="Share">
            Share
          </cmn-button>
        }
        <cmn-button (clicked)="done.emit()" size="sm">Done</cmn-button>
      </div>
    </cmn-alert>
  `,
})
export class SecretRevealComponent {
  /** The secret, in the clear. Held only while this is on screen. */
  public readonly secret = input.required<string>();
  public readonly title = input('Copy this now');
  public readonly warning = input('It will not be shown again.');
  /** Names the copy button, e.g. "Copy token". */
  public readonly copyLabel = input('Copy secret');
  /** Offers Share where the browser has `navigator.share`; hidden elsewhere. */
  public readonly shareable = input(false);

  /** The user has the secret and is finished; the host drops it. */
  public readonly done = output<void>();

  protected readonly canShare = computed(
    () => this.shareable() && typeof navigator !== 'undefined' && 'share' in navigator
  );

  protected async share(): Promise<void> {
    try {
      await navigator.share({text: this.secret()});
    } catch {
      // Dismissing the share sheet rejects with AbortError; the secret is still on screen.
    }
  }
}
