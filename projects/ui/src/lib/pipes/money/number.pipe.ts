import {inject, LOCALE_ID, Pipe, type PipeTransform} from '@angular/core';
import {formatNumber, type PlainNumberDisplayOptions} from '@lifekit-hq/core/format';

/**
 * Renders a plain number or a percent in the app's `LOCALE_ID` through the library formatter, with
 * the same delta and compact rules as `cmnMoney` (guardrails $1).
 *
 * `{{ count | cmnNumber }}`, `{{ ratio | cmnNumber: {percent: true, delta: true} }}`. Returns
 * `fallback` (default `''`) for a missing or non-finite value.
 */
@Pipe({
  name: 'cmnNumber',
})
export class NumberDisplayPipe implements PipeTransform {
  private readonly locale = inject(LOCALE_ID);

  public transform(
    value: number | null | undefined,
    options: PlainNumberDisplayOptions = {},
    fallback = ''
  ): string {
    return formatNumber(value, {locale: this.locale, ...options}) || fallback;
  }
}
