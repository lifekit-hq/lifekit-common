import {ChangeDetectionStrategy, Component, input, output} from '@angular/core';
import type {TimeInput} from '@lifekit-hq/core/format';

import {RelativeTimePipe} from '../../pipes/relative-time/relative-time.pipe';
import {type Nullable} from '../../types';
import {ButtonComponent} from '../button/button.component';
import {TagComponent} from '../tag/tag.component';

/**
 * One issued token or invite in a revoke list: its label, the visible prefix of the secret, when it
 * was issued and last used, and Revoke. A revoked row drops Revoke for a "Revoked" tag. The secret
 * itself is never here; `cmn-secret-reveal` shows it once at creation.
 */
@Component({
  selector: 'cmn-token-list-row',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent, TagComponent, RelativeTimePipe],
  template: `
    <div [class.opacity-60]="revoked()" class="flex items-center gap-cmn-3 py-cmn-3">
      <div class="min-w-0 flex-1">
        <p class="truncate font-label text-cmn-sm font-semibold text-text-primary">{{ label() }}</p>
        <p class="truncate text-cmn-xs text-text-secondary">
          @if (prefix()) {
            <code class="font-mono">{{ prefix() }}…</code> ·
          }
          Issued {{ issuedAt() | cmnRelativeTime: 'unknown' }} ·
          {{ lastUsedAt() ? 'Last used ' + (lastUsedAt() | cmnRelativeTime) : 'Never used' }}
        </p>
      </div>
      @if (revoked()) {
        <cmn-tag variant="neutral">Revoked</cmn-tag>
      } @else {
        <cmn-button
          [aria-label]="'Revoke ' + label()"
          (clicked)="revoke.emit()"
          variant="danger-ghost"
          size="sm"
        >
          Revoke
        </cmn-button>
      }
    </div>
  `,
})
export class TokenListRowComponent {
  public readonly label = input.required<string>();
  /** The first characters of the secret, enough to tell tokens apart. */
  public readonly prefix = input<Nullable<string>>(null);
  public readonly issuedAt = input.required<TimeInput>();
  public readonly lastUsedAt = input<Nullable<TimeInput>>(null);
  public readonly revoked = input(false);

  public readonly revoke = output<void>();
}
