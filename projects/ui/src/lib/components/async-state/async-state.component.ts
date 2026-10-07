import {NgTemplateOutlet} from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  LOCALE_ID,
  output,
} from '@angular/core';

import {type Nullable} from '../../types';
import {AlertComponent} from '../alert/alert.component';
import {EmptyStateComponent} from '../empty-state/empty-state.component';
import {type IconName} from '../icon/icon.component';
import {SkeletonComponent} from '../skeleton/skeleton.component';

export type AsyncStateStatus = 'idle' | 'loading' | 'success' | 'error';

/**
 * Where the error alert goes. `replace` swaps the content out for the alert (a failed first
 * load). `above` keeps the content (or the empty state) rendered under a persistent banner, so a
 * failed refresh does not throw away what is already on screen.
 */
export type AsyncStateErrorPlacement = 'replace' | 'above';

/** A moment in time the caller last synced: a `Date`, epoch milliseconds or an ISO string. */
export type AsyncStateSyncedAt = Date | number | string;

const DEFAULT_SKELETON_ROWS = 3;

const TIME_ONLY: Intl.DateTimeFormatOptions = {timeStyle: 'short'};
const DATE_AND_TIME: Intl.DateTimeFormatOptions = {dateStyle: 'medium', timeStyle: 'short'};

/**
 * The one state pattern for a region of a page: loading, empty, error and offline.
 *
 * Precedence, so an unhappy state is never mistaken for an empty one:
 *
 * 1. `loading` shows the skeleton. It is never empty and never an error.
 * 2. `offline` beats `error` and empty. With nothing trustworthy to show (a failed first load, an
 *    empty result, or an error under `errorPlacement="replace"`) it replaces the region with an
 *    offline panel; with content to show it sits above the content as a banner. Both carry the
 *    time of the last sync, so an offline cold start reads as "offline", never "no data".
 * 3. `error` shows the alert: in place of the content, or above it with `errorPlacement="above"`
 *    when there is content to keep. A failed load never falls through to the empty state.
 * 4. `isEmpty` after a successful load shows the empty state.
 * 5. Otherwise the projected content.
 *
 * Three named slots replace the built-in markup when a caller projects into them, and fall back
 * to it otherwise (the same contract as a Lit `<slot>` with fallback content):
 *
 * - `[skeleton]` — a placeholder shaped like the content, shown while `loading`.
 * - `[empty]` — a rich empty state (icon, sub-message, call to action), shown on an empty success.
 * - `[error-action]` — an action rendered next to the error or offline message.
 *
 * Set `retryable` to render the built-in Retry button next to the error or offline message; it
 * emits `retry`. Leave it off when the page projects its own `[error-action]`.
 */
@Component({
  selector: 'cmn-async-state',
  imports: [AlertComponent, EmptyStateComponent, NgTemplateOutlet, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Angular projects light DOM into the FIRST outlet that matches it, so every selector below
  // has exactly one outlet. The error action is a template because the alert and the offline
  // panel both show it; they are never live together.
  template: `
    @if (showOfflinePanel()) {
      <div role="status">
        <cmn-empty-state [subMessage]="syncedLabel()" icon="WifiOff" message="You're offline">
          <div cta class="flex flex-wrap items-center justify-center gap-cmn-2">
            <ng-container [ngTemplateOutlet]="actions" />
          </div>
        </cmn-empty-state>
      </div>
    } @else if (offline()) {
      <cmn-alert class="mb-cmn-6 block" icon="WifiOff" variant="info">
        You're offline. {{ syncedLabel() }}
        <ng-container [ngTemplateOutlet]="actions" />
      </cmn-alert>
    }

    @if (status() === 'loading') {
      <span class="sr-only" role="status">Loading</span>
      <ng-content select="[skeleton]">
        <div class="space-y-cmn-3">
          @for (_ of skeletonArray; track $index) {
            <cmn-skeleton [height]="skeletonHeight()" />
          }
        </div>
      </ng-content>
    }

    @if (showErrorAlert()) {
      <cmn-alert [class]="errorPlacement() === 'above' ? 'mb-cmn-6 block' : ''" variant="error">
        {{ errorMessage() || 'Something went wrong.' }}
        <ng-container [ngTemplateOutlet]="actions" />
      </cmn-alert>
    }

    @if (showBody()) {
      @if (showEmpty()) {
        <ng-content select="[empty]">
          <cmn-empty-state
            [icon]="emptyIcon()"
            [message]="emptyMessage()"
            [subMessage]="emptySubMessage()"
            variant="bare"
          />
        </ng-content>
      } @else {
        <ng-content />
      }
    }

    <ng-template #actions>
      <ng-content select="[error-action]" />
      @if (retryable()) {
        <button
          (click)="retry.emit()"
          class="min-h-cmn-touch min-w-cmn-touch cursor-pointer rounded-cmn-md border border-border-default px-cmn-3 text-cmn-sm font-medium text-text-primary hover:bg-surface-raised focus:outline-none focus:ring-2 focus:ring-border-focus focus:ring-offset-1"
          type="button"
        >
          Retry
        </button>
      }
    </ng-template>
  `,
})
export class AsyncStateComponent {
  private readonly locale = inject(LOCALE_ID);

  public readonly status = input<AsyncStateStatus>('idle');
  public readonly errorMessage = input<string>('');
  public readonly errorPlacement = input<AsyncStateErrorPlacement>('replace');
  public readonly isEmpty = input<boolean>(false);
  public readonly emptyMessage = input<string>('No data available.');
  public readonly emptySubMessage = input<Nullable<string>>(null);
  public readonly emptyIcon = input<Nullable<IconName>>(null);
  public readonly skeletonHeight = input<string>('1.25rem');
  public readonly skeletonRows = input<number>(DEFAULT_SKELETON_ROWS);
  /** The device has no network. Wins over `error` and empty; see the precedence above. */
  public readonly offline = input<boolean>(false);
  /** When the region last synced, shown while `offline`. `null` reads as "Not synced yet". */
  public readonly lastSynced = input<Nullable<AsyncStateSyncedAt>>(null);
  /** Renders the built-in Retry button beside the error or offline message. */
  public readonly retryable = input(false, {transform: booleanAttribute});

  public readonly retry = output<void>();

  /** Only a settled, successful load can be empty: an error never is. */
  protected readonly showEmpty = computed(() => this.status() === 'success' && this.isEmpty());

  /** The alert stands alone: a failed first load, or a failed refresh with nothing to keep. */
  protected readonly alertOnly = computed(
    () => this.status() === 'error' && (this.errorPlacement() === 'replace' || this.isEmpty())
  );

  /** True when there is real content on screen, so an offline notice can sit above it. */
  protected readonly hasContent = computed(
    () => this.status() !== 'loading' && !this.showEmpty() && !this.alertOnly()
  );

  protected readonly showOfflinePanel = computed(
    () => this.offline() && this.status() !== 'loading' && !this.hasContent()
  );

  protected readonly showErrorAlert = computed(() => this.status() === 'error' && !this.offline());

  protected readonly showBody = computed(
    () => this.status() !== 'loading' && !this.showOfflinePanel() && !this.alertOnly()
  );

  protected readonly syncedLabel = computed(() => {
    const raw = this.lastSynced();
    const at = raw === null ? null : new Date(raw);
    if (!at || Number.isNaN(at.getTime())) {
      return 'Not synced yet';
    }
    const sameDay = at.toDateString() === new Date().toDateString();
    const time = new Intl.DateTimeFormat(this.locale, sameDay ? TIME_ONLY : DATE_AND_TIME).format(
      at
    );
    return `Last synced ${time}`;
  });

  protected get skeletonArray(): readonly undefined[] {
    return Array.from({length: this.skeletonRows()});
  }
}
