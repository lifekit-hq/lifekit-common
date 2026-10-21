/** The locale used when the caller passes none; apps pass their `LOCALE_ID`. */
export const DEFAULT_FORMAT_LOCALE = 'en-IE';

/** Options shared by money and plain numbers. */
export interface NumberDisplayOptions {
  /** A BCP 47 locale; CLDR decides symbol placement, separators and the minus sign. */
  locale?: string;
  /** A change rather than a level: always signed (`+12.00`, `-3.50`), zero unsigned. */
  delta?: boolean;
  /** Compact notation (`1.2M`). */
  compact?: boolean;
  /** Fixed fraction digits; by default the currency's own (2 for EUR, 0 for JPY). */
  fractionDigits?: number;
}

export interface MoneyDisplayOptions extends NumberDisplayOptions {
  /**
   * Every currency shown on the same screen. When two of them share a narrow symbol in the
   * locale (USD and CAD are both `$`), the amount shows its ISO code instead of the symbol.
   */
  screenCurrencies?: readonly string[];
}

export interface PlainNumberDisplayOptions extends NumberDisplayOptions {
  /** `value` is a ratio (0.023) shown as a percent (`2.3%`). */
  percent?: boolean;
}

type Amount = number | null | undefined;

function isAmount(value: Amount): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function narrowSymbol(currency: string, locale: string): string {
  const part = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
  })
    .formatToParts(0)
    .find(p => p.type === 'currency');
  return part?.value ?? currency;
}

/**
 * True when `currency` shares its narrow symbol with another currency in `screenCurrencies`, so
 * the symbol alone would be ambiguous on that screen.
 */
export function isCurrencySymbolAmbiguous(
  currency: string,
  screenCurrencies: readonly string[],
  locale: string = DEFAULT_FORMAT_LOCALE
): boolean {
  const code = currency.toUpperCase();
  const symbol = narrowSymbol(code, locale);
  return screenCurrencies.some(
    other => other.toUpperCase() !== code && narrowSymbol(other.toUpperCase(), locale) === symbol
  );
}

function sharedOptions(options: NumberDisplayOptions): Intl.NumberFormatOptions {
  return {
    signDisplay: options.delta ? 'exceptZero' : 'auto',
    notation: options.compact ? 'compact' : 'standard',
    ...(options.fractionDigits === undefined
      ? {}
      : {
          minimumFractionDigits: options.fractionDigits,
          maximumFractionDigits: options.fractionDigits,
        }),
  };
}

/**
 * Formats money the lifekit way (guardrails $1, $2): CLDR through `Intl` in the given locale,
 * the narrow symbol first (`₴18,981.48`, not `UAH 18,981.48`), the ISO code only when another
 * currency on the screen shares the symbol, and a sign on every non-zero delta.
 *
 * Framework-free and pure. Returns `''` for a missing or non-finite amount so templates can render
 * it unconditionally.
 */
export function formatMoney(
  amount: Amount,
  currency: string,
  options: MoneyDisplayOptions = {}
): string {
  if (!isAmount(amount) || !currency) {
    return '';
  }
  const locale = options.locale ?? DEFAULT_FORMAT_LOCALE;
  const code = currency.toUpperCase();
  const ambiguous = isCurrencySymbolAmbiguous(code, options.screenCurrencies ?? [], locale);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: code,
    currencyDisplay: ambiguous ? 'code' : 'narrowSymbol',
    ...sharedOptions(options),
  }).format(amount);
}

/**
 * Formats a plain number or a percent in the given locale, with the same delta and compact rules
 * as `formatMoney`. Returns `''` for a missing or non-finite value.
 */
export function formatNumber(value: Amount, options: PlainNumberDisplayOptions = {}): string {
  if (!isAmount(value)) {
    return '';
  }
  return new Intl.NumberFormat(options.locale ?? DEFAULT_FORMAT_LOCALE, {
    style: options.percent ? 'percent' : 'decimal',
    ...sharedOptions(options),
  }).format(value);
}
