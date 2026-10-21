import {formatMoney, formatNumber, isCurrencySymbolAmbiguous} from './money';

/** CLDR separates with no-break and narrow no-break spaces; compare on plain spaces. */
const plain = (text: string): string => text.replace(/[\u00a0\u202f]/g, ' ');

describe('formatMoney', () => {
  it.each<[string, number, string, string]>([
    ['en-IE', 18981.48, 'EUR', '€18,981.48'],
    ['en-IE', 18981.48, 'UAH', '₴18,981.48'],
    ['en-IE', -1234.5, 'USD', '-$1,234.50'],
    ['en-IE', 1234, 'JPY', '¥1,234'],
    ['uk-UA', 18981.48, 'EUR', '18 981,48 €'],
    ['uk-UA', 18981.48, 'UAH', '18 981,48 ₴'],
  ])('formats in %s with the narrow symbol: %s %s', (locale, amount, currency, expected) => {
    expect(plain(formatMoney(amount, currency, {locale}))).toBe(expected);
  });

  it('accepts a lower-case currency code', () => {
    expect(formatMoney(5, 'eur', {locale: 'en-IE'})).toBe('€5.00');
  });

  describe('deltas (guardrails $2)', () => {
    it.each<[string, number, string]>([
      ['en-IE', 12, '+€12.00'],
      ['en-IE', -3.5, '-€3.50'],
      ['en-IE', 0, '€0.00'],
      ['uk-UA', 12, '+12,00 €'],
      ['uk-UA', -3.5, '-3,50 €'],
    ])('signs a non-zero delta in %s: %s', (locale, amount, expected) => {
      expect(plain(formatMoney(amount, 'EUR', {locale, delta: true}))).toBe(expected);
    });

    it('leaves a level unsigned', () => {
      expect(formatMoney(12, 'EUR', {locale: 'en-IE'})).toBe('€12.00');
    });
  });

  describe('same-symbol currencies on one screen (guardrails $2)', () => {
    it.each<[string, string, string]>([
      ['en-IE', 'USD', 'USD 1,234.50'],
      ['en-IE', 'CAD', 'CAD 1,234.50'],
      ['uk-UA', 'USD', '1 234,50 USD'],
    ])('shows the ISO code in %s for %s', (locale, currency, expected) => {
      const screenCurrencies = ['USD', 'CAD', 'EUR'];
      expect(plain(formatMoney(1234.5, currency, {locale, screenCurrencies}))).toBe(expected);
    });

    it('keeps the symbol for a currency whose symbol is unique on the screen', () => {
      expect(
        formatMoney(5, 'EUR', {locale: 'en-IE', screenCurrencies: ['USD', 'CAD', 'EUR']})
      ).toBe('€5.00');
    });

    it('detects ambiguity per locale', () => {
      expect(isCurrencySymbolAmbiguous('USD', ['USD', 'CAD'], 'en-IE')).toBe(true);
      expect(isCurrencySymbolAmbiguous('USD', ['USD', 'EUR'], 'en-IE')).toBe(false);
      expect(isCurrencySymbolAmbiguous('USD', ['USD'], 'en-IE')).toBe(false);
    });

    it('builds no formatter to check ambiguity when no other currency is on the screen', () => {
      const numberFormat = vi.spyOn(Intl, 'NumberFormat');
      try {
        expect(isCurrencySymbolAmbiguous('USD', [], 'en-IE')).toBe(false);
        expect(isCurrencySymbolAmbiguous('USD', ['usd', 'USD'], 'en-IE')).toBe(false);
        expect(numberFormat).not.toHaveBeenCalled();
      } finally {
        numberFormat.mockRestore();
      }
    });
  });

  it('formats compact amounts', () => {
    expect(formatMoney(1_234_567, 'EUR', {locale: 'en-IE', compact: true})).toBe('€1.2M');
  });

  it('honours fixed fraction digits', () => {
    expect(formatMoney(1234.5, 'EUR', {locale: 'en-IE', fractionDigits: 0})).toBe('€1,235');
  });

  it.each([null, undefined, Number.NaN, Number.POSITIVE_INFINITY])(
    'returns an empty string for %s',
    value => {
      expect(formatMoney(value, 'EUR')).toBe('');
    }
  );

  it('returns an empty string without a currency', () => {
    expect(formatMoney(5, '')).toBe('');
  });
});

describe('formatNumber', () => {
  it.each<[string, number, string]>([
    ['en-IE', 18981.48, '18,981.48'],
    ['uk-UA', 18981.48, '18 981,48'],
  ])('groups and separates in %s', (locale, value, expected) => {
    expect(plain(formatNumber(value, {locale}))).toBe(expected);
  });

  it('formats a signed percent delta', () => {
    expect(
      formatNumber(0.023, {locale: 'en-IE', percent: true, delta: true, fractionDigits: 1})
    ).toBe('+2.3%');
  });

  it('formats compact numbers', () => {
    expect(formatNumber(1_234_567, {locale: 'en-IE', compact: true})).toBe('1.2M');
  });

  it('returns an empty string for a missing value', () => {
    expect(formatNumber(null)).toBe('');
  });
});
