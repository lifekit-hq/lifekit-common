import {NgTemplateOutlet} from '@angular/common';
import {ChangeDetectionStrategy, Component, input} from '@angular/core';

import {AlertComponent} from '../alert/alert.component';
import {SkeletonComponent} from '../skeleton/skeleton.component';

export type AsyncStateStatus = 'idle' | 'loading' | 'success' | 'error';

/**
 * Where the error alert goes. `replace` swaps the content out for the alert (a failed first
 * load). `above` keeps the content (or the empty state) rendered under a persistent banner, so a
 * failed refresh does not throw away what is already on screen.
 */
export type AsyncStateErrorPlacement = 'replace' | 'above';

const DEFAULT_SKELETON_ROWS = 3;

/**
 * Swaps a region between loading, error, empty and content. Three named slots replace the
 * built-in markup when a caller projects into them, and fall back to it otherwise (the same
 * contract as a Lit `<slot>` with fallback content):
 *
 * - `[skeleton]` — a placeholder shaped like the content, shown while `loading`.
 * - `[empty]` — a rich empty state (icon, sub-message, call to action), shown on an empty success.
 * - `[error-action]` — an action such as Retry, rendered inside the error alert.
 */
@Component({
  selector: 'cmn-async-state',
  imports: [AlertComponent, NgTemplateOutlet, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Angular projects light DOM into the FIRST outlet that matches it, so every selector below
  // has exactly one outlet. The default <ng-content /> appears in two branches and is therefore
  // a template: `#body` is stamped once by whichever branch is live.
  template: `
    @if (status() === 'loading') {
      <ng-content select="[skeleton]">
        <div class="space-y-cmn-3">
          @for (_ of skeletonArray; track $index) {
            <cmn-skeleton [height]="skeletonHeight()" />
          }
        </div>
      </ng-content>
    } @else if (status() === 'error') {
      <cmn-alert [class]="errorPlacement() === 'above' ? 'mb-cmn-6 block' : ''" variant="error">
        {{ errorMessage() || 'Something went wrong.' }}
        <ng-content select="[error-action]" />
      </cmn-alert>
      @if (errorPlacement() === 'above') {
        <ng-container [ngTemplateOutlet]="body" />
      }
    } @else {
      <ng-container [ngTemplateOutlet]="body" />
    }

    <ng-template #body>
      @if (status() !== 'idle' && isEmpty()) {
        <ng-content select="[empty]">
          <p class="py-cmn-6 text-center text-cmn-sm text-text-secondary">
            {{ emptyMessage() }}
          </p>
        </ng-content>
      } @else {
        <ng-content />
      }
    </ng-template>
  `,
})
export class AsyncStateComponent {
  public readonly status = input<AsyncStateStatus>('idle');
  public readonly errorMessage = input<string>('');
  public readonly errorPlacement = input<AsyncStateErrorPlacement>('replace');
  public readonly isEmpty = input<boolean>(false);
  public readonly emptyMessage = input<string>('No data available.');
  public readonly skeletonHeight = input<string>('1.25rem');
  public readonly skeletonRows = input<number>(DEFAULT_SKELETON_ROWS);

  protected get skeletonArray(): readonly undefined[] {
    return Array.from({length: this.skeletonRows()});
  }
}
