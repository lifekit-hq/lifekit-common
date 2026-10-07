/**
 * Colour maths for the seed engine: sRGB hex <-> OKLCH, WCAG 2 contrast and sRGB alpha blending.
 * Zero dependencies and no DOM, so the same code runs in Node (generation, the AA gate) and in the
 * browser (ThemeService, <lk-theme-picker>).
 */

const toLinear = c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const fromLinear = c => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const clamp01 = c => Math.min(1, Math.max(0, c));

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** `#rgb` / `#rrggbb` (the `#` optional) as lower-case `#rrggbb`, or `null` when it is not one. */
export function normalizeHex(value) {
  const match = HEX.exec(String(value ?? '').trim());
  if (!match) return null;
  const digits = match[1].toLowerCase();
  return `#${digits.length === 3 ? [...digits].map(d => d + d).join('') : digits}`;
}

function channels(hex) {
  const normalized = normalizeHex(hex);
  if (!normalized) throw new TypeError(`not a hex colour: ${hex}`);
  return [1, 3, 5].map(i => parseInt(normalized.slice(i, i + 2), 16) / 255);
}

function toHex(rgb) {
  return `#${rgb
    .map(c =>
      Math.round(clamp01(c) * 255)
        .toString(16)
        .padStart(2, '0')
    )
    .join('')}`;
}

/** OKLCH of an sRGB hex colour: `L` 0-1, `C` chroma, `H` hue in degrees. */
export function hexToOklch(hex) {
  const [r, g, b] = channels(hex).map(toLinear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return {L, C: Math.hypot(A, B), H: ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360};
}

function oklchToLinear({L, C, H}) {
  const a = C * Math.cos((H * Math.PI) / 180);
  const b = C * Math.sin((H * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const GAMUT_EPSILON = 1e-4;
const GAMUT_STEPS = 24;
const inGamut = linear => linear.every(c => c >= -GAMUT_EPSILON && c <= 1 + GAMUT_EPSILON);

/**
 * An OKLCH colour as an sRGB hex. Out-of-gamut colours are mapped by reducing chroma at fixed
 * lightness and hue, so the hue the user picked survives.
 */
export function oklchToHex({L, C, H}) {
  const lightness = clamp01(L);
  let chroma = C;
  if (!inGamut(oklchToLinear({L: lightness, C: chroma, H}))) {
    let lo = 0;
    let hi = chroma;
    for (let i = 0; i < GAMUT_STEPS; i++) {
      const mid = (lo + hi) / 2;
      if (inGamut(oklchToLinear({L: lightness, C: mid, H}))) lo = mid;
      else hi = mid;
    }
    chroma = lo;
  }
  return toHex(oklchToLinear({L: lightness, C: chroma, H}).map(fromLinear));
}

/** WCAG 2 relative luminance of a hex colour. */
export function luminance(hex) {
  const [r, g, b] = channels(hex).map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2 contrast ratio between two hex colours (1-21). */
export function contrastRatio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** `fg` at `alpha` over `bg`, blended in sRGB as the browser composites an rgba fill. */
export function mix(fg, bg, alpha) {
  const f = channels(fg);
  const g = channels(bg);
  return toHex(f.map((c, i) => c * alpha + g[i] * (1 - alpha)));
}

/** The shorter angular distance between two hues, in degrees (0-180). */
export function hueDistance(a, b) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}
