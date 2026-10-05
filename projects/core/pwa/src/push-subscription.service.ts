import {DOCUMENT} from '@angular/common';
import {computed, DestroyRef, inject, Injectable, type Signal, signal} from '@angular/core';
import {SwPush} from '@angular/service-worker';
import {firstValueFrom, type Observable} from 'rxjs';

export type PushPermission = 'default' | 'granted' | 'denied';

/** Payload of {@link PushSubscriptionService.subscriptionChanges}. */
export interface PushSubscriptionChange {
  readonly oldSubscription: PushSubscription | null;
  readonly newSubscription: PushSubscription | null;
}

/** Payload of {@link PushSubscriptionService.notificationClicks}. */
export interface PushNotificationClick {
  readonly action: string;
  readonly notification: NotificationOptions & {title?: string};
}

const BASE64_BLOCK = 4;
const IOS_UA = /iPad|iPhone|iPod/;
const IPADOS_PLATFORM = 'MacIntel';

function decodeBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / BASE64_BLOCK) * BASE64_BLOCK, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

function keyMatches(sub: PushSubscription, serverPublicKey: string): boolean {
  const key = sub.options.applicationServerKey;
  if (!key) {
    return false;
  }
  const current = new Uint8Array(key);
  const expected = decodeBase64Url(serverPublicKey);
  return current.length === expected.length && current.every((byte, i) => byte === expected[i]);
}

/**
 * Browser half of Web Push, built from signals on top of Angular's `SwPush`.
 *
 * HTTP-agnostic by design: the app fetches its VAPID public key, calls {@link subscribe} from a
 * user gesture, then POSTs the returned JSON to its own backend. Inert when the service worker is
 * not enabled or the browser lacks push support — {@link isSupported} is false and every
 * mutating call is a no-op or rejects with a clear error.
 */
@Injectable({providedIn: 'root'})
export class PushSubscriptionService {
  private readonly swPush = inject(SwPush);
  private readonly document = inject(DOCUMENT);
  private readonly window = this.document.defaultView;

  private readonly standalone = signal(false);
  private readonly permissionState = signal<PushPermission>('default');
  private readonly currentSubscription = signal<PushSubscription | null>(null);

  /** Service worker enabled and the browser exposes `PushManager` and `Notification`. */
  public readonly isSupported: Signal<boolean> = signal(this.detectSupport()).asReadonly();

  /** True when running as an installed PWA (`display-mode: standalone` or iOS `navigator.standalone`). */
  public readonly isStandalone: Signal<boolean> = this.standalone.asReadonly();

  /** iOS only delivers push to installed PWAs: true on iOS while not running standalone. */
  public readonly requiresInstall: Signal<boolean> = computed(
    () => this.isIos() && !this.standalone()
  );

  /** Notification permission; re-read when the document becomes visible again. */
  public readonly permission: Signal<PushPermission> = this.permissionState.asReadonly();

  /** The active push subscription, or null. */
  public readonly subscription: Signal<PushSubscription | null> =
    this.currentSubscription.asReadonly();

  /** Emits when the browser rotates or drops the subscription. */
  // eslint-disable-next-line rxjs/finnish -- name is part of the documented API
  public readonly subscriptionChanges: Observable<PushSubscriptionChange> =
    this.swPush.pushSubscriptionChanges;

  /** Emits when a notification is clicked (navigation itself is done by ngsw `onActionClick`). */
  // eslint-disable-next-line rxjs/finnish -- name is part of the documented API
  public readonly notificationClicks: Observable<PushNotificationClick> =
    this.swPush.notificationClicks;

  constructor() {
    this.refreshEnvironment();

    if (!this.isSupported()) {
      return;
    }

    const destroyRef = inject(DestroyRef);
    const subscriptionSub = this.swPush.subscription.subscribe(sub => {
      this.currentSubscription.set(sub);
    });
    const onVisibilityChange = (): void => {
      if (this.document.visibilityState === 'visible') {
        this.refreshEnvironment();
      }
    };
    this.document.addEventListener('visibilitychange', onVisibilityChange);

    destroyRef.onDestroy(() => {
      subscriptionSub.unsubscribe();
      this.document.removeEventListener('visibilitychange', onVisibilityChange);
    });
  }

  /**
   * Requests permission (if needed) and subscribes. Call from a user gesture — iOS requires it.
   * Resolves with the JSON the app POSTs to its backend; performs no HTTP itself. An existing
   * subscription made with a different key (VAPID rotation) is dropped first, since browsers
   * refuse to resubscribe under a new key while the old subscription exists.
   */
  public async subscribe(serverPublicKey: string): Promise<PushSubscriptionJSON> {
    if (!this.isSupported()) {
      throw new Error('Push notifications are not supported in this environment.');
    }
    try {
      const existing = await this.resolveSubscription();
      if (existing && !keyMatches(existing, serverPublicKey)) {
        await this.unsubscribe();
      }
      const sub = await this.swPush.requestSubscription({serverPublicKey});
      this.currentSubscription.set(sub);
      return sub.toJSON();
    } finally {
      this.refreshPermission();
    }
  }

  /**
   * Whether the browser's current subscription was created with `serverPublicKey`. Resolves the
   * subscription from the service worker rather than the cached signal, so it is accurate on app
   * start. False without a subscription. Use it to resubscribe after VAPID key rotation.
   */
  public async matchesKey(serverPublicKey: string): Promise<boolean> {
    const sub = await this.resolveSubscription();
    return !!sub && keyMatches(sub, serverPublicKey);
  }

  /** Drops the browser subscription. No-op when unsupported or not subscribed. */
  public async unsubscribe(): Promise<void> {
    if (!(await this.resolveSubscription())) {
      return;
    }
    await this.swPush.unsubscribe();
    this.currentSubscription.set(null);
  }

  private async resolveSubscription(): Promise<PushSubscription | null> {
    if (!this.isSupported()) {
      return null;
    }
    const sub = await firstValueFrom(this.swPush.subscription);
    this.currentSubscription.set(sub);
    return sub;
  }

  private detectSupport(): boolean {
    return (
      this.swPush.isEnabled &&
      !!this.window &&
      'PushManager' in this.window &&
      'Notification' in this.window
    );
  }

  private isIos(): boolean {
    const nav = this.window?.navigator;
    if (!nav) {
      return false;
    }
    // iPadOS 13+ reports a desktop Mac user agent; touch support tells them apart.
    return (
      IOS_UA.test(nav.userAgent) || (nav.platform === IPADOS_PLATFORM && nav.maxTouchPoints > 1)
    );
  }

  private refreshEnvironment(): void {
    const nav = this.window?.navigator as (Navigator & {standalone?: boolean}) | undefined;
    this.standalone.set(
      !!this.window?.matchMedia?.('(display-mode: standalone)').matches || nav?.standalone === true
    );
    this.refreshPermission();
  }

  private refreshPermission(): void {
    this.permissionState.set(
      this.window && 'Notification' in this.window ? this.window.Notification.permission : 'default'
    );
  }
}
