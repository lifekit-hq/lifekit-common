import {DOCUMENT} from '@angular/common';
import {inject, Injectable} from '@angular/core';
import type {PreloadingStrategy, Route} from '@angular/router';
import {Observable, of} from 'rxjs';

/** The `data` flag a route sets to be preloaded: `{path: 'budgets', data: {tabPreload: true}}`. */
export const TAB_PRELOAD_DATA_KEY = 'tabPreload';

/** Longest the browser may keep a chunk waiting for an idle moment before it loads anyway. */
export const TAB_PRELOAD_IDLE_TIMEOUT_MS = 4000;

/** The part of the Network Information API this reads; Safari ships none of it. */
interface NetworkInformation {
  saveData?: boolean;
  type?: string;
  effectiveType?: string;
}

type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: {timeout: number}) => number;
  cancelIdleCallback?: (handle: number) => void;
};

const SLOW_CONNECTIONS = ['slow-2g', '2g'];

/**
 * Preloads the lazy routes that are tab-bar destinations, so the first visit to a tab does not
 * wait for its chunk. A route opts in with `data: {tabPreload: true}`; every other lazy route
 * loads on demand, as it does without a strategy.
 *
 * A chunk loads on an idle moment after the router's first navigation has rendered (never before
 * first paint), and not at all where the reader asked to save data or the connection is metered
 * (`saveData`, a cellular `type`) or slow (`2g`). The Network Information API is missing in
 * Safari, so there a route preloads whatever the connection; nothing can be known.
 *
 * @example
 * provideRouter(APP_ROUTES, withPreloading(TabPreloadStrategy));
 */
@Injectable({providedIn: 'root'})
export class TabPreloadStrategy implements PreloadingStrategy {
  private readonly window = inject(DOCUMENT).defaultView as IdleWindow | null;

  public preload(route: Route, load: () => Observable<unknown>): Observable<unknown> {
    if (route.data?.[TAB_PRELOAD_DATA_KEY] !== true || this.savesData()) {
      return of(null);
    }
    return new Observable<unknown>(subscriber => {
      const stop = this.whenIdle(() => {
        if (!this.savesData()) {
          const loading = load().subscribe(subscriber);
          subscriber.add(loading);
        } else {
          subscriber.next(null);
          subscriber.complete();
        }
      });
      return stop;
    });
  }

  /** The reader asked to save data, or the connection is metered or slow. */
  private savesData(): boolean {
    const connection = (this.window?.navigator as {connection?: NetworkInformation} | undefined)
      ?.connection;
    if (!connection) {
      return false;
    }
    return (
      connection.saveData === true ||
      connection.type === 'cellular' ||
      SLOW_CONNECTIONS.includes(connection.effectiveType ?? '')
    );
  }

  /** Runs `task` on an idle moment after the next paint; returns what cancels the wait. */
  private whenIdle(task: () => void): () => void {
    const view = this.window;
    if (!view) {
      task();
      return () => undefined;
    }
    let idle: number | undefined;
    let frame: number | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // A frame callback runs just before a paint; the one after it runs once that paint is done.
    frame = view.requestAnimationFrame(() => {
      frame = view.requestAnimationFrame(() => {
        frame = undefined;
        if (view.requestIdleCallback) {
          idle = view.requestIdleCallback(task, {timeout: TAB_PRELOAD_IDLE_TIMEOUT_MS});
        } else {
          timer = setTimeout(task, 0);
        }
      });
    });
    return () => {
      if (frame !== undefined) {
        view.cancelAnimationFrame(frame);
      }
      if (idle !== undefined) {
        view.cancelIdleCallback?.(idle);
      }
      clearTimeout(timer);
    };
  }
}
