import {DOCUMENT} from '@angular/common';
import {TestBed} from '@angular/core/testing';
import type {Route} from '@angular/router';
import {of, type Subscription} from 'rxjs';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {
  TAB_PRELOAD_DATA_KEY,
  TAB_PRELOAD_IDLE_TIMEOUT_MS,
  TabPreloadStrategy,
} from './tab-preload.strategy';

interface Connection {
  saveData?: boolean;
  type?: string;
  effectiveType?: string;
}

/** A window whose frames and idle moments the test fires by hand. */
class FakeWindow {
  public readonly frames: (() => void)[] = [];
  public readonly idle: {task: () => void; timeout?: number}[] = [];
  public readonly navigator: {connection?: Connection} = {};

  public cancelAnimationFrame = vi.fn();
  public cancelIdleCallback = vi.fn();
  public requestAnimationFrame = (callback: () => void): number => this.frames.push(callback);
  public requestIdleCallback: unknown = (task: () => void, options?: {timeout: number}): number =>
    this.idle.push({task, timeout: options?.timeout});

  public paint(): void {
    this.frames.splice(0).forEach(frame => frame());
  }
}

const TAB: Route = {path: 'budgets', data: {[TAB_PRELOAD_DATA_KEY]: true}};
const OTHER: Route = {path: 'settings'};

function setup(window: FakeWindow = new FakeWindow()) {
  TestBed.configureTestingModule({
    providers: [{provide: DOCUMENT, useValue: {defaultView: window}}],
  });
  return {window, strategy: TestBed.inject(TabPreloadStrategy)};
}

function run(strategy: TabPreloadStrategy, route: Route, load = vi.fn(() => of('chunk'))) {
  const emitted: unknown[] = [];
  const subscription: Subscription = strategy
    .preload(route, load)
    .subscribe(value => emitted.push(value));
  return {load, emitted, subscription};
}

describe('TabPreloadStrategy', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('loads a tab destination on an idle moment after the second frame, not before', () => {
    const {window, strategy} = setup();
    const {load} = run(strategy, TAB);

    expect(load).not.toHaveBeenCalled();
    window.paint();
    expect(load).not.toHaveBeenCalled();
    window.paint();
    expect(load).not.toHaveBeenCalled();
    expect(window.idle[0].timeout).toBe(TAB_PRELOAD_IDLE_TIMEOUT_MS);

    window.idle[0].task();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('leaves a route that did not opt in to load on demand', () => {
    const {window, strategy} = setup();
    const {load, emitted} = run(strategy, OTHER);

    window.paint();
    window.paint();
    expect(window.idle).toHaveLength(0);
    expect(load).not.toHaveBeenCalled();
    expect(emitted).toEqual([null]);
  });

  it.each([
    ['Save-Data is on', {saveData: true}],
    ['the connection is cellular', {type: 'cellular'}],
    ['the connection is 2g', {effectiveType: '2g'}],
  ])('does not preload when %s', (_name, connection) => {
    const {window, strategy} = setup();
    window.navigator.connection = connection;
    const {load} = run(strategy, TAB);

    window.paint();
    window.paint();
    expect(window.idle).toHaveLength(0);
    expect(load).not.toHaveBeenCalled();
  });

  it('does not load if Save-Data turns on while it waits', () => {
    const {window, strategy} = setup();
    const {load, emitted} = run(strategy, TAB);

    window.paint();
    window.paint();
    window.navigator.connection = {saveData: true};
    window.idle[0].task();
    expect(load).not.toHaveBeenCalled();
    expect(emitted).toEqual([null]);
  });

  it('preloads where the browser reports no connection (Safari)', () => {
    const {window, strategy} = setup();
    window.navigator.connection = undefined;
    const {load} = run(strategy, TAB);

    window.paint();
    window.paint();
    window.idle[0].task();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('cancels the wait when the router stops listening', () => {
    const {window, strategy} = setup();
    const {load, subscription} = run(strategy, TAB);

    window.paint();
    window.paint();
    subscription.unsubscribe();
    expect(window.cancelIdleCallback).toHaveBeenCalledTimes(1);
    expect(load).not.toHaveBeenCalled();
  });

  it('falls back to a timer where requestIdleCallback is missing', () => {
    vi.useFakeTimers();
    const {window, strategy} = setup();
    window.requestIdleCallback = undefined;
    const {load} = run(strategy, TAB);

    window.paint();
    window.paint();
    vi.advanceTimersByTime(0);
    expect(load).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('loads at once where there is no window', () => {
    TestBed.configureTestingModule({
      providers: [{provide: DOCUMENT, useValue: {defaultView: null}}],
    });
    const {load} = run(TestBed.inject(TabPreloadStrategy), TAB);

    expect(load).toHaveBeenCalledTimes(1);
  });
});
