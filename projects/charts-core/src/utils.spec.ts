import {afterEach, describe, expect, it, vi} from 'vitest';

import {
  CATEGORICAL_STEPS,
  chartFontFamily,
  cssVar,
  fontFamily,
  isSeriesEmpty,
  money,
  NARROW_CHART_WIDTH,
  NEUTRAL_STEP,
  percent,
  plainNumber,
  seriesColor,
  valueFormatter,
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

describe('plainNumber', () => {
  it('has no currency symbol and keeps up to two decimals', () => {
    expect(plainNumber(25)).toBe('25');
    expect(plainNumber(1234.567)).toBe('1,234.57');
  });

  it('compacts large values to one decimal', () => {
    expect(plainNumber(12_400, true)).toBe('12.4K');
    expect(plainNumber(-12_400, true)).toBe('-12.4K');
  });

  it('keeps two decimals below 1000 when compact so narrow-range ticks stay distinct', () => {
    const labels = [0.8, 0.85, 0.9].map(tick => plainNumber(tick, true));
    expect(labels).toEqual(['0.8', '0.85', '0.9']);
    expect(new Set(labels).size).toBe(labels.length);
    expect(plainNumber(999.5, true)).toBe('999.5');
  });
});

describe('percent', () => {
  it('uses one decimal', () => {
    expect(percent(62.45)).toBe('62.5%');
  });

  it('keeps at most one decimal when compact, dropping a trailing .0', () => {
    expect(percent(62, true)).toBe('62%');
    expect(percent(62.45, true)).toBe('62.5%');
  });

  it('renders narrow-range ticks as distinct compact labels', () => {
    const labels = [62.2, 62.4, 62.6].map(tick => percent(tick, true));
    expect(labels).toEqual(['62.2%', '62.4%', '62.6%']);
    expect(new Set(labels).size).toBe(labels.length);
  });
});

describe('valueFormatter', () => {
  it('resolves each built-in kind', () => {
    expect(valueFormatter('currency', 'USD')(25, false)).toBe(money(25, 'USD'));
    expect(valueFormatter('currency', 'USD')(12_400, true)).toBe(money(12_400, 'USD', true));
    expect(valueFormatter('number', 'USD')(25, false)).toBe('25');
    expect(valueFormatter('percent', 'USD')(25, false)).toBe('25.0%');
  });

  it('returns a consumer formatter untouched', () => {
    const custom = (v: number): string => `#${v}`;
    expect(valueFormatter(custom, 'USD')).toBe(custom);
  });
});

describe('seriesColor', () => {
  afterEach(() => {
    document.documentElement.style.removeProperty('--color-chart-series-2');
  });

  it('falls back to the shipped colour when the token is unavailable', () => {
    expect(seriesColor(2)).toBe('#cc6184');
  });

  it('draws categories from the accent through the ramp, leaving the neutral for "other"', () => {
    expect(CATEGORICAL_STEPS).toEqual([1, 2, 3, 4, 5, 6, 8, 7]);
    expect(CATEGORICAL_STEPS).not.toContain(NEUTRAL_STEP);
  });

  it('reads the series token when it resolves', () => {
    document.documentElement.style.setProperty('--color-chart-series-2', '#112233');
    expect(seriesColor(2)).toBe('#112233');
  });
});
