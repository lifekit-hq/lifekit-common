import {describe, expect, it, vi} from 'vitest';

import {
  chartFontFamily,
  cssVar,
  fontFamily,
  isSeriesEmpty,
  money,
  NARROW_CHART_WIDTH,
  xTickLimit,
} from './utils';

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

describe('chart font and emptiness helpers', () => {
  it('falls back to the sans stack when the token is unset, never a bare family', () => {
    expect(chartFontFamily()).toBe(
      "'IBM Plex Sans Variable', 'IBM Plex Sans', system-ui, sans-serif"
    );
    expect(fontFamily({})).toContain('sans-serif');
    expect(fontFamily({fontFamily: 'Foo'})).toBe('Foo');
  });

  it('reads the --font-sans token when defined', () => {
    document.documentElement.style.setProperty('--font-sans', 'Roboto, sans-serif');
    expect(chartFontFamily()).toBe('Roboto, sans-serif');
    document.documentElement.style.removeProperty('--font-sans');
  });

  it('isSeriesEmpty is true for no series or series without points', () => {
    expect(isSeriesEmpty([])).toBe(true);
    expect(isSeriesEmpty([{points: []}])).toBe(true);
    expect(isSeriesEmpty([{points: [1]}])).toBe(false);
  });
});

describe('xTickLimit', () => {
  const WIDE_LIMIT = 8;

  it('keeps the desktop limit at and above the narrow breakpoint', () => {
    expect(xTickLimit(NARROW_CHART_WIDTH, WIDE_LIMIT)).toBe(WIDE_LIMIT);
    expect(xTickLimit(1200, WIDE_LIMIT)).toBe(WIDE_LIMIT);
  });

  it('thins ticks below the narrow breakpoint', () => {
    expect(xTickLimit(NARROW_CHART_WIDTH - 1, WIDE_LIMIT)).toBeLessThan(WIDE_LIMIT);
    expect(xTickLimit(360, WIDE_LIMIT)).toBe(4);
  });

  it('never raises a wide limit that is already lower', () => {
    expect(xTickLimit(360, 3)).toBe(3);
  });
});
