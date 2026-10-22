import {InjectionToken} from '@angular/core';

import type {DateRange} from './date-range.component';

/**
 * One quick pick beside a `cmn-date-range`: a fixed range, or a resolver evaluated against today
 * (a local-time `Date` at the moment the presets are read).
 */
export interface DateRangePreset {
  label: string;
  range: DateRange | ((today: Date) => DateRange);
}

/** Today's date for date-range presets. Override it to pin "today" in tests and stories. */
export const DATE_RANGE_TODAY = new InjectionToken<() => Date>('DateRangeToday', {
  providedIn: 'root',
  factory: () => () => new Date(),
});

const ISO_PAD = 2;
const MONTH_OFFSET = 1;
const LAST_30_DAYS = 30;
const LAST_90_DAYS = 90;

/** The local calendar date as ISO `yyyy-MM-dd` (not `toISOString`, which shifts to UTC). */
export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + MONTH_OFFSET).padStart(ISO_PAD, '0');
  const day = String(date.getDate()).padStart(ISO_PAD, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** The last `days` days, today included. */
function lastDays(days: number): (today: Date) => DateRange {
  return today => ({
    from: toIsoDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - days + 1)),
    to: toIsoDate(today),
  });
}

/** The 1st of this month through today. */
export const THIS_MONTH_PRESET: DateRangePreset = {
  label: 'This month',
  range: today => ({
    from: toIsoDate(new Date(today.getFullYear(), today.getMonth(), 1)),
    to: toIsoDate(today),
  }),
};

/** The whole previous calendar month. */
export const LAST_MONTH_PRESET: DateRangePreset = {
  label: 'Last month',
  range: today => ({
    from: toIsoDate(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
    // Day 0 of this month is the last day of the previous one.
    to: toIsoDate(new Date(today.getFullYear(), today.getMonth(), 0)),
  }),
};

export const LAST_30_DAYS_PRESET: DateRangePreset = {
  label: 'Last 30 days',
  range: lastDays(LAST_30_DAYS),
};

export const LAST_90_DAYS_PRESET: DateRangePreset = {
  label: 'Last 90 days',
  range: lastDays(LAST_90_DAYS),
};

/** January 1st through today. */
export const YEAR_TO_DATE_PRESET: DateRangePreset = {
  label: 'Year to date',
  range: today => ({from: toIsoDate(new Date(today.getFullYear(), 0, 1)), to: toIsoDate(today)}),
};

/** The built-in presets, in reading order. Pass them as-is, pick some, or add your own. */
export const DATE_RANGE_PRESETS: readonly DateRangePreset[] = [
  THIS_MONTH_PRESET,
  LAST_MONTH_PRESET,
  LAST_30_DAYS_PRESET,
  LAST_90_DAYS_PRESET,
  YEAR_TO_DATE_PRESET,
];

/** The preset's range on `today`. */
export function resolveDateRangePreset(preset: DateRangePreset, today: Date): DateRange {
  return typeof preset.range === 'function' ? preset.range(today) : preset.range;
}
