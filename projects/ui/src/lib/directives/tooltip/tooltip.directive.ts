import {AriaDescriber, FocusMonitor, type FocusOrigin} from '@angular/cdk/a11y';
import {hasModifierKey} from '@angular/cdk/keycodes';
import {
  type ConnectedPosition,
  type FlexibleConnectedPositionStrategy,
  Overlay,
  type OverlayRef,
} from '@angular/cdk/overlay';
import {ComponentPortal} from '@angular/cdk/portal';
import {
  afterRenderEffect,
  booleanAttribute,
  type ComponentRef,
  DestroyRef,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  Renderer2,
} from '@angular/core';

import {TooltipPanelComponent} from './tooltip-panel.component';

export type TooltipPlacement = 'top' | 'bottom' | 'start' | 'end';

/** The gap between the trigger and the bubble. */
const TOOLTIP_OFFSET_PX = 8;
/** How long a pointer rests on the trigger before the tooltip shows; keyboard focus shows at once. */
const HOVER_SHOW_DELAY_MS = 300;
/** How long the tooltip waits after the pointer leaves, so it can cross the gap onto the bubble. */
const HOVER_HIDE_DELAY_MS = 100;
/** How long a finger rests on the trigger before the tooltip shows on touch. */
const LONG_PRESS_MS = 500;

const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex]';

const ABOVE: ConnectedPosition = {
  originX: 'center',
  originY: 'top',
  overlayX: 'center',
  overlayY: 'bottom',
  offsetY: -TOOLTIP_OFFSET_PX,
};
const BELOW: ConnectedPosition = {
  originX: 'center',
  originY: 'bottom',
  overlayX: 'center',
  overlayY: 'top',
  offsetY: TOOLTIP_OFFSET_PX,
};
const BEFORE: ConnectedPosition = {
  originX: 'start',
  originY: 'center',
  overlayX: 'end',
  overlayY: 'center',
  offsetX: -TOOLTIP_OFFSET_PX,
};
const AFTER: ConnectedPosition = {
  originX: 'end',
  originY: 'center',
  overlayX: 'start',
  overlayY: 'center',
  offsetX: TOOLTIP_OFFSET_PX,
};

/** The asked-for side first, then the opposite side when the viewport has no room for it. */
const POSITIONS: Record<TooltipPlacement, ConnectedPosition[]> = {
  top: [ABOVE, BELOW],
  bottom: [BELOW, ABOVE],
  start: [BEFORE, AFTER],
  end: [AFTER, BEFORE],
};

/**
 * A short text that explains its trigger, meeting WCAG 1.4.13 (content on hover or focus).
 *
 * - Shows when a mouse or pen rests on the trigger, and at once on keyboard focus.
 * - The pointer can move onto the bubble without it closing; it stays until hover and focus
 *   have both left, or Escape dismisses it. Escape leaves focus where it is, and the tooltip
 *   stays dismissed until hover and focus leave and come back.
 * - Touch: a tap acts on the trigger and never shows the tooltip. A long press (500ms) shows
 *   it, and the next touch anywhere dismisses it. Keep anything a person needs to act out of
 *   a tooltip, since a phone user rarely discovers the long press.
 * - The trigger is described by the text (`aria-describedby`) whether or not the bubble shows,
 *   so screen readers read it without hover or focus. On a wrapper such as `cmn-button`, the
 *   description goes on the control it renders, and focus anywhere inside shows the tooltip.
 * - `cmnTooltipTruncatedOnly` shows the tooltip only while the trigger's text overflows it
 *   (guardrail T5). The full text is then already the trigger's accessible name, so it adds no
 *   description. A truncated element that is not focusable needs `tabindex="0"`.
 */
@Directive({
  selector: '[cmnTooltip]',
  exportAs: 'cmnTooltip',
  host: {
    '(pointerenter)': 'onPointerEnter($event)',
    '(pointerleave)': 'onPointerLeave($event)',
    '(pointerdown)': 'onPointerDown($event)',
    '(pointerup)': 'cancelLongPress()',
    '(pointercancel)': 'cancelLongPress()',
  },
})
export class TooltipDirective {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly overlay = inject(Overlay);
  private readonly ariaDescriber = inject(AriaDescriber);
  private readonly focusMonitor = inject(FocusMonitor);
  private readonly renderer = inject(Renderer2);

  private overlayRef: OverlayRef | null = null;
  private panelRef: ComponentRef<TooltipPanelComponent> | null = null;
  private showTimer: ReturnType<typeof setTimeout> | null = null;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private longPressTimer: ReturnType<typeof setTimeout> | null = null;
  private stopTouchDismiss: (() => void) | null = null;

  private hostHovered = false;
  private panelHovered = false;
  private focused = false;
  private touchHeld = false;
  private dismissed = false;

  /** The text to show. An empty string turns the tooltip off. */
  public readonly cmnTooltip = input<string | null | undefined>('');
  public readonly cmnTooltipPlacement = input<TooltipPlacement>('top');
  public readonly cmnTooltipDisabled = input(false, {transform: booleanAttribute});
  /** Show only while the trigger's own text is cut off (`truncate`, `line-clamp`). */
  public readonly cmnTooltipTruncatedOnly = input(false, {transform: booleanAttribute});

  constructor() {
    // After render, so a wrapper's own focusable child (cmn-button's <button>) exists.
    afterRenderEffect(onCleanup => {
      const text = this.text();
      if (!text || this.cmnTooltipDisabled() || this.cmnTooltipTruncatedOnly()) {
        return;
      }
      const element = this.describedElement();
      this.ariaDescriber.describe(element, text, 'tooltip');
      onCleanup(() => this.ariaDescriber.removeDescription(element, text, 'tooltip'));
    });

    effect(() => {
      const text = this.text();
      if (!text || this.cmnTooltipDisabled()) {
        this.hide();
        return;
      }
      this.panelRef?.setInput('text', text);
    });

    effect(() => {
      const strategy = this.positionStrategy();
      this.overlayRef?.updatePositionStrategy(strategy);
    });

    this.focusMonitor.monitor(this.host, true).subscribe(origin => this.onFocusChange(origin));

    inject(DestroyRef).onDestroy(() => {
      this.clearTimers();
      this.stopTouchDismiss?.();
      this.focusMonitor.stopMonitoring(this.host);
      this.overlayRef?.dispose();
    });
  }

  /** Whether the bubble is on screen. */
  public get isVisible(): boolean {
    return this.overlayRef?.hasAttached() ?? false;
  }

  public onPointerEnter(event: PointerEvent): void {
    if (event.pointerType === 'touch') {
      return;
    }
    this.hostHovered = true;
    this.cancelHide();
    if (!this.isVisible && !this.showTimer) {
      this.showTimer = setTimeout(() => {
        this.showTimer = null;
        this.show();
      }, HOVER_SHOW_DELAY_MS);
    }
  }

  public onPointerLeave(event: PointerEvent): void {
    if (event.pointerType === 'touch') {
      this.cancelLongPress();
      return;
    }
    this.hostHovered = false;
    this.cancelShow();
    this.hideWhenIdle(HOVER_HIDE_DELAY_MS);
  }

  public onPointerDown(event: PointerEvent): void {
    if (event.pointerType !== 'touch' || this.isVisible) {
      return;
    }
    this.cancelLongPress();
    this.longPressTimer = setTimeout(() => {
      this.longPressTimer = null;
      this.touchHeld = true;
      this.dismissed = false;
      this.show();
      // The touch that showed it has already gone down, so the next one dismisses.
      this.stopTouchDismiss = this.renderer.listen('document', 'pointerdown', () =>
        this.releaseTouch()
      );
    }, LONG_PRESS_MS);
  }

  public cancelLongPress(): void {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  /** Shows the tooltip now, unless it is off, dismissed, or its text fits. */
  public show(): void {
    this.cancelShow();
    this.cancelHide();
    const text = this.text();
    if (this.isVisible || this.dismissed || !text || this.cmnTooltipDisabled()) {
      return;
    }
    if (this.cmnTooltipTruncatedOnly() && !this.overflows()) {
      return;
    }
    const overlayRef = this.ensureOverlay();
    this.panelRef = overlayRef.attach(new ComponentPortal(TooltipPanelComponent));
    this.panelRef.setInput('text', text);
    // Render the text now, so the overlay measures the bubble it will place.
    this.panelRef.changeDetectorRef.detectChanges();
    overlayRef.updatePosition();
  }

  /** Hides the tooltip now. */
  public hide(): void {
    this.cancelShow();
    this.cancelHide();
    if (this.isVisible) {
      this.overlayRef?.detach();
    }
    this.panelRef = null;
    this.panelHovered = false;
  }

  private text(): string {
    return this.cmnTooltip()?.trim() ?? '';
  }

  private onFocusChange(origin: FocusOrigin): void {
    if (origin === 'keyboard') {
      this.focused = true;
      this.show();
    } else if (origin === null) {
      this.focused = false;
      this.hideWhenIdle(0);
    }
  }

  private dismiss(): void {
    this.dismissed = true;
    this.releaseTouch();
    this.hide();
  }

  private releaseTouch(): void {
    this.stopTouchDismiss?.();
    this.stopTouchDismiss = null;
    if (this.touchHeld) {
      this.touchHeld = false;
      this.hideWhenIdle(0);
    }
  }

  /** Hides once nothing holds the tooltip open; leaving everything also lifts a dismissal. */
  private hideWhenIdle(delay: number): void {
    if (this.hostHovered || this.panelHovered || this.focused || this.touchHeld) {
      return;
    }
    this.dismissed = false;
    this.cancelHide();
    if (delay === 0) {
      this.hide();
      return;
    }
    this.hideTimer = setTimeout(() => {
      this.hideTimer = null;
      this.hide();
    }, delay);
  }

  /** The element that takes focus: the host, or the control a wrapper component renders. */
  private describedElement(): HTMLElement {
    const host = this.host.nativeElement;
    if (host.matches(FOCUSABLE)) {
      return host;
    }
    return host.querySelector<HTMLElement>(FOCUSABLE) ?? host;
  }

  private overflows(): boolean {
    const element = this.host.nativeElement;
    return element.scrollWidth > element.clientWidth || element.scrollHeight > element.clientHeight;
  }

  private ensureOverlay(): OverlayRef {
    if (this.overlayRef) {
      return this.overlayRef;
    }
    const overlayRef = this.overlay.create({
      positionStrategy: this.positionStrategy(),
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
      panelClass: 'cmn-tooltip-pane',
    });
    overlayRef.keydownEvents().subscribe(event => {
      if (event.key === 'Escape' && !hasModifierKey(event)) {
        // The topmost overlay takes Escape, so a dialog under the tooltip stays open.
        event.preventDefault();
        event.stopPropagation();
        this.dismiss();
      }
    });
    const pane = overlayRef.overlayElement;
    this.renderer.listen(pane, 'pointerenter', () => {
      this.panelHovered = true;
      this.cancelHide();
    });
    this.renderer.listen(pane, 'pointerleave', () => {
      this.panelHovered = false;
      this.hideWhenIdle(HOVER_HIDE_DELAY_MS);
    });
    this.overlayRef = overlayRef;
    return overlayRef;
  }

  private positionStrategy(): FlexibleConnectedPositionStrategy {
    return this.overlay
      .position()
      .flexibleConnectedTo(this.host)
      .withPositions(POSITIONS[this.cmnTooltipPlacement()])
      .withFlexibleDimensions(false)
      .withViewportMargin(TOOLTIP_OFFSET_PX);
  }

  private cancelShow(): void {
    if (this.showTimer) {
      clearTimeout(this.showTimer);
      this.showTimer = null;
    }
  }

  private cancelHide(): void {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }

  private clearTimers(): void {
    this.cancelShow();
    this.cancelHide();
    this.cancelLongPress();
  }
}
