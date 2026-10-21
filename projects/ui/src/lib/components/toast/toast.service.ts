import {Overlay, OverlayRef} from '@angular/cdk/overlay';
import {ComponentPortal} from '@angular/cdk/portal';
import {inject, Injectable, Injector} from '@angular/core';

import {DEFAULT_DURATION_MS, ToastComponent, type ToastVariant} from './toast.component';

/**
 * Shows toasts in a CDK overlay. Success, warning and info close themselves after `duration`
 * (3s by default). An error toast stays until it is dismissed (guardrails F1, Carbon
 * notifications): a message someone has to act on must not time out under them.
 */
@Injectable({providedIn: 'root'})
export class ToastService {
  private readonly overlay = inject(Overlay);
  private readonly injector = inject(Injector);

  /** `duration` applies to non-error toasts only; an error toast ignores it and persists. */
  public show(message: string, variant: ToastVariant, duration = DEFAULT_DURATION_MS): void {
    const positionStrategy = this.overlay.position().global().centerHorizontally().bottom('24px');
    const overlayRef: OverlayRef = this.overlay.create({positionStrategy});

    const portal = new ComponentPortal(ToastComponent, null, this.injector);
    const ref = overlayRef.attach(portal);

    ref.setInput('message', message);
    ref.setInput('variant', variant);

    const dispose = (): void => {
      if (overlayRef.hasAttached()) {
        overlayRef.dispose();
      }
    };

    ref.instance.dismissed.subscribe(dispose);
    if (variant !== 'error') {
      setTimeout(dispose, duration);
    }
  }

  public success(message: string, duration?: number): void {
    this.show(message, 'success', duration);
  }

  /** Persists until dismissed. */
  public error(message: string): void {
    this.show(message, 'error');
  }

  public warning(message: string, duration?: number): void {
    this.show(message, 'warning', duration);
  }

  public info(message: string, duration?: number): void {
    this.show(message, 'info', duration);
  }
}
