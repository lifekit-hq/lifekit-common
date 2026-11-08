import {afterEach, describe, expect, it, vi} from 'vitest';

import {canAnimate, motionDurationMs, prefersReducedMotion} from './motion';

describe('motion helpers', () => {
  afterEach(() => {
    document.documentElement.style.removeProperty('--cmn-duration-short');
    document.documentElement.style.removeProperty('--cmn-duration-medium');
    vi.restoreAllMocks();
  });

  describe('motionDurationMs', () => {
    it("falls back to Carbon's value where the stylesheet is not loaded", () => {
      expect(motionDurationMs('short')).toBe(150);
      expect(motionDurationMs('medium')).toBe(240);
      expect(motionDurationMs('long')).toBe(400);
    });

    it('reads the token live, in milliseconds', () => {
      document.documentElement.style.setProperty('--cmn-duration-short', '90ms');
      expect(motionDurationMs('short')).toBe(90);
    });

    it('reads a token written in seconds', () => {
      document.documentElement.style.setProperty('--cmn-duration-medium', '0.3s');
      expect(motionDurationMs('medium')).toBe(300);
    });

    it('falls back when there is no root to read', () => {
      expect(motionDurationMs('short', null)).toBe(150);
    });
  });

  describe('prefersReducedMotion', () => {
    it('is true when the system asks for less motion', () => {
      vi.spyOn(window, 'matchMedia').mockReturnValue({matches: true} as MediaQueryList);
      expect(prefersReducedMotion()).toBe(true);
    });

    it('is false otherwise, and without a window', () => {
      vi.spyOn(window, 'matchMedia').mockReturnValue({matches: false} as MediaQueryList);
      expect(prefersReducedMotion()).toBe(false);
      expect(prefersReducedMotion(null)).toBe(false);
    });
  });

  describe('canAnimate', () => {
    const original = Object.getOwnPropertyDescriptor(Element.prototype, 'animate');

    afterEach(() => {
      Object.defineProperty(Element.prototype, 'animate', original as PropertyDescriptor);
    });

    it('is true where Element.animate exists and the system allows motion', () => {
      vi.spyOn(window, 'matchMedia').mockReturnValue({matches: false} as MediaQueryList);
      expect(canAnimate(document.createElement('div'))).toBe(true);
    });

    it('is false under Reduce Motion', () => {
      vi.spyOn(window, 'matchMedia').mockReturnValue({matches: true} as MediaQueryList);
      expect(canAnimate(document.createElement('div'))).toBe(false);
    });

    it('is false where the host has no Element.animate (jsdom, happy-dom)', () => {
      Object.defineProperty(Element.prototype, 'animate', {value: undefined, configurable: true});
      expect(canAnimate(document.createElement('div'))).toBe(false);
    });
  });
});
