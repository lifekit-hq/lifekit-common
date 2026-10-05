import {DOCUMENT} from '@angular/common';
import {TestBed} from '@angular/core/testing';
import {SwPush} from '@angular/service-worker';
import {BehaviorSubject, Subject} from 'rxjs';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {PushSubscriptionService} from './push-subscription.service';

const KEY_BYTES = [250, 251, 252, 253, 254, 255, 1, 2, 3];
// base64url of KEY_BYTES (exercises the `-`/`_` alphabet and missing padding)
const KEY = '-vv8_f7_AQID';

function fakeSubscription(keyBytes: number[] | null): PushSubscription {
  return {
    options: {applicationServerKey: keyBytes ? new Uint8Array(keyBytes).buffer : null},
    toJSON: () => ({endpoint: 'https://push.example/1', keys: {p256dh: 'p', auth: 'a'}}),
  } as unknown as PushSubscription;
}

describe('PushSubscriptionService', () => {
  let subscription$: BehaviorSubject<PushSubscription | null>;
  let swPush: {
    isEnabled: boolean;
    subscription: BehaviorSubject<PushSubscription | null>;
    pushSubscriptionChanges: Subject<unknown>;
    notificationClicks: Subject<unknown>;
    requestSubscription: ReturnType<typeof vi.fn>;
    unsubscribe: ReturnType<typeof vi.fn>;
  };
  let fakeWindow: Record<string, unknown> & {
    navigator: Record<string, unknown>;
    Notification?: {permission: string};
  };
  let fakeDocument: EventTarget & {visibilityState: string; defaultView: unknown};
  let standaloneMatch: boolean;

  function create(enabled = true): PushSubscriptionService {
    swPush.isEnabled = enabled;
    TestBed.configureTestingModule({
      providers: [
        {provide: SwPush, useValue: swPush},
        {provide: DOCUMENT, useValue: fakeDocument},
      ],
    });
    return TestBed.inject(PushSubscriptionService);
  }

  function setVisibility(state: 'visible' | 'hidden'): void {
    fakeDocument.visibilityState = state;
    fakeDocument.dispatchEvent(new Event('visibilitychange'));
  }

  beforeEach(() => {
    subscription$ = new BehaviorSubject<PushSubscription | null>(null);
    swPush = {
      isEnabled: true,
      subscription: subscription$,
      pushSubscriptionChanges: new Subject(),
      notificationClicks: new Subject(),
      requestSubscription: vi.fn(),
      unsubscribe: vi.fn().mockResolvedValue(undefined),
    };
    standaloneMatch = false;
    fakeWindow = {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      PushManager: class {},
      // eslint-disable-next-line @typescript-eslint/naming-convention
      Notification: {permission: 'default'},
      navigator: {userAgent: 'Mozilla/5.0 (X11; Linux)', platform: 'Linux', maxTouchPoints: 0},
      matchMedia: vi.fn(() => ({matches: standaloneMatch})),
    };
    fakeDocument = Object.assign(new EventTarget(), {
      visibilityState: 'visible',
      defaultView: fakeWindow,
    });
  });

  describe('capability detection', () => {
    it('is supported with an enabled worker, PushManager and Notification', () => {
      expect(create().isSupported).toBe(true);
    });

    it('is unsupported when the service worker is disabled', () => {
      expect(create(false).isSupported).toBe(false);
    });

    it('is unsupported without PushManager', () => {
      delete fakeWindow['PushManager'];
      expect(create().isSupported).toBe(false);
    });

    it('is unsupported without Notification', () => {
      delete fakeWindow.Notification;
      const service = create();
      expect(service.isSupported).toBe(false);
      expect(service.permission()).toBe('default');
    });

    it('is unsupported without a window', () => {
      fakeDocument.defaultView = null;
      const service = create();
      expect(service.isSupported).toBe(false);
      expect(service.isStandalone()).toBe(false);
      expect(service.requiresInstall()).toBe(false);
    });

    it('detects standalone via display-mode', () => {
      standaloneMatch = true;
      expect(create().isStandalone()).toBe(true);
    });

    it('detects standalone via iOS navigator.standalone', () => {
      fakeWindow.navigator['standalone'] = true;
      expect(create().isStandalone()).toBe(true);
    });

    it('requires install on iPhone Safari outside standalone', () => {
      fakeWindow.navigator['userAgent'] = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)';
      expect(create().requiresInstall()).toBe(true);
    });

    it('requires install on iPadOS reporting a Mac user agent', () => {
      fakeWindow.navigator['platform'] = 'MacIntel';
      fakeWindow.navigator['maxTouchPoints'] = 5;
      expect(create().requiresInstall()).toBe(true);
    });

    it('does not require install on a real Mac', () => {
      fakeWindow.navigator['platform'] = 'MacIntel';
      expect(create().requiresInstall()).toBe(false);
    });

    it('does not require install on iOS once standalone', () => {
      fakeWindow.navigator['userAgent'] = 'Mozilla/5.0 (iPhone)';
      standaloneMatch = true;
      expect(create().requiresInstall()).toBe(false);
    });

    it('does not require install on Android', () => {
      expect(create().requiresInstall()).toBe(false);
    });
  });

  describe('permission', () => {
    it('reads the current permission', () => {
      fakeWindow.Notification = {permission: 'denied'};
      expect(create().permission()).toBe('denied');
    });

    it('re-reads permission and display mode when the document becomes visible', () => {
      const service = create();
      fakeWindow.Notification = {permission: 'granted'};
      standaloneMatch = true;
      setVisibility('hidden');
      expect(service.permission()).toBe('default');
      setVisibility('visible');
      expect(service.permission()).toBe('granted');
      expect(service.isStandalone()).toBe(true);
    });

    it('stops listening once destroyed', () => {
      const service = create();
      TestBed.resetTestingModule();
      fakeWindow.Notification = {permission: 'granted'};
      setVisibility('visible');
      expect(service.permission()).toBe('default');
    });
  });

  describe('subscription', () => {
    it('mirrors swPush.subscription', () => {
      const service = create();
      expect(service.subscription()).toBeNull();
      const sub = fakeSubscription(KEY_BYTES);
      subscription$.next(sub);
      expect(service.subscription()).toBe(sub);
    });

    it('passes through subscription changes and notification clicks', () => {
      const service = create();
      const changes: unknown[] = [];
      const clicks: unknown[] = [];
      service.subscriptionChanges.subscribe(c => changes.push(c));
      service.notificationClicks.subscribe(c => clicks.push(c));
      const change = {oldSubscription: null, newSubscription: null};
      const click = {action: '', notification: {title: 'x'}};
      swPush.pushSubscriptionChanges.next(change);
      swPush.notificationClicks.next(click);
      expect(changes).toEqual([change]);
      expect(clicks).toEqual([click]);
    });
  });

  describe('subscribe', () => {
    it('requests a subscription with the key and returns its JSON', async () => {
      const service = create();
      const sub = fakeSubscription(KEY_BYTES);
      swPush.requestSubscription.mockResolvedValue(sub);
      fakeWindow.Notification = {permission: 'granted'};

      const json = await service.subscribe(KEY);

      expect(swPush.requestSubscription).toHaveBeenCalledWith({serverPublicKey: KEY});
      expect(json.endpoint).toBe('https://push.example/1');
      expect(service.subscription()).toBe(sub);
      expect(service.permission()).toBe('granted');
    });

    it('refreshes permission and rethrows when the user denies', async () => {
      const service = create();
      swPush.requestSubscription.mockRejectedValue(new Error('denied'));
      fakeWindow.Notification = {permission: 'denied'};

      await expect(service.subscribe(KEY)).rejects.toThrow('denied');
      expect(service.permission()).toBe('denied');
      expect(service.subscription()).toBeNull();
    });

    it('rejects without touching swPush when unsupported', async () => {
      const service = create(false);
      await expect(service.subscribe(KEY)).rejects.toThrow('not supported');
      expect(swPush.requestSubscription).not.toHaveBeenCalled();
    });

    it('drops a subscription made with a rotated key before resubscribing', async () => {
      const service = create();
      subscription$.next(fakeSubscription([...KEY_BYTES.slice(0, -1), 99]));
      swPush.requestSubscription.mockResolvedValue(fakeSubscription(KEY_BYTES));

      await service.subscribe(KEY);

      expect(swPush.unsubscribe).toHaveBeenCalledOnce();
      expect(swPush.unsubscribe.mock.invocationCallOrder[0]).toBeLessThan(
        swPush.requestSubscription.mock.invocationCallOrder[0]
      );
    });

    it('keeps a subscription that already matches the key', async () => {
      const service = create();
      subscription$.next(fakeSubscription(KEY_BYTES));
      swPush.requestSubscription.mockResolvedValue(fakeSubscription(KEY_BYTES));

      await service.subscribe(KEY);

      expect(swPush.unsubscribe).not.toHaveBeenCalled();
      expect(swPush.requestSubscription).toHaveBeenCalledOnce();
    });
  });

  describe('matchesKey', () => {
    it('is false without a subscription', () => {
      expect(create().matchesKey(KEY)).toBe(false);
    });

    it('is false when the subscription carries no key', () => {
      const service = create();
      subscription$.next(fakeSubscription(null));
      expect(service.matchesKey(KEY)).toBe(false);
    });

    it('is true for the same key', () => {
      const service = create();
      subscription$.next(fakeSubscription(KEY_BYTES));
      expect(service.matchesKey(KEY)).toBe(true);
    });

    it('is false for a different key of the same length', () => {
      const service = create();
      subscription$.next(fakeSubscription([...KEY_BYTES.slice(0, -1), 99]));
      expect(service.matchesKey(KEY)).toBe(false);
    });

    it('is false for a key of a different length', () => {
      const service = create();
      subscription$.next(fakeSubscription(KEY_BYTES.slice(0, -1)));
      expect(service.matchesKey(KEY)).toBe(false);
    });
  });

  describe('unsubscribe', () => {
    it('unsubscribes and clears the subscription', async () => {
      const service = create();
      subscription$.next(fakeSubscription(KEY_BYTES));
      await service.unsubscribe();
      expect(swPush.unsubscribe).toHaveBeenCalledOnce();
      expect(service.subscription()).toBeNull();
    });

    it('is a no-op when not subscribed', async () => {
      const service = create();
      await service.unsubscribe();
      expect(swPush.unsubscribe).not.toHaveBeenCalled();
    });

    it('is a no-op when unsupported', async () => {
      const service = create(false);
      await service.unsubscribe();
      expect(swPush.unsubscribe).not.toHaveBeenCalled();
    });
  });

  it('stays inert when the service worker is disabled', () => {
    const service = create(false);
    subscription$.next(fakeSubscription(KEY_BYTES));
    setVisibility('visible');
    expect(service.subscription()).toBeNull();
    expect(service.matchesKey(KEY)).toBe(false);
  });
});
