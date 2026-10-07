/**
 * The fixed-meaning colours (asset classes, gain/loss, in/out) never follow the seed: the engine
 * does not derive them, no seed stylesheet sets them, and whatever a seed does to the page they
 * resolve to the same value. Each also keeps one hue across light and dark, and clears its
 * contrast floor on every surface the engine can produce.
 */
import assert from 'node:assert/strict';
import {readdirSync, readFileSync} from 'node:fs';
import {describe, it} from 'node:test';

import {
  APP_SEEDS,
  contrastRatio,
  derive,
  FIXED_COLOUR_NAMES,
  hexToOklch,
  hueDistance,
  INTENSITY_STOPS,
  mix,
  PRESETS,
  seedTokenNames,
  seedVariants,
  toDeclarations,
} from '../engine/index.mjs';
import {SEEDS_DIR} from '../scripts/build-seeds.mjs';

const THEME_CSS = readFileSync(new URL('../theme.css', import.meta.url), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  ''
);

const MARK_MIN = 3;
const TEXT_MIN = 4.5;
const TINT_ALPHA = 0.15;
const HUE_TOLERANCE = 1.5;
const MODES = ['light', 'dark'];

const ASSETS = ['asset-equity', 'asset-crypto', 'asset-cash'];
const CHANGES = ['gain', 'loss'];
const FLOWS = {'flow-in': 'gain', 'flow-out': 'loss'};

/** The declarations of the blocks whose selector list names one of `selectors`. */
function declared(selectors) {
  const vars = new Map();
  for (const [, selector, body] of THEME_CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!selector.split(',').some(s => selectors.includes(s.trim()))) continue;
    for (const [, name, value] of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
      vars.set(name, value.trim());
    }
  }
  return vars;
}

const light = declared([':root', "[data-theme='light']"]);
const THEME = {light, dark: new Map([...light, ...declared(["[data-theme='dark']"])])};

/** A fixed token's value in a theme, following a `var(--color-…)` alias. */
function themed(mode, name) {
  const value = THEME[mode].get(`--color-${name}`);
  assert.ok(value, `--color-${name} is not declared in the ${mode} theme`);
  const alias = value.match(/^var\(--color-([\w-]+)\)$/);
  return alias ? themed(mode, alias[1]) : value;
}

/** What `<html>` resolves each custom property to: theme.css, then the seed's inline overrides. */
function resolved(mode, declarations) {
  const vars = new Map(THEME[mode]);
  for (const [name, value] of Object.entries(declarations)) vars.set(name, value);
  return Object.fromEntries(FIXED_COLOUR_NAMES.map(name => [name, vars.get(`--color-${name}`)]));
}

const SEEDS = [
  ...Object.values(APP_SEEDS).map(({seed}) => seed),
  ...PRESETS.map(({seed}) => seed),
  '#000000',
  '#ffffff',
  '#ff0000',
  '#00ff00',
  '#ffff00',
  '#808080',
];
const INTENSITIES = [0, ...Object.values(INTENSITY_STOPS), 1];

/** Every surface the engine places under the fixed colours, by theme. */
const SURFACES = {light: [], dark: []};
for (const seed of SEEDS) {
  for (const intensity of INTENSITIES) {
    for (const mode of MODES) {
      for (const contrast of ['standard', 'more']) {
        const {tokens} = derive({seed, intensity, mode, contrast});
        SURFACES[mode].push(tokens['surface-bg'], tokens['surface-card'], tokens['surface-raised']);
      }
    }
  }
}

describe('fixed colours: declared', () => {
  it('names every fixed token once, in theme.css light and dark', () => {
    assert.deepEqual(
      [...FIXED_COLOUR_NAMES].sort(),
      [...ASSETS, ...CHANGES, ...Object.keys(FLOWS)].sort()
    );
    for (const name of [...ASSETS, ...CHANGES]) {
      for (const mode of MODES)
        assert.match(themed(mode, name), /^#[0-9a-f]{6}$/, `${name} ${mode}`);
    }
  });

  it('keeps cash flow on the colours of a change of value', () => {
    for (const [flow, change] of Object.entries(FLOWS)) {
      assert.equal(THEME.light.get(`--color-${flow}`), `var(--color-${change})`);
      for (const mode of MODES) assert.equal(themed(mode, flow), themed(mode, change));
    }
  });

  it('keeps the pre-#971 finance-sentry colours where they already clear contrast', () => {
    assert.equal(themed('light', 'asset-equity'), '#175a6d');
    assert.equal(themed('dark', 'asset-crypto'), '#f59e0b');
    assert.equal(themed('dark', 'asset-cash'), '#10b981');
  });
});

describe('fixed colours: independent of the seed', () => {
  it('is never derived by the engine, in any mode or contrast level', () => {
    for (const seed of SEEDS) {
      for (const mode of MODES) {
        for (const contrast of ['standard', 'more']) {
          const tokens = Object.keys(derive({seed, mode, contrast}).tokens);
          assert.deepEqual(
            tokens.filter(name => FIXED_COLOUR_NAMES.includes(name)),
            []
          );
        }
      }
    }
    const rewritten = seedTokenNames().filter(name =>
      FIXED_COLOUR_NAMES.some(f => name === `--color-${f}`)
    );
    assert.deepEqual(rewritten, []);
  });

  it('is set by none of the app seed stylesheets', () => {
    const sheets = readdirSync(SEEDS_DIR).filter(file => file.endsWith('.css'));
    assert.ok(sheets.length >= 2, 'at least two seed stylesheets');
    for (const file of sheets) {
      const css = readFileSync(new URL(file, `file://${SEEDS_DIR}`), 'utf8');
      for (const name of FIXED_COLOUR_NAMES) {
        assert.ok(!css.includes(`--color-${name}:`), `${file} sets --color-${name}`);
      }
    }
  });

  it('resolves to an identical value under every seed, intensity, theme and contrast level', () => {
    for (const mode of MODES) {
      const baseline = resolved(mode, {});
      const seen = new Set();
      for (const seed of SEEDS) {
        for (const intensity of INTENSITIES) {
          const variants = seedVariants({seed, intensity});
          for (const variant of Object.keys(variants).filter(v => v.split('-')[0] === mode)) {
            assert.deepEqual(
              resolved(mode, variants[variant]),
              baseline,
              `${seed} ${intensity} ${variant}`
            );
            seen.add(
              JSON.stringify(resolved(mode, toDeclarations(derive({seed, intensity, mode}).tokens)))
            );
          }
        }
      }
      assert.equal(seen.size, 1, `${mode}: every seed resolves the fixed tokens alike`);
    }
  });
});

describe('fixed colours: one hue in light and dark', () => {
  for (const name of [...ASSETS, ...CHANGES]) {
    it(`${name} moves only in lightness between themes`, () => {
      const [a, b] = MODES.map(mode => hexToOklch(themed(mode, name)));
      assert.ok(
        hueDistance(a.H, b.H) <= HUE_TOLERANCE,
        `${name}: ${a.H.toFixed(1)} vs ${b.H.toFixed(1)}`
      );
    });
  }
});

describe('fixed colours: contrast', () => {
  // Asset-class colours are marks (a donut slice, a legend dot): WCAG 1.4.11, 3:1.
  // Gain and loss are also read as text on a surface and on their own 15% tint: WCAG 1.4.3, 4.5:1.
  for (const mode of MODES) {
    for (const name of ASSETS) {
      it(`${name} is a ${MARK_MIN}:1 mark on every ${mode} surface`, () => {
        const hex = themed(mode, name);
        const worst = Math.min(...SURFACES[mode].map(surface => contrastRatio(hex, surface)));
        assert.ok(worst >= MARK_MIN, `${name} ${hex} is ${worst.toFixed(2)}`);
      });
    }
    for (const name of CHANGES) {
      it(`${name} is ${TEXT_MIN}:1 text on every ${mode} surface and its own tint`, () => {
        const hex = themed(mode, name);
        const worst = Math.min(
          ...SURFACES[mode].flatMap(surface => [
            contrastRatio(hex, surface),
            contrastRatio(hex, mix(hex, surface, TINT_ALPHA)),
          ])
        );
        assert.ok(worst >= TEXT_MIN, `${name} ${hex} is ${worst.toFixed(2)}`);
      });
    }
  }
});
