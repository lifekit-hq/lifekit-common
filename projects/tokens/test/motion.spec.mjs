/**
 * Motion discipline (epic: motion in the library, issue #270): every transition and animation in
 * theme.css takes its length from a `--cmn-duration-*` token, Carbon's values, and its curve from
 * a `--cmn-ease-*` token, never a literal, so nothing can be longer than the tokens allow and one
 * edit retimes the library. The Reduce Motion block is the one place a literal is correct
 * (0.01ms, "finished before it is seen"). The one loop this library keeps is the skeleton sheen.
 *
 * theme.css is parsed with postcss into a declaration model, so comments, at-rule nesting and
 * longhands (`animation-duration`, `transition-timing-function`, ...) are read as CSS does, and the
 * durations are the resolved values of the tokens the declarations actually reference.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {describe, it} from 'node:test';

const require = createRequire(import.meta.url);
const postcss = require('postcss');

const root = postcss.parse(readFileSync(new URL('../theme.css', import.meta.url), 'utf8'));

function inReducedMotion(node) {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (parent.type === 'atrule' && /prefers-reduced-motion\s*:\s*reduce/.test(parent.params)) {
      return true;
    }
  }
  return false;
}

/** Custom properties declared in theme.css, by name (the first declaration wins; light is first). */
const tokens = new Map();
root.walkDecls(/^--/, decl => {
  if (!tokens.has(decl.prop)) {
    tokens.set(decl.prop, decl.value);
  }
});

function splitTopLevel(value, separator) {
  const parts = [];
  let depth = 0;
  let current = '';
  for (const char of value) {
    if (char === '(') {
      depth += 1;
    } else if (char === ')') {
      depth -= 1;
    }
    if (depth === 0 && (separator === ' ' ? /\s/.test(char) : char === separator)) {
      parts.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  parts.push(current);
  return parts.map(part => part.trim()).filter(Boolean);
}

function resolve(value) {
  return value.replace(/var\((--[\w-]+)\)/g, (_, name) => resolve(tokens.get(name) ?? 'UNDEFINED'));
}

const TIME = /^\d*\.?\d+m?s$/;
const toMs = time => (time.endsWith('ms') ? parseFloat(time) : parseFloat(time) * 1000);

/** One entry per comma-separated layer of each motion declaration outside Reduce Motion. */
const layers = [];
root.walkDecls(
  /^(animation|transition)(-(duration|delay|timing-function|iteration-count))?$/,
  decl => {
    if (inReducedMotion(decl)) {
      return;
    }
    const [, kind, longhand] = decl.prop.match(/^(animation|transition)(?:-(.+))?$/);
    for (const layer of splitTopLevel(decl.value, ',')) {
      if (layer !== 'none' && layer !== 'inherit') {
        layers.push({decl, kind, longhand, raw: layer, words: splitTopLevel(layer, ' ')});
      }
    }
  }
);

const isDurationToken = word =>
  /^(var\(--cmn-duration-(short|medium|long)\)|calc\(.*\))$/.test(word);
const isEaseToken = word => /^var\(--cmn-ease-[a-z-]+\)$/.test(word);
const loops = layers.filter(({longhand, words}) =>
  longhand === 'iteration-count' ? words[0] === 'infinite' : words.includes('infinite')
);

describe('motion in theme.css', () => {
  it('finds the transitions and animations it is meant to check', () => {
    assert.ok(layers.length >= 10, `only ${layers.length} layers found`);
    assert.ok(
      layers.some(({longhand}) => longhand === 'duration'),
      'no animation-duration found'
    );
  });

  it('defines the duration tokens as Carbon productive/expressive lengths', () => {
    assert.deepEqual(
      ['short', 'medium', 'long'].map(name => toMs(tokens.get(`--cmn-duration-${name}`))),
      [150, 240, 400]
    );
  });

  it('takes every duration from a --cmn-duration token, never a literal', () => {
    for (const {decl, longhand, words, raw} of layers) {
      if (longhand === 'timing-function' || longhand === 'iteration-count') {
        continue;
      }
      const times = words.filter(word => TIME.test(word));
      assert.deepEqual(times, [], `${decl.prop} has a literal time: ${raw}`);
      assert.ok(words.some(isDurationToken), `${decl.prop} has no --cmn-duration token: ${raw}`);
    }
  });

  it('takes every curve from a --cmn-ease token, never a literal', () => {
    for (const {decl, longhand, words, raw} of layers) {
      if (longhand === 'duration' || longhand === 'delay' || longhand === 'iteration-count') {
        continue;
      }
      const curve = longhand === 'timing-function' ? words : words.filter(w => !TIME.test(w));
      assert.ok(curve.some(isEaseToken), `${decl.prop} has no --cmn-ease token: ${raw}`);
      assert.equal(
        words.filter(word => /^(cubic-bezier|steps|linear|ease(-in|-out|-in-out)?)\b/.test(word))
          .length,
        0,
        `${decl.prop} has a literal curve: ${raw}`
      );
    }
  });

  it('keeps every non-looping motion within the longest token', () => {
    const longest = toMs(tokens.get('--cmn-duration-long'));
    for (const {decl, longhand, words, raw} of layers) {
      if (loops.some(loop => loop.decl === decl) || longhand === 'timing-function') {
        continue;
      }
      for (const word of words.filter(w => TIME.test(resolve(w)) && !/^calc/.test(w))) {
        assert.ok(toMs(resolve(word)) <= longest, `${decl.prop} runs past ${longest}ms: ${raw}`);
      }
    }
  });

  it('keeps no loop but the skeleton sheen', () => {
    assert.equal(loops.length, 1);
    assert.equal(loops[0].decl.parent.selector, '.cmn-skeleton-sweep::after');
    assert.equal(loops[0].words[0], 'cmn-skeleton-sweep');
  });

  it('moves only opacity and transform in its keyframes', () => {
    const compositor = new Set(['opacity', 'transform']);
    let frames = 0;
    root.walkAtRules('keyframes', keyframes => {
      keyframes.walkDecls(decl => {
        frames += 1;
        assert.ok(
          compositor.has(decl.prop),
          `@keyframes ${keyframes.params} animates ${decl.prop}`
        );
      });
    });
    assert.ok(frames > 0, 'no keyframe declarations found');
  });

  it("points Tailwind's default transition at the motion tokens", () => {
    const {theme} = require('../tailwind/preset.cjs');
    assert.equal(theme.extend.transitionDuration.DEFAULT, 'var(--cmn-duration-short)');
    assert.equal(theme.extend.transitionTimingFunction.DEFAULT, 'var(--cmn-ease-standard)');
  });
});
