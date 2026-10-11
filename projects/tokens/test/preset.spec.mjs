import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {describe, it} from 'node:test';

const require = createRequire(import.meta.url);
const postcss = require('postcss');
const tailwindcss = require('tailwindcss');
const preset = require('../tailwind/preset.cjs');

async function generate(classes, css = '@tailwind utilities;') {
  const config = {presets: [preset], content: [{raw: classes.join(' ')}]};
  const result = await postcss([tailwindcss(config)]).process(css, {from: undefined});
  return result.css;
}

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
});
