import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {describe, it} from 'node:test';

const css = readFileSync(new URL('../theme.css', import.meta.url), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  ''
);

describe('motion tokens', () => {
  it('settles pulse animations under prefers-reduced-motion and exempts only spinners', () => {
    const block = css.match(/@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/)?.[1];
    assert.ok(block, 'reduced-motion block exists');
    assert.match(block, /:not\(\.animate-spin, \.animate-cmn-spin\)/);
    assert.doesNotMatch(block, /pulse/);
  });

  it('keeps the dialog backdrop a plain scrim, without a blur', () => {
    const rule = css.match(/\.cmn-dialog-backdrop\s*\{([^}]*)\}/)?.[1];
    assert.ok(rule, 'dialog backdrop rule exists');
    assert.doesNotMatch(rule, /backdrop-filter/);
  });
});
