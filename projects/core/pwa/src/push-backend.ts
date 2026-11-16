import {InjectionToken} from '@angular/core';

/**
 * The server half of Web Push, supplied by the app. The library never does HTTP itself: it asks
 * the backend for the VAPID key, hands it the subscription to store and tells it which one to drop.
 */
export interface PushBackend {
  /** The server's VAPID public key (base64url). */
  publicKey(): Promise<string>;
  /** Stores this browser's subscription for the signed-in user. */
  register(subscription: PushSubscriptionJSON): Promise<void>;
  /** Forgets the subscription with this endpoint. */
  unregister(endpoint: string): Promise<void>;
}

export const PUSH_BACKEND = new InjectionToken<PushBackend>('PUSH_BACKEND');
