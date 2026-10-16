import {DOCUMENT} from '@angular/common';
import {inject} from '@angular/core';
import {
  type ActivatedRouteSnapshot,
  type ViewTransitionInfo,
  type ViewTransitionsFeature,
  type ViewTransitionsFeatureOptions,
  withViewTransitions,
} from '@angular/router';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * True when both snapshots match the same route configs in every outlet, so the navigation
 * changed only params, query params or the fragment (a filter chip, a search, a URL-synced store's
 * `replaceUrl` write). Compares the trees, not the URLs: `/detail/1` to `/detail/2` is the same
 * route, `/budgets` to `/settings` is not.
 */
function isSameMatchedRoute(
  from: ActivatedRouteSnapshot,
  to: ActivatedRouteSnapshot
): boolean {
  if (from.routeConfig !== to.routeConfig || from.outlet !== to.outlet) {
    return false;
  }
  if (from.children.length !== to.children.length) {
    return false;
  }
  return from.children.every(child => {
    const match = to.children.find(other => other.outlet === child.outlet);
    return match !== undefined && isSameMatchedRoute(child, match);
  });
}

function prefersReducedMotion(): boolean {
  return inject(DOCUMENT).defaultView?.matchMedia?.(REDUCED_MOTION_QUERY).matches ?? false;
}

/**
 * The lifekit view-transition setup: Angular's `withViewTransitions()`, with the crossfade kept to
 * navigations that change the matched route (a tab switch, opening a detail page).
 *
 * The transition is skipped (`skipTransition()`, so the DOM updates at once and pointer input is
 * never held by the transition overlay) when:
 *
 * - the matched route configs are the same, so only params, query params or the fragment changed;
 * - the reader prefers reduced motion.
 *
 * `onViewTransitionCreated` runs, in an injection context, only for a transition that goes ahead.
 * The crossfade's duration and easing come from the motion tokens in `@lifekit-hq/tokens`
 * (`::view-transition-old/new(root)` in `theme.css`).
 *
 * @example
 * provideRouter(APP_ROUTES, withPreloading(TabPreloadStrategy), withLkViewTransitions());
 */
export function withLkViewTransitions(
  options: ViewTransitionsFeatureOptions = {}
): ViewTransitionsFeature {
  const {onViewTransitionCreated} = options;
  return withViewTransitions({
    ...options,
    onViewTransitionCreated: (info: ViewTransitionInfo) => {
      if (isSameMatchedRoute(info.from, info.to) || prefersReducedMotion()) {
        info.transition.skipTransition();
        return;
      }
      onViewTransitionCreated?.(info);
    },
  });
}
