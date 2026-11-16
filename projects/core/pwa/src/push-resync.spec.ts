import {beforeEach, describe, expect, it, vi} from 'vitest';

import {type PushBackend} from './push-backend';
import {resyncPushSubscription} from './push-resync';
import {type PushSubscriptionService} from './push-subscription.service';

const JSON_SUB: PushSubscriptionJSON = {endpoint: 'https://push.example/1'};
const ROTATED_JSON: PushSubscriptionJSON = {endpoint: 'https://push.example/2'};

describe('resyncPushSubscription', () => {
  let backend: Record<keyof PushBackend, ReturnType<typeof vi.fn>>;
  let push: {
    isSupported: ReturnType<typeof vi.fn>;
    permission: ReturnType<typeof vi.fn>;
    subscription: ReturnType<typeof vi.fn>;
    matchesKey: ReturnType<typeof vi.fn>;
    subscribe: ReturnType<typeof vi.fn>;
  };

  const run = (): Promise<void> =>
    resyncPushSubscription(
      push as unknown as PushSubscriptionService,
      backend as unknown as PushBackend
    );

  beforeEach(() => {
    backend = {
      publicKey: vi.fn().mockResolvedValue('key'),
      register: vi.fn().mockResolvedValue(undefined),
      unregister: vi.fn().mockResolvedValue(undefined),
    };
    push = {
      isSupported: vi.fn().mockReturnValue(true),
      permission: vi.fn().mockReturnValue('granted'),
      subscription: vi.fn().mockReturnValue({toJSON: () => JSON_SUB}),
      matchesKey: vi.fn().mockResolvedValue(true),
      subscribe: vi.fn().mockResolvedValue(ROTATED_JSON),
    };
  });

  it('re-sends the current subscription when the key matches', async () => {
    await run();
    expect(backend.register).toHaveBeenCalledExactlyOnceWith(JSON_SUB);
    expect(push.subscribe).not.toHaveBeenCalled();
  });

  it('resubscribes under the new key after a rotation', async () => {
    push.matchesKey.mockResolvedValue(false);
    await run();
    expect(push.subscribe).toHaveBeenCalledWith('key');
    expect(backend.register).toHaveBeenCalledExactlyOnceWith(ROTATED_JSON);
  });

  it('does nothing when unsupported or not granted', async () => {
    push.isSupported.mockReturnValue(false);
    await run();
    push.isSupported.mockReturnValue(true);
    push.permission.mockReturnValue('default');
    await run();
    expect(backend.publicKey).not.toHaveBeenCalled();
  });

  it('does nothing without a subscription', async () => {
    push.matchesKey.mockResolvedValue(false);
    push.subscription.mockReturnValue(null);
    await run();
    expect(push.subscribe).not.toHaveBeenCalled();
    expect(backend.register).not.toHaveBeenCalled();
  });

  it('swallows a backend failure', async () => {
    backend.publicKey.mockRejectedValue(new Error('offline'));
    await expect(run()).resolves.toBeUndefined();
  });
});
