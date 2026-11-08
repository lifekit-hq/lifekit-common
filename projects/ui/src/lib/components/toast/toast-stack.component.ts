import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  linkedSignal,
  output,
} from '@angular/core';

import {motionDurationMs, prefersReducedMotion} from '../../tokens/motion';
import {ToastComponent, type ToastVariant} from './toast.component';

/** One toast as the stack renders it. */
export interface ToastStackItem {
  readonly id: number;
  readonly message: string;
  readonly variant: ToastVariant;
  readonly action?: string;
}

/** A toast the stack is drawing: one the service still lists, or one on its way out. */
interface ShownToast extends ToastStackItem {
  readonly leaving: boolean;
}

/**
 * The toasts to draw: everything the service lists, plus each toast it stopped listing, kept at its
 * old place while it plays its exit. With nothing to wait for (Reduce Motion, or no earlier list)
 * a removed toast is simply gone.
 */
function withLeaving(
  incoming: readonly ToastStackItem[],
  previous: readonly ShownToast[] | undefined,
  animate: boolean
): ShownToast[] {
  const next: ShownToast[] = incoming.map(item => ({...item, leaving: false}));
  if (!animate || !previous) {
    return next;
  }
  const listed = new Set(incoming.map(item => item.id));
  previous.forEach((item, index) => {
    if (!listed.has(item.id)) {
      next.splice(Math.min(index, next.length), 0, {...item, leaving: true});
    }
  });
  return next;
}

/** Hover only pauses where a pointer can hover; on touch a tap leaves a sticky `:hover` behind. */
const CAN_HOVER = '(hover: hover)';

/**
 * The column `ToastService` attaches to its overlay: oldest at the top, the newest at the bottom,
 * nearest the thumb (guardrails F3). Hovering or focusing it pauses every timed toast in it
 * (F2, WCAG 2.2.1); the service owns the timers. A toast enters and leaves with a short fade and
 * rise (`cmn-toast-in` and `cmn-toast-out` in the tokens stylesheet); a removed one stays drawn,
 * inert, for the length of its exit, and `drained` says the last one is gone.
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
    @for (toast of shown(); track toast.id) {
      <cmn-toast
        [attr.inert]="toast.leaving ? '' : null"
        [class.cmn-toast--leaving]="toast.leaving"
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

  private readonly exits = new Map<number, ReturnType<typeof setTimeout>>();
  private hovered = false;
  private focused = false;

  public readonly toasts = input<readonly ToastStackItem[]>([]);

  public readonly dismissed = output<number>();
  public readonly actioned = output<number>();
  public readonly pausedChange = output<boolean>();
  /** The last toast has finished leaving; the stack is empty and can be taken down. */
  public readonly drained = output<void>();

  protected readonly shown = linkedSignal<readonly ToastStackItem[], ShownToast[]>({
    source: this.toasts,
    computation: (incoming, previous) =>
      withLeaving(incoming, previous?.value, !prefersReducedMotion()),
  });

  constructor() {
    effect(() => {
      for (const toast of this.shown()) {
        if (toast.leaving && !this.exits.has(toast.id)) {
          this.exits.set(
            toast.id,
            setTimeout(() => this.finishExit(toast.id), motionDurationMs('short'))
          );
        }
      }
    });
    inject(DestroyRef).onDestroy(() => this.exits.forEach(timer => clearTimeout(timer)));
  }

  /** True when nothing is drawn, not even a toast still leaving. */
  public isEmpty(): boolean {
    return this.shown().length === 0;
  }

  /**
   * Re-reads hover and focus from the DOM. A removed toast can take the focused element, or the
   * pointer's target, with it without a `focusout` or `mouseleave` ever firing.
   */
  public refreshPaused(): void {
    this.hovered = this.host.matches(':hover');
    // A toast on its way out still holds the focus its button had, but it is already gone.
    const active = document.activeElement;
    this.focused = !!active && this.host.contains(active) && !active.closest('.cmn-toast--leaving');
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

  private finishExit(id: number): void {
    this.exits.delete(id);
    this.shown.update(list => list.filter(toast => toast.id !== id));
    if (this.isEmpty()) {
      this.drained.emit();
    }
  }

  private emitPaused(): void {
    this.pausedChange.emit((this.hovered && matchMedia(CAN_HOVER).matches) || this.focused);
  }
}
