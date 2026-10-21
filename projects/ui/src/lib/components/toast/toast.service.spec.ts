import {provideHttpClient, withXhr} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {ApplicationRef} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {CMN_OVERLAY_INSET_BOTTOM} from '../../tokens/overlay-inset';
import {type ToastVariant} from './toast.component';
import {MAX_VISIBLE_TOASTS, ToastService} from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting()],
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

  it('keeps an error toast up until it is dismissed (guardrails F1)', () => {
    service.error('Could not save that change.');
    render();
    vi.advanceTimersByTime(60_000);
    expect(toasts()).toHaveLength(1);

    document.querySelector<HTMLButtonElement>('cmn-toast button[aria-label="Dismiss"]')?.click();
    expect(toasts()).toHaveLength(0);
  });

  it('ignores a duration passed with an error toast', () => {
    service.show('Could not save that change.', 'error', 1000);
    vi.advanceTimersByTime(1000);
    expect(toasts()).toHaveLength(1);
  });

  it('stacks independent toasts', () => {
    service.info('One');
    service.info('Two');
    expect(toasts()).toHaveLength(2);
    vi.runAllTimers();
    expect(toasts()).toHaveLength(0);
  });

  function messages(): string[] {
    return [...toasts()].map(el => el.textContent?.replace('Undo', '').trim() ?? '');
  }

  function button(name: string): HTMLButtonElement | null {
    return (
      [...document.querySelectorAll<HTMLButtonElement>('cmn-toast button')].find(
        el => (el.getAttribute('aria-label') ?? el.textContent?.trim()) === name
      ) ?? null
    );
  }

  function stack(): HTMLElement {
    return document.querySelector('cmn-toast-stack') as HTMLElement;
  }

  it('still takes a duration as an options object', () => {
    service.success('Saved', {duration: 1000});
    vi.advanceTimersByTime(1000);
    expect(toasts()).toHaveLength(0);
  });

  describe('action (guardrails F1, F4)', () => {
    it('renders the action and keeps a toast that carries one up until it is used', () => {
      const run = vi.fn();
      service.success('Transaction deleted', {duration: 1000, action: {label: 'Undo', run}});
      vi.advanceTimersByTime(60_000);
      expect(toasts()).toHaveLength(1);

      button('Undo')?.click();
      expect(run).toHaveBeenCalledOnce();
      expect(toasts()).toHaveLength(0);
    });

    it('closes an action toast on dismiss without running the action', () => {
      const run = vi.fn();
      service.info('Archived', {action: {label: 'Undo', run}});
      button('Dismiss')?.click();
      expect(run).not.toHaveBeenCalled();
      expect(toasts()).toHaveLength(0);
    });

    it('lets an error toast carry an action and still persist', () => {
      const run = vi.fn();
      service.error('Sync failed.', {action: {label: 'Retry', run}});
      vi.advanceTimersByTime(60_000);
      button('Retry')?.click();
      expect(run).toHaveBeenCalledOnce();
      expect(toasts()).toHaveLength(0);
    });

    it('renders no action button without an action', () => {
      service.info('Saved');
      expect(document.querySelectorAll('cmn-toast button')).toHaveLength(1);
      vi.runAllTimers();
    });
  });

  describe('stacking (guardrails F3)', () => {
    it('puts the newest toast last, nearest the bottom edge', () => {
      service.error('One');
      service.error('Two');
      service.error('Three');
      expect(messages()).toEqual(['One', 'Two', 'Three']);
      const [first, , last] = [...toasts()].map(el => el.getBoundingClientRect());
      expect(last.top).toBeGreaterThan(first.bottom);
    });

    it(`shows at most ${MAX_VISIBLE_TOASTS}, and the oldest comes back once there is room`, () => {
      for (const message of ['One', 'Two', 'Three', 'Four']) {
        service.error(message);
      }
      expect(messages()).toEqual(['Two', 'Three', 'Four']);

      button('Dismiss')?.click();
      expect(messages()).toEqual(['One', 'Three', 'Four']);
    });

    it('holds the clock of a toast pushed out of view', () => {
      service.info('Timed', 1000);
      for (const message of ['One', 'Two', 'Three']) {
        service.error(message);
      }
      vi.advanceTimersByTime(5000);

      button('Dismiss')?.click();
      expect(messages()).toEqual(['Timed', 'Two', 'Three']);
      vi.advanceTimersByTime(1000);
      expect(messages()).toEqual(['Two', 'Three']);
    });

    it('uses one overlay for the whole stack', () => {
      service.info('One');
      service.info('Two');
      expect(document.querySelectorAll('cmn-toast-stack')).toHaveLength(1);
      vi.runAllTimers();
      expect(document.querySelectorAll('cmn-toast-stack')).toHaveLength(0);
    });
  });

  describe('pause (guardrails F2, WCAG 2.2.1)', () => {
    /** Answers `(hover: hover)`: true for a mouse or trackpad, false on a touch screen. */
    function canHover(hover: boolean): void {
      const matchMedia = window.matchMedia.bind(window);
      const answer: Pick<MediaQueryList, 'matches'> = {matches: hover};
      vi.spyOn(window, 'matchMedia').mockImplementation(query =>
        query === '(hover: hover)' ? (answer as MediaQueryList) : matchMedia(query)
      );
    }

    beforeEach(() => {
      canHover(true);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('pauses while hovered and resumes with the time that was left', () => {
      service.success('Saved', 3000);
      vi.advanceTimersByTime(1000);
      stack().dispatchEvent(new MouseEvent('mouseenter'));
      vi.advanceTimersByTime(10_000);
      expect(toasts()).toHaveLength(1);

      stack().dispatchEvent(new MouseEvent('mouseleave'));
      vi.advanceTimersByTime(1999);
      expect(toasts()).toHaveLength(1);
      vi.advanceTimersByTime(1);
      expect(toasts()).toHaveLength(0);
    });

    it('does not pause on a hover left behind by a tap on a touch screen', () => {
      vi.restoreAllMocks();
      canHover(false);
      service.success('Saved', 3000);
      stack().dispatchEvent(new MouseEvent('mouseenter'));
      vi.advanceTimersByTime(3000);
      expect(toasts()).toHaveLength(0);
    });

    it('still pauses on focus on a touch screen', () => {
      vi.restoreAllMocks();
      canHover(false);
      service.info('Saved', 1000);
      button('Dismiss')?.dispatchEvent(new FocusEvent('focusin', {bubbles: true}));
      vi.advanceTimersByTime(5000);
      expect(toasts()).toHaveLength(1);
      button('Dismiss')?.click();
    });

    it('pauses while focus is inside the stack, and resumes once it leaves', () => {
      service.info('Saved', 1000);
      button('Dismiss')?.dispatchEvent(new FocusEvent('focusin', {bubbles: true}));
      vi.advanceTimersByTime(5000);
      expect(toasts()).toHaveLength(1);

      button('Dismiss')?.dispatchEvent(
        new FocusEvent('focusout', {bubbles: true, relatedTarget: document.body})
      );
      vi.advanceTimersByTime(1000);
      expect(toasts()).toHaveLength(0);
    });

    it('stays paused while focused even when the pointer leaves', () => {
      service.info('Saved', 1000);
      stack().dispatchEvent(new MouseEvent('mouseenter'));
      button('Dismiss')?.dispatchEvent(new FocusEvent('focusin', {bubbles: true}));
      stack().dispatchEvent(new MouseEvent('mouseleave'));
      vi.advanceTimersByTime(5000);
      expect(toasts()).toHaveLength(1);
      button('Dismiss')?.click();
    });

    it('keeps the pause when focus moves between toasts', () => {
      service.info('One', 1000);
      service.info('Two', 1000);
      const [first, second] = [...document.querySelectorAll<HTMLButtonElement>('cmn-toast button')];
      first.dispatchEvent(new FocusEvent('focusin', {bubbles: true}));
      first.dispatchEvent(new FocusEvent('focusout', {bubbles: true, relatedTarget: second}));
      vi.advanceTimersByTime(5000);
      expect(toasts()).toHaveLength(2);
      stack().dispatchEvent(new FocusEvent('focusout', {relatedTarget: null}));
      vi.runAllTimers();
    });

    it('resumes the clock when the focused toast is removed without a focusout', () => {
      service.success('Saved', 3000);
      service.error('Failed');
      const [, errorDismiss] = [
        ...document.querySelectorAll<HTMLButtonElement>('cmn-toast button[aria-label="Dismiss"]'),
      ];
      errorDismiss.focus();
      errorDismiss.dispatchEvent(new FocusEvent('focusin', {bubbles: true}));
      vi.advanceTimersByTime(10_000);
      expect(toasts()).toHaveLength(2);

      errorDismiss.click();
      expect(toasts()).toHaveLength(1);
      vi.advanceTimersByTime(3000);
      expect(toasts()).toHaveLength(0);
    });
  });

  describe('position (guardrails F5)', () => {
    afterEach(() => {
      document.documentElement.style.removeProperty(CMN_OVERLAY_INSET_BOTTOM);
    });

    function gapBelow(): number {
      const pane = document.querySelector('.cdk-overlay-pane') as HTMLElement;
      return window.innerHeight - pane.getBoundingClientRect().bottom;
    }

    it('sits 24px above the bottom edge outside the app shell', () => {
      service.error('Saved');
      render();
      expect(gapBelow()).toBeCloseTo(24, 0);
    });

    it("follows the app shell's bottom inset (tab bar and floating action), live", () => {
      document.documentElement.style.setProperty(CMN_OVERLAY_INSET_BOTTOM, '70px');
      service.error('Saved');
      render();
      expect(gapBelow()).toBeCloseTo(94, 0);

      document.documentElement.style.setProperty(CMN_OVERLAY_INSET_BOTTOM, '120px');
      expect(gapBelow()).toBeCloseTo(144, 0);
    });
  });
});
