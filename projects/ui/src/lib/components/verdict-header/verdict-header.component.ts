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
import {TagComponent, TagVariant} from '../tag/tag.component';

/**
 * A status's colour. It is the tag's vocabulary (the four status hues plus neutral), so the word
 * and its pills tint from the same roles and a seed re-tints both.
 */
export type VerdictTone = TagVariant;

/** The state of the thing: a word the app chooses, and the tone that colours it. */
export interface VerdictStatus {
  readonly tone: VerdictTone;
  /** The word itself; colour is never the only signal, so a status always has one. */
  readonly label: string;
}

/** A short fact beside the status word (a rating, a horizon, a count). */
export interface VerdictPill {
  readonly label: string;
  readonly tone?: VerdictTone;
}

/** How the price moved over the day. A move that rounds to zero in both figures reads as no change. */
export interface VerdictChange {
  /** A ratio (0.018 is shown as +1.80%), the library's convention for a percent. */
  readonly percent: number;
  /** The absolute move, in the price's currency when it has one. */
  readonly amount: number;
}

/** The pills that fit beside the word; a third would push the caveat off the first read. */
export const VERDICT_MAX_PILLS = 2;

const STATUS_TEXT: Record<VerdictTone, string> = {
  success: 'text-status-success',
  warning: 'text-status-warning',
  error: 'text-status-error',
  info: 'text-status-info',
  neutral: 'text-text-primary',
};

const PERCENT_FRACTION_DIGITS = 2;
const EMPTY_VALUE = '—';

@Component({
  selector: 'cmn-verdict-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, TagComponent],
  host: {class: 'block'},
  template: `
    <div class="flex flex-col gap-cmn-4 md:flex-row md:items-start md:justify-between">
      <div class="flex min-w-0 flex-col gap-cmn-2">
        <div class="flex flex-wrap items-center gap-x-cmn-4 gap-y-cmn-2">
          <p [class]="statusClasses()">{{ status().label }}</p>
          @if (visiblePills().length) {
            <ul class="m-0 flex list-none flex-wrap items-center gap-cmn-2 p-0">
              @for (pill of visiblePills(); track pill.label) {
                <li>
                  <cmn-tag [variant]="pill.tone ?? 'neutral'" size="lg">{{ pill.label }}</cmn-tag>
                </li>
              }
            </ul>
          }
        </div>
        @if (caveat()) {
          <p class="text-cmn-sm font-semibold text-text-primary">{{ caveat() }}</p>
        }
      </div>

      @if (showPrice()) {
        <div class="flex flex-col gap-cmn-2 md:items-end">
          <p class="font-headline text-cmn-2xl font-semibold tabular-nums text-text-primary">
            {{ displayPrice() }}
          </p>
          @if (changeText()) {
            <cmn-tag [variant]="changeTone()" size="lg">
              <span class="inline-flex items-center gap-cmn-1 tabular-nums">
                <cmn-icon [name]="changeIcon()" size="sm" />
                <span class="sr-only">{{ changeLabel() }}: </span>
                {{ changeText() }}
              </span>
            </cmn-tag>
          }
        </div>
      }
    </div>
  `,
})
export class VerdictHeaderComponent {
  private readonly locale = inject(LOCALE_ID);

  /** The state of the thing, as a tone and a word. The app owns the vocabulary. */
  public readonly status = input.required<VerdictStatus>();
  /** Up to two short facts beside the word; any more are not drawn. */
  public readonly pills = input<readonly VerdictPill[]>([]);
  /** The one line that qualifies the verdict, in bold under it. */
  public readonly caveat = input<string | null>(null);
  /**
   * The price opposite the verdict. A number is formatted in the app's `LOCALE_ID` through the
   * library formatter (money when `currency` is set); a string is shown as given. Leave it
   * `null` for a header with no price.
   */
  public readonly price = input<string | number | null>(null);
  /** ISO 4217 code for a numeric `price` and for the change's amount. */
  public readonly currency = input<string | null>(null);
  /** The day's move, drawn as one pill showing the percent and the amount together. */
  public readonly change = input<VerdictChange | null>(null);
  /** Read to assistive technology before the change ("Day change: +1.80% · +€3.20"). */
  public readonly changeLabel = input<string>('Day change');

  protected readonly statusClasses = computed(
    () => `m-0 break-words font-headline text-cmn-4xl font-bold ${STATUS_TEXT[this.status().tone]}`
  );

  protected readonly visiblePills = computed(() => this.pills().slice(0, VERDICT_MAX_PILLS));

  protected readonly showPrice = computed(() => this.price() !== null || this.change() !== null);

  protected readonly displayPrice = computed(() => {
    const price = this.price();
    if (typeof price === 'string') {
      return price;
    }
    const currency = this.currency();
    const formatted = currency
      ? formatMoney(price, currency, {locale: this.locale})
      : formatNumber(price, {locale: this.locale});
    return formatted || EMPTY_VALUE;
  });

  /** What the pill shows and the direction it shows: both come from the rounded, formatted values. */
  private readonly changeView = computed(() => {
    const change = this.change();
    if (!change) {
      return {text: '', direction: 0};
    }
    const currency = this.currency();
    const formatPercent = (value: number) =>
      formatNumber(value, {
        locale: this.locale,
        percent: true,
        delta: true,
        fractionDigits: PERCENT_FRACTION_DIGITS,
      });
    const formatAmount = (value: number) =>
      currency
        ? formatMoney(value, currency, {locale: this.locale, delta: true})
        : formatNumber(value, {locale: this.locale, delta: true});
    const percent = formatPercent(change.percent);
    const amount = formatAmount(change.amount);
    if (!percent || !amount) {
      return {text: '', direction: 0};
    }
    const amountDirection = amount === formatAmount(0) ? 0 : Math.sign(change.amount);
    const percentDirection = percent === formatPercent(0) ? 0 : Math.sign(change.percent);
    return {text: `${percent} · ${amount}`, direction: amountDirection || percentDirection};
  });

  protected readonly changeText = computed(() => this.changeView().text);

  protected readonly changeTone = computed<TagVariant>(() => {
    const direction = this.changeView().direction;
    if (direction === 0) {
      return 'neutral';
    }
    return direction > 0 ? 'success' : 'error';
  });

  protected readonly changeIcon = computed<LucideIconName>(() => {
    const direction = this.changeView().direction;
    if (direction === 0) {
      return 'Minus';
    }
    return direction > 0 ? 'TrendingUp' : 'TrendingDown';
  });
}
