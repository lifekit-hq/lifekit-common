import {Overlay, type OverlayRef} from '@angular/cdk/overlay';
import {ComponentPortal} from '@angular/cdk/portal';
import {type ComponentRef, inject, Injectable, Injector} from '@angular/core';

import {CMN_OVERLAY_INSET_BOTTOM} from '../../tokens/overlay-inset';
import {DEFAULT_DURATION_MS, type ToastVariant} from './toast.component';
import {ToastStackComponent, type ToastStackItem} from './toast-stack.component';

/** A toast's one action: a short verb (two words or fewer, e.g. "Undo") and what it does. */
export interface ToastAction {
  readonly label: string;
  readonly run: () => void;
}

export interface ToastOptions {
  /** How long a timed toast stays up, in ms; ignored by error toasts and toasts with an action. */
  readonly duration?: number;
  /** One action. A toast that carries one stays until it is used or dismissed (guardrails F1). */
  readonly action?: ToastAction;
}

/** The most toasts on screen at once; newer ones push the oldest out of view until there is room. */
export const MAX_VISIBLE_TOASTS = 3;

/** Space between the stack and what it sits on: the bottom inset, or the viewport edge. */
const TOAST_GAP = '24px';

/**
 * Bottom-centre, above the app shell's tab bar and floating action (live, through the inset it
 * publishes) and never below the bottom safe area.
 */
const TOAST_BOTTOM = `calc(max(var(${CMN_OVERLAY_INSET_BOTTOM}, 0px), env(safe-area-inset-bottom, 0px)) + ${TOAST_GAP})`;

interface ToastEntry extends ToastStackItem {
  readonly run?: () => void;
  /** Time left before it dismisses itself, or null when it persists. */
  remaining: number | null;
  startedAt: number;
  timer?: ReturnType<typeof setTimeout>;
}

/**
 * Shows toasts in one CDK overlay, bottom-centre above the tab bar and the bottom inset. Toasts
 * stack with the newest at the bottom, at most three in view (guardrails F3). Success, warning and
 * info close themselves after `duration` (3s by default), with the clock paused while the stack is
 * hovered or focused (F2, WCAG 2.2.1). An error toast, and any toast with an action, stays until
 * it is dismissed or its action is used (F1, Carbon notifications): a message someone has to act
 * on must not time out under them.
 */
@Injectable({providedIn: 'root'})
export class ToastService {
  private readonly overlay = inject(Overlay);
  private readonly injector = inject(Injector);

  private entries: ToastEntry[] = [];
  private nextId = 0;
  private paused = false;
  private overlayRef: OverlayRef | null = null;
  private stackRef: ComponentRef<ToastStackComponent> | null = null;

  /**
   * `options` takes a duration (a number, as before) or {@link ToastOptions}. The duration applies
   * to timed toasts only; an error toast or one with an action ignores it and persists.
   */
  public show(message: string, variant: ToastVariant, options: number | ToastOptions = {}): void {
    const {duration = DEFAULT_DURATION_MS, action} =
      typeof options === 'number' ? {duration: options} : options;
    const persists = variant === 'error' || action !== undefined;
    this.entries.push({
      id: this.nextId++,
      message,
      variant,
      action: action?.label,
      run: action?.run,
      remaining: persists ? null : duration,
      startedAt: 0,
    });
    this.sync();
  }

  public success(message: string, options?: number | ToastOptions): void {
    this.show(message, 'success', options);
  }

  /** Persists until dismissed or its action is used. */
  public error(message: string, options?: Pick<ToastOptions, 'action'>): void {
    this.show(message, 'error', options);
  }

  public warning(message: string, options?: number | ToastOptions): void {
    this.show(message, 'warning', options);
  }

  public info(message: string, options?: number | ToastOptions): void {
    this.show(message, 'info', options);
  }

  private dismiss(id: number): void {
    const entry = this.entries.find(item => item.id === id);
    if (!entry) {
      return;
    }
    clearTimeout(entry.timer);
    this.entries = this.entries.filter(item => item !== entry);
    this.sync();
  }

  private runAction(id: number): void {
    const entry = this.entries.find(item => item.id === id);
    this.dismiss(id);
    entry?.run?.();
  }

  private setPaused(paused: boolean): void {
    if (paused === this.paused) {
      return;
    }
    this.paused = paused;
    this.sync();
  }

  /** Renders the visible toasts and runs a clock only for those in view while not paused. */
  private sync(): void {
    if (this.entries.length === 0) {
      this.overlayRef?.dispose();
      this.overlayRef = null;
      this.stackRef = null;
      this.paused = false;
      return;
    }
    const visible = this.entries.slice(-MAX_VISIBLE_TOASTS);
    for (const entry of this.entries) {
      const running = entry.timer !== undefined;
      const shouldRun = entry.remaining !== null && !this.paused && visible.includes(entry);
      if (running && !shouldRun) {
        clearTimeout(entry.timer);
        entry.timer = undefined;
        entry.remaining = Math.max(0, (entry.remaining ?? 0) - (Date.now() - entry.startedAt));
      } else if (!running && shouldRun) {
        entry.startedAt = Date.now();
        entry.timer = setTimeout(() => this.dismiss(entry.id), entry.remaining ?? 0);
      }
    }
    const stack = this.attachStack();
    stack.setInput(
      'toasts',
      visible.map(({id, message, variant, action}) => ({id, message, variant, action}))
    );
    stack.changeDetectorRef.detectChanges();
  }

  private attachStack(): ComponentRef<ToastStackComponent> {
    if (this.overlayRef && this.stackRef) {
      return this.stackRef;
    }
    const positionStrategy = this.overlay
      .position()
      .global()
      .centerHorizontally()
      .bottom(TOAST_BOTTOM);
    this.overlayRef = this.overlay.create({positionStrategy});
    const ref = this.overlayRef.attach(
      new ComponentPortal(ToastStackComponent, null, this.injector)
    );
    ref.instance.dismissed.subscribe(id => this.dismiss(id));
    ref.instance.actioned.subscribe(id => this.runAction(id));
    ref.instance.pausedChange.subscribe(paused => this.setPaused(paused));
    this.stackRef = ref;
    return ref;
  }
}
