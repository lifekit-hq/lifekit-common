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

import postcss from 'postcss';

import {checkPreset, HOOK_RULES} from './presets-check.mjs';

const read = relative => readFileSync(new URL(relative, import.meta.url), 'utf8');
const themeCss = read('../theme.css');
const tailwindPreset = createRequire(import.meta.url)('../tailwind/preset.cjs');

const sheet = postcss.parse(themeCss);

/** Every declaration of every rule in the sheet, by property: the semantic model of theme.css. */
const declared = new Map();
sheet.walkDecls(decl => {
  declared.set(decl.prop, [...(declared.get(decl.prop) ?? []), decl]);
});

/** The hook block: the declarations between its heading comment and the Motion comment. */
const hooks = [];
sheet.walkRules(rule => {
  let inBlock = false;
  for (const node of rule.nodes) {
    if (node.type === 'comment') {
      if (node.text.startsWith('PRESET HOOKS.')) inBlock = true;
      else if (inBlock && node.text.startsWith('Motion')) inBlock = false;
    } else if (inBlock && node.type === 'decl') {
      hooks.push({name: node.prop, value: node.value.trim()});
    }
  }
});

describe('preset hooks', () => {
  it('finds the hook block', () => {
    assert.ok(hooks.length >= 40, `expected the whole hook block, found ${hooks.length} hooks`);
    assert.ok(hooks.every(h => h.name.startsWith('--cmn-')));
  });

  it('gives every hook one Carbon default in theme.css, none of them dark- or width-specific', () => {
    for (const {name} of hooks) {
      assert.equal(
        declared.get(name)?.length,
        1,
        `${name} must be declared once, with its Carbon value`
      );
    }
  });

  it('names a rule for every hook in the per-preset test, and no hook that is gone', () => {
    assert.deepEqual(Object.keys(HOOK_RULES).sort(), hooks.map(h => h.name).sort());
  });

  it('declares every --cmn-* custom property the Tailwind preset reads', () => {
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
