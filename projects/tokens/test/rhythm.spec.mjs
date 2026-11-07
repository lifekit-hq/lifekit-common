/**
 * The page rhythm tokens (theme.css): five semantic steps the page template owns. Each is defined
 * once for the phone, steps up from 768px only where the desktop needs more, and every value sits
 * on the spacing scale the drift check enforces, so the rhythm never invents a length.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {describe, it} from 'node:test';

import {SPACING_SCALE_PX} from '../drift/rules.mjs';

const THEME_CSS = readFileSync(new URL('../theme.css', import.meta.url), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  ''
);
const RHYTHM = ['page-gutter', 'title-gap', 'section-gap', 'group-gap', 'control-h'];
const TOUCH_PX = 44;
const MD_QUERY = '@media (min-width: 768px)';

/** The declarations of the first block that `marker` opens, as a name → value map. */
function declarations(css, marker) {
  const start = css.indexOf(marker);
  assert.ok(start >= 0, `theme.css has no ${marker}`);
  const open = css.indexOf('{', start);
  let depth = 0;
  let end = open;
  for (; end < css.length; end++) {
    if (css[end] === '{') depth++;
    if (css[end] === '}' && --depth === 0) break;
  }
  const body = css.slice(open + 1, end);
  return new Map(
    [...body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()])
  );
}

/** Carbon's layout sizes (@carbon/layout), px: the control heights `--cmn-size-*` carry. */
const CARBON_SIZES_PX = {xs: 24, sm: 32, md: 40, lg: 48};

/** A value in px: a px literal, `var(--size-touch)` or a `var(--cmn-size-*)` layout size. */
function px(value) {
  if (value === 'var(--size-touch)') return TOUCH_PX;
  const size = value.match(/^var\(--cmn-size-(\w+)\)$/)?.[1];
  if (size) return CARBON_SIZES_PX[size];
  const match = value.match(/^(\d+(?:\.\d+)?)px$/);
  assert.ok(match, `${value} is not a px length`);
  return Number(match[1]);
}

describe('page rhythm tokens', () => {
  const phone = declarations(THEME_CSS, ':root,');
  const desktop = declarations(THEME_CSS, MD_QUERY);

  it('defines all five on the root for the phone', () => {
    for (const name of RHYTHM) assert.ok(phone.has(`--cmn-${name}`), name);
  });

  it('keeps every value, phone and desktop, on the spacing scale', () => {
    for (const map of [phone, desktop]) {
      for (const [name, value] of map) {
        if (!name.startsWith('--cmn-') || !RHYTHM.includes(name.slice('--cmn-'.length))) continue;
        // The touch size is the scale's `cmn-touch` step, which the preset spells as a var().
        const length = px(value);
        assert.ok(SPACING_SCALE_PX.includes(length) || length === TOUCH_PX, `${name}: ${value}`);
      }
    }
  });

  it('uses the page container’s gutter: 16px on a phone, 32px from md', () => {
    assert.equal(px(phone.get('--cmn-page-gutter')), 16);
    assert.equal(px(desktop.get('--cmn-page-gutter')), 32);
  });

  it('gives a control Carbon’s 48px default on the phone and the desktop, above the touch target', () => {
    assert.equal(px(phone.get('--cmn-control-h')), 48);
    assert.equal(desktop.has('--cmn-control-h'), false, 'the control height does not step');
    assert.ok(px(phone.get('--cmn-control-h')) >= TOUCH_PX);
  });

  it('defines the four Carbon layout sizes, 24/32/40/48, on the root', () => {
    for (const [name, size] of Object.entries(CARBON_SIZES_PX)) {
      assert.equal(px(phone.get(`--cmn-size-${name}`)), size, name);
      assert.ok(SPACING_SCALE_PX.includes(size), `${size}px is on the spacing scale`);
    }
  });

  it('puts more space above a section than inside a group', () => {
    assert.ok(px(phone.get('--cmn-section-gap')) > px(phone.get('--cmn-group-gap')));
  });

  it('steps up only the gutter and the title gap from md', () => {
    assert.deepEqual([...desktop.keys()].sort(), ['--cmn-page-gutter', '--cmn-title-gap']);
  });
});
