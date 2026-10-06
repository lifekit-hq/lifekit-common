import {formatAge, formatRelativeTime} from './relative-time';

const NOW = Date.parse('2026-10-06T12:00:00Z');
const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('formatRelativeTime', () => {
  it.each<[number, string]>([
    [0, 'just now'],
    [59 * SECOND, 'just now'],
    [MINUTE, '1m ago'],
    [59 * MINUTE, '59m ago'],
    [HOUR, '1h ago'],
    [23 * HOUR, '23h ago'],
    [DAY, '1d ago'],
    [6 * DAY, '6d ago'],
    [7 * DAY, '1w ago'],
    [15 * DAY, '2w ago'],
  ])('formats an age of %ims as "%s"', (ageMs, expected) => {
    expect(formatRelativeTime(NOW - ageMs, NOW)).toBe(expected);
  });

  it('accepts a Date, an ISO string and a numeric timestamp', () => {
    const ts = NOW - 5 * MINUTE;
    expect(formatRelativeTime(new Date(ts), NOW)).toBe('5m ago');
    expect(formatRelativeTime(new Date(ts).toISOString(), NOW)).toBe('5m ago');
    expect(formatRelativeTime(ts, NOW)).toBe('5m ago');
  });

  it('treats a future timestamp as just now', () => {
    expect(formatRelativeTime(NOW + HOUR, NOW)).toBe('just now');
  });

  it.each<[string, string | number | Date | null | undefined]>([
    ['null', null],
    ['undefined', undefined],
    ['an empty string', ''],
    ['an unparseable string', 'not-a-date'],
    ['an invalid Date', new Date(Number.NaN)],
  ])('returns an empty string for %s', (_label, value) => {
    expect(formatRelativeTime(value, NOW)).toBe('');
  });

  it('defaults to the current time', () => {
    expect(formatRelativeTime(Date.now() - 5 * MINUTE)).toBe('5m ago');
  });
});

describe('formatAge', () => {
  it.each<[number, string]>([
    [0, '0s'],
    [42 * SECOND, '42s'],
    [MINUTE, '1m'],
    [59 * MINUTE, '59m'],
    [3 * HOUR, '3h'],
    [2 * DAY, '2d'],
    [40 * DAY, '40d'],
  ])('formats an age of %ims as "%s"', (ageMs, expected) => {
    expect(formatAge(NOW - ageMs, NOW)).toBe(expected);
  });

  it('clamps a future timestamp to zero', () => {
    expect(formatAge(NOW + HOUR, NOW)).toBe('0s');
  });

  it.each<[string, string | null | undefined]>([
    ['null', null],
    ['undefined', undefined],
    ['an unparseable string', 'not-a-date'],
  ])('returns an empty string for %s', (_label, value) => {
    expect(formatAge(value, NOW)).toBe('');
  });

  it('defaults to the current time', () => {
    expect(formatAge(Date.now() - 5 * MINUTE)).toBe('5m');
  });
});
