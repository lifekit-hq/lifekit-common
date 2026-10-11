import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {describe, it} from 'node:test';

const require = createRequire(import.meta.url);
const postcss = require('postcss');
const tailwindcss = require('tailwindcss');
const preset = require('../tailwind/preset.cjs');

const SELECT_SOURCE = new URL(
  '../../ui/src/lib/components/select/select.component.ts',
  import.meta.url
);

async function generate(classes, css = '@tailwind utilities;') {
  const config = {presets: [preset], content: [{raw: classes.join(' ')}]};
  const result = await postcss([tailwindcss(config)]).process(css, {from: undefined});
  return result.css;
}

describe('tailwind preset', () => {
  it('generates every border colour class cmn-select can emit (an invalid select shows red)', async () => {
    const source = readFileSync(SELECT_SOURCE, 'utf8');
    const borders = [...new Set(source.match(/\bborder-[a-z]+-[a-z-]+/g))];
    assert.ok(borders.includes('border-status-error'), 'select lost its error border');
    assert.ok(borders.includes('border-border-strong'), 'select lost its 3:1 resting border');

    const css = await generate(borders);
    for (const name of borders) {
      assert.ok(css.includes(`.${name.replace(/:/g, '\\:')}`), `preset does not generate .${name}`);
    }
  });

  it('paints ring offsets with the card surface, not Tailwind default white', async () => {
    const css = await generate(['ring-offset-1'], '@tailwind base; @tailwind utilities;');
    assert.match(css, /--tw-ring-offset-color:\s*var\(--color-surface-card\)/);
    assert.doesNotMatch(css, /--tw-ring-offset-color:\s*#fff/);
  });
});
