import {NgTemplateOutlet} from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  LOCALE_ID,
  type OnInit,
  output,
  signal,
} from '@angular/core';
import {
  CATEGORICAL_STEPS,
  type DonutSegment,
  type DonutSegmentClick,
} from '@lifekit-hq/charts-core';

import {isOutputObserved} from '../../chart-click/output-observed';
import {
  ASYNC_STATE_MIN_DISPLAY_MS,
  ASYNC_STATE_SHOW_DELAY_MS,
  AsyncStateComponent,
  type AsyncStateStatus,
} from '../async-state/async-state.component';
import {SkeletonComponent} from '../skeleton/skeleton.component';

/** One part of the whole: its label, its value in `currency`, and an optional CSS colour. */
export type AllocationSegment = DonutSegment;

/** The segment a click landed on: its index in `segments`, its label and its value. */
export type AllocationSegmentClick = DonutSegmentClick;

/** A segment as drawn: its share of the total and its formatted readouts. */
interface DrawnSegment {
  index: number;
  label: string;
  value: number;
  color: string;
  share: number;
  percent: string;
  amount: string;
  /** The row's accessible name: the readouts with pauses between them. */
  name: string;
}

/** Legend rows the skeleton draws before the first load, when the segment count is unknown. */
const DEFAULT_SKELETON_ROWS = 3;
/** A share under 1% keeps one significant digit, so a sliver never reads as "0%". */
const WHOLE_PERCENT = 0.01;

const ROW_BASE = 'flex w-full items-center gap-cmn-3 py-cmn-2 text-left text-cmn-sm';
const CLICKABLE_ROW =
  ' min-h-cmn-touch cursor-pointer rounded-cmn-sm hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus';

/** The charts-core categorical series step for input position `index`, as a token reference. */
function defaultColor(index: number): string {
  const step = CATEGORICAL_STEPS[index % CATEGORICAL_STEPS.length];
  return `var(--color-chart-series-${step})`;
}

/**
 * One horizontal bar split into segments sized by value, over a legend of label · percent ·
 * amount per segment: where a whole (a net worth, a budget) sits, at a glance.
 *
 * - Only segments with a positive value are drawn; with none, the empty state shows.
 * - Colours: each segment's `color` (a CSS colour, typically a fixed token such as
 *   `var(--color-asset-cash)`), else the charts-core categorical series in input order, as
 *   `cmn-donut-chart` does. Colour is never the only signal: every segment is named in the legend.
 * - States come from `cmn-async-state` with the calm-loading values on: no skeleton for a load
 *   under 200ms, a shown skeleton holds 400ms, a refresh keeps the bar on screen, and a failed
 *   refresh keeps it under the error banner.
 * - Bind `(segmentClick)` and the legend rows become buttons (touch-sized, keyboard-reachable)
 *   that emit the segment. The bar itself is too thin to be a target, so it stays a picture.
 * - Money and percent follow the app's `LOCALE_ID`, with the narrow currency symbol.
 */
@Component({
  selector: 'cmn-allocation-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncStateComponent, NgTemplateOutlet, SkeletonComponent],
  host: {class: 'block'},
  template: `
    <cmn-async-state
      [emptyMessage]="emptyMessage()"
      [errorMessage]="errorMessage()"
      [isEmpty]="drawn().length === 0"
      [minDisplay]="minDisplay"
      [retryable]="retryable()"
      [showDelay]="showDelay"
      [status]="status()"
      (retry)="retry.emit()"
      crossfade
      errorPlacement="above"
      keepContent
    >
      <div class="flex flex-col gap-cmn-3" skeleton>
        <cmn-skeleton class="block" className="rounded-cmn-full" height="0.75rem" />
        <div>
          @for (_ of skeletonRows(); track $index) {
            <!-- One text line tall (text-cmn-sm), so the rows keep their height when the legend lands -->
            <div [class]="rowClasses()">
              <cmn-skeleton height="0.75rem" width="0.75rem" />
              <span class="flex flex-1 items-center" style="height: 1.3125rem">
                <cmn-skeleton class="flex-1" height="0.875rem" width="45%" />
              </span>
              <cmn-skeleton height="0.875rem" width="4rem" />
            </div>
          }
        </div>
      </div>

      <div class="flex flex-col gap-cmn-3">
        <div
          [attr.aria-label]="summary()"
          class="flex h-cmn-3 w-full gap-0.5 overflow-hidden rounded-cmn-full"
          data-testid="allocation-bar"
          role="img"
        >
          @for (segment of drawn(); track segment.index) {
            <span
              [style.background-color]="segment.color"
              [style.flex-grow]="segment.share * 100"
              class="h-full min-w-0.5 basis-0"
            ></span>
          }
        </div>
        <ul [attr.aria-label]="label()">
          @for (segment of drawn(); track segment.index) {
            <li>
              @if (clickable()) {
                <button
                  [attr.aria-label]="segment.name"
                  [class]="rowClasses()"
                  (click)="select(segment)"
                  type="button"
                >
                  <ng-container
                    [ngTemplateOutletContext]="{$implicit: segment}"
                    [ngTemplateOutlet]="row"
                  />
                </button>
              } @else {
                <div [class]="rowClasses()">
                  <ng-container
                    [ngTemplateOutletContext]="{$implicit: segment}"
                    [ngTemplateOutlet]="row"
                  />
                </div>
              }
            </li>
          }
        </ul>
      </div>
    </cmn-async-state>

    <ng-template #row let-segment>
      <span
        [style.background-color]="segment.color"
        aria-hidden="true"
        class="size-cmn-3 shrink-0 rounded-cmn-sm"
      ></span>
      <span class="min-w-0 flex-1 break-words font-medium text-text-primary">{{
        segment.label
      }}</span>
      <span class="shrink-0 tabular-nums text-text-secondary">{{ segment.percent }}</span>
      <span class="shrink-0 font-medium tabular-nums text-text-primary">{{ segment.amount }}</span>
    </ng-template>
  `,
})
export class AllocationBarComponent implements OnInit {
  private readonly locale = inject(LOCALE_ID);
  private readonly money = computed(
    () =>
      new Intl.NumberFormat(this.locale, {
        style: 'currency',
        currency: this.currency(),
        currencyDisplay: 'narrowSymbol',
      })
  );

  public readonly segments = input<AllocationSegment[]>([]);
  /** ISO 4217 code the segment values are in. */
  public readonly currency = input<string>('USD');
  /** What the whole is ("Allocation", "Where it is"); prefixes the bar's accessible name. */
  public readonly label = input<string>('Allocation');
  /** The load state, as `cmn-async-state` takes it. `success` with no positive segment is empty. */
  public readonly status = input<AsyncStateStatus>('success');
  public readonly errorMessage = input<string>('');
  public readonly emptyMessage = input<string>('Nothing to show yet');
  /** Renders the built-in Retry button beside the error message; it emits `retry`. */
  public readonly retryable = input(false, {transform: booleanAttribute});

  /**
   * Emits the segment whose legend row was activated: its index in `segments`, label and value.
   * Binding it makes the legend rows buttons; unbound, the legend is plain text.
   */
  public readonly segmentClick = output<AllocationSegmentClick>();
  public readonly retry = output<void>();

  protected readonly showDelay = ASYNC_STATE_SHOW_DELAY_MS;
  protected readonly minDisplay = ASYNC_STATE_MIN_DISPLAY_MS;
  /** Whether the host bound `segmentClick`; listeners attach before the first change detection. */
  protected readonly clickable = signal(false);

  protected readonly drawn = computed<DrawnSegment[]>(() => {
    const positive = this.segments()
      .map((segment, index) => ({segment, index}))
      .filter(({segment}) => segment.value > 0);
    const total = positive.reduce((sum, {segment}) => sum + segment.value, 0);
    const money = this.money();
    return positive.map(({segment, index}) => {
      const share = segment.value / total;
      const percent = this.formatShare(share);
      const amount = money.format(segment.value);
      return {
        index,
        label: segment.label,
        value: segment.value,
        color: segment.color ?? defaultColor(index),
        share,
        percent,
        amount,
        name: `${segment.label}, ${percent}, ${amount}`,
      };
    });
  });

  /** The bar's text alternative: every segment's label and share, in drawing order. */
  protected readonly summary = computed(() => {
    const parts = this.drawn().map(s => `${s.label} ${s.percent}`);
    return `${this.label()}: ${parts.join(', ')}`;
  });

  protected readonly skeletonRows = computed(() =>
    Array.from({length: this.drawn().length || DEFAULT_SKELETON_ROWS})
  );

  protected readonly rowClasses = computed(() =>
    this.clickable() ? `${ROW_BASE}${CLICKABLE_ROW}` : ROW_BASE
  );

  public ngOnInit(): void {
    this.clickable.set(isOutputObserved(this.segmentClick));
  }

  protected select(segment: DrawnSegment): void {
    this.segmentClick.emit({index: segment.index, label: segment.label, value: segment.value});
  }

  private formatShare(share: number): string {
    const options: Intl.NumberFormatOptions =
      share < WHOLE_PERCENT
        ? {style: 'percent', maximumSignificantDigits: 1}
        : {style: 'percent', maximumFractionDigits: 0};
    return new Intl.NumberFormat(this.locale, options).format(share);
  }
}
