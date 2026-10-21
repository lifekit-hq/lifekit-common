import {LOCALE_ID} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {describe, expect, it} from 'vitest';

import {MoneyPipe} from './money.pipe';
import {NumberDisplayPipe} from './number.pipe';

/** CLDR separates with no-break and narrow no-break spaces; compare on plain spaces. */
const plain = (text: string): string => text.replace(/[\u00a0\u202f]/g, ' ');

function pipesFor(locale: string): {money: MoneyPipe; number: NumberDisplayPipe} {
  TestBed.configureTestingModule({
    providers: [MoneyPipe, NumberDisplayPipe, {provide: LOCALE_ID, useValue: locale}],
  });
  return {money: TestBed.inject(MoneyPipe), number: TestBed.inject(NumberDisplayPipe)};
}

describe('MoneyPipe', () => {
  it('formats in the app LOCALE_ID with the narrow symbol', () => {
    expect(pipesFor('en-IE').money.transform(18981.48, 'UAH')).toBe('₴18,981.48');
  });

  it('follows a different LOCALE_ID', () => {
    expect(plain(pipesFor('uk-UA').money.transform(18981.48, 'UAH'))).toBe('18 981,48 ₴');
  });

  it('lets an explicit locale option override LOCALE_ID', () => {
    expect(pipesFor('uk-UA').money.transform(5, 'EUR', {locale: 'en-IE'})).toBe('€5.00');
  });

  it('signs deltas', () => {
    const {money} = pipesFor('en-IE');
    expect(money.transform(12, 'EUR', {delta: true})).toBe('+€12.00');
    expect(money.transform(-12, 'EUR', {delta: true})).toBe('-€12.00');
  });

  it('shows the ISO code when same-symbol currencies share the screen', () => {
    const {money} = pipesFor('en-IE');
    expect(plain(money.transform(1, 'USD', {screenCurrencies: ['USD', 'CAD']}))).toBe('USD 1.00');
  });

  it('returns the fallback for a missing amount or currency', () => {
    const {money} = pipesFor('en-IE');
    expect(money.transform(null, 'EUR')).toBe('');
    expect(money.transform(undefined, 'EUR', {}, '-')).toBe('-');
    expect(money.transform(5, null, {}, '-')).toBe('-');
  });
});

describe('NumberDisplayPipe', () => {
  it('formats in the app LOCALE_ID', () => {
    expect(plain(pipesFor('uk-UA').number.transform(18981.48))).toBe('18 981,48');
  });

  it('formats a signed percent delta', () => {
    expect(
      pipesFor('en-IE').number.transform(0.023, {percent: true, delta: true, fractionDigits: 1})
    ).toBe('+2.3%');
  });

  it('returns the fallback for a missing value', () => {
    expect(pipesFor('en-IE').number.transform(null, {}, '-')).toBe('-');
  });
});
