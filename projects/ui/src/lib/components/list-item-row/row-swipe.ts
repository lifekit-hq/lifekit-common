import {computed, signal} from '@angular/core';

/** A touch that moves less than this (px) on both axes has not chosen a direction yet. */
export const ROW_SWIPE_SLOP_PX = 8;

/** The share of an action tray that must be uncovered at release for the row to stay open. */
export const ROW_SWIPE_OPEN_RATIO = 0.5;

/** `leading` is the tray on the start edge (revealed by a swipe toward the end), `trailing` the other. */
export type RowSwipeSide = 'leading' | 'trailing';

export interface RowSwipeHooks {
  /** The widths (px) of the two action trays; 0 for a side with no actions. Read when a touch starts. */
  widths: () => {leading: number; trailing: number};
}

/**
 * The horizontal swipe of a list row (Apple HIG, Lists and tables: swipe actions). It follows one
 * finger, locks to the horizontal axis only once the touch has clearly gone sideways (a vertical
 * pan stays the page's scroll), uncovers the action tray on that side and settles open or shut at
 * release. A mouse never swipes: it has the visible control, and dragging would fight text
 * selection. The owner binds the pointer events of the row surface, applies `transform` to it and
 * drops its transition while `dragging`.
 */
export class RowSwipe {
  private startX: number | null = null;
  private startY = 0;
  private base = 0;
  private axis: 'x' | 'y' | null = null;
  private limits = {leading: 0, trailing: 0};
  private shutByTap = false;

  /** Which tray the row rests open on, or null when it rests shut. */
  public readonly open = signal<RowSwipeSide | null>(null);
  /** Pixels the surface is moved: positive uncovers the leading tray, negative the trailing one. */
  public readonly offset = signal(0);
  /** True while a finger is moving the surface (the owner must not animate it then). */
  public readonly dragging = signal(false);
  public readonly transform = computed(() =>
    this.offset() === 0 ? null : `translateX(${this.offset()}px)`
  );

  constructor(private readonly hooks: RowSwipeHooks) {}

  public start(event: PointerEvent): void {
    this.shutByTap = false;
    if (event.pointerType === 'mouse') {
      return;
    }
    this.limits = this.hooks.widths();
    if (this.limits.leading === 0 && this.limits.trailing === 0) {
      return;
    }
    this.startX = event.clientX;
    this.startY = event.clientY;
    this.base = this.offset();
    this.axis = null;
  }

  public move(event: PointerEvent): void {
    if (this.startX === null || this.axis === 'y') {
      return;
    }
    const dx = event.clientX - this.startX;
    if (this.axis === null) {
      const dy = event.clientY - this.startY;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < ROW_SWIPE_SLOP_PX) {
        return;
      }
      if (Math.abs(dy) > Math.abs(dx)) {
        // The reader is scrolling the page; the row keeps out of it.
        this.axis = 'y';
        this.startX = null;
        return;
      }
      this.axis = 'x';
      this.dragging.set(true);
    }
    this.offset.set(Math.min(this.limits.leading, Math.max(-this.limits.trailing, this.base + dx)));
  }

  /**
   * Release, or the browser taking the touch over (`cancelled`): settle open or shut, whichever is
   * nearer. Only a release is a tap that a click follows.
   */
  public end(cancelled = false): void {
    const dragged = this.axis === 'x';
    const tapped = this.startX !== null && this.axis === null;
    this.startX = null;
    this.axis = null;
    if (!dragged) {
      if (tapped) {
        // A tap on the row while a tray is open puts the row back, as it does in a native list.
        this.shutByTap = !cancelled && this.open() !== null;
        this.close();
      }
      return;
    }
    this.dragging.set(false);
    const offset = this.offset();
    if (offset > 0 && offset >= this.limits.leading * ROW_SWIPE_OPEN_RATIO) {
      this.reveal('leading', this.limits.leading);
    } else if (offset < 0 && -offset >= this.limits.trailing * ROW_SWIPE_OPEN_RATIO) {
      this.reveal('trailing', this.limits.trailing);
    } else {
      this.close();
    }
  }

  /** Rests the row open on a tray: a settled swipe, or focus arriving on one of its actions. */
  public reveal(side: RowSwipeSide, width: number): void {
    this.open.set(side);
    this.offset.set(side === 'leading' ? width : -width);
  }

  /**
   * True once for the click that follows a tap which shut an open row: that tap only shuts it.
   * A click with no detail came from the keyboard or a screen reader, not from that tap.
   */
  public takeShutTap(click: MouseEvent): boolean {
    if (click.detail === 0) {
      return false;
    }
    const shut = this.shutByTap;
    this.shutByTap = false;
    return shut;
  }

  public close(): void {
    this.open.set(null);
    this.offset.set(0);
  }
}
