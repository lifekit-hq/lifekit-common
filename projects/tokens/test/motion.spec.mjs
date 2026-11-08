/**
 * Motion discipline (epic: motion in the library, issue #270): every transition and animation in
 * theme.css takes its length from a `--cmn-duration-*` token, Carbon's values, and its curve from
 * a `--cmn-ease-*` token, never a literal, so nothing can be longer than the tokens allow and one
 * edit retimes the library. The Reduce Motion block is the one place a literal is correct
 * (0.01ms, "finished before it is seen"). The loops this library keeps are named below.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {describe, it} from 'node:test';

const THEME = readFileSync(new URL('../theme.css', import.meta.url), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  ''
);

/** theme.css without its `@media (prefers-reduced-motion: reduce)` blocks. */
function withoutReducedMotion(css) {
  let out = '';
  let rest = css;
  for (;;) {
    const start = rest.indexOf('@media (prefers-reduced-motion: reduce)');
    if (start === -1) {
      return out + rest;
    }
    out += rest.slice(0, start);
    let depth = 0;
    let i = rest.indexOf('{', start);
    do {
      depth += rest[i] === '{' ? 1 : rest[i] === '}' ? -1 : 0;
      i += 1;
    } while (depth > 0);
    rest = rest.slice(i);
  }
}

const MOTION = withoutReducedMotion(THEME);

/** Each comma-separated layer of every `animation` / `transition` shorthand. */
function layers() {
  const found = [];
  for (const match of MOTION.matchAll(/(?<![\w-])(animation|transition)\s*:\s*([^;]+);/g)) {
    for (const layer of match[2].split(/,(?![^(]*\))/)) {
      const text = layer.trim().replace(/\s+/g, ' ');
      if (text !== 'none' && text !== 'inherit') {
        found.push({property: match[1], text});
      }
    }
  }
  return found;
}

describe('motion in theme.css', () => {
  it('finds the transitions and animations it is meant to check', () => {
    assert.ok(layers().length >= 10, `only ${layers().length} layers found`);
  });

  it('takes every duration from a --cmn-duration token', () => {
    for (const {text} of layers()) {
      assert.match(
        text,
        /var\(--cmn-duration-(short|medium|long)\)/,
        `hard-coded duration: ${text}`
      );
    }
  });

  it('takes every curve from a --cmn-ease token', () => {
    for (const {text} of layers()) {
      assert.match(text, /var\(--cmn-ease-[a-z-]+\)/, `hard-coded curve: ${text}`);
    }
  });

  it('keeps no loop but the skeleton sheen', () => {
    const loops = layers().filter(({text}) => /\binfinite\b/.test(text));
    assert.equal(loops.length, 1);
    assert.match(loops[0].text, /^cmn-skeleton-sweep /);
  });

  it('moves only opacity and transform in its keyframes', () => {
    const forbidden =
      /(?:^|[{;\s])(?:width|height|top|left|right|bottom|margin[a-z-]*|padding[a-z-]*)\s*:/;
    for (const block of THEME.matchAll(/@keyframes\s+([\w-]+)\s*\{((?:[^{}]|\{[^{}]*\})*)\}/g)) {
      assert.doesNotMatch(block[2], forbidden, `@keyframes ${block[1]} animates layout`);
    }
  });
});
