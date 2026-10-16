/**
 * The route crossfade (`withLkViewTransitions()` in @lifekit-hq/core) takes its timing from the
 * motion tokens, and Reduce Motion removes it.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {describe, it} from 'node:test';

const CSS = readFileSync(new URL('../theme.css', import.meta.url), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  ''
);

function ruleBody(selector, source = CSS) {
  const at = source.indexOf(selector);
  assert.ok(at >= 0, `no rule for ${selector}`);
  const open = source.indexOf('{', at);
  return source.slice(open + 1, source.indexOf('}', open));
}

describe('route crossfade', () => {
  it('times the root crossfade with the motion tokens', () => {
    const body = ruleBody('::view-transition-old(root),\n::view-transition-new(root)');
    assert.match(body, /animation-duration:\s*var\(--cmn-duration-medium\)/);
    assert.match(body, /animation-timing-function:\s*var\(--cmn-ease-standard\)/);
  });

  it('removes every view-transition animation under Reduce Motion', () => {
    const media = [...CSS.matchAll(/@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/g)]
      .map(([, inner]) => inner)
      .find(inner => inner.includes('::view-transition-group(*)'));
    assert.ok(media, 'no reduced-motion rule for view transitions');
    assert.match(ruleBody('::view-transition-new(*)', media), /animation:\s*none/);
  });
});
