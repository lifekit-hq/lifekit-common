import {signal, type WritableSignal} from '@angular/core';
import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {PUSH_BACKEND, PushSubscriptionService} from '@lifekit-hq/core/pwa';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {PushRowComponent} from './push-row.component';

const SUB_JSON: PushSubscriptionJSON = {endpoint: 'https://push.example/1'};

describe('PushRowComponent', () => {
  let fixture: ComponentFixture<PushRowComponent>;
  let backend: Record<'publicKey' | 'register' | 'unregister', ReturnType<typeof vi.fn>>;
  let push: {
    isSupported: ReturnType<typeof vi.fn>;
    requiresInstall: ReturnType<typeof vi.fn>;
    permission: WritableSignal<NotificationPermission>;
    subscription: ReturnType<typeof vi.fn>;
    subscribe: ReturnType<typeof vi.fn>;
    unsubscribe: ReturnType<typeof vi.fn>;
  };

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const toggle = (): HTMLButtonElement =>
    el().querySelector<HTMLButtonElement>('button[role="switch"]') as HTMLButtonElement;

  async function press(): Promise<void> {
    toggle().click();
    // Every mocked call settles in microtasks, so one macrotask lets the whole handler finish.
    await new Promise(resolve => setTimeout(resolve));
    fixture.detectChanges();
  }

  function render(): void {
    fixture = TestBed.createComponent(PushRowComponent);
    fixture.componentRef.setInput('appName', 'Finance Sentry');
    fixture.detectChanges();
  }

  beforeEach(() => {
    backend = {
      publicKey: vi.fn().mockResolvedValue('key'),
      register: vi.fn().mockResolvedValue(undefined),
      unregister: vi.fn().mockResolvedValue(undefined),
    };
    push = {
      isSupported: vi.fn().mockReturnValue(true),
      requiresInstall: vi.fn().mockReturnValue(false),
      permission: signal<NotificationPermission>('default'),
      subscription: vi.fn().mockReturnValue(null),
      subscribe: vi.fn().mockResolvedValue(SUB_JSON),
      unsubscribe: vi.fn().mockResolvedValue(undefined),
    };
    TestBed.configureTestingModule({
      providers: [
        {provide: PushSubscriptionService, useValue: push},
        {provide: PUSH_BACKEND, useValue: backend},
      ],
    });
  });

  it('is an enabled, unchecked switch with no notice when off', () => {
    render();
    expect(toggle().getAttribute('aria-checked')).toBe('false');
    expect(toggle().disabled).toBe(false);
    expect(el().querySelector('cmn-alert')).toBeNull();
  });

  it('is checked when a subscription exists', () => {
    push.subscription.mockReturnValue({endpoint: SUB_JSON.endpoint});
    render();
    expect(toggle().getAttribute('aria-checked')).toBe('true');
  });

  it('says to install first on iPhone, even though push looks unsupported there', () => {
    push.requiresInstall.mockReturnValue(true);
    push.isSupported.mockReturnValue(false);
    render();
    expect(toggle().disabled).toBe(true);
    expect(el().querySelector('cmn-alert')?.textContent).toContain(
      'add Finance Sentry to your Home Screen first'
    );
  });

  it('explains a blocked permission and disables the switch', () => {
    push.permission.set('denied');
    render();
    expect(toggle().disabled).toBe(true);
    expect(el().querySelector('cmn-alert')?.textContent).toContain('Notifications blocked');
  });

  it('explains an unsupported browser', () => {
    push.isSupported.mockReturnValue(false);
    render();
    expect(toggle().disabled).toBe(true);
    expect(el().querySelector('cmn-alert')?.textContent).toContain('cannot receive push');
  });

  it('subscribes and registers when turned on', async () => {
    render();
    await press();
    expect(push.subscribe).toHaveBeenCalledWith('key');
    expect(backend.register).toHaveBeenCalledWith(SUB_JSON);
  });

  it('drops the browser subscription when the backend refuses it', async () => {
    backend.register.mockRejectedValue(new Error('500'));
    render();
    await press();
    expect(push.unsubscribe).toHaveBeenCalled();
    expect(el().querySelector('cmn-alert')?.textContent).toContain('Could not turn');
  });

  it('unsubscribes and unregisters its endpoint when turned off', async () => {
    push.subscription.mockReturnValue({endpoint: SUB_JSON.endpoint});
    render();
    await press();
    expect(push.unsubscribe).toHaveBeenCalled();
    expect(backend.unregister).toHaveBeenCalledWith(SUB_JSON.endpoint);
  });

  it('reports a failed turn-off', async () => {
    push.subscription.mockReturnValue({endpoint: SUB_JSON.endpoint});
    push.unsubscribe.mockRejectedValue(new Error('x'));
    render();
    await press();
    expect(el().querySelector('cmn-alert')?.textContent).toContain(
      'Could not turn notifications off'
    );
  });

  it('stays on and retryable when the backend refuses the unregister', async () => {
    push.subscription.mockReturnValue({endpoint: SUB_JSON.endpoint});
    backend.unregister.mockRejectedValue(new Error('500'));
    render();
    await press();
    expect(push.unsubscribe).not.toHaveBeenCalled();
    expect(toggle().getAttribute('aria-checked')).toBe('true');
    expect(el().querySelector('cmn-alert')?.textContent).toContain(
      'Could not turn notifications off'
    );
  });

  it('shows the blocked notice, not a stale failure, after Block', async () => {
    push.subscribe.mockImplementation(() => {
      push.permission.set('denied');
      return Promise.reject(new Error('NotAllowedError'));
    });
    render();
    await press();
    expect(toggle().disabled).toBe(true);
    const text = el().querySelector('cmn-alert')?.textContent;
    expect(text).toContain('Notifications blocked');
    expect(text).not.toContain('Try again');
  });
});
