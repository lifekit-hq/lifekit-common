/**
 * carbon-bridge.css maps Carbon's `--cds-*` colour names onto the seed engine's `--color-*` roles.
 * Checks: the committed file is fresh, every name is a real Carbon token, every role exists in
 * theme.css, and the mapping follows two app seeds in light and dark with no JS.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {describe, it} from 'node:test';
import {fileURLToPath} from 'node:url';

import {BRIDGE_FILE, bridgeCss, rolesOf, themeRoles} from '../scripts/build-carbon-bridge.mjs';
import {BRIDGE} from '../scripts/carbon-bridge-map.mjs';

const read = path => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');
const THEME = read('../theme.css');
const BRIDGE_CSS = readFileSync(BRIDGE_FILE, 'utf8');
const MAX_ALIAS_DEPTH = 4;
const ENTRIES = BRIDGE.filter(entry => Array.isArray(entry));

/** Declarations of one theme block (`light` is the `:root` block, `dark` the `[data-theme='dark']` one). */
function block(css, mode) {
  const head = mode === 'light' ? ":root,\n[data-theme='light'] {" : "[data-theme='dark'] {";
  const start = css.indexOf(head);
  assert.ok(start >= 0, `no ${mode} block`);
  const body = css.slice(start + head.length, css.indexOf('\n}', start));
  return new Map([...body.matchAll(/^\s*(--[a-z0-9-]+)\s*:\s*([^;]+);/gm)].map(m => [m[1], m[2]]));
}

/** The `--color-*` roles an app sees in `mode`: theme.css, then the app seed over it. */
function roles(app, mode) {
  return new Map([...block(THEME, mode), ...block(read(`../seeds/${app}.css`), mode)]);
}

/** One bridged name with its roles substituted, as the browser computes it on `:root`. */
function computed(name, app, mode) {
  const values = roles(app, mode);
  const value = ENTRIES.find(([entry]) => `--cds-${entry}` === name)?.[1];
  assert.ok(value, `${name} is not bridged`);
  let resolved = value;
  // a role may itself read another (a seed's surface-hover mixes in text-primary)
  for (let depth = 0; depth < MAX_ALIAS_DEPTH && resolved.includes('var('); depth++) {
    resolved = resolved.replace(/var\((--color-[a-z0-9-]+)\)/g, (_, role) => values.get(role));
  }
  return resolved;
}

// Component tokens (button-*, tag-*, notification-*) are declared by the component styles.
const COMPONENTS = ['button', 'tag', 'notification'];

/** The `--cds-*` names Carbon's own g10 theme and these components declare, from @carbon/styles. */
function carbonTokens() {
  const sass = createRequire(import.meta.url)('sass');
  const {css} = sass.compileString(
    `${COMPONENTS.map(name => `@use '@carbon/styles/scss/components/${name}';`).join('')}` +
      "@use '@carbon/styles/scss/theme'; @use '@carbon/styles/scss/themes';" +
      ':root { @include theme.theme(themes.$g10); }',
    {loadPaths: [fileURLToPath(new URL('../../../node_modules', import.meta.url))], quietDeps: true}
  );
  return new Set([...css.matchAll(/--cds-([a-z0-9-]+):/g)].map(m => m[1]));
}

describe('carbon-bridge.css', () => {
  it('is the committed output of the generator (run npm run build:carbon-bridge)', () => {
    assert.equal(BRIDGE_CSS, bridgeCss());
  });

  it('declares each name once, on every theme scope, and nothing else', () => {
    const names = [...BRIDGE_CSS.matchAll(/^ {2}(--cds-[a-z0-9-]+):/gm)].map(m => m[1]);
    assert.equal(names.length, ENTRIES.length);
    assert.equal(new Set(names).size, names.length);
    assert.ok(
      BRIDGE_CSS.includes(":root,\n[data-theme='light'],\n[data-theme='dark'] {"),
      'a nested [data-theme] element must re-resolve the roles'
    );
    assert.doesNotMatch(BRIDGE_CSS, /#[0-9a-f]{3,8}\b/i, 'no colour literals in the bridge');
  });

  it('reads only --color-* roles that theme.css defines', () => {
    const defined = themeRoles(THEME);
    for (const [name, value] of ENTRIES) {
      const read = rolesOf(value);
      assert.ok(read.length > 0, `--cds-${name} reads no role`);
      for (const role of read) assert.ok(defined.has(role), `--cds-${name} reads ${role}`);
    }
  });

  it('refuses a role theme.css lacks', () => {
    assert.throws(() => bridgeCss(new Set(['--color-surface-bg'])), /theme\.css lacks/);
  });

  it('names only tokens Carbon itself declares (@carbon/styles g10)', () => {
    const carbon = carbonTokens();
    const unknown = ENTRIES.map(([name]) => name).filter(name => !carbon.has(name));
    assert.deepEqual(unknown, []);
  });

  for (const app of ['fs', 'dc']) {
    for (const mode of ['light', 'dark']) {
      it(`follows the ${app} seed in ${mode}`, () => {
        const values = roles(app, mode);
        assert.equal(
          computed('--cds-button-primary', app, mode),
          values.get('--color-accent-default')
        );
        assert.equal(
          computed('--cds-interactive', app, mode),
          values.get('--color-accent-default')
        );
        assert.equal(computed('--cds-background', app, mode), values.get('--color-surface-bg'));
        assert.equal(computed('--cds-layer-01', app, mode), values.get('--color-surface-card'));
        assert.equal(computed('--cds-text-primary', app, mode), values.get('--color-text-primary'));
        assert.equal(
          computed('--cds-support-error', app, mode),
          values.get('--color-status-error')
        );
        assert.equal(computed('--cds-focus', app, mode), values.get('--color-border-focus'));
        for (const [name] of ENTRIES) {
          assert.doesNotMatch(computed(`--cds-${name}`, app, mode), /var\(|undefined/);
        }
      });
    }
  }

  it('flips with light/dark and re-tints with the seed', () => {
    for (const name of [
      '--cds-background',
      '--cds-layer-01',
      '--cds-text-primary',
      '--cds-button-primary',
    ]) {
      for (const app of ['fs', 'dc']) {
        assert.notEqual(
          computed(name, app, 'light'),
          computed(name, app, 'dark'),
          `${name} ${app}`
        );
      }
    }
    for (const mode of ['light', 'dark']) {
      assert.notEqual(
        computed('--cds-button-primary', 'fs', mode),
        computed('--cds-button-primary', 'dc', mode),
        `the accent differs per seed in ${mode}`
      );
    }
  });
});
