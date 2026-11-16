import {type EnvironmentProviders, isDevMode} from '@angular/core';
import {provideServiceWorker} from '@angular/service-worker';

/** Waits for the app to settle, or this long, before registering so first paint is not delayed. */
export const SERVICE_WORKER_REGISTER_TIMEOUT_MS = 30_000;

export interface LifekitServiceWorkerOptions {
  /** Worker script URL. Default `ngsw-worker.js`; an app with a push-aware wrapper passes its own. */
  readonly script?: string;
  /**
   * Whether to register the worker. Default: on in production builds, off under the dev server.
   * Pass `true` to demo the install and update pieces locally.
   */
  readonly enabled?: boolean;
}

/**
 * Registers the Angular service worker the way every lifekit app does: after the app is stable
 * (or {@link SERVICE_WORKER_REGISTER_TIMEOUT_MS}), with `updateViaCache: 'none'` so the browser
 * never serves a stale worker script from the HTTP cache.
 *
 * Needs an `ngsw-config.json` (see `docs/SERVICE-WORKER.md`). `AppUpdateService` and
 * `PushSubscriptionService` stay inert when the worker is disabled.
 */
export function provideLifekitServiceWorker(
  options: LifekitServiceWorkerOptions = {}
): EnvironmentProviders {
  return provideServiceWorker(options.script ?? 'ngsw-worker.js', {
    enabled: options.enabled ?? !isDevMode(),
    registrationStrategy: `registerWhenStable:${SERVICE_WORKER_REGISTER_TIMEOUT_MS}`,
    updateViaCache: 'none',
  });
}
