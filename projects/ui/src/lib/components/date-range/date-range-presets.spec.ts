import {describe, expect, it} from 'vitest';

import {
  DATE_RANGE_PRESETS,
  type DateRangePreset,
  resolveDateRangePreset,
  toIsoDate,
} from './date-range-presets';

describe('date range presets', () => {
  const resolveAll = (today: Date): Record<string, unknown> =>
    Object.fromEntries(DATE_RANGE_PRESETS.map(p => [p.label, resolveDateRangePreset(p, today)]));

  it('resolves the built-ins against a mid-year today', () => {
    expect(resolveAll(new Date(2026, 9, 22))).toEqual({
      'This month': {from: '2026-10-01', to: '2026-10-22'},
      'Last month': {from: '2026-09-01', to: '2026-09-30'},
      'Last 30 days': {from: '2026-09-23', to: '2026-10-22'},
      'Last 90 days': {from: '2026-07-25', to: '2026-10-22'},
      'Year to date': {from: '2026-01-01', to: '2026-10-22'},
    });
  });

  it('crosses the year boundary in January', () => {
    expect(resolveAll(new Date(2026, 0, 5))).toEqual({
      'This month': {from: '2026-01-01', to: '2026-01-05'},
      'Last month': {from: '2025-12-01', to: '2025-12-31'},
      'Last 30 days': {from: '2025-12-07', to: '2026-01-05'},
      'Last 90 days': {from: '2025-10-08', to: '2026-01-05'},
      'Year to date': {from: '2026-01-01', to: '2026-01-05'},
    });
  });

  it('ends last month on its real last day, leap years included', () => {
    const lastMonth = DATE_RANGE_PRESETS[1];
    expect(resolveDateRangePreset(lastMonth, new Date(2028, 2, 31))).toEqual({
      from: '2028-02-01',
      to: '2028-02-29',
    });
  });

  it('returns a fixed range as given', () => {
    const fixed: DateRangePreset = {label: 'Q1', range: {from: '2026-01-01', to: '2026-03-31'}};
    expect(resolveDateRangePreset(fixed, new Date(2026, 9, 22))).toEqual(fixed.range);
  });

  it('formats the local calendar date, zero-padded', () => {
    expect(toIsoDate(new Date(2026, 2, 7, 23, 59))).toBe('2026-03-07');
  });
});
