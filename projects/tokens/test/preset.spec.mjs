import assert from 'node:assert/strict';
import {readdirSync, readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {join} from 'node:path';
import {describe, it} from 'node:test';
import {fileURLToPath} from 'node:url';

import {FIXED_COLOUR_NAMES} from '../engine/index.mjs';

const require = createRequire(import.meta.url);
const postcss = require('postcss');
const tailwindcss = require('tailwindcss');
const preset = require('../tailwind/preset.cjs');

async function generate(classes, css = '@tailwind utilities;') {
  const config = {presets: [preset], content: [{raw: classes.join(' ')}]};
  const result = await postcss([tailwindcss(config)]).process(css, {from: undefined});
  return result.css;
}

/** The class names a stylesheet defines, unescaped (`.gap-cmn-0\\.5` is `gap-cmn-0.5`). */
const classes = css =>
  new Set(
    [...css.matchAll(/^\.((?:\\.|[^\s{,>:])+)/gm)].map(([, name]) => name.replace(/\\(.)/g, '$1'))
  );

describe('tailwind preset', () => {
  it('generates the border colour classes cmn-select uses for resting and invalid states', async () => {
    const css = await generate(['border-status-error', 'border-border-strong']);
    assert.match(css, /\.border-status-error\s*\{[^}]*border-color/);
    assert.match(css, /\.border-border-strong\s*\{[^}]*border-color/);
  });

  it('paints ring offsets with the card surface, not Tailwind default white', async () => {
    const css = await generate(['ring-offset-1'], '@tailwind base; @tailwind utilities;');
    assert.match(css, /--tw-ring-offset-color:\s*var\(--color-surface-card\)/);
    assert.doesNotMatch(css, /--tw-ring-offset-color:\s*#fff/);
  });

  it('exposes every fixed colour as a colour utility resolving to its custom property', async () => {
    const css = await generate(FIXED_COLOUR_NAMES.map(name => `bg-${name}`));
    for (const name of FIXED_COLOUR_NAMES) {
      assert.match(css, new RegExp(`\\.bg-${name}\\s*\\{[^}]*var\\(--color-${name}\\)`), name);
    }
  });

  it("replaces Tailwind's default spacing: only the cmn-* steps, 0 and px generate", async () => {
    const generated = classes(
      await generate([
        'p-cmn-4',
        'gap-cmn-0.5',
        '-mt-cmn-2',
        'p-0',
        'top-px',
        'p-4',
        'gap-2',
        'mt-1.5',
        '-mx-3',
        'space-y-6',
        'translate-x-1',
        'inset-8',
      ])
    );
    for (const kept of ['p-cmn-4', 'gap-cmn-0.5', '-mt-cmn-2', 'p-0', 'top-px']) {
      assert.ok(generated.has(kept), kept);
    }
    for (const gone of [
      'p-4',
      'gap-2',
      'mt-1.5',
      '-mx-3',
      'space-y-6',
      'translate-x-1',
      'inset-8',
    ]) {
      assert.ok(!generated.has(gone), gone);
    }
  });

  it("keeps element sizing on Tailwind's numeric scale, since sizing is not spacing", async () => {
    const css = await generate([
      'w-8',
      'h-2',
      'size-3',
      'min-h-11',
      'max-h-64',
      'basis-64',
      'w-1/2',
      'h-full',
      'max-w-md',
      'h-cmn-control-h',
      'w-cmn-size-md',
    ]);
    const generated = classes(css);
    for (const kept of [
      'w-8',
      'h-2',
      'size-3',
      'min-h-11',
      'max-h-64',
      'basis-64',
      'w-1/2',
      'h-full',
      'max-w-md',
    ]) {
      assert.ok(generated.has(kept), kept);
    }
    assert.match(css, /\.h-cmn-control-h\s*\{[^}]*var\(--cmn-control-h\)/);
    assert.match(css, /\.w-cmn-size-md\s*\{[^}]*var\(--cmn-size-md\)/);
  });

  it("replaces Tailwind's default type sizes: only the text-cmn-* ramp generates", async () => {
    const css = await generate([
      'text-cmn-md',
      'text-cmn-4xl',
      'text-cmn-xl',
      'text-xs',
      'text-sm',
      'text-base',
      'text-lg',
      'text-2xl',
    ]);
    const generated = classes(css);
    assert.match(css, /\.text-cmn-md\s*\{[^}]*font-size:\s*1rem/);
    assert.ok(generated.has('text-cmn-4xl'));
    for (const gone of ['text-cmn-xl', 'text-xs', 'text-sm', 'text-base', 'text-lg', 'text-2xl']) {
      assert.ok(!generated.has(gone), gone);
    }
  });

  it('exposes the page rhythm tokens as spacing steps resolving to their custom properties', async () => {
    const steps = ['page-gutter', 'title-gap', 'section-gap', 'group-gap', 'control-h'];
    const css = await generate([
      'px-cmn-page-gutter',
      'mt-cmn-title-gap',
      'gap-cmn-section-gap',
      'gap-cmn-group-gap',
      'h-cmn-control-h',
    ]);
    for (const step of steps) {
      assert.match(css, new RegExp(`cmn-${step}\\s*\\{[^}]*var\\(--cmn-${step}\\)`), step);
    }
  });

  it('generates the opacity forms of a token colour, mixed from the token so the theme still decides it', async () => {
    const css = await generate([
      'border-status-warning/40',
      'bg-status-error/[0.04]',
      'bg-status-error/10',
      'border-accent-default/40',
    ]);
    assert.match(
      css,
      /\.border-status-warning\\\/40\s*\{\s*border-color:\s*color-mix\(in srgb, var\(--color-status-warning\) calc\(0\.4 \* 100%\), transparent\)/
    );
    assert.match(
      css,
      /\.bg-status-error\\\/10\s*\{[^}]*var\(--color-status-error\) calc\(0\.1 \* 100%\)/
    );
    assert.match(css, /bg-status-error\\\/\\\[0\\\.04\\\]\s*\{[^}]*calc\(0\.04 \* 100%\)/);
    assert.match(css, /border-accent-default\\\/40\s*\{[^}]*var\(--color-accent-default\)/);
  });

  it('generates gradient stops from a token colour, whose transparent end Tailwind asks for at alpha 0', async () => {
    const css = await generate(['bg-gradient-to-r', 'from-status-error', 'via-accent-default']);
    assert.match(
      css,
      /\.from-status-error\s*\{[^}]*--tw-gradient-from:\s*var\(--color-status-error\)/
    );
    assert.match(
      css,
      /\.from-status-error\s*\{[^}]*--tw-gradient-to:\s*color-mix\(in srgb, var\(--color-status-error\) calc\(0 \* 100%\), transparent\)/
    );
    assert.match(css, /\.via-accent-default\s*\{[^}]*var\(--color-accent-default\)/);
  });

  it('leaves a token colour without an opacity modifier as the plain custom property', async () => {
    const css = await generate(['border-status-warning', 'text-status-error', 'bg-surface-card']);
    assert.match(
      css,
      /\.border-status-warning\s*\{[^}]*border-color:\s*var\(--color-status-warning\)\s*\}/
    );
    assert.match(css, /\.text-status-error\s*\{[^}]*color:\s*var\(--color-status-error\)\s*\}/);
    assert.match(
      css,
      /\.bg-surface-card\s*\{[^}]*background-color:\s*var\(--color-surface-card\)\s*\}/
    );
    assert.doesNotMatch(css, /color-mix/);
  });

  it('generates every token-colour opacity class the component library uses', async () => {
    const root = join(fileURLToPath(new URL('../../ui/src/lib', import.meta.url)));
    const sources = [];
    const walk = dir => {
      for (const entry of readdirSync(dir, {withFileTypes: true})) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) walk(path);
        else if (/\.component\.ts$/.test(entry.name)) sources.push(readFileSync(path, 'utf8'));
      }
    };
    walk(root);
    const prefixes = '(?:bg|border(?:-[trblxy])?|text|ring|outline|divide|fill|stroke)';
    const tokens = Object.keys(preset.theme.extend.colors).join('|');
    const pattern = new RegExp(
      `(?<![\\w-])${prefixes}-(?:${tokens})\\/(?:\\[[0-9.]+\\]|[0-9]+)(?![\\w/])`,
      'g'
    );
    const used = [...new Set(sources.flatMap(source => source.match(pattern) ?? []))];
    assert.ok(used.length > 0, 'expected the library to use at least one opacity form');
    const css = await generate(used);
    for (const name of used) {
      const escaped = name.replace(/[/[\].]/g, '\\$&');
      assert.ok(css.includes(`.${escaped}`), `${name} is not generated by the preset`);
    }
  });
});
