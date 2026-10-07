import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {runInNewContext} from 'node:vm';
import {after, before, describe, it} from 'node:test';

import {
  THEME_SCRIPT,
  THEME_STORAGE_KEY,
  themeScriptCspHash,
  themeScriptTag,
} from '../brand/index.mjs';
import {SEED_STORAGE_KEY, storeSeed} from '../engine/index.mjs';
import {buildBrand} from '../scripts/build-brand.mjs';

/** Runs the script against a fake page and returns the `data-theme` and inline properties it set. */
function runPage({stored, seed, osDark = false, moreContrast = false, storageThrows = false}) {
  const attrs = {};
  const style = {};
  const items = {[THEME_STORAGE_KEY]: stored, [SEED_STORAGE_KEY]: seed};
  const sandbox = {
    localStorage: {
      getItem(key) {
        if (storageThrows) throw new Error('blocked');
        return items[key] ?? null;
      },
    },
    window: {
      matchMedia: query => ({
        matches:
          (query === '(prefers-color-scheme: dark)' && osDark) ||
          (query === '(prefers-contrast: more)' && moreContrast),
      }),
    },
    document: {
      documentElement: {
        setAttribute: (name, value) => (attrs[name] = value),
        style: {setProperty: (name, value) => (style[name] = value)},
      },
    },
  };
  runInNewContext(THEME_SCRIPT, sandbox);
  return {theme: attrs['data-theme'], style};
}

/** Runs the script against a fake page and returns the `data-theme` it set. */
const run = options => runPage(options).theme;

/** The `cmn-theme-seed` value `storeSeed` writes for `choice`. */
function storedSeed(choice) {
  const storage = new Map();
  storeSeed({setItem: (key, value) => storage.set(key, value)}, choice);
  return storage.get(SEED_STORAGE_KEY);
}

describe('theme script', () => {
  it('applies a stored explicit choice over the OS', () => {
    assert.equal(run({stored: 'dark', osDark: false}), 'dark');
    assert.equal(run({stored: 'light', osDark: true}), 'light');
  });

  it('follows the OS when nothing valid is stored', () => {
    assert.equal(run({osDark: true}), 'dark');
    assert.equal(run({osDark: false}), 'light');
    assert.equal(run({stored: 'solarized', osDark: true}), 'dark');
  });

  it('falls back to light when storage is blocked', () => {
    assert.equal(run({storageThrows: true, osDark: true}), 'light');
  });

  it('reads the key ThemeService writes', () => {
    assert.equal(THEME_STORAGE_KEY, 'cmn-theme');
  });
});

describe('theme script seed colour', () => {
  const seed = storedSeed({seed: '#4f46e5', intensity: 0.45});
  const variants = JSON.parse(seed).css;

  it('sets nothing inline when no seed is stored, so the app renders its own palette', () => {
    assert.deepEqual(runPage({stored: 'dark'}).style, {});
  });

  it('applies the stored palette for the active theme', () => {
    assert.deepEqual(runPage({stored: 'light', seed}).style, variants.light);
    assert.deepEqual(runPage({osDark: true, seed}).style, variants.dark);
  });

  it('applies the more-contrast palette when the OS asks for it', () => {
    assert.deepEqual(
      runPage({stored: 'dark', seed, moreContrast: true}).style,
      variants['dark-more']
    );
  });

  it('ignores a cache of another version, a broken one, and blocked storage', () => {
    const stale = JSON.stringify({...JSON.parse(seed), v: 0});
    assert.deepEqual(runPage({seed: stale}).style, {});
    assert.deepEqual(runPage({seed: '{broken'}).style, {});
    assert.deepEqual(runPage({seed, storageThrows: true}).style, {});
  });

  it('applies only --color-* hex declarations', () => {
    const hostile = JSON.stringify({
      v: 1,
      css: {light: {'--color-surface-bg': '#123456', '--x': '#123456', '--color-a': 'url(x)'}},
    });
    assert.deepEqual(runPage({stored: 'light', seed: hostile}).style, {
      '--color-surface-bg': '#123456',
    });
  });
});

describe('theme script CSP hash', () => {
  // A script edit changes the hash every app pins in its CSP. Update this value
  // deliberately, in the same change, and say so in the release notes.
  it('is pinned', () => {
    assert.equal(themeScriptCspHash(), "'sha256-1CdonPxh0ooZS+15UPGry+te8K78Ih2R0PkG9xcbnyU='");
  });
});

describe('theme script build output', () => {
  let outDir;
  before(() => {
    outDir = mkdtempSync(join(tmpdir(), 'lifekit-theme-script-'));
    buildBrand({outDir});
  });
  after(() => rmSync(outDir, {recursive: true, force: true}));

  it('ships the script and its hash', () => {
    assert.equal(readFileSync(join(outDir, 'theme-init.js'), 'utf8'), THEME_SCRIPT);
    assert.equal(
      readFileSync(join(outDir, 'theme-init.csp-hash.txt'), 'utf8'),
      `${themeScriptCspHash()}\n`
    );
  });

  it('publishes the hash of the shipped file bytes, so inlining it verbatim matches', () => {
    const shipped = readFileSync(join(outDir, 'theme-init.js'));
    const published = readFileSync(join(outDir, 'theme-init.csp-hash.txt'), 'utf8').trim();
    assert.equal(published, `'sha256-${createHash('sha256').update(shipped).digest('base64')}'`);
    assert.equal(themeScriptTag(shipped.toString('utf8')), `<script>${shipped}</script>`);
  });
});
