import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {describe, it} from 'node:test';

import {
  APP_SEEDS,
  applySeedDeclarations,
  clearSeedDeclarations,
  clearStoredSeed,
  DEFAULT_INTENSITY,
  derive,
  hexToOklch,
  hueDistance,
  normalizeHex,
  normalizeSeedChoice,
  PRESETS,
  readStoredSeed,
  SEED_CACHE_VERSION,
  SEED_STORAGE_KEY,
  SEED_VARIANTS,
  seedTokenNames,
  seedVariant,
  STATUS_HUES,
  storeSeed,
  toCss,
} from '../engine/index.mjs';
import {seedCss, SEEDS_DIR} from '../scripts/build-seeds.mjs';

const THEME_CSS = readFileSync(new URL('../theme.css', import.meta.url), 'utf8');

class MemoryStorage {
  items = new Map();
  getItem(key) {
    return this.items.has(key) ? this.items.get(key) : null;
  }
  setItem(key, value) {
    this.items.set(key, String(value));
  }
  removeItem(key) {
    this.items.delete(key);
  }
}

class FakeElement {
  props = new Map();
  style = {
    setProperty: (name, value) => this.props.set(name, value),
    removeProperty: name => this.props.delete(name),
  };
}

describe('derive', () => {
  it('rejects a seed that is not a hex colour', () => {
    assert.throws(() => derive({seed: 'teal'}), TypeError);
    assert.throws(() => derive({seed: '#12345'}), TypeError);
  });

  it('accepts #rgb and a seed without the hash', () => {
    assert.deepEqual(derive({seed: '#fff'}).tokens, derive({seed: 'ffffff'}).tokens);
  });

  it('emits every colour token theme.css themes, so a seed replaces the whole palette', () => {
    const themed = new Set(
      [...THEME_CSS.matchAll(/--color-([\w-]+):\s*#/g)].map(([, name]) => name)
    );
    const derived = new Set(Object.keys(derive({seed: '#175a6d'}).tokens));
    assert.deepEqual(
      [...themed].filter(name => !derived.has(name)),
      []
    );
  });

  it('emits the same token names in every mode and contrast level', () => {
    const names = o => Object.keys(derive({seed: '#8e3b8a', ...o}).tokens).sort();
    assert.deepEqual(names({mode: 'dark'}), names({}));
    assert.deepEqual(names({contrast: 'more'}), names({}));
  });

  it('defaults to the quiet intensity and clamps out-of-range ones', () => {
    const quiet = derive({seed: '#4f46e5'}).tokens;
    assert.deepEqual(derive({seed: '#4f46e5', intensity: DEFAULT_INTENSITY}).tokens, quiet);
    assert.deepEqual(
      derive({seed: '#4f46e5', intensity: 7}).tokens,
      derive({seed: '#4f46e5', intensity: 1}).tokens
    );
    assert.deepEqual(derive({seed: '#4f46e5', intensity: Number.NaN}).tokens, quiet);
  });

  it('tints the surfaces more as intensity rises', () => {
    const chroma = intensity =>
      hexToOklch(derive({seed: '#4f46e5', intensity}).tokens['surface-bg']).C;
    assert.ok(chroma(0) < chroma(DEFAULT_INTENSITY));
    assert.ok(chroma(DEFAULT_INTENSITY) < chroma(1));
  });

  it('keeps the fs seed on the petrol accent theme.css ships', () => {
    assert.equal(derive({seed: APP_SEEDS.fs.seed}).tokens['accent-default'], '#175a6d');
  });

  it('gives each app its own accent', () => {
    const accents = Object.values(APP_SEEDS).map(
      ({seed, intensity}) => derive({seed, intensity}).tokens['accent-default']
    );
    assert.equal(new Set(accents).size, accents.length);
  });

  it('aliases the deltas to success and error and series 1 to the accent', () => {
    const {tokens} = derive({seed: '#8e3b8a', mode: 'dark'});
    assert.equal(tokens['delta-up'], tokens['status-success']);
    assert.equal(tokens['delta-down'], tokens['status-error']);
    assert.equal(tokens['chart-series-1'], tokens['accent-default']);
  });

  it('keeps chart categories out of the red and green arcs the deltas own', () => {
    for (const {seed} of PRESETS) {
      const {tokens} = derive({seed});
      for (let i = 2; i <= 8; i++) {
        const {H} = hexToOklch(tokens[`chart-series-${i}`]);
        // Gamut mapping can nudge the rendered hue a few degrees; the walk itself keeps 20.
        assert.ok(hueDistance(H, STATUS_HUES.error) > 12, `${seed} series ${i} reads as red`);
        assert.ok(hueDistance(H, STATUS_HUES.success) > 12, `${seed} series ${i} reads as green`);
      }
    }
  });

  it('folds info into a blue seed so it never reads as a second accent', () => {
    const blue = derive({seed: '#1f5fbf'});
    assert.ok(hueDistance(hexToOklch(blue.tokens['status-info']).H, blue.seed.H) < 10);
    const plum = derive({seed: '#8e3b8a'});
    assert.ok(hueDistance(hexToOklch(plum.tokens['status-info']).H, STATUS_HUES.info) < 10);
  });

  it('warns when a seed sits next to a status hue, and not for a grey', () => {
    const near = status => derive({seed: '#be2533'}).warnings.some(w => w.status === status);
    assert.ok(near('error'));
    assert.deepEqual(derive({seed: '#175a6d'}).warnings, []);
    assert.deepEqual(derive({seed: '#4b5563'}).warnings, []);
  });

  it('prints rules with the --color- prefix', () => {
    assert.equal(
      toCss(':root', {'surface-bg': '#fff'}),
      ':root {\n  --color-surface-bg: #fff;\n}\n'
    );
  });
});

describe('seed runtime', () => {
  it('normalises a choice', () => {
    assert.deepEqual(normalizeSeedChoice({seed: 'ABC', intensity: 2}), {
      seed: '#aabbcc',
      intensity: 1,
    });
    assert.deepEqual(normalizeSeedChoice({seed: '#abc'}), {
      seed: '#aabbcc',
      intensity: DEFAULT_INTENSITY,
    });
    assert.equal(normalizeSeedChoice({seed: 'nope'}), null);
    assert.equal(normalizeSeedChoice(null), null);
    assert.equal(normalizeHex(undefined), null);
  });

  it('names a variant per theme and contrast level', () => {
    assert.equal(seedVariant('dark'), 'dark');
    assert.equal(seedVariant('light', 'more'), 'light-more');
  });

  it('stores a choice with every variant derived, and reads it back', () => {
    const storage = new MemoryStorage();
    const css = storeSeed(storage, {seed: '#4F46E5', intensity: 0.45});
    assert.deepEqual(Object.keys(css), [...SEED_VARIANTS]);
    const stored = JSON.parse(storage.getItem(SEED_STORAGE_KEY));
    assert.equal(stored.v, SEED_CACHE_VERSION);
    assert.deepEqual(stored.css, css);
    assert.equal(
      css['dark-more']['--color-accent-default'],
      derive({seed: '#4f46e5', intensity: 0.45, mode: 'dark', contrast: 'more'}).tokens[
        'accent-default'
      ]
    );
    assert.deepEqual(readStoredSeed(storage), {seed: '#4f46e5', intensity: 0.45});
    clearStoredSeed(storage);
    assert.equal(readStoredSeed(storage), null);
  });

  it('ignores a stored value it cannot use', () => {
    const storage = new MemoryStorage();
    storage.setItem(SEED_STORAGE_KEY, '{not json');
    assert.equal(readStoredSeed(storage), null);
    storage.setItem(SEED_STORAGE_KEY, JSON.stringify({v: 0, seed: '#4f46e5'}));
    assert.equal(readStoredSeed(storage), null);
  });

  it('survives blocked storage', () => {
    const blocked = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    };
    assert.equal(readStoredSeed(blocked), null);
    assert.ok(storeSeed(blocked, {seed: '#4f46e5'}).light);
    assert.doesNotThrow(() => clearStoredSeed(blocked));
  });

  it('refuses to store an invalid seed', () => {
    assert.throws(() => storeSeed(new MemoryStorage(), {seed: 'red'}), TypeError);
  });

  it('applies declarations inline and clears exactly the derived ones', () => {
    const root = new FakeElement();
    root.style.setProperty('--app-own', '1px');
    applySeedDeclarations(root, storeSeed(new MemoryStorage(), {seed: '#8e3b8a'}).light);
    assert.equal(root.props.size, seedTokenNames().length + 1);
    clearSeedDeclarations(root);
    assert.deepEqual([...root.props.keys()], ['--app-own']);
  });
});

describe('seeds/<app>.css', () => {
  for (const app of Object.keys(APP_SEEDS)) {
    it(`${app}.css is what scripts/build-seeds.mjs generates (run npm run build:seeds)`, () => {
      assert.equal(
        readFileSync(new URL(`${app}.css`, `file://${SEEDS_DIR}`), 'utf8'),
        seedCss(app)
      );
    });
  }

  it('carries a prefers-contrast: more block', () => {
    assert.match(seedCss('lk'), /@media \(prefers-contrast: more\)/);
  });
});

describe('docs/design/patterns.md', () => {
  it('quotes the app seeds the engine ships', () => {
    const doc = readFileSync(new URL('../../../docs/design/patterns.md', import.meta.url), 'utf8');
    for (const {seed} of Object.values(APP_SEEDS)) {
      assert.ok(doc.includes(`\`${seed}\``), `patterns.md is missing ${seed}`);
    }
    const quoted = [...doc.matchAll(/`(#[0-9a-f]{6})`/gi)].map(([, hex]) => hex);
    const seeds = Object.values(APP_SEEDS).map(app => app.seed);
    assert.deepEqual(
      quoted.filter(hex => !seeds.includes(hex)),
      []
    );
  });
});
