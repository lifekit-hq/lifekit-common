import {computed, signal} from '@angular/core';

/** A press that moves less than this (px) is a tap on the grabber, not a drag. */
const GRABBER_TAP_SLOP_PX = 8;

/** How far (px) a sheet must be dragged down before release dismisses it. */
export const SHEET_DISMISS_DISTANCE_PX = 96;

export interface CmnSheetDragHooks {
  /** Whether the container is currently drawn as a draggable bottom sheet. */
  enabled: () => boolean;
  /** Whether a drag past the threshold may dismiss (false once the caller locked closing). */
  dismissible: () => boolean;
  /** Runs when a drag is released past the threshold. */
  dismiss: () => void;
  /** Runs when the grabber is tapped rather than dragged. */
  tap?: () => void;
}

/**
 * Pull-down-to-dismiss for a bottom sheet, shared by `cmn-drawer` and `cmn-dialog` so both phone
 * sheets move the same way. The owner binds the pointer events of its drag zone (grabber and
 * header, never the scrolling body), applies `transform` to the sheet's host and toggles a
 * transition-free class while `dragging`.
 */
export class CmnSheetDrag {
  private startY: number | null = null;
  private startedOnGrabber = false;
  private travel = 0;

  public readonly dragging = signal(false);
  public readonly offset = signal(0);
  public readonly transform = computed(() =>
    this.offset() > 0 ? `translateY(${this.offset()}px)` : null
  );

  constructor(private readonly hooks: CmnSheetDragHooks) {}

  public start(event: PointerEvent, onGrabber: boolean): void {
    if (!this.hooks.enabled()) {
      return;
    }
    this.startedOnGrabber = onGrabber;
    this.startY = event.clientY;
    this.travel = 0;
    this.dragging.set(true);
    try {
      (event.currentTarget as Element).setPointerCapture(event.pointerId);
    } catch {
      // The pointer is already gone (or synthetic); moves still arrive by bubbling.
    }
  }

  public move(event: PointerEvent): void {
    if (this.startY === null) {
      return;
    }
    const delta = event.clientY - this.startY;
    this.travel = Math.max(this.travel, Math.abs(delta));
    this.offset.set(Math.max(0, delta));
  }

  public end(): void {
    this.finish(false);
  }

  public cancel(): void {
    this.finish(true);
  }

  private finish(cancelled: boolean): void {
    if (this.startY === null) {
      return;
    }
    const offset = this.offset();
    const tapped = !cancelled && this.startedOnGrabber && this.travel < GRABBER_TAP_SLOP_PX;
    this.startY = null;
    this.startedOnGrabber = false;
    this.dragging.set(false);
    this.offset.set(0);
    if (tapped) {
      this.hooks.tap?.();
    } else if (offset >= SHEET_DISMISS_DISTANCE_PX && this.hooks.dismissible()) {
      this.hooks.dismiss();
    }
  }
}
