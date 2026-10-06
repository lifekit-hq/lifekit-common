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
import {buildBrand} from '../scripts/build-brand.mjs';

/** Runs the script against a fake page and returns the `data-theme` it set. */
function run({stored, osDark = false, storageThrows = false}) {
  const attrs = {};
  const sandbox = {
    localStorage: {
      getItem(key) {
        if (storageThrows) throw new Error('blocked');
        return key === THEME_STORAGE_KEY ? (stored ?? null) : null;
      },
    },
    window: {matchMedia: query => ({matches: query === '(prefers-color-scheme: dark)' && osDark})},
    document: {documentElement: {setAttribute: (name, value) => (attrs[name] = value)}},
  };
  runInNewContext(THEME_SCRIPT, sandbox);
  return attrs['data-theme'];
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

describe('theme script CSP hash', () => {
  it('hashes exactly the text between the tags', () => {
    const body = themeScriptTag()
      .replace(/^<script>/, '')
      .replace(/<\/script>$/, '');
    const expected = `'sha256-${createHash('sha256').update(body).digest('base64')}'`;
    assert.equal(themeScriptCspHash(), expected);
  });

  // A script edit changes the hash every app pins in its CSP. Update this value
  // deliberately, in the same change, and say so in the release notes.
  it('is pinned', () => {
    assert.equal(themeScriptCspHash(), "'sha256-ehnGtkrAJzJLwjKmsfKTp4UqIig7dXYgLNw+GsdTysM='");
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
    assert.equal(readFileSync(join(outDir, 'theme-init.js'), 'utf8'), `${THEME_SCRIPT}\n`);
    assert.equal(
      readFileSync(join(outDir, 'theme-init.csp-hash.txt'), 'utf8'),
      `${themeScriptCspHash()}\n`
    );
  });
});
