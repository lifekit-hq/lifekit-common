import {NgTemplateOutlet} from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  LOCALE_ID,
  output,
  signal,
  untracked,
} from '@angular/core';

import {type Nullable} from '../../types';
import {AlertComponent} from '../alert/alert.component';
import {EmptyStateComponent} from '../empty-state/empty-state.component';
import {type IconName} from '../icon/icon.component';
import {SkeletonComponent, type SkeletonShape} from '../skeleton/skeleton.component';

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

/**
 * The calm-loading values the standard recommends: no indicator for a load under 200ms, and once
 * one shows it stays at least 400ms, so a fast load never flashes a skeleton. Pass them to
 * `showDelay` and `minDisplay`; both default to 0 (show at once, hide at once).
 */
export const ASYNC_STATE_SHOW_DELAY_MS = 200;
export const ASYNC_STATE_MIN_DISPLAY_MS = 400;

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
 * Calm loading, all opt-in so a caller that sets none of it behaves as before:
 *
 * - `keepContent` keeps the content on screen, dimmed, while a refresh loads (only once there
 *   is content to keep; a first load still shows the skeleton).
 * - `showDelay` holds the loading indicator back so a quick load shows none; until it shows, the
 *   content already on screen stays put. `minDisplay` keeps an indicator that has shown up for at
 *   least that long, so it never flashes.
 * - `crossfade` fades the content in when it replaces the skeleton (or nothing) during the
 *   component's lifetime. Content already there at the first render (a revisit whose store kept
 *   its data) paints at full opacity.
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

    @if (showSkeleton()) {
      <span class="sr-only" role="status">Loading</span>
      <ng-content select="[skeleton]">
        @if (skeletonShape(); as shape) {
          <cmn-skeleton [count]="skeletonRows()" [shape]="shape" />
        } @else {
          <div class="space-y-cmn-3">
            @for (_ of skeletonArray; track $index) {
              <cmn-skeleton [height]="skeletonHeight()" />
            }
          </div>
        }
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
      } @else if (wrapBody()) {
        <div [attr.aria-busy]="dimmed() ? 'true' : null" [class]="bodyClasses()">
          <ng-container [ngTemplateOutlet]="content" />
        </div>
        @if (dimmed()) {
          <span class="sr-only" role="status">Refreshing</span>
        }
      } @else {
        <ng-container [ngTemplateOutlet]="content" />
      }
    }

    <ng-template #content><ng-content /></ng-template>

    <ng-template #actions>
      <ng-content select="[error-action]" />
      @if (retryable()) {
        <button
          (click)="retry.emit()"
          class="min-h-cmn-touch min-w-cmn-touch cursor-pointer rounded-cmn-md border border-border-strong px-cmn-3 text-cmn-sm font-medium text-text-primary hover:bg-surface-raised focus:outline-none focus:ring-2 focus:ring-border-focus focus:ring-offset-1"
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
  private readonly destroyRef = inject(DestroyRef);

  /** True once the loading indicator has been allowed to show (only used with a delay or minimum). */
  private readonly gateOpen = signal(false);
  /** Whether the last settled view was real content, so a refresh has something to keep. */
  private readonly hadContent = signal(false);
  /** The content was off screen at some point, so its next arrival fades in under `crossfade`. */
  private readonly contentWasAbsent = signal(false);
  private showTimer: ReturnType<typeof setTimeout> | null = null;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private shownAt = 0;

  private readonly gated = computed(() => this.showDelay() > 0 || this.minDisplay() > 0);

  /** The status says loading, or a shown indicator is still being held for its minimum time. */
  private readonly busy = computed(
    () =>
      this.status() === 'loading' || (this.gated() && this.gateOpen() && this.status() !== 'error')
  );

  /** The loading indicator is allowed on screen: at once, or once the delay has passed. */
  private readonly indicating = computed(() =>
    this.gated() ? this.gateOpen() : this.status() === 'loading'
  );

  /** The previous content is kept (dimmed or not) rather than swapped for the skeleton. */
  private readonly keeping = computed(() => this.keepContent() && this.hadContent());

  /** A settled view with a body to show: not loading, not replaced by the offline panel or alert. */
  private readonly settledBody = computed(
    () => !this.busy() && !this.showOfflinePanel() && !this.alertOnly()
  );

  /** The projected content is on screen (inside the wrapper or not). */
  private readonly contentShown = computed(() => this.showBody() && !this.showEmpty());

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

  /** Keeps the content on screen, dimmed, while a refresh loads; a first load still shows the skeleton. */
  public readonly keepContent = input(false, {transform: booleanAttribute});
  /** Milliseconds a load must last before any loading indicator shows. 0 shows it at once. */
  public readonly showDelay = input<number>(0);
  /** Milliseconds a shown loading indicator stays up, so it never flashes. 0 hides it at once. */
  public readonly minDisplay = input<number>(0);
  /** Fades the content in when it replaces the skeleton; content there at first render does not fade. */
  public readonly crossfade = input(false, {transform: booleanAttribute});
  /** Draws the loading placeholder as a `cmn-skeleton` preset (`skeletonRows` rows) instead of bars. */
  public readonly skeletonShape = input<SkeletonShape | null>(null);

  public readonly retry = output<void>();

  protected readonly showSkeleton = computed(
    () => this.busy() && this.indicating() && !this.keeping()
  );

  /** Content kept on screen during a refresh: dimmed once the indicator shows. */
  protected readonly dimmed = computed(
    () => this.status() === 'loading' && this.keeping() && this.indicating()
  );

  protected readonly wrapBody = computed(() => this.keepContent() || this.crossfade());

  protected readonly bodyClasses = computed(() => {
    const motion =
      'transition-opacity duration-cmn-short ease-cmn-standard motion-reduce:transition-none';
    const fade = this.crossfade() && this.contentWasAbsent() ? ' animate-cmn-fade-in' : '';
    return `${motion}${fade}${this.dimmed() ? ' opacity-60' : ''}`;
  });

  /** Only a settled, successful load can be empty: an error never is. */
  protected readonly showEmpty = computed(() => this.status() === 'success' && this.isEmpty());

  /** The alert stands alone: a failed first load, or a failed refresh with nothing to keep. */
  protected readonly alertOnly = computed(
    () => this.status() === 'error' && (this.errorPlacement() === 'replace' || this.isEmpty())
  );

  /** True when there is real content on screen, so an offline notice can sit above it. */
  protected readonly hasContent = computed(
    () => !this.busy() && !this.showEmpty() && !this.alertOnly()
  );

  protected readonly showOfflinePanel = computed(
    () => this.offline() && !this.busy() && !this.hasContent()
  );

  protected readonly showErrorAlert = computed(() => this.status() === 'error' && !this.offline());

  /**
   * The body is on screen when settled, and during a refresh (or the hold after one) while there
   * is previous content to keep: before the indicator's delay has passed, and with `keepContent`.
   */
  protected readonly showBody = computed(
    () =>
      this.settledBody() ||
      (this.hadContent() &&
        !this.showOfflinePanel() &&
        !this.alertOnly() &&
        (this.status() === 'loading'
          ? this.keepContent() || !this.indicating()
          : this.keepContent()))
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

  constructor() {
    effect(() => {
      const loading = this.status() === 'loading';
      const delay = this.showDelay();
      const minimum = this.minDisplay();
      untracked(() => {
        this.advanceGate(loading, delay, minimum);
      });
    });

    // Remember whether the last settled view was real content, for `keepContent`.
    effect(() => {
      const settled = this.status() !== 'idle' && this.settledBody() && !this.showEmpty();
      if (!this.busy()) {
        untracked(() => {
          this.hadContent.set(settled);
        });
      }
    });

    // Arm the crossfade once the content has been off screen (a skeleton, an empty state, an
    // alert), so only content that replaces something fades; content at first render does not.
    effect(() => {
      if (!this.contentShown()) {
        untracked(() => {
          this.contentWasAbsent.set(true);
        });
      }
    });

    this.destroyRef.onDestroy(() => {
      this.clearTimers();
    });
  }

  /** Opens the gate once a load outlasts `delay`, and closes it once `minimum` has passed. */
  private advanceGate(loading: boolean, delay: number, minimum: number): void {
    if (delay <= 0 && minimum <= 0) {
      this.clearTimers();
      this.gateOpen.set(false);
      return;
    }
    if (loading) {
      this.clearHideTimer();
      if (!this.gateOpen() && this.showTimer === null) {
        this.showTimer = setTimeout(
          () => {
            this.showTimer = null;
            this.shownAt = Date.now();
            this.gateOpen.set(true);
          },
          Math.max(0, delay)
        );
      }
      return;
    }
    this.clearShowTimer();
    if (this.gateOpen()) {
      const wait = Math.max(0, minimum - (Date.now() - this.shownAt));
      this.hideTimer = setTimeout(() => {
        this.hideTimer = null;
        this.gateOpen.set(false);
      }, wait);
    }
  }

  private clearShowTimer(): void {
    if (this.showTimer !== null) {
      clearTimeout(this.showTimer);
      this.showTimer = null;
    }
  }

  private clearHideTimer(): void {
    if (this.hideTimer !== null) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }

  private clearTimers(): void {
    this.clearShowTimer();
    this.clearHideTimer();
  }

  protected get skeletonArray(): readonly undefined[] {
    return Array.from({length: this.skeletonRows()});
  }
}
