/** The motion durations the stylesheet publishes (`--cmn-duration-*`, Carbon's moderate-01, moderate-02 and slow-01). */
export type CmnMotionDuration = 'short' | 'medium' | 'long';

/** Carbon's values, used only where the stylesheet is not loaded (a unit test, a bare host page). */
const FALLBACK_MS: Record<CmnMotionDuration, number> = {short: 150, medium: 240, long: 400};

const MS_PER_SECOND = 1000;

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/** True when the person asked the system for less motion; leaving surfaces then close at once. */
export function prefersReducedMotion(view: Window | null = globalThis.window ?? null): boolean {
  return !!view?.matchMedia?.(REDUCED_MOTION_QUERY).matches;
}

/**
 * How long a motion token runs, in ms, read live from `--cmn-duration-<name>` so a script that
 * waits for a CSS transition to end (an overlay that must outlive its exit) never carries its own
 * copy of the number. Falls back to Carbon's value where the token is not defined.
 */
export function motionDurationMs(
  name: CmnMotionDuration,
  root: Element | null = globalThis.document?.documentElement ?? null
): number {
  const raw = root ? getComputedStyle(root).getPropertyValue(`--cmn-duration-${name}`).trim() : '';
  const value = Number.parseFloat(raw);
  if (Number.isNaN(value)) {
    return FALLBACK_MS[name];
  }
  return raw.endsWith('ms') ? value : value * MS_PER_SECOND;
}
