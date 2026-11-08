import {type DestroyRef} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {type ActivatedRouteSnapshot, NavigationEnd, type Router} from '@angular/router';
import {filter} from 'rxjs';

import {canAnimate, motionDurationMs, motionEasing} from '../../tokens/motion';

/** The route configs from the root down the primary outlet: which pages are on screen. */
export function matchedRoutes(root: ActivatedRouteSnapshot): readonly unknown[] {
  const chain: unknown[] = [];
  for (let route: ActivatedRouteSnapshot | null = root; route; route = route.firstChild) {
    chain.push(route.routeConfig);
  }
  return chain;
}

/**
 * True when both navigations matched the same route configs, so only params, query params or the
 * fragment changed (a filter chip, a search, a URL-synced store's `replaceUrl` write). Compares
 * the matched pages, not the URLs: `/detail/1` to `/detail/2` is the same page.
 */
export function isSameMatchedRoute(from: readonly unknown[], to: readonly unknown[]): boolean {
  return from.length === to.length && from.every((config, index) => config === to[index]);
}

/**
 * Fades the page in when the router moves to a different page, so a tab switch or opening a detail
 * page reads as a change of surface and not as a cut: opacity only, over `--cmn-duration-medium`
 * on the standard curve (the same timing as the router's view-transition crossfade).
 *
 * This is the shell's own motion, so it is on in every app that uses the shell, with no router
 * feature to add. It stands down when
 *
 * - the navigation only changed params, query params or the fragment (the page must not dim
 *   under a tap);
 * - it is the first navigation (the launch is drawn as it is);
 * - the reader prefers reduced motion, or the host has no `Element.animate`;
 * - a view transition is already crossfading the page (`withLkViewTransitions()` in the app),
 *   which would otherwise fade it twice.
 */
export function fadeRouteChanges(
  router: Router,
  page: () => HTMLElement,
  destroyRef: DestroyRef
): void {
  let previous: readonly unknown[] | null = null;
  router.events
    .pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      takeUntilDestroyed(destroyRef)
    )
    .subscribe(() => {
      const current = matchedRoutes(router.routerState.snapshot.root);
      const launch = previous === null;
      const unchanged = previous !== null && isSameMatchedRoute(previous, current);
      previous = current;
      const element = page();
      const transitioning = !!(element.ownerDocument as {activeViewTransition?: unknown})
        .activeViewTransition;
      if (launch || unchanged || transitioning || !canAnimate(element)) {
        return;
      }
      element.animate([{opacity: 0}, {opacity: 1}], {
        duration: motionDurationMs('medium'),
        easing: motionEasing('standard'),
      });
    });
}
