import {describe, expect, it, vi} from 'vitest';

import {cssVar, money} from './utils';

describe('cssVar', () => {
  it('returns the CSS custom property value when set', () => {
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      getPropertyValue: (name: string) => (name === '--color-test' ? ' #abc ' : ''),
    } as unknown as CSSStyleDeclaration);

    expect(cssVar('--color-test', '#fallback')).toBe('#abc');
    vi.restoreAllMocks();
  });

  it('returns the fallback when the property is empty', () => {
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      getPropertyValue: () => '',
    } as unknown as CSSStyleDeclaration);

    expect(cssVar('--color-missing', '#fallback')).toBe('#fallback');
    vi.restoreAllMocks();
  });
});

describe('money', () => {
  it('formats as standard currency by default', () => {
    expect(money(1234, 'USD')).toBe('$1,234');
  });

  it('formats as compact when compact=true', () => {
    const result = money(1_234_000, 'USD', true);
    expect(result).toMatch(/\$1\.2M/);
  });

  it('formats zero correctly', () => {
    expect(money(0, 'USD')).toBe('$0');
  });

  it('formats negative values', () => {
    expect(money(-500, 'USD')).toBe('-$500');
  });
});
