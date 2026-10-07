/**
 * The seed engine: one colour in, the whole `--color-*` palette out.
 *
 *   derive({seed: '#4f46e5', intensity: 0.12, mode: 'dark', contrast: 'standard'})
 *     -> {tokens: {'surface-bg': '#…', 'accent-default': '#…', …}, warnings: [], seed: {…}}
 *
 * Every foreground is placed by an OKLCH lightness solver against explicit contrast floors, so
 * WCAG AA holds by construction; `test/seed-aa.spec.mjs` verifies it independently over a sweep of
 * seeds. The token names are the ones theme.css ships (without the `--color-` prefix), so no
 * component changes when a seed is applied. Structure (radii, spacing, type, motion, shadows) is
 * never derived.
 *
 * Borrowed: Discord's one colour + intensity, Material's seed-tinted neutrals with roles solved to
 * contrast floors, Apple's single accent, grouped surfaces and increased-contrast variant.
 */
import {contrastRatio, hexToOklch, hueDistance, mix, normalizeHex, oklchToHex} from './colour.mjs';
import {DEFAULT_INTENSITY} from './presets.mjs';

/** Fixed semantic hues (OKLCH degrees), so red always means loss whatever the seed. */
export const STATUS_HUES = Object.freeze({info: 255, success: 150, warning: 70, error: 25});

/** Status tints (`status-*-subtle`) are the status colour at this alpha over the card. */
export const STATUS_TINT_ALPHA = 0.15;

/** A seed within this many degrees of a status hue can read as that status. */
export const NEAR_HUE_DEGREES = 25;

/** Below this chroma a seed is a grey: its hue means nothing, so no hue rule applies. */
const ACHROMATIC_CHROMA = 0.04;
/** The least chroma the accent is derived with, so a grey seed still yields a visible accent. */
const MIN_SEED_CHROMA = 0.02;

/** Contrast floors per level. Apple asks 7:1 for small text; WCAG 1.4.11 asks 3:1 for UI parts. */
const FLOORS = {
  standard: {primary: 7, text: 4.5, ui: 3},
  more: {primary: 10, text: 7, ui: 4.5},
};
/** Focus rings and chart marks stay at the WCAG 1.4.11 floor at either level. */
const NON_TEXT_FLOOR = 3;

const SOLVER_STEP = 0.0025;
const SOLVER_LIMIT = 400;

/** Chart categories avoid this arc around the error and success hues (deltas own red and green). */
const DELTA_HUE_GUARD = 20;
const CHART_WALK_DEGREES = 360 - 4 * DELTA_HUE_GUARD;
/** Series 2-8 take these eighths of the walk, ordered so neighbours differ most. */
const CHART_ORDER = [4, 2, 6, 1, 5, 3, 7];
const CHART_STEPS = 8;

/** Accent ramp 100-1000: fixed lightness (light theme order) and a chroma bell over it. */
const RAMP_LIGHTNESS = [0.965, 0.92, 0.85, 0.76, 0.67, 0.58, 0.5, 0.43, 0.36, 0.28];
const RAMP_CHROMA = [0.25, 0.45, 0.7, 0.9, 1, 1, 0.95, 0.85, 0.7, 0.55];

/**
 * Moves L in `direction` (-1 darker, +1 lighter) until the colour clears every `[against, min]`
 * floor. Throws when no lightness does, which the AA sweep proves does not happen for any seed.
 */
function solve({L, C, H}, floors, direction) {
  let lightness = Math.min(1, Math.max(0, L));
  for (let step = 0; step < SOLVER_LIMIT && lightness >= 0 && lightness <= 1; step++) {
    const hex = oklchToHex({L: lightness, C, H});
    if (floors.every(([against, min]) => contrastRatio(hex, against) >= min)) return hex;
    lightness += direction * SOLVER_STEP;
  }
  throw new Error(`seed engine: no lightness clears ${JSON.stringify(floors)} at H${H.toFixed(0)}`);
}

/**
 * Walks `degrees` of the wheel from `from`, skipping the arcs around error and success, so a
 * chart category never wears the colour of a gain or a loss.
 */
function walkHue(from, degrees) {
  const guarded = [STATUS_HUES.error, STATUS_HUES.success];
  let hue = from;
  let left = degrees;
  while (left > 0) {
    hue = (hue + 1) % 360;
    if (!guarded.some(centre => hueDistance(hue, centre) <= DELTA_HUE_GUARD)) left -= 1;
  }
  return hue;
}

/**
 * Derives the full palette from one seed colour.
 *
 * @param {object} options
 * @param {string} options.seed the brand colour, `#rgb` or `#rrggbb`
 * @param {number} [options.intensity] 0 (Apple grey surfaces) to 1 (Discord-strength tint); the
 *   default is the quiet 0.12
 * @param {'light' | 'dark'} [options.mode]
 * @param {'standard' | 'more'} [options.contrast] `more` is the `prefers-contrast: more` palette
 * @returns {{tokens: Record<string, string>, warnings: {code: string, status: string, message: string}[], seed: {hex: string, L: number, C: number, H: number}}}
 */
export function derive({
  seed,
  intensity = DEFAULT_INTENSITY,
  mode = 'light',
  contrast = 'standard',
}) {
  const hex = normalizeHex(seed);
  if (!hex) throw new TypeError(`seed engine: not a hex colour: ${seed}`);
  const source = hexToOklch(hex);
  const H = source.H;
  const seedChroma = Math.max(source.C, MIN_SEED_CHROMA);
  const dark = mode === 'dark';
  const floor = contrast === 'more' ? FLOORS.more : FLOORS.standard;
  /** The direction that raises a foreground's contrast against the surfaces. */
  const fg = dark ? +1 : -1;
  const t = Math.min(1, Math.max(0, Number.isFinite(intensity) ? intensity : DEFAULT_INTENSITY));
  /** Neutral chroma: 0.003 is an Apple grey with a hint of the hue; 0.04 is a Discord tint. */
  const neutralChroma = 0.003 + t * 0.037;
  const warnings = [];
  const T = {};

  // Surfaces: Apple's grouped ground, content and raised. In dark, elevation gets lighter.
  const surfaces = dark
    ? {bg: [0.17, 1], card: [0.215, 1], raised: [0.255, 1.05], hover: [0.295, 1.1]}
    : {
        bg: [0.965, 0.8],
        card: [1 - Math.max(0, t - 0.3) * 0.03, 0.3],
        raised: [0.935, 1],
        hover: [0.905, 1.1],
      };
  for (const [name, [L, factor]] of Object.entries(surfaces)) {
    T[`surface-${name}`] = oklchToHex({L, C: neutralChroma * factor, H});
  }
  const S = [T['surface-bg'], T['surface-card'], T['surface-raised'], T['surface-hover']];
  const S3 = S.slice(0, 3);
  const on = (surfaces, min) => surfaces.map(surface => [surface, min]);
  const textChroma = Math.min(neutralChroma * 1.4, 0.03);

  // Text tiers: Apple's label / secondary / tertiary. Primary is held to 7:1, the rest to AA.
  const text = (L, surfaces, min) => solve({L, C: textChroma, H}, on(surfaces, min), fg);
  T['text-primary'] = text(dark ? 0.94 : 0.2, S, floor.primary);
  T['text-secondary'] = text(dark ? 0.79 : 0.42, S, floor.text);
  T['text-disabled'] = text(dark ? 0.7 : 0.52, S3, floor.text);
  T['text-placeholder'] = text(dark ? 0.7 : 0.5, S3, floor.text);

  // Borders: default is a decorative hairline; strong bounds inputs (WCAG 1.4.11).
  const more = contrast === 'more';
  const hairline = dark ? (more ? 0.42 : 0.32) : more ? 0.7 : 0.885;
  T['border-default'] = oklchToHex({L: hairline, C: neutralChroma * 1.2, H});
  T['border-strong'] = solve(
    {L: dark ? 0.5 : 0.62, C: neutralChroma * 1.5, H},
    on(S3, floor.ui),
    fg
  );

  // Accent: the seed's hue and chroma, lightness solved so it reads as text on every surface and
  // carries the inverse label as a fill.
  const accentChroma = Math.min(seedChroma, dark ? 0.15 : 0.19);
  T['text-inverse'] = dark
    ? oklchToHex({L: 0.18, C: Math.min(accentChroma * 0.4, 0.04), H})
    : '#ffffff';
  T['accent-subtle'] = oklchToHex(
    dark
      ? {L: 0.3, C: Math.min(accentChroma * 0.45, 0.02 + t * 0.05), H}
      : {L: 0.94, C: Math.min(accentChroma * 0.3, 0.02 + t * 0.03), H}
  );
  const accentFloors = [
    ...on([...S3, T['accent-subtle']], floor.text),
    [T['text-inverse'], floor.text],
  ];
  const accentStart = dark
    ? Math.min(Math.max(source.L, 0.72), 0.95)
    : Math.min(Math.max(source.L, 0.36), 0.56);
  T['accent-default'] = solve({L: accentStart, C: accentChroma, H}, accentFloors, fg);
  const accentL = hexToOklch(T['accent-default']).L;
  T['accent-hover'] = solve(
    {L: accentL + (dark ? 0.06 : -0.05), C: accentChroma, H},
    accentFloors,
    fg
  );
  T['accent-active'] = solve(
    {L: accentL + (dark ? -0.05 : -0.1), C: accentChroma, H},
    [[T['text-inverse'], floor.text]],
    fg
  );
  T['border-focus'] = solve(
    {L: accentL + (dark ? 0 : 0.06), C: accentChroma, H},
    on(S3, NON_TEXT_FLOOR),
    fg
  );
  // The 100-1000 ramp for components that index the scale; dark mirrors it, as theme.css does.
  const ramp = dark ? [...RAMP_LIGHTNESS].reverse() : RAMP_LIGHTNESS;
  ramp.forEach((L, i) => {
    const bell = RAMP_CHROMA[dark ? RAMP_CHROMA.length - 1 - i : i];
    const lightness = dark && i < 2 ? L - 0.02 : L;
    T[`accent-${(i + 1) * 100}`] = oklchToHex({L: lightness, C: accentChroma * bell, H});
  });

  // Status: fixed hues; only lightness moves. Info folds into the accent when the seed is itself
  // that blue, so it never reads as a second accent.
  const statusHues = {...STATUS_HUES};
  if (hueDistance(H, statusHues.info) < NEAR_HUE_DEGREES) statusHues.info = H;
  if (source.C >= ACHROMATIC_CHROMA) {
    for (const status of ['success', 'warning', 'error']) {
      if (hueDistance(H, STATUS_HUES[status]) < NEAR_HUE_DEGREES) {
        warnings.push({
          code: 'near-status',
          status,
          message: `The colour is close to the ${status} colour, so it can read as ${status}.`,
        });
      }
    }
  }
  for (const [status, hue] of Object.entries(statusHues)) {
    const C = dark ? 0.13 : 0.17;
    // The tint is made from the colour itself, so it is recomputed on every step until both the
    // surfaces and the tint clear the floor (computing it once from the start colour fails `more`).
    let colour;
    for (let i = 0, L = dark ? 0.78 : 0.5; i < SOLVER_LIMIT; i++, L += fg * SOLVER_STEP) {
      const candidate = oklchToHex({L, C, H: hue});
      const tint = mix(candidate, T['surface-card'], STATUS_TINT_ALPHA);
      if ([...S3, tint].every(against => contrastRatio(candidate, against) >= floor.text)) {
        colour = candidate;
        break;
      }
    }
    if (!colour) throw new Error(`seed engine: no lightness clears status ${status}`);
    T[`status-${status}`] = colour;
    T[`status-${status}-subtle`] = mix(colour, T['surface-card'], STATUS_TINT_ALPHA);
  }
  // Colour on money is for the change only (up or down), never a whole screen.
  T['delta-up'] = T['status-success'];
  T['delta-down'] = T['status-error'];

  // Chart series: 1 is the accent; 2-8 walk the wheel from the seed, clear of red and green.
  T['chart-series-1'] = T['accent-default'];
  CHART_ORDER.forEach((eighth, i) => {
    const hue = walkHue(H, (eighth * CHART_WALK_DEGREES) / CHART_STEPS);
    const L = (dark ? 0.74 : 0.6) + (i % 2 ? 0.05 : -0.03) * (dark ? 1 : -1);
    T[`chart-series-${i + 2}`] = solve(
      {L, C: dark ? 0.12 : 0.14, H: hue},
      on([T['surface-card'], T['surface-bg']], NON_TEXT_FLOOR),
      fg
    );
  });
  T['chart-series-9'] = T['text-disabled'];
  T['chart-grid'] = T['border-default'];

  // Ends of a generated accent ramp, kept for the token API.
  T['accent-scale-light'] = oklchToHex({L: 0.975, C: neutralChroma * 0.5, H});
  T['accent-scale-dark'] = oklchToHex({L: 0.15, C: neutralChroma * 0.5, H});

  return {tokens: T, warnings, seed: {hex, L: source.L, C: source.C, H}};
}

/** Derived tokens as custom-property declarations: `{'--color-surface-bg': '#…', …}`. */
export function toDeclarations(tokens) {
  return Object.fromEntries(
    Object.entries(tokens).map(([name, value]) => [`--color-${name}`, value])
  );
}

/** Derived tokens as one CSS rule. */
export function toCss(selector, tokens, indent = '') {
  const body = Object.entries(toDeclarations(tokens))
    .map(([name, value]) => `${indent}  ${name}: ${value};`)
    .join('\n');
  return `${indent}${selector} {\n${body}\n${indent}}\n`;
}
