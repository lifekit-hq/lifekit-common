/**
 * The Linear preset's accent restraint (lifekit-common#347): the accent means one thing, active, and
 * green and red are money's. The preset sets values, so the rule is checked on the values it names:
 * only the roles below may appear, and the accent reaches only the on toggle and the nav fill.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {describe, it} from 'node:test';

import postcss from 'postcss';

const css = readFileSync(new URL('../presets/linear.css', import.meta.url), 'utf8');

/** Every `--color-*` role the preset reads, by the hook that reads it. */
const roles = new Map();
postcss.parse(css).walkDecls(decl => {
  for (const [, role] of decl.value.matchAll(/var\(\s*(--color-[\w-]+)/g)) {
    roles.set(decl.prop, [...(roles.get(decl.prop) ?? []), role]);
  }
});

describe('the Linear preset keeps the accent restrained', () => {
  it('reads neutral, accent or hairline roles only; never a status colour', () => {
    for (const [prop, list] of roles) {
      for (const role of list) {
        assert.doesNotMatch(role, /status|error|success|warning/, `${prop} reads ${role}`);
      }
    }
  });

  it('lets only an on toggle carry the accent fill', () => {
    const filled = [...roles].filter(([, list]) =>
      list.some(r => /^--color-accent-default$/.test(r))
    );
    assert.deepEqual(
      filled.map(([prop]) => prop),
      ['--cmn-toggle-on']
    );
  });

  it('keeps the secondary button and the chosen segment neutral', () => {
    for (const prop of [
      '--cmn-btn-secondary-bg',
      '--cmn-btn-secondary-hover',
      '--cmn-segmented-active-bg',
      '--cmn-segmented-active-fg',
    ]) {
      assert.ok(roles.has(prop), `${prop} is set`);
      assert.ok(
        roles.get(prop).every(r => !/accent/.test(r)),
        `${prop} is not an accent`
      );
    }
  });

  it('is held by a hairline and not a shadow', () => {
    const props = [];
    postcss.parse(css).walkDecls(decl => props.push(decl.prop));
    assert.deepEqual(
      props.filter(prop => /^--cmn-card-shadow$|^--shadow-/.test(prop)),
      []
    );
  });

  it('leaves the phone to Carbon: density applies from 768px only', () => {
    const sized = [];
    postcss.parse(css).walkDecls(/^--cmn-(size-\w+|control-h|nav-item-h)$/, decl => {
      sized.push(decl);
    });
    assert.ok(sized.length > 0);
    for (const decl of sized) {
      const media = decl.parent?.parent;
      assert.equal(media?.type, 'atrule', `${decl.prop} is inside an at-rule`);
      assert.equal(media.name, 'media');
      assert.equal(media.params, '(min-width: 768px)', `${decl.prop} is desktop-only`);
    }
  });
});
