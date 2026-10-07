import {type ActivatedRouteSnapshot, type Data} from '@angular/router';

import {type IconName} from '../icon/icon.component';

/** A trailing top-bar action a page declares in its route data. */
export interface PageAction {
  /** Reported to `CmnPageActionsService.on(id)` and the layout's `pageAction` output. */
  id: string;
  /** Accessible name and tooltip of the icon button. */
  label: string;
  icon: IconName;
  /** Navigates here when pressed, resolved like `parent` (absolute, or relative to the page). */
  route?: string;
  /** Greys the control out and ignores presses, inline and in the narrow-phone overflow menu. */
  disabled?: boolean;
}

/**
 * What a page declares in route data for the shell's top bar (docs/PHONE-CONTRACT.md, "What a
 * page declares"): `{path: ':id', component: AccountPage, data: {title: 'Account', parent: '..'}}`.
 * A route that declares none of these keeps the layout's `title` input and gets no back chevron.
 */
export interface PageChromeData {
  /** Shown once: as the page's large title and, scrolled past it, inline in the top bar. */
  title?: string;
  /** Where the back chevron returns: absolute (`/accounts`) or relative to the page (`..`). */
  parent?: string;
  /** Trailing top-bar actions, at most a few. */
  actions?: PageAction[];
}

/** Where the back chevron goes: the declared parent, browser history, or nowhere (no chevron). */
export type BackTarget = {kind: 'parent'; parent: string} | {kind: 'history'} | null;

/** The chrome the deepest primary route declares, or null when it declares none. */
export function readPageChrome(data: Data): PageChromeData | null {
  const {title, parent, actions} = data as PageChromeData;
  if (title === undefined && parent === undefined && actions === undefined) {
    return null;
  }
  return {title, parent, actions};
}

/** The deepest activated route on the primary outlet: the page being shown. */
export function leafRoute(root: ActivatedRouteSnapshot): ActivatedRouteSnapshot {
  let route = root;
  while (route.firstChild) {
    route = route.firstChild;
  }
  return route;
}

/**
 * Back resolution per the phone contract: the declared parent wins; a tab root has no back; any
 * other declaring page falls back to history, but only when the app itself navigated here, so
 * the chevron never leaves the app. A page that declares nothing keeps today's bar: no back.
 */
export function resolveBack(
  chrome: PageChromeData | null,
  {isTabRoot, hasHistory}: {isTabRoot: boolean; hasHistory: boolean}
): BackTarget {
  if (!chrome) {
    return null;
  }
  if (chrome.parent) {
    return {kind: 'parent', parent: chrome.parent};
  }
  return !isTabRoot && hasHistory ? {kind: 'history'} : null;
}
