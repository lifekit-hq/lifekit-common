/**
 * docs/BROWSER-CHROME.md quotes the brand colours. They are derived from theme.css, so a
 * token change that leaves the prose behind fails here instead of misleading app authors.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {describe, it} from 'node:test';

import {brandColors, headMarkup, manifestFragment} from '../brand/index.mjs';

const DOC = readFileSync(new URL('../../../docs/BROWSER-CHROME.md', import.meta.url), 'utf8');
const HEX = /#[0-9a-f]{6}\b/gi;
const colors = brandColors();

function codeBlock(startsWith) {
  const block = [...DOC.matchAll(/```\w*\n([\s\S]*?)```/g)].find(([, body]) =>
    body.startsWith(startsWith)
  );
  assert.ok(block, `no code block starting with ${startsWith}`);
  return block[1].trim();
}

function tableValue(field) {
  const row = DOC.match(new RegExp(`^\\| \`${field}\`\\s*\\|[^\\n]*?(#[0-9a-f]{6})`, 'im'));
  assert.ok(row, `no ${field} row with a colour in the manifest table`);
  return row[1].toLowerCase();
}

describe('docs/BROWSER-CHROME.md colours', () => {
  it('quotes only token-derived colours', () => {
    const allowed = new Set(Object.values(colors));
    const stale = [...new Set(DOC.match(HEX).map(hex => hex.toLowerCase()))].filter(
      hex => !allowed.has(hex)
    );
    assert.deepEqual(stale, [], 'colours in the doc that no brand token produces');
  });

  it('names the mark tile colour as --color-accent-700', () => {
    const tile = DOC.match(/`--color-accent-700` `(#[0-9a-f]{6})`/i);
    assert.ok(tile, 'the mark section pairs --color-accent-700 with its value');
    assert.equal(tile[1].toLowerCase(), colors.tile);
  });

  it('gives the theme-color pair and the manifest colours from the surface tokens', () => {
    const metas = [...codeBlock('<meta name="theme-color"').matchAll(HEX)].map(([hex]) => hex);
    assert.deepEqual(metas, [colors.surfaceLight, colors.surfaceDark]);
    const fragment = manifestFragment(colors);
    assert.equal(tableValue('theme_color'), fragment.theme_color);
    assert.equal(tableValue('background_color'), fragment.background_color);
  });

  it('shows the head template the package generates', () => {
    assert.equal(
      codeBlock('<title>Finance Sentry</title>'),
      headMarkup({title: 'Finance Sentry'}, colors)
    );
  });
});
