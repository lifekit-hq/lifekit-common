import {inject, LOCALE_ID, Pipe, type PipeTransform} from '@angular/core';
import {formatMoney, type MoneyDisplayOptions} from '@lifekit-hq/core/format';

/**
 * Renders money in the app's `LOCALE_ID` through the library formatter (guardrails $1, $2): the
 * narrow symbol first (`₴18,981.48`), the ISO code when `screenCurrencies` share that symbol, and
 * a sign on every non-zero `delta`.
 *
 * `{{ amount | cmnMoney: 'EUR' }}`, `{{ change | cmnMoney: 'EUR' : {delta: true} }}`. Returns
 * `fallback` (default `''`) for a missing or non-finite amount.
 */
@Pipe({
  name: 'cmnMoney',
})
export class MoneyPipe implements PipeTransform {
  private readonly locale = inject(LOCALE_ID);

  public transform(
    amount: number | null | undefined,
    currency: string | null | undefined,
    options: MoneyDisplayOptions = {},
    fallback = ''
  ): string {
    return formatMoney(amount, currency ?? '', {locale: this.locale, ...options}) || fallback;
  }
}
