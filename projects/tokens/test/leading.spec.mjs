/**
 * The type ramp's line-heights and the design judge's tight-leading rule agree: impeccable flags
 * multi-line text set under 1.3x its font size, and exempts headings. Every ramp step meets that
 * floor except the display step, which is page titles (headings) only. DESIGN.md quotes the same
 * numbers, so a ramp change that leaves the prose behind fails here.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {describe, it} from 'node:test';

const require = createRequire(import.meta.url);
const postcss = require('postcss');
const tailwindcss = require('tailwindcss');
const preset = require('../tailwind/preset.cjs');

const MIN_LEADING = 1.3;
const DISPLAY_STEP = 'cmn-4xl';
/** DESIGN.md typography role -> the preset step that implements it. */
const ROLE_STEPS = {
  display: 'cmn-4xl',
  headline: 'cmn-2xl',
  title: 'cmn-lg',
  body: 'cmn-sm',
  label: 'cmn-xs',
};

const DESIGN = readFileSync(new URL('../../../DESIGN.md', import.meta.url), 'utf8');
const STEPS = preset.theme.fontSize;

function designLineHeight(role) {
  const block = DESIGN.match(new RegExp(`^  ${role}:\\n((?:    .+\\n)+)`, 'm'));
  assert.ok(block, `DESIGN.md has no ${role} typography role`);
  const value = block[1].match(/lineHeight:\s*([\d.]+)/);
  assert.ok(value, `DESIGN.md ${role} has no lineHeight`);
  return Number(value[1]);
}

describe('type ramp line-height', () => {
  it('holds every multi-line step to the judge floor; only display (headings) sits below', () => {
    for (const [step, [, {lineHeight}]] of Object.entries(STEPS)) {
      if (step === DISPLAY_STEP) continue;
      assert.ok(
        Number(lineHeight) >= MIN_LEADING,
        `${step} line-height ${lineHeight} < ${MIN_LEADING}`
      );
    }
  });

  it('quotes in DESIGN.md the line-height each role has in the preset', () => {
    for (const [role, step] of Object.entries(ROLE_STEPS)) {
      assert.equal(designLineHeight(role), Number(STEPS[step][1].lineHeight), `${role} (${step})`);
    }
  });

  it('keeps Tailwind leading-tight at the floor, not its 1.25 default', async () => {
    const config = {presets: [preset], content: [{raw: 'leading-tight'}]};
    const {css} = await postcss([tailwindcss(config)]).process('@tailwind utilities;', {
      from: undefined,
    });
    assert.match(css, /\.leading-tight\s*\{\s*line-height:\s*1\.3\s*;?\s*\}/);
  });
});
