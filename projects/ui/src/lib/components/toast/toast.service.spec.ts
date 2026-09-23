import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {ApplicationRef} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {type ToastVariant} from './toast.component';
import {ToastService} from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ToastService);
  });

  /** The overlay attaches the toast to ApplicationRef; nothing renders until it ticks. */
  function render(): void {
    TestBed.inject(ApplicationRef).tick();
  }

  afterEach(() => {
    vi.useRealTimers();
  });

  function toasts(): NodeListOf<Element> {
    return document.querySelectorAll('cmn-toast');
  }

  it('attaches a toast to the overlay and renders its message', () => {
    service.show('Saved', 'success');
    render();
    expect(toasts()).toHaveLength(1);
    expect(document.body.textContent).toContain('Saved');
  });

  it('disposes the toast once its duration elapses', () => {
    service.show('Saved', 'success', 1000);
    expect(toasts()).toHaveLength(1);

    vi.advanceTimersByTime(1000);
    expect(toasts()).toHaveLength(0);
  });

  it('keeps the toast up until its duration elapses', () => {
    service.show('Saved', 'success', 5000);
    vi.advanceTimersByTime(4999);
    expect(toasts()).toHaveLength(1);
  });

  it('disposes early when the toast is dismissed, and the timer does not double-dispose', () => {
    service.show('Saved', 'success', 5000);
    render();
    document.querySelector<HTMLButtonElement>('cmn-toast button[aria-label="Dismiss"]')?.click();
    expect(toasts()).toHaveLength(0);

    expect(() => vi.advanceTimersByTime(5000)).not.toThrow();
    expect(toasts()).toHaveLength(0);
  });

  it.each<[keyof ToastService, ToastVariant, string]>([
    ['success', 'success', 'bg-status-success'],
    ['error', 'error', 'bg-status-error'],
    ['warning', 'warning', 'bg-status-warning'],
    ['info', 'info', 'bg-status-info'],
  ])('%s() shows a "%s" toast', (method, _variant, expectedClass) => {
    (service[method] as (message: string) => void)('Hello');
    render();
    const el = document.querySelector('cmn-toast [role]');
    expect(el?.className).toContain(expectedClass);
    vi.runAllTimers();
  });

  it('stacks independent toasts', () => {
    service.info('One');
    service.info('Two');
    expect(toasts()).toHaveLength(2);
    vi.runAllTimers();
    expect(toasts()).toHaveLength(0);
  });
});
