import {computed, signal} from '@angular/core';

/** A touch that has moved less than this (px) on both axes has not chosen a direction yet. */
export const PULL_SLOP_PX = 8;

/** The share of the finger's travel that shows as movement: the pull resists, as a rubber band does. */
export const PULL_RESISTANCE = 0.5;

/** How far (px) the content has been pulled when releasing starts a refresh. */
export const PULL_THRESHOLD_PX = 64;

/** The furthest (px) the content follows the finger. */
export const PULL_MAX_PX = 96;

/** Where (px) the content rests while refreshing: the height of the gap the indicator sits in (`--cmn-size-lg`). */
export const PULL_HOLD_PX = 48;

/**
 * True when nothing between `target` and `scroller` (inclusive) is scrolled down, so a downward
 * touch there would scroll nothing and can be a pull instead.
 */
function atTop(target: EventTarget | null, scroller: HTMLElement): boolean {
  let node = target instanceof Element ? target : null;
  while (node) {
    if (node.scrollTop > 0) {
      return false;
    }
    if (node === scroller) {
      return true;
    }
    node = node.parentElement;
  }
  return scroller.scrollTop <= 0;
}

/**
 * `idle`: nothing happening. `pulling`: the finger is pulling, short of the threshold. `ready`:
 * past the threshold, so releasing refreshes. `refreshing`: released, waiting for the reload.
 */
export type PullPhase = 'idle' | 'pulling' | 'ready' | 'refreshing';

export interface PullRefreshHooks {
  /** Whether a pull may start now (a tab root with a reload, no sheet open). Read when a touch starts. */
  enabled: () => boolean;
  /** Runs the reload; the indicator stays until it settles. */
  refresh: () => Promise<void>;
  /** Whether the person asked for less motion. Read when a pull starts. */
  reduceMotion: () => boolean;
  /** Runs when a touch becomes a pull, before anything is drawn: the place to measure the bar. */
  engaged?: () => void;
}

/**
 * Pull to refresh (Apple HIG, Refreshing content): pulling the top of a tab root down past a
 * threshold and letting go reloads it, with an activity indicator up until the reload is done.
 * The shell binds it to `<main>`, the scroller, with `attach`.
 *
 * - It engages only when the touch started with nothing scrolled on the way from the touched
 *   element up to the scroller (a `cmn-page-scroll` list counts), and only once the touch has gone
 *   clearly downward. A sideways swipe (a row, a chip row) and an upward scroll are left alone.
 * - Once engaged it stops the browser's own handling of the touch, so the pull is not a scroll.
 * - Under Reduce Motion the content never moves: `offset` stays 0 and only the indicator shows
 *   progress, with the same distance to the threshold.
 */
export class PullRefresh {
  private startX = 0;
  private startY = 0;
  private tracking = false;
  private engaged = false;
  private readonly pulled = signal(0);
  private readonly reducedMotion = signal(false);

  public readonly phase = signal<PullPhase>('idle');
  /** A finger is pulling, so the content follows it with no transition. */
  public readonly dragging = signal(false);
  /** How far (px) the content is moved down. Always 0 under Reduce Motion. */
  public readonly offset = computed(() => {
    if (this.reducedMotion()) {
      return 0;
    }
    return this.phase() === 'refreshing' ? PULL_HOLD_PX : this.pulled();
  });
  /** 0 to 1: how close the pull is to the threshold. 1 while refreshing. */
  public readonly progress = computed(() =>
    this.phase() === 'refreshing' ? 1 : Math.min(1, this.pulled() / PULL_THRESHOLD_PX)
  );
  public readonly transform = computed(() =>
    this.offset() === 0 ? null : `translateY(${this.offset()}px)`
  );

  constructor(private readonly hooks: PullRefreshHooks) {}

  /** Listens for touches on `scroller`; returns the function that stops. */
  public attach(scroller: HTMLElement): () => void {
    const start = (event: TouchEvent): void => this.start(event, scroller);
    const move = (event: TouchEvent): void => this.move(event, scroller);
    const end = (): void => this.release(true);
    const cancel = (): void => this.release(false);
    scroller.addEventListener('touchstart', start, {passive: true});
    // Not passive: an engaged pull cancels the browser's own handling of the touch.
    scroller.addEventListener('touchmove', move, {passive: false});
    scroller.addEventListener('touchend', end);
    scroller.addEventListener('touchcancel', cancel);
    return () => {
      // A pull in flight when listening stops (a sheet opened over it) is dropped, not refreshed.
      this.release(false);
      scroller.removeEventListener('touchstart', start);
      scroller.removeEventListener('touchmove', move);
      scroller.removeEventListener('touchend', end);
      scroller.removeEventListener('touchcancel', cancel);
    };
  }

  private start(event: TouchEvent, scroller: HTMLElement): void {
    this.release(false);
    if (
      event.touches.length !== 1 ||
      this.phase() === 'refreshing' ||
      !this.hooks.enabled() ||
      !atTop(event.target, scroller)
    ) {
      return;
    }
    this.startX = event.touches[0].clientX;
    this.startY = event.touches[0].clientY;
    this.tracking = true;
  }

  private move(event: TouchEvent, scroller: HTMLElement): void {
    if (!this.tracking) {
      return;
    }
    if (event.touches.length !== 1) {
      this.release(false);
      return;
    }
    const touch = event.touches[0];
    if (!this.engaged && !this.engage(touch, event.target, scroller)) {
      return;
    }
    if (event.cancelable) {
      event.preventDefault();
    }
    const pulled = Math.min(
      PULL_MAX_PX,
      Math.max(0, touch.clientY - this.startY) * PULL_RESISTANCE
    );
    this.pulled.set(pulled);
    this.phase.set(pulled >= PULL_THRESHOLD_PX ? 'ready' : 'pulling');
  }

  /** Decides whether the touch is a pull; stops tracking it when it is clearly something else. */
  private engage(touch: Touch, target: EventTarget | null, scroller: HTMLElement): boolean {
    const dx = touch.clientX - this.startX;
    const dy = touch.clientY - this.startY;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < PULL_SLOP_PX) {
      return false;
    }
    // Upward is a scroll and sideways is a swipe: neither is ours, and this touch never will be.
    if (dy <= 0 || Math.abs(dx) > dy || !atTop(target, scroller)) {
      this.tracking = false;
      return false;
    }
    this.engaged = true;
    // The pull counts from here, so the slop is not part of it.
    this.startY = touch.clientY;
    this.reducedMotion.set(this.hooks.reduceMotion());
    this.hooks.engaged?.();
    this.dragging.set(true);
    return true;
  }

  private release(allowRefresh: boolean): void {
    const engaged = this.engaged;
    this.tracking = false;
    this.engaged = false;
    if (!engaged) {
      return;
    }
    this.dragging.set(false);
    if (allowRefresh && this.phase() === 'ready') {
      void this.runRefresh();
    } else {
      this.reset();
    }
  }

  private async runRefresh(): Promise<void> {
    this.phase.set('refreshing');
    try {
      await this.hooks.refresh();
    } finally {
      this.reset();
    }
  }

  private reset(): void {
    this.pulled.set(0);
    this.phase.set('idle');
  }
}
