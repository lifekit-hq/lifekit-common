/**
 * Step 1 of the Carbon adoption (epic #279): the type ramp, layout sizes, geometry and motion in
 * theme.css and the preset are Carbon's own values, read here from the Carbon packages
 * (`@carbon/type`, `@carbon/layout`, `@carbon/motion`, dependencies of `@carbon/styles`), so a
 * Carbon bump that moves a value, or an edit that drifts from it, fails instead of going unseen.
 * What we deliberately keep is named in each test.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {describe, it} from 'node:test';

const require = createRequire(import.meta.url);
const carbonType = require('@carbon/type');
const carbonLayout = require('@carbon/layout');
const carbonMotion = require('@carbon/motion');
const preset = require('../tailwind/preset.cjs');

const THEME = readFileSync(new URL('../theme.css', import.meta.url), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  ''
);

/** The root block's value for a custom property. */
function token(name) {
  const value = THEME.match(new RegExp(`^\\s*${name}:\\s*([^;]+);`, 'm'))?.[1];
  assert.ok(value, `theme.css has no ${name}`);
  return value.trim();
}

const SIZES = preset.theme.extend.fontSize;
const px = rem => Number.parseFloat(rem) * 16;
const CARBON_STEPS = [
  'label01',
  'bodyCompact01',
  'bodyCompact02',
  'body01',
  'body02',
  'heading03',
  'heading04',
  'heading05',
  'heading06',
].map(name => carbonType[name]);
const CARBON_SIZES_REM = new Set(CARBON_STEPS.map(step => step.fontSize));

describe('type ramp is Carbon’s', () => {
  it('uses only font sizes Carbon’s productive scale has', () => {
    for (const [step, [size]] of Object.entries(SIZES)) {
      assert.ok(CARBON_SIZES_REM.has(size), `${step} ${size} is not a Carbon type size`);
    }
  });

  it('maps label to label-01 and the headings to heading-03, -04, -05 and -06', () => {
    assert.equal(SIZES['cmn-xs'][0], carbonType.label01.fontSize);
    assert.equal(SIZES['cmn-lg'][0], carbonType.heading03.fontSize);
    assert.equal(SIZES['cmn-2xl'][0], carbonType.heading04.fontSize);
    assert.equal(SIZES['cmn-3xl'][0], carbonType.heading05.fontSize);
    assert.equal(SIZES['cmn-4xl'][0], carbonType.heading06.fontSize);
  });

  it('keeps our 14/21 body line height, not Carbon’s 14/18 compact or 14/20', () => {
    assert.equal(SIZES['cmn-sm'][0], carbonType.bodyCompact01.fontSize);
    assert.equal(SIZES['cmn-sm'][1].lineHeight, '1.5');
    assert.equal(px(SIZES['cmn-sm'][0]) * Number(SIZES['cmn-sm'][1].lineHeight), 21);
  });

  it('keeps the 12px floor', () => {
    const smallest = Math.min(...Object.values(SIZES).map(([size]) => px(size)));
    assert.equal(smallest, 12);
  });

  it('takes Carbon’s line height wherever it clears the 1.3 floor, and the floor where it does not', () => {
    const FLOOR = 1.3;
    const pairs = [
      ['cmn-xs', carbonType.label01],
      ['cmn-md', carbonType.body02],
      ['cmn-lg', carbonType.heading03],
      ['cmn-2xl', carbonType.heading04],
      ['cmn-3xl', carbonType.heading05],
    ];
    for (const [step, carbon] of pairs) {
      const expected = Math.max(carbon.lineHeight, FLOOR);
      assert.ok(
        Math.abs(Number(SIZES[step][1].lineHeight) - expected) < 0.001,
        `${step}: ${SIZES[step][1].lineHeight} vs Carbon ${carbon.lineHeight}`
      );
    }
    // display is a heading and exempt from the floor, so it keeps Carbon's own leading
    assert.ok(
      Math.abs(Number(SIZES['cmn-4xl'][1].lineHeight) - carbonType.heading06.lineHeight) < 0.01
    );
  });

  it('keeps xl as an alias of lg', () => {
    assert.deepEqual(SIZES['cmn-xl'], SIZES['cmn-lg']);
  });
});

describe('layout sizes are Carbon’s', () => {
  it('defines 24 / 32 / 40 / 48 as Carbon’s xsmall, small, medium and large', () => {
    const rem = {xs: 'XSmall', sm: 'Small', md: 'Medium', lg: 'Large'};
    for (const [name, carbon] of Object.entries(rem)) {
      assert.equal(token(`--cmn-size-${name}`), `${px(carbonLayout.sizes[carbon])}px`, name);
    }
  });

  it('makes 48px the default control height and keeps the 44px touch target under it', () => {
    assert.equal(token('--cmn-control-h'), 'var(--cmn-size-lg)');
    assert.equal(token('--size-touch'), '44px');
  });

  it('exposes the sizes as spacing steps', () => {
    for (const name of ['xs', 'sm', 'md', 'lg']) {
      assert.equal(preset.theme.extend.spacing[`cmn-size-${name}`], `var(--cmn-size-${name})`);
    }
  });
});

describe('geometry is Carbon’s', () => {
  it('squares sm, md and lg, and leaves the pill', () => {
    for (const name of ['sm', 'md', 'lg']) assert.equal(token(`--radius-${name}`), '0', name);
    assert.equal(token('--radius-full'), '9999px');
  });

  it('defines the filled bottom-border field: a fill, a 1px bottom border, a 2px focus ring', () => {
    assert.equal(token('--cmn-field-bg'), 'var(--color-surface-raised)');
    assert.equal(token('--cmn-field-border-bottom'), '1px solid var(--color-border-strong)');
    assert.equal(token('--cmn-field-focus'), '2px solid var(--color-border-focus)');
    assert.equal(preset.theme.extend.colors['cmn-field'], 'var(--cmn-field-bg)');
  });
});

describe('motion is Carbon’s', () => {
  it('uses moderate-01, moderate-02 and slow-01 for short, medium and long', () => {
    assert.equal(token('--cmn-duration-short'), carbonMotion.moderate01);
    assert.equal(token('--cmn-duration-medium'), carbonMotion.moderate02);
    assert.equal(token('--cmn-duration-long'), carbonMotion.slow01);
  });

  it('uses the productive curves for standard, decelerate and accelerate', () => {
    const {standard, entrance, exit} = carbonMotion.easings;
    assert.equal(token('--cmn-ease-standard'), standard.productive);
    assert.equal(token('--cmn-ease-decelerate'), entrance.productive);
    assert.equal(token('--cmn-ease-accelerate'), exit.productive);
  });

  it('adds the expressive curves for the larger surfaces', () => {
    const {standard, entrance, exit} = carbonMotion.easings;
    assert.equal(token('--cmn-ease-expressive-standard'), standard.expressive);
    assert.equal(token('--cmn-ease-expressive-decelerate'), entrance.expressive);
    assert.equal(token('--cmn-ease-expressive-accelerate'), exit.expressive);
  });

  it('keeps the old emphasized names as aliases of the productive curves', () => {
    assert.equal(token('--cmn-ease-emphasized-decelerate'), 'var(--cmn-ease-decelerate)');
    assert.equal(token('--cmn-ease-emphasized-accelerate'), 'var(--cmn-ease-accelerate)');
  });

  it('keeps a reduced-motion path that settles every transition and animation', () => {
    assert.match(THEME, /@media \(prefers-reduced-motion: reduce\)/);
    assert.match(THEME, /transition-duration:\s*0\.01ms !important/);
    assert.match(THEME, /animation-duration:\s*0\.01ms !important/);
  });
});
