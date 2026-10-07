import {afterNextRender, DestroyRef, inject, Injectable, Injector} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {NavigationEnd, NavigationStart, Router} from '@angular/router';

import {LOCAL_STORAGE} from '../../services/theme/theme.service';

/** Where the last tab is kept so a launch can reopen it. */
export const LAST_TAB_STORAGE_KEY = 'cmn-last-tab';

/** The router numbers navigations from 1; the first one is the launch. */
const LAUNCH_NAVIGATION_ID = 1;
/** Frames (about a second) a restore keeps trying while the page's content is still loading. */
const RESTORE_FRAMES = 60;
const RESTORE_TOLERANCE_PX = 1;
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
/** Input that means the reader took over the scroller, so a restore must stop fighting them. */
const USER_SCROLL_EVENTS = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const;

/** The path part of a URL, without query or fragment. */
export function pathOf(url: string): string {
  return url.split(/[?#]/, 1)[0];
}

/** The longest route that owns `url`, matching on path-segment boundaries; '' when none does. */
export function matchTab(url: string, routes: readonly string[]): string {
  const path = pathOf(url);
  return routes.reduce(
    (best, route) =>
      (path === route || path.startsWith(`${route}/`)) && route.length > best.length ? route : best,
    ''
  );
}

function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia(REDUCED_MOTION_QUERY).matches;
}

/** What the layout lends the service: its scroller and its tabs, read when needed. */
export interface ShellNavigationHost {
  /** The element that scrolls pages: the layout's `<main>`. */
  scroller: () => HTMLElement | undefined;
  /** Every destination route the shell lists, tab bar and "More" alike. */
  tabs: () => readonly string[];
  /** The route shown as active. */
  activeTab: () => string;
}

interface TabEntry {
  /** The screen the tab was last showing. */
  url: string;
  /** Where that screen was scrolled to when the reader left it. */
  scroll: number;
}

interface FinishedNavigation {
  id: number;
  /** The URL as requested, before redirects. */
  url: string;
  urlAfterRedirects: string;
  /** Whether this navigation walked the browser history (back or forward). */
  history: boolean;
  /** The history entry being returned to, when the browser reports one. */
  restoredId: number;
}

/**
 * The shell's memory of where the reader was, provided by `cmn-app-layout` (one per layout).
 *
 * - Scroll lives in the layout's `<main>`, which the router's own scroll restoration (window
 *   only) cannot see. Leaving a screen stores its scroll under its navigation id, and back and
 *   forward put it back; any other navigation starts a new screen at the top.
 *   A page's back chevron (`returnTo`) is a return too, so it restores the screen it goes back to.
 * - Each tab remembers the screen it was last showing and where that was scrolled.
 * - Re-tapping the active tab scrolls to the top first, then pops to the tab root.
 * - The last tab is persisted, and a launch (the first navigation, from `/`) reopens it.
 */
@Injectable()
export class ShellNavigationService {
  private readonly router = inject(Router);
  private readonly storage = inject(LOCAL_STORAGE);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);

  private host?: ShellNavigationHost;
  /** Id of the navigation whose screen is showing; 0 before the first one ends. */
  private currentId = 0;
  private currentPath = '';
  private currentTab = '';
  private readonly scrollByNavigation = new Map<number, number>();
  /** Where each screen was last left, for a return that is not a history pop. */
  private readonly scrollByPath = new Map<string, number>();
  private readonly tabs = new Map<string, TabEntry>();
  /** A tab switch in flight: the screen it returns to and where to scroll it. */
  private returningTo?: TabEntry;
  private pendingHistory = false;
  private pendingRestoredId = 0;
  private stopRestoring?: () => void;

  /** Starts listening to the router; the layout calls this once, from its constructor. */
  public connect(host: ShellNavigationHost): void {
    this.host = host;
    this.router.events.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(event => {
      if (event instanceof NavigationStart) {
        this.onStart(event);
      } else if (event instanceof NavigationEnd) {
        this.onEnd({
          id: event.id,
          url: event.url,
          urlAfterRedirects: event.urlAfterRedirects,
          history: this.pendingHistory,
          restoredId: this.pendingRestoredId,
        });
      }
    });
    this.destroyRef.onDestroy(() => this.stopRestoring?.());
    // A layout built after the launch navigation finished never sees its end event.
    afterNextRender(
      () => {
        const launch = this.router.lastSuccessfulNavigation();
        if (launch && this.currentId === 0) {
          this.onEnd({
            id: launch.id,
            url: this.router.serializeUrl(launch.initialUrl),
            urlAfterRedirects: this.router.url,
            history: false,
            restoredId: 0,
          });
        }
      },
      {injector: this.injector}
    );
  }

  /**
   * A tab was pressed. The active tab scrolls to the top, and once there pops to its root. Any
   * other tab opens the screen it was last showing, scrolled where the reader left it.
   */
  public selectTab(route: string): void {
    const scroller = this.host?.scroller();
    if (this.host?.activeTab() === route) {
      if (scroller && scroller.scrollTop > 0) {
        scroller.scrollTo({top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth'});
      } else if (pathOf(this.router.url) !== route) {
        this.tabs.delete(route);
        void this.router.navigateByUrl(route);
      }
      return;
    }
    const remembered = this.tabs.get(route);
    this.returningTo = remembered;
    void this.router.navigateByUrl(remembered?.url ?? route);
  }

  /** A page's back chevron: opens `url` as a return, scrolled where the reader left it. */
  public returnTo(url: string): void {
    this.returningTo = {url, scroll: this.scrollByPath.get(pathOf(url)) ?? 0};
    void this.router.navigateByUrl(url);
  }

  private onStart(event: NavigationStart): void {
    this.saveScroll();
    this.pendingHistory =
      event.navigationTrigger === 'popstate' || event.navigationTrigger === 'hashchange';
    this.pendingRestoredId = event.restoredState?.navigationId ?? 0;
  }

  private saveScroll(): void {
    const scroller = this.host?.scroller();
    if (!scroller || this.currentId === 0) {
      return;
    }
    this.scrollByNavigation.set(this.currentId, scroller.scrollTop);
    this.scrollByPath.set(this.currentPath, scroller.scrollTop);
    const entry = this.tabs.get(this.currentTab);
    if (entry) {
      entry.scroll = scroller.scrollTop;
    }
  }

  private onEnd(finished: FinishedNavigation): void {
    const {id, url, urlAfterRedirects, history, restoredId} = finished;
    const path = pathOf(urlAfterRedirects);
    const samePage = path === this.currentPath;
    this.currentId = id;
    this.currentPath = path;

    const routes = this.host?.tabs() ?? [];
    const launchTab = id === LAUNCH_NAVIGATION_ID && pathOf(url) === '/' ? this.readLastTab() : '';
    if (launchTab && routes.includes(launchTab) && launchTab !== matchTab(path, routes)) {
      this.currentTab = launchTab;
      void this.router.navigateByUrl(launchTab, {replaceUrl: true});
      return;
    }

    this.currentTab = matchTab(path, routes);
    if (this.currentTab) {
      this.tabs.set(this.currentTab, {url: urlAfterRedirects, scroll: 0});
      this.writeLastTab(this.currentTab);
    }

    const returning = this.returningTo?.url === urlAfterRedirects ? this.returningTo : undefined;
    this.returningTo = undefined;
    if (history) {
      this.restore(this.scrollByNavigation.get(restoredId) ?? 0);
    } else if (returning) {
      this.restore(returning.scroll);
    } else if (!samePage) {
      this.restore(0);
    }
  }

  /** Scrolls the layout to `top` once the new page has rendered, retrying while it loads. */
  private restore(top: number): void {
    this.stopRestoring?.();
    const scroller = this.host?.scroller();
    if (!scroller) {
      return;
    }
    let frame = 0;
    let frames = 0;
    let live = true;
    const stop = (): void => {
      live = false;
      cancelAnimationFrame(frame);
      for (const type of USER_SCROLL_EVENTS) {
        scroller.removeEventListener(type, stop);
      }
      this.stopRestoring = undefined;
    };
    const attempt = (): void => {
      if (!live) {
        return;
      }
      scroller.scrollTop = top;
      const reached = Math.abs(scroller.scrollTop - top) <= RESTORE_TOLERANCE_PX;
      if (reached || ++frames >= RESTORE_FRAMES) {
        stop();
      } else {
        frame = requestAnimationFrame(attempt);
      }
    };
    this.stopRestoring = stop;
    if (top > 0) {
      for (const type of USER_SCROLL_EVENTS) {
        scroller.addEventListener(type, stop, {once: true, passive: true});
      }
    }
    afterNextRender(attempt, {injector: this.injector});
  }

  private readLastTab(): string {
    try {
      return this.storage.getItem(LAST_TAB_STORAGE_KEY) ?? '';
    } catch {
      return '';
    }
  }

  private writeLastTab(route: string): void {
    try {
      this.storage.setItem(LAST_TAB_STORAGE_KEY, route);
    } catch {
      // storage blocked: the tab is remembered for this session only
    }
  }
}
