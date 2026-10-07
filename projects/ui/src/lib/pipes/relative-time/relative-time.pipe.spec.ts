import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {RelativeTimePipe} from './relative-time.pipe';

const NOW = new Date('2026-10-07T12:00:00Z');
const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_DAY = 86_400;

describe('RelativeTimePipe', () => {
  const pipe = new RelativeTimePipe();
  const ago = (seconds: number): Date => new Date(NOW.getTime() - seconds * MS_PER_SECOND);

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    ['59s', SECONDS_PER_MINUTE - 1, 'just now'],
    ['60s', SECONDS_PER_MINUTE, '1m ago'],
    ['59m', SECONDS_PER_HOUR - SECONDS_PER_MINUTE, '59m ago'],
    ['23h', SECONDS_PER_HOUR * 23, '23h ago'],
    ['24h', SECONDS_PER_DAY, '1d ago'],
    ['6d', SECONDS_PER_DAY * 6, '6d ago'],
    ['7d', SECONDS_PER_DAY * 7, '1w ago'],
  ])('formats %s elapsed as "%s"', (_label, seconds, expected) => {
    expect(pipe.transform(ago(seconds))).toBe(expected);
  });

  it('accepts a Date, an ISO string and an epoch number alike', () => {
    const date = ago(SECONDS_PER_HOUR * 3);
    expect(pipe.transform(date)).toBe('3h ago');
    expect(pipe.transform(date.toISOString())).toBe('3h ago');
    expect(pipe.transform(date.getTime())).toBe('3h ago');
  });

  it('returns an empty string for null and undefined by default', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
  });

  it('returns the fallback for missing and unparseable values', () => {
    expect(pipe.transform(null, '—')).toBe('—');
    expect(pipe.transform(undefined, '—')).toBe('—');
    expect(pipe.transform('not a date', '—')).toBe('—');
  });

  it('ignores the fallback when the value formats', () => {
    expect(pipe.transform(ago(SECONDS_PER_HOUR * 2), '—')).toBe('2h ago');
  });
});
