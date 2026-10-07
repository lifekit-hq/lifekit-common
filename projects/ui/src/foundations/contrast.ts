/** WCAG 2.x contrast maths for the foundations stories. Pure; no DOM. */

export interface Rgb {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

export type ContrastGrade = 'AAA' | 'AA' | 'fail';

const CHANNEL_MAX = 255;
const LINEAR_THRESHOLD = 0.03928;
const LINEAR_DIVISOR = 12.92;
const GAMMA_OFFSET = 0.055;
const GAMMA_DIVISOR = 1.055;
const GAMMA_EXPONENT = 2.4;
const LUMA_R = 0.2126;
const LUMA_G = 0.7152;
const LUMA_B = 0.0722;
const FLARE = 0.05;
const AAA_TEXT = 7;
const HEX_RADIX = 16;
const HEX_WIDTH = 2;

/** Parses the forms `getComputedStyle` yields for a resolved colour: `rgb()`, `rgba()` and `color(srgb …)`. */
export function parseColor(css: string): Rgb | null {
  const legacy = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/.exec(css.trim());
  if (legacy) {
    return {r: Number(legacy[1]), g: Number(legacy[2]), b: Number(legacy[3])};
  }
  const srgb = /^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/.exec(css.trim());
  if (srgb) {
    return {
      r: Number(srgb[1]) * CHANNEL_MAX,
      g: Number(srgb[2]) * CHANNEL_MAX,
      b: Number(srgb[3]) * CHANNEL_MAX,
    };
  }
  return null;
}

/** Composites `fg` over `bg` at `alpha` (0–1), e.g. a status colour at 15% over a card. */
export function blend(fg: Rgb, bg: Rgb, alpha: number): Rgb {
  const mix = (a: number, b: number): number => a * alpha + b * (1 - alpha);
  return {r: mix(fg.r, bg.r), g: mix(fg.g, bg.g), b: mix(fg.b, bg.b)};
}

function linear(channel: number): number {
  const c = channel / CHANNEL_MAX;
  return c <= LINEAR_THRESHOLD
    ? c / LINEAR_DIVISOR
    : Math.pow((c + GAMMA_OFFSET) / GAMMA_DIVISOR, GAMMA_EXPONENT);
}

export function luminance({r, g, b}: Rgb): number {
  return LUMA_R * linear(r) + LUMA_G * linear(g) + LUMA_B * linear(b);
}

export function contrastRatio(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + FLARE) / (lo + FLARE);
}

/** Grades a ratio against the `required` minimum (4.5 for text, 3 for UI components and large text). */
export function gradeContrast(ratio: number, required: number): ContrastGrade {
  if (ratio < required) {
    return 'fail';
  }
  return ratio >= AAA_TEXT ? 'AAA' : 'AA';
}

export function toHex({r, g, b}: Rgb): string {
  return (
    '#' + [r, g, b].map(c => Math.round(c).toString(HEX_RADIX).padStart(HEX_WIDTH, '0')).join('')
  );
}
