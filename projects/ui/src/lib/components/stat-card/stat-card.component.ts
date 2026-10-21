import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  LOCALE_ID,
} from '@angular/core';
import {formatMoney, formatNumber} from '@lifekit-hq/core/format';

import {IconComponent, LucideIconName} from '../icon/icon.component';
import {SkeletonComponent} from '../skeleton/skeleton.component';

const POSITIVE_DELTA_CLASSES = 'text-gain';
const NEGATIVE_DELTA_CLASSES = 'text-loss';
const NEUTRAL_DELTA_CLASSES = 'text-text-secondary';
const EMPTY_VALUE = '—';

@Component({
  selector: 'cmn-stat-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, SkeletonComponent],
  template: `
    <div
      class="flex flex-col gap-cmn-2 rounded-cmn-lg border border-border-default bg-surface-card p-cmn-4"
    >
      <div class="flex items-center justify-between gap-cmn-2">
        <span
          title="{{ label() }}"
          class="min-w-0 truncate font-label text-cmn-xs font-semibold text-text-secondary"
        >
          {{ label() }}
        </span>
        @if (icon()) {
          <cmn-icon [name]="icon()!" size="sm" class="text-text-secondary" />
        }
      </div>

      @if (loading()) {
        <cmn-skeleton height="1.875rem" width="75%" />
        @if (delta() !== null) {
          <div class="flex items-center gap-1">
            <cmn-skeleton height="1rem" width="50%" />
          </div>
        }
      } @else {
        <!-- A long value wraps rather than truncating: an ellipsis would hide digits of an amount -->
        <span class="break-words text-cmn-2xl font-semibold tabular-nums text-text-primary">
          {{ displayValue() }}
        </span>
        @if (delta() !== null) {
          <div class="flex items-center gap-1">
            <cmn-icon [name]="deltaIcon()" [class]="deltaClasses()" size="sm" />
            <span [class]="deltaClasses()" class="font-label text-cmn-xs font-medium">
              {{ deltaLabel() }}
            </span>
          </div>
        }
      }
    </div>
  `,
})
export class StatCardComponent {
  private readonly locale = inject(LOCALE_ID);

  public readonly label = input.required<string>();
  /**
   * A number is formatted in the app's `LOCALE_ID` through the library formatter (guardrails $1):
   * money when `currency` is set, a plain number otherwise. A string is shown as given.
   */
  public readonly value = input<string | number | null>(EMPTY_VALUE);
  /** ISO 4217 code for a numeric `value`; ignored for a string value. */
  public readonly currency = input<string | null>(null);
  public readonly delta = input<number | null>(null);
  public readonly deltaLabel = input<string>('');
  public readonly icon = input<LucideIconName | null>(null);
  public readonly loading = input<boolean>(false);

  public readonly displayValue = computed(() => {
    const value = this.value();
    if (typeof value === 'string') {
      return value;
    }
    const currency = this.currency();
    const formatted = currency
      ? formatMoney(value, currency, {locale: this.locale})
      : formatNumber(value, {locale: this.locale});
    return formatted || EMPTY_VALUE;
  });

  public readonly deltaClasses = computed(() => {
    const d = this.delta();
    if (d === null || d === 0) {
      return NEUTRAL_DELTA_CLASSES;
    }
    return d > 0 ? POSITIVE_DELTA_CLASSES : NEGATIVE_DELTA_CLASSES;
  });

  public readonly deltaIcon = computed<LucideIconName>(() => {
    const d = this.delta();
    if (d === null || d === 0) {
      return 'Minus';
    }
    return d > 0 ? 'TrendingUp' : 'TrendingDown';
  });
}
