/** Anything a backend or a `Date` can hand us as a point in time. */
export type TimeInput = string | number | Date;

const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const DAYS_PER_WEEK = 7;

function toTimestamp(value: TimeInput | null | undefined): number {
  if (value === null || value === undefined || value === '') {
    return Number.NaN;
  }
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

/** Whole seconds elapsed since `value`, never negative (future timestamps clamp to 0). */
function elapsedSeconds(value: TimeInput | null | undefined, now: number): number {
  const ts = toTimestamp(value);
  return Number.isNaN(ts) ? Number.NaN : Math.max(0, Math.floor((now - ts) / MS_PER_SECOND));
}

/**
 * Human relative time: `just now`, `5m ago`, `3h ago`, `2d ago`, `3w ago`.
 *
 * Framework-free and pure: pass `now` to make it deterministic. Returns `''` for a missing or
 * unparseable value so templates can render it unconditionally.
 */
export function formatRelativeTime(
  value: TimeInput | null | undefined,
  now: number = Date.now()
): string {
  const seconds = elapsedSeconds(value, now);
  if (Number.isNaN(seconds)) {
    return '';
  }
  const minutes = Math.floor(seconds / SECONDS_PER_MINUTE);
  if (minutes < 1) {
    return 'just now';
  }
  if (minutes < MINUTES_PER_HOUR) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  if (hours < HOURS_PER_DAY) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / HOURS_PER_DAY);
  if (days < DAYS_PER_WEEK) {
    return `${days}d ago`;
  }
  return `${Math.floor(days / DAYS_PER_WEEK)}w ago`;
}

/**
 * Compact age without a suffix: `42s`, `5m`, `3h`, `2d`. For dense tables where the caller
 * adds its own wording ("Stale since 5m"). Returns `''` for a missing or unparseable value.
 */
export function formatAge(value: TimeInput | null | undefined, now: number = Date.now()): string {
  const seconds = elapsedSeconds(value, now);
  if (Number.isNaN(seconds)) {
    return '';
  }
  if (seconds < SECONDS_PER_MINUTE) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / SECONDS_PER_MINUTE);
  if (minutes < MINUTES_PER_HOUR) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  if (hours < HOURS_PER_DAY) {
    return `${hours}h`;
  }
  return `${Math.floor(hours / HOURS_PER_DAY)}d`;
}
