/* eslint-disable @typescript-eslint/no-magic-numbers -- fixture data: dates and price shapes are the data */
import type {
  PriceMarker,
  PricePoint,
  PriceReferenceLine,
  PriceSeries,
} from '@lifekit-hq/charts-core';

/**
 * Deterministic price histories for the price block's stories, specs and screenshots: weekdays
 * only, ending on Friday 13 March 2026, so nothing depends on the clock and a baseline never moves.
 */

const DAY_MS = 86_400_000;
const FIRST_DAY = Date.UTC(2020, 2, 16);
export const PRICE_HISTORY_END = Date.UTC(2026, 2, 13);
const SATURDAY = 6;
const SUNDAY = 0;

interface Shape {
  /** The price on the first day. */
  start: number;
  /** Added per trading day. */
  drift: number;
  /** Swing (price units) of the slow cycle and the fast one. */
  slow: number;
  fast: number;
  /** Shifts the cycles so two series do not move together. */
  phase: number;
}

const SLOW_PERIOD = 45;
const FAST_PERIOD = 7;

function history(shape: Shape): PricePoint[] {
  const points: PricePoint[] = [];
  let tradingDay = 0;
  for (let time = FIRST_DAY; time <= PRICE_HISTORY_END; time += DAY_MS) {
    const weekday = new Date(time).getUTCDay();
    if (weekday !== SATURDAY && weekday !== SUNDAY) {
      const value =
        shape.start +
        shape.drift * tradingDay +
        shape.slow * Math.sin(tradingDay / SLOW_PERIOD + shape.phase) +
        shape.fast * Math.sin(tradingDay / FAST_PERIOD + shape.phase * 2);
      points.push({time, value: Math.round(value * 100) / 100});
      tradingDay++;
    }
  }
  return points;
}

/** An instrument that has climbed over the years. */
export const RISING: PriceSeries = {
  label: 'ACME',
  points: history({start: 82, drift: 0.09, slow: 14, fast: 3, phase: 0.4}),
};

/** An instrument that has slid over the years. */
export const FALLING: PriceSeries = {
  label: 'ACME',
  points: history({start: 240, drift: -0.07, slow: 12, fast: 3, phase: 1.1}),
};

/** An index to compare against: steadier, on its own scale. */
export const BENCHMARK: PriceSeries = {
  label: 'World index',
  points: history({start: 3100, drift: 1.4, slow: 160, fast: 25, phase: 2.2}),
};

/** A history too short for the longer periods (a recent listing). */
export const RECENT: PriceSeries = {
  label: 'NEWCO',
  points: RISING.points.slice(-45),
};

/** A holding's fills over the last two years: three buys and a sell, the first of them more than a year before the history ends. */
export const FILLS: readonly PriceMarker[] = [
  {time: Date.UTC(2024, 5, 12), kind: 'buy', label: '20 shares'},
  {time: Date.UTC(2025, 5, 11), kind: 'buy', label: '10 shares'},
  {time: Date.UTC(2025, 10, 5), kind: 'sell', label: '8 shares'},
  {time: Date.UTC(2026, 0, 14), kind: 'buy', label: '5 shares'},
];

/** The average cost of that holding. */
export const AVERAGE_COST: PriceReferenceLine = {value: 150, label: 'Average cost'};
