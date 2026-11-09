/**
 * Preset hooks (theme.css, the PRESET HOOKS block): the semantic radius and component hooks a
 * preset overrides to change anatomy a token value cannot. This spec holds the promises the hook
 * sweep makes: every hook has a Carbon default in theme.css, every `--cmn-*` the Tailwind preset
 * reads is declared there, and every hook has a rule in the per-preset test (presets-check.mjs
 * HOOK_RULES), so adding a hook means deciding how a preset is held to it.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {describe, it} from 'node:test';

import {checkPreset, HOOK_RULES} from './presets-check.mjs';

const read = relative => readFileSync(new URL(relative, import.meta.url), 'utf8');
const themeCss = read('../theme.css');
const tailwindPreset = createRequire(import.meta.url)('../tailwind/preset.cjs');

/** The hook block: from its heading comment to the Motion block that follows. */
const block = themeCss.slice(themeCss.indexOf('/* PRESET HOOKS.'), themeCss.indexOf('/* Motion'));
const hooks = [...block.matchAll(/^\s*(--[\w-]+):\s*([^;]+);/gm)].map(([, name, value]) => ({
  name,
  value: value.trim(),
}));

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

  it('declares every --cmn-* custom property the Tailwind preset reads', () => {
    const declared = new Set([...themeCss.matchAll(/^\s*(--[\w-]+):/gm)].map(m => m[1]));
    const reads = [...JSON.stringify(tailwindPreset.theme).matchAll(/var\((--cmn-[\w-]+)/g)];
    assert.ok(reads.length > 0, 'the Tailwind preset reads no --cmn-* hook');
    for (const [, name] of reads) {
      assert.ok(declared.has(name), `${name} is read by the Tailwind preset but not in theme.css`);
    }
  });

  it('accepts a preset that restates every hook at its Carbon value', () => {
    const body = hooks.map(({name, value}) => `  ${name}: ${value};`).join('\n');
    const css = `:root[data-preset='restated'] {\n${body}\n}`;
    assert.deepEqual(checkPreset({id: 'restated', css, themeCss}), []);
  });
});
