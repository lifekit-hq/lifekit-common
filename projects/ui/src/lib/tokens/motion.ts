/** The motion durations the stylesheet publishes (`--cmn-duration-*`, Carbon's moderate-01, moderate-02 and slow-01). */
export type CmnMotionDuration = 'short' | 'medium' | 'long';

/** Carbon's values, used only where the stylesheet is not loaded (a unit test, a bare host page). */
const FALLBACK_MS: Record<CmnMotionDuration, number> = {short: 150, medium: 240, long: 400};

const MS_PER_SECOND = 1000;

function readToken(name: string, root: Element | null): string {
  return root ? getComputedStyle(root).getPropertyValue(name).trim() : '';
}

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/** True when the person asked the system for less motion; leaving surfaces then close at once. */
export function prefersReducedMotion(view: Window | null = globalThis.window ?? null): boolean {
  return !!view?.matchMedia?.(REDUCED_MOTION_QUERY).matches;
}

/**
 * Whether a script may animate this element: not under Reduce Motion, and only where the host
 * implements `Element.animate` (jsdom and happy-dom, which a consumer's unit tests may run in, do not).
 */
export function canAnimate(element: Element): boolean {
  return (
    typeof element.animate === 'function' &&
    !prefersReducedMotion(element.ownerDocument.defaultView)
  );
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
  const raw = readToken(`--cmn-duration-${name}`, root);
  const value = Number.parseFloat(raw);
  if (Number.isNaN(value)) {
    return FALLBACK_MS[name];
  }
  return raw.endsWith('ms') ? value : value * MS_PER_SECOND;
}

/** The curves the stylesheet publishes (`--cmn-ease-*`): the productive ones for the everyday. */
export type CmnMotionEase = 'standard' | 'decelerate' | 'accelerate';

/** Carbon's productive curves, used only where the stylesheet is not loaded. */
const FALLBACK_EASE: Record<CmnMotionEase, string> = {
  standard: 'cubic-bezier(0.2, 0, 0.38, 0.9)',
  decelerate: 'cubic-bezier(0, 0, 0.38, 0.9)',
  accelerate: 'cubic-bezier(0.2, 0, 1, 0.9)',
};

/** How far a small element travels while it fades (`--cmn-motion-distance-*`). */
export type CmnMotionDistance = 'sm' | 'md';

const FALLBACK_DISTANCE: Record<CmnMotionDistance, string> = {sm: '8px', md: '24px'};

/**
 * A curve as the Web Animations API takes it, read live from `--cmn-ease-<name>`: a script
 * animation cannot hand `var()` to `easing`, so it reads the token instead of copying it.
 */
export function motionEasing(
  name: CmnMotionEase,
  root: Element | null = globalThis.document?.documentElement ?? null
): string {
  return readToken(`--cmn-ease-${name}`, root) || FALLBACK_EASE[name];
}

/** A travel distance as a CSS length (`8px`), read live from `--cmn-motion-distance-<name>`. */
export function motionDistance(
  name: CmnMotionDistance,
  root: Element | null = globalThis.document?.documentElement ?? null
): string {
  return readToken(`--cmn-motion-distance-${name}`, root) || FALLBACK_DISTANCE[name];
}
