/**
 * The seed engine's AA gate: every derived pair a component draws is checked against its WCAG
 * floor, with a contrast implementation independent of the engine's own, over the app seeds, the
 * presets and a sweep of synthetic seeds x intensity x light/dark x standard/more contrast.
 *
 * The CI sweep is trimmed for time. SEED_AA_FULL=1 runs the full design-time sweep (704 seeds,
 * 14,080 palettes, about half a minute).
 */
import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {APP_SEEDS, derive, oklchToHex, PRESETS} from '../engine/index.mjs';

const FULL = process.env.SEED_AA_FULL === '1';

const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
const luminance = hex => {
  const [r, g, b] = rgb(hex).map(c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/** `[fg, bg, standard floor, more floor, why]`. */
const PAIRS = [];
const on = (fg, bgs, standard, more, why) =>
  bgs.forEach(bg => PAIRS.push({fg, bg, standard, more, why}));
const S4 = ['surface-bg', 'surface-card', 'surface-raised', 'surface-hover'];
const S3 = S4.slice(0, 3);
on('text-primary', S4, 7, 10, 'body text (Apple 7:1)');
on('text-primary', ['accent-subtle'], 4.5, 7, 'label on a selected row');
on('text-secondary', S4, 4.5, 7, 'secondary text');
on('text-disabled', S3, 4.5, 7, 'tertiary text');
on('text-placeholder', S3, 4.5, 7, 'placeholder');
on('text-inverse', ['accent-default', 'accent-hover', 'accent-active'], 4.5, 7, 'label on a fill');
on('accent-default', [...S3, 'accent-subtle'], 4.5, 7, 'link / accent text');
on('accent-hover', S3, 4.5, 7, 'hovered link');
on('border-strong', S3, 3, 4.5, 'input boundary (1.4.11)');
on('border-focus', S3, 3, 3, 'focus ring (1.4.11)');
for (const status of ['info', 'success', 'warning', 'error']) {
  on(`status-${status}`, S3, 4.5, 7, `${status} text`);
  on(`status-${status}`, [`status-${status}-subtle`], 4.5, 7, `${status} text on its tint`);
}
for (let i = 1; i <= 8; i++) {
  on(`chart-series-${i}`, ['surface-card', 'surface-bg'], 3, 3, 'chart mark (1.4.11)');
}

function failures(options) {
  const {tokens} = derive(options);
  const more = options.contrast === 'more';
  return PAIRS.flatMap(({fg, bg, standard, more: moreFloor}) => {
    const min = more ? moreFloor : standard;
    const r = ratio(tokens[fg], tokens[bg]);
    return r + 1e-9 < min ? [`${fg} on ${bg} ${r.toFixed(2)} < ${min}`] : [];
  });
}

function sweepSeeds() {
  const seeds = [
    ...Object.values(APP_SEEDS).map(app => app.seed),
    ...PRESETS.map(preset => preset.seed),
    '#ffffff',
    '#000000',
  ];
  const hueStep = FULL ? 10 : 30;
  const chromas = FULL ? [0.02, 0.08, 0.14, 0.2, 0.26] : [0.02, 0.14, 0.26];
  const lightnesses = FULL ? [0.25, 0.4, 0.55, 0.7, 0.85, 0.95] : [0.25, 0.55, 0.85];
  for (let H = 0; H < 360; H += hueStep) {
    for (const C of chromas) for (const L of lightnesses) seeds.push(oklchToHex({L, C, H}));
  }
  return [...new Set(seeds)];
}

describe('seed engine AA gate', () => {
  it('derives every app seed at its default intensity with no pair under its floor', () => {
    for (const [app, {seed, intensity}] of Object.entries(APP_SEEDS)) {
      for (const mode of ['light', 'dark']) {
        for (const contrast of ['standard', 'more']) {
          assert.deepEqual(
            failures({seed, intensity, mode, contrast}),
            [],
            `${app} ${mode} ${contrast}`
          );
        }
      }
    }
  });

  it(`holds every floor across the ${FULL ? 'full' : 'trimmed'} seed sweep`, () => {
    const intensities = FULL ? [0, 0.12, 0.45, 0.85, 1] : [0, 0.12, 1];
    const failed = [];
    let palettes = 0;
    for (const seed of sweepSeeds()) {
      for (const intensity of intensities) {
        for (const mode of ['light', 'dark']) {
          for (const contrast of ['standard', 'more']) {
            palettes++;
            try {
              const found = failures({seed, intensity, mode, contrast});
              if (found.length) failed.push({seed, intensity, mode, contrast, found});
            } catch (error) {
              failed.push({seed, intensity, mode, contrast, found: [error.message]});
            }
          }
        }
      }
    }
    assert.ok(palettes > 0);
    assert.deepEqual(failed.slice(0, 5), [], `${failed.length} of ${palettes} palettes fail`);
  });
});
