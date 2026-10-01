import {DOCUMENT} from '@angular/common';
import {DestroyRef, inject, Injectable, type Signal, signal} from '@angular/core';
import {SwUpdate, type VersionEvent} from '@angular/service-worker';

/**
 * Thin wrapper over Angular's `SwUpdate` that exposes update state as a signal.
 *
 * Inert when the service worker is not enabled (dev server, unsupported browser, or no
 * `provideServiceWorker`). Apps render `<lk-update-prompt [ready]="updateReady()">` and call
 * `reload()` from its `lk-update-prompt-reload` event.
 */
@Injectable({providedIn: 'root'})
export class AppUpdateService {
  private readonly swUpdate = inject(SwUpdate);
  private readonly document = inject(DOCUMENT);
  private readonly ready = signal(false);

  /** True once a new app version has been downloaded and is ready to activate. */
  public readonly updateReady: Signal<boolean> = this.ready.asReadonly();

  constructor() {
    if (!this.swUpdate.isEnabled) {
      return;
    }

    const destroyRef = inject(DestroyRef);

    const versionSub = this.swUpdate.versionUpdates.subscribe((event: VersionEvent) => {
      if (event.type === 'VERSION_READY') {
        this.ready.set(true);
      }
    });
    const unrecoverableSub = this.swUpdate.unrecoverable.subscribe(() => {
      this.document.location.reload();
    });

    const onVisibilityChange = (): void => {
      if (this.document.visibilityState === 'visible') {
        this.swUpdate.checkForUpdate().catch(() => undefined);
      }
    };
    this.document.addEventListener('visibilitychange', onVisibilityChange);

    destroyRef.onDestroy(() => {
      versionSub.unsubscribe();
      unrecoverableSub.unsubscribe();
      this.document.removeEventListener('visibilitychange', onVisibilityChange);
    });
  }

  /** Activates the downloaded version, then reloads the page to run it. */
  public async reload(): Promise<void> {
    if (!this.swUpdate.isEnabled) {
      return;
    }
    await this.swUpdate.activateUpdate();
    this.document.location.reload();
  }
}
