/**
 * Preset hooks (theme.css, the PRESET HOOKS block): the semantic radius and component hooks a
 * preset overrides to change anatomy a token value cannot. This spec holds the three promises the
 * hook sweep makes: every hook has a Carbon default in theme.css, every hook is consumed by a
 * utility or a component (none is dead), and every hook has a rule in the per-preset test
 * (presets-check.mjs HOOK_RULES), so adding a hook means deciding how a preset is held to it.
 */
import assert from 'node:assert/strict';
import {readdirSync, readFileSync} from 'node:fs';
import {describe, it} from 'node:test';
import {fileURLToPath} from 'node:url';

import {checkPreset, HOOK_RULES} from './presets-check.mjs';

const read = relative => readFileSync(new URL(relative, import.meta.url), 'utf8');
const themeCss = read('../theme.css');
const presetCjs = read('../tailwind/preset.cjs');
const UI_SRC = new URL('../../ui/src/lib/', import.meta.url);

/** The hook block: from its heading comment to the Motion block that follows. */
const block = themeCss.slice(themeCss.indexOf('/* PRESET HOOKS.'), themeCss.indexOf('/* Motion'));
const hooks = [...block.matchAll(/^\s*(--[\w-]+):\s*([^;]+);/gm)].map(([, name, value]) => ({
  name,
  value: value.trim(),
}));

/** Every component, directive and service source (no specs, no stories) under projects/ui. */
function uiSources(dir = UI_SRC) {
  return readdirSync(dir, {withFileTypes: true}).flatMap(entry => {
    const path = new URL(entry.name + (entry.isDirectory() ? '/' : ''), dir);
    if (entry.isDirectory()) return uiSources(path);
    return /\.ts$/.test(entry.name) && !/\.(spec|stories)\.ts$/.test(entry.name)
      ? [{file: fileURLToPath(path), text: readFileSync(path, 'utf8')}]
      : [];
  });
}
const sources = uiSources();

describe('preset hooks', () => {
  it('finds the hook block', () => {
    assert.ok(hooks.length >= 40, `expected the whole hook block, found ${hooks.length} hooks`);
  });

  it('gives every hook one Carbon default in theme.css, none of them dark- or width-specific', () => {
    for (const {name} of hooks) {
      const declarations = themeCss.match(new RegExp(`^\\s*${name}:`, 'gm')) ?? [];
      assert.equal(declarations.length, 1, `${name} must be declared once, with its Carbon value`);
    }
  });

  it('names a rule for every hook in the per-preset test, and no hook that is gone', () => {
    const declared = hooks.map(h => h.name).sort();
    assert.deepEqual(Object.keys(HOOK_RULES).sort(), declared);
  });

  it('is consumed: every hook is reached through a utility, a component or another token', () => {
    const corpus = [presetCjs, themeCss.replace(block, ''), ...sources.map(s => s.text)].join('\n');
    for (const {name} of hooks) {
      assert.ok(corpus.includes(`var(${name}`), `${name} is declared but nothing uses it`);
    }
  });

  it('declares every --cmn-* custom property the Tailwind preset reads', () => {
    const declared = new Set([...themeCss.matchAll(/^\s*(--[\w-]+):/gm)].map(m => m[1]));
    for (const [, name] of presetCjs.matchAll(/var\((--cmn-[\w-]+)/g)) {
      assert.ok(declared.has(name), `${name} is read in tailwind/preset.cjs but not in theme.css`);
    }
  });

  it('keeps components on a role (control, field, surface, inset), never a size step', () => {
    const raw = sources.filter(({text}) => /\brounded-cmn-(sm|md|lg)\b/.test(text));
    assert.deepEqual(
      raw.map(s => s.file),
      [],
      'use rounded-cmn-role-control|field|surface|inset so a preset can restyle it'
    );
  });

  it('accepts a preset that restates every hook at its Carbon value', () => {
    const body = hooks.map(({name, value}) => `  ${name}: ${value};`).join('\n');
    const css = `:root[data-preset='restated'] {\n${body}\n}`;
    assert.deepEqual(checkPreset({id: 'restated', css, themeCss}), []);
  });
});
