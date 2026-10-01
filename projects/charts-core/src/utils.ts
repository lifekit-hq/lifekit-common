export function cssVar(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

const FALLBACK_FONT_FAMILY = 'Inter, system-ui, sans-serif';

/** Canvas text cannot inherit CSS, so charts read the token font stack explicitly. */
export function chartFontFamily(): string {
  return cssVar('--font-sans', FALLBACK_FONT_FAMILY);
}

/** The font stack a chart should draw with: its resolved token, else the token default. */
export function fontFamily(tokens: {fontFamily?: string}): string {
  return tokens.fontFamily ?? FALLBACK_FONT_FAMILY;
}

/** True when the series holds nothing to draw (no points at all). */
export function isSeriesEmpty(series: readonly {points: readonly unknown[]}[]): boolean {
  return series.every(s => s.points.length === 0);
}

export function money(value: number, currency: string, compact = false): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    notation: compact ? 'compact' : 'standard',
    minimumFractionDigits: 0,
    maximumFractionDigits: compact ? 1 : 0,
  }).format(value);
}
