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

/** A value in px: a px literal, or `var(--size-touch)`. */
function px(value) {
  if (value === 'var(--size-touch)') return TOUCH_PX;
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

  it('gives a control the touch height on a phone and the md button’s 40px from md', () => {
    assert.equal(px(phone.get('--cmn-control-h')), TOUCH_PX);
    assert.equal(px(desktop.get('--cmn-control-h')), 40);
  });

  it('puts more space above a section than inside a group', () => {
    assert.ok(px(phone.get('--cmn-section-gap')) > px(phone.get('--cmn-group-gap')));
  });

  it('steps up only the gutter, the title gap and the control height from md', () => {
    assert.deepEqual([...desktop.keys()].sort(), [
      '--cmn-control-h',
      '--cmn-page-gutter',
      '--cmn-title-gap',
    ]);
  });
});
