/**
 * The fixed-meaning colours (asset classes, gain/loss, in/out, the categorical palette) never follow
 * the seed: the engine does not derive them, no seed stylesheet sets them, and whatever a seed does
 * to the page they resolve to the same value. Each also keeps one hue across light and dark, and
 * clears its contrast floor on every surface the engine can produce.
 */
import assert from 'node:assert/strict';
import {readdirSync, readFileSync} from 'node:fs';
import {describe, it} from 'node:test';

import {
  APP_SEEDS,
  CATEGORY_COLOUR_NAMES,
  contrastRatio,
  derive,
  FIXED_COLOUR_NAMES,
  hexToOklch,
  hueDistance,
  INTENSITY_STOPS,
  mix,
  NEAR_HUE_DEGREES,
  oklchToHex,
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
// The mark grade of cash flow: same hues as gain and loss, held apart in lightness.
const FLOW_FILLS = {'flow-in-fill': 'gain', 'flow-out-fill': 'loss'};
const FLOW_GAP_MIN = 1.4;
const CATEGORIES = [...CATEGORY_COLOUR_NAMES];
const NUMBERED = CATEGORIES.filter(name => name !== 'category-other');
// How far a category hue stays from loss, from gain and the warm/green assets, and from the petrol
// equity (a teal sits nearer it than any other family; the colour distance below keeps them apart).
const LOSS_HUE_CLEARANCE = 40;
const HUE_CLEARANCE = 28;
const EQUITY_HUE_CLEARANCE = 22;
// OKLab distance below which two fixed colours read as one (the audit's collisions were 0 and 0.016).
const DISTINCT_MIN = 0.08;
// A category must read as a colour, not a grey; a preset accent likewise (Graphite was 0.025).
const CHROMA_MIN = 0.06;
const OTHER_CHROMA_MAX = 0.04;
// Deprecated names that now only alias gain and loss, so the old and the fixed pair never differ.
const DELTAS = {'delta-up': 'gain', 'delta-down': 'loss'};

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

function oklab(hex) {
  const {L, C, H} = hexToOklch(hex);
  const h = (H * Math.PI) / 180;
  return [L, C * Math.cos(h), C * Math.sin(h)];
}
const distance = (a, b) => Math.hypot(...oklab(a).map((v, i) => v - oklab(b)[i]));

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
      [
        ...ASSETS,
        ...CHANGES,
        ...Object.keys(FLOWS),
        ...Object.keys(FLOW_FILLS),
        ...CATEGORIES,
      ].sort()
    );
    for (const name of [...ASSETS, ...CHANGES, ...Object.keys(FLOW_FILLS), ...CATEGORIES]) {
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

  it('lists the categorical palette as 14 numbered colours and one neutral, in order', () => {
    assert.equal(NUMBERED.length, 14);
    assert.deepEqual(
      NUMBERED,
      Array.from({length: 14}, (_, i) => `category-${i + 1}`)
    );
    assert.equal(CATEGORIES.at(-1), 'category-other');
  });

  it('keeps the deprecated deltas on gain and loss, in light and dark', () => {
    for (const [delta, change] of Object.entries(DELTAS)) {
      assert.equal(THEME.light.get(`--color-${delta}`), `var(--color-${change})`);
      assert.equal(THEME.dark.get(`--color-${delta}`), `var(--color-${change})`);
      for (const mode of MODES) assert.equal(themed(mode, delta), themed(mode, change));
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
    const deltas = seedTokenNames().filter(name =>
      Object.keys(DELTAS).some(d => name === `--color-${d}`)
    );
    assert.deepEqual(deltas, [], 'a seed that rewrote a delta would split it from gain and loss');
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
      for (const name of [...FIXED_COLOUR_NAMES, ...Object.keys(DELTAS)]) {
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
  for (const name of [...ASSETS, ...CHANGES, ...Object.keys(FLOW_FILLS), ...NUMBERED]) {
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
    for (const name of [...Object.keys(FLOW_FILLS), ...CATEGORIES]) {
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

describe('fixed colours: cash flow fills', () => {
  for (const [fill, change] of Object.entries(FLOW_FILLS)) {
    it(`${fill} keeps the hue of ${change}`, () => {
      for (const mode of MODES) {
        const a = hexToOklch(themed(mode, fill));
        const b = hexToOklch(themed(mode, change));
        assert.ok(hueDistance(a.H, b.H) <= HUE_TOLERANCE, `${fill} ${mode}`);
      }
    });
  }

  for (const mode of MODES) {
    it(`flow-in-fill is at least ${FLOW_GAP_MIN}:1 from flow-out-fill in ${mode}, the inflow lighter`, () => {
      const [inflow, outflow] = Object.keys(FLOW_FILLS).map(name => themed(mode, name));
      assert.ok(
        contrastRatio(inflow, outflow) >= FLOW_GAP_MIN,
        `${inflow} vs ${outflow}: ${contrastRatio(inflow, outflow).toFixed(2)}`
      );
      assert.ok(hexToOklch(inflow).L > hexToOklch(outflow).L, `${mode}: in is not lighter`);
    });
  }

  it('leaves the text tokens flow-in and flow-out as the gain and loss text colours', () => {
    assert.equal(themed('light', 'gain'), '#00673c');
    assert.equal(themed('light', 'loss'), '#af1426');
    assert.equal(themed('dark', 'gain'), '#57af7d');
    assert.equal(themed('dark', 'loss'), '#ff6d6c');
  });
});

describe('fixed colours: categorical palette', () => {
  const FIXED_APART = [...ASSETS, ...CHANGES, ...Object.keys(FLOW_FILLS)];

  for (const name of NUMBERED) {
    it(`${name} stays clear of gain, loss and the asset colours in hue and in colour`, () => {
      for (const mode of MODES) {
        const {H, C} = hexToOklch(themed(mode, name));
        assert.ok(C >= CHROMA_MIN, `${name} ${mode} chroma ${C.toFixed(3)}`);
        assert.ok(
          hueDistance(H, hexToOklch(themed(mode, 'loss')).H) >= LOSS_HUE_CLEARANCE,
          `${name} ${mode} is near loss`
        );
        for (const other of ['gain', ...ASSETS]) {
          const clearance = other === 'asset-equity' ? EQUITY_HUE_CLEARANCE : HUE_CLEARANCE;
          assert.ok(
            hueDistance(H, hexToOklch(themed(mode, other)).H) >= clearance,
            `${name} ${mode} is near ${other}`
          );
        }
        for (const other of FIXED_APART) {
          assert.ok(
            distance(themed(mode, name), themed(mode, other)) >= DISTINCT_MIN,
            `${name} ${mode} collides with ${other}`
          );
        }
      }
    });
  }

  for (const mode of MODES) {
    it(`keeps every category at least ${DISTINCT_MIN} from every other in ${mode}`, () => {
      for (const [i, a] of CATEGORIES.entries()) {
        for (const b of CATEGORIES.slice(i + 1)) {
          assert.ok(
            distance(themed(mode, a), themed(mode, b)) >= DISTINCT_MIN,
            `${a} and ${b} in ${mode}: ${distance(themed(mode, a), themed(mode, b)).toFixed(3)}`
          );
        }
      }
    });
  }

  it('makes category-other a neutral that is not mistaken for a category', () => {
    for (const mode of MODES) {
      assert.ok(hexToOklch(themed(mode, 'category-other')).C <= OTHER_CHROMA_MAX, mode);
    }
  });

  it('gives a hex the engine reads back as written, so a palette entry is not a typo', () => {
    for (const mode of MODES) {
      for (const name of CATEGORIES) {
        const hex = themed(mode, name);
        const {L, C, H} = hexToOklch(hex);
        assert.equal(oklchToHex({L, C, H}), hex, `${name} ${mode}`);
      }
    }
  });
});

describe('theme presets', () => {
  // A preset recolours the accent. One near the error or success hue would read as a loss or a gain,
  // and a grey one would blur a link or a selected state into body text.
  const presetHue = ({seed}) => hexToOklch(seed);

  for (const preset of PRESETS) {
    it(`${preset.name} is a chromatic accent clear of loss and gain`, () => {
      const {H, C} = presetHue(preset);
      assert.ok(C >= CHROMA_MIN, `${preset.name} chroma ${C.toFixed(3)}`);
      for (const change of CHANGES) {
        for (const mode of MODES) {
          const hue = hexToOklch(themed(mode, change)).H;
          assert.ok(
            hueDistance(H, hue) > NEAR_HUE_DEGREES,
            `${preset.name} is ${hueDistance(H, hue).toFixed(1)} degrees from ${change}`
          );
        }
      }
    });
  }

  it('no longer offers Rose or Graphite', () => {
    assert.deepEqual(
      PRESETS.map(({id}) => id).filter(id => ['rose', 'graphite'].includes(id)),
      []
    );
  });
});

describe('segmented control: the selected cell', () => {
  // lk-segmented / cmn-segmented draw the selected cell as accent-subtle with accent-default text and
  // a border-strong ring, on a surface-raised track. The fill alone sits near the track, so the ring
  // is what makes the cell a 3:1 shape against it (WCAG 1.4.11) and the text is held to 4.5:1.
  const RING_MIN = {standard: 3, more: 4.5};
  const SEGMENTED_SEEDS = [
    ...Object.values(APP_SEEDS).map(({seed}) => seed),
    ...PRESETS.map(p => p.seed),
  ];

  for (const mode of MODES) {
    it(`reads against its track in ${mode} under every app seed and preset`, () => {
      for (const seed of SEGMENTED_SEEDS) {
        for (const intensity of INTENSITIES) {
          for (const contrast of ['standard', 'more']) {
            const t = derive({seed, intensity, mode, contrast}).tokens;
            const where = `${seed} ${intensity} ${mode} ${contrast}`;
            assert.ok(
              contrastRatio(t['border-strong'], t['surface-raised']) >= RING_MIN[contrast],
              `${where}: ring on the track`
            );
            assert.ok(
              contrastRatio(t['accent-default'], t['accent-subtle']) >= TEXT_MIN,
              `${where}: label on the thumb`
            );
          }
        }
      }
    });
  }
});
