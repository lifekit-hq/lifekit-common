import {Component, Injector, runInInjectionContext, signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {of, Subject} from 'rxjs';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {motionDurationMs} from '../../tokens/motion';
import {CmnPullRefreshService, registerPullRefresh} from './pull-refresh.service';

describe('CmnPullRefreshService', () => {
  let service: CmnPullRefreshService;

  beforeEach(() => {
    vi.useRealTimers();
    service = TestBed.inject(CmnPullRefreshService);
  });

  it('should offer the pull only while a reload is registered', () => {
    expect(service.available()).toBe(false);
    const withdraw = service.register(() => undefined);
    expect(service.available()).toBe(true);
    withdraw();
    expect(service.available()).toBe(false);
  });

  it('should run the latest registration, and keep it when an older one is withdrawn', async () => {
    const older = vi.fn();
    const newer = vi.fn();
    const withdrawOlder = service.register(older);
    service.register(newer);
    withdrawOlder();

    expect(service.available()).toBe(true);
    await service.refresh();
    expect(older).not.toHaveBeenCalled();
    expect(newer).toHaveBeenCalledOnce();
  });

  it('should do nothing with no reload registered', async () => {
    await service.refresh();
    expect(service.refreshing()).toBe(false);
  });

  it('should stay refreshing until a returned promise settles', async () => {
    let finish!: () => void;
    service.register(() => new Promise<void>(resolve => (finish = resolve)));

    const done = service.refresh();
    expect(service.refreshing()).toBe(true);
    finish();
    await done;
    expect(service.refreshing()).toBe(false);
  });

  it('should wait for a returned observable to complete', async () => {
    const source = new Subject<number>();
    service.register(() => source);
    let settled = false;
    const done = service.refresh().then(() => (settled = true));

    source.next(1);
    await new Promise(resolve => setTimeout(resolve, motionDurationMs('long') + 20));
    expect(settled).toBe(false);
    source.complete();
    await done;
    expect(settled).toBe(true);
  });

  it('should keep the indicator up for a long motion duration when the reload is instant', async () => {
    service.register(() => of(1));
    const started = performance.now();
    await service.refresh();
    expect(performance.now() - started).toBeGreaterThanOrEqual(motionDurationMs('long') - 5);
  });

  it('should ignore a second refresh while one is running', async () => {
    const reload = vi.fn();
    service.register(reload);
    const first = service.refresh();
    await service.refresh();
    await first;
    expect(reload).toHaveBeenCalledOnce();
  });

  it('should end the refresh when the reload throws or rejects', async () => {
    const withdraw = service.register(() => {
      throw new Error('boom');
    });
    await service.refresh();
    expect(service.refreshing()).toBe(false);

    withdraw();
    service.register(() => Promise.reject(new Error('nope')));
    await service.refresh();
    expect(service.refreshing()).toBe(false);
  });

  it('should hold the refresh until a busy signal clears', async () => {
    const busy = signal(true);
    service.register(() => undefined, {busy});
    let settled = false;
    const done = service.refresh().then(() => (settled = true));

    await new Promise(resolve => setTimeout(resolve, motionDurationMs('long') + 20));
    expect(settled).toBe(false);
    expect(service.refreshing()).toBe(true);

    busy.set(false);
    await done;
    expect(settled).toBe(true);
  });

  it('should end the refresh when the registration is withdrawn while busy stays true', async () => {
    const withdraw = service.register(() => undefined, {busy: signal(true)});
    const done = service.refresh();
    withdraw();
    await done;
    expect(service.refreshing()).toBe(false);
  });

  it('should not wait for a busy signal that is already clear', async () => {
    service.register(() => undefined, {busy: signal(false)});
    await service.refresh();
    expect(service.refreshing()).toBe(false);
  });
});

describe('registerPullRefresh', () => {
  @Component({template: ''})
  class HostComponent {
    constructor() {
      registerPullRefresh(() => undefined);
    }
  }

  it('should register for the life of the component that called it', () => {
    const service = TestBed.inject(CmnPullRefreshService);
    const fixture = TestBed.createComponent(HostComponent);
    expect(service.available()).toBe(true);
    fixture.destroy();
    expect(service.available()).toBe(false);
  });

  it('should need an injection context', () => {
    expect(() => registerPullRefresh(() => undefined)).toThrow();
    const injector = TestBed.inject(Injector);
    expect(() =>
      runInInjectionContext(injector, () => registerPullRefresh(() => undefined))
    ).not.toThrow();
  });
});
