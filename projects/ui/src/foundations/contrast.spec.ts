import {blend, contrastRatio, gradeContrast, luminance, parseColor, toHex} from './contrast';

const WHITE = {r: 255, g: 255, b: 255};
const BLACK = {r: 0, g: 0, b: 0};

describe('contrast', () => {
  it('parses rgb(), rgba() and color(srgb) strings', () => {
    expect(parseColor('rgb(15, 26, 31)')).toEqual({r: 15, g: 26, b: 31});
    expect(parseColor('rgba(15, 26, 31, 0.5)')).toEqual({r: 15, g: 26, b: 31});
    expect(parseColor('color(srgb 1 0.5 0)')).toEqual({r: 255, g: 127.5, b: 0});
  });

  it('returns null for colours it cannot read', () => {
    expect(parseColor('transparent')).toBeNull();
  });

  it('computes the WCAG extremes and is symmetric', () => {
    expect(contrastRatio(BLACK, WHITE)).toBeCloseTo(21, 5);
    expect(contrastRatio(WHITE, BLACK)).toBeCloseTo(21, 5);
    expect(contrastRatio(WHITE, WHITE)).toBe(1);
  });

  it('matches a known pair (#767676 on white is 4.54:1)', () => {
    expect(contrastRatio({r: 0x76, g: 0x76, b: 0x76}, WHITE)).toBeCloseTo(4.54, 2);
  });

  it('uses the linear segment for very dark channels', () => {
    expect(luminance({r: 5, g: 5, b: 5})).toBeCloseTo(5 / 255 / 12.92, 6);
  });

  it('blends foreground over background by alpha', () => {
    expect(blend(BLACK, WHITE, 0.5)).toEqual({r: 127.5, g: 127.5, b: 127.5});
    expect(blend(BLACK, WHITE, 0)).toEqual(WHITE);
  });

  it('grades against the required minimum', () => {
    expect(gradeContrast(4.49, 4.5)).toBe('fail');
    expect(gradeContrast(4.5, 4.5)).toBe('AA');
    expect(gradeContrast(7, 4.5)).toBe('AAA');
    expect(gradeContrast(3, 3)).toBe('AA');
  });

  it('formats hex, rounding channels', () => {
    expect(toHex({r: 15, g: 26, b: 31.4})).toBe('#0f1a1f');
  });
});
