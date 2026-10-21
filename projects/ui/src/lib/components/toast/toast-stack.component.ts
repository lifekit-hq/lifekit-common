import {ChangeDetectionStrategy, Component, ElementRef, inject, input, output} from '@angular/core';

import {ToastComponent, type ToastVariant} from './toast.component';

/** One toast as the stack renders it. */
export interface ToastStackItem {
  readonly id: number;
  readonly message: string;
  readonly variant: ToastVariant;
  readonly action?: string;
}

/** Hover only pauses where a pointer can hover; on touch a tap leaves a sticky `:hover` behind. */
const CAN_HOVER = '(hover: hover)';

/**
 * The column `ToastService` attaches to its overlay: oldest at the top, the newest at the bottom,
 * nearest the thumb (guardrails F3). Hovering or focusing it pauses every timed toast in it
 * (F2, WCAG 2.2.1); the service owns the timers.
 */
@Component({
  selector: 'cmn-toast-stack',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToastComponent],
  host: {
    class: 'flex flex-col items-stretch gap-cmn-2',
    '(mouseenter)': 'setHovered(true)',
    '(mouseleave)': 'setHovered(false)',
    '(focusin)': 'setFocused(true)',
    '(focusout)': 'onFocusOut($event)',
  },
  template: `
    @for (toast of toasts(); track toast.id) {
      <cmn-toast
        [message]="toast.message"
        [variant]="toast.variant"
        [action]="toast.action"
        (dismissed)="dismissed.emit(toast.id)"
        (actioned)="actioned.emit(toast.id)"
      />
    }
  `,
})
export class ToastStackComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  private hovered = false;
  private focused = false;

  public readonly toasts = input<readonly ToastStackItem[]>([]);

  public readonly dismissed = output<number>();
  public readonly actioned = output<number>();
  public readonly pausedChange = output<boolean>();

  /**
   * Re-reads hover and focus from the DOM. A removed toast can take the focused element, or the
   * pointer's target, with it without a `focusout` or `mouseleave` ever firing.
   */
  public refreshPaused(): void {
    this.hovered = this.host.matches(':hover');
    this.focused = this.host.contains(document.activeElement);
    this.emitPaused();
  }

  protected setHovered(hovered: boolean): void {
    this.hovered = hovered;
    this.emitPaused();
  }

  protected setFocused(focused: boolean): void {
    this.focused = focused;
    this.emitPaused();
  }

  /** Focus moving between toasts keeps the pause; leaving the stack ends it. */
  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (!next || !(event.currentTarget as HTMLElement).contains(next)) {
      this.setFocused(false);
    }
  }

  private emitPaused(): void {
    this.pausedChange.emit((this.hovered && matchMedia(CAN_HOVER).matches) || this.focused);
  }
}
