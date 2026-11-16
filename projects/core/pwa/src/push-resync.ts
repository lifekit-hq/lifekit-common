import {type PushBackend} from './push-backend';
import {type PushSubscriptionService} from './push-subscription.service';

/**
 * Re-sends the browser's push subscription to the backend, for an app that treats the browser as
 * the source of truth. Call it once per page load. Does nothing without permission or a
 * subscription; after a VAPID rotation it resubscribes under the new key first (no prompt is
 * needed, permission is already granted). Failures are swallowed: a resync is best effort and must
 * not break startup.
 */
export async function resyncPushSubscription(
  push: PushSubscriptionService,
  backend: PushBackend
): Promise<void> {
  if (!push.isSupported() || push.permission() !== 'granted') {
    return;
  }
  try {
    const key = await backend.publicKey();
    if (await push.matchesKey(key)) {
      const current = push.subscription();
      if (current) {
        await backend.register(current.toJSON());
      }
    } else if (push.subscription()) {
      await backend.register(await push.subscribe(key));
    }
  } catch {
    // best effort
  }
}
