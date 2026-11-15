import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

// cmn-toast paints `text-inverse` on `status-<variant>` (toast.component.ts). WCAG AA needs 4.5:1
// for its 14px text, in both themes.
const MIN_TEXT_CONTRAST = 4.5;
const VARIANTS = ['info', 'success', 'warning', 'error'];
const css = readFileSync(new URL('../theme.css', import.meta.url), 'utf8');

const THEMES = {
  light: /:root,\s*\[data-theme='light'\]\s*\{([\s\S]*?)\n\}/,
  dark: /^\[data-theme='dark'\]\s*\{([\s\S]*?)\n\}/m,
};

function tokensOf(block) {
  return new Map(
    [...block.matchAll(/--color-([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map(m => [m[1], m[2]])
  );
}

function luminance(hex) {
  const [r, g, b] = [1, 3, 5]
    .map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

for (const [theme, pattern] of Object.entries(THEMES)) {
  const tokens = tokensOf(pattern.exec(css)?.[1] ?? '');
  for (const variant of VARIANTS) {
    test(`${theme} theme: ${variant} toast text clears AA (4.5:1)`, () => {
      const bg = tokens.get(`status-${variant}`);
      const fg = tokens.get('text-inverse');
      assert.ok(bg && fg, 'toast tokens resolved');
      assert.ok(ratio(bg, fg) >= MIN_TEXT_CONTRAST, `${variant}: ${ratio(bg, fg).toFixed(2)}:1`);
    });
  }
}
