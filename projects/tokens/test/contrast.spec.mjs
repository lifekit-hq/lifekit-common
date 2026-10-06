import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {describe, it} from 'node:test';

const css = readFileSync(new URL('../theme.css', import.meta.url), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  ''
);

const BODY_MIN = 4.5;
const STATUS_TINT_MIN = 4.68;
const TINT_ALPHA = 0.15;
const STATUS = ['info', 'success', 'warning', 'error'];

function tokens(selectors) {
  const vars = new Map();
  for (const [, sel, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!sel.split(',').some(s => selectors.includes(s.trim()))) continue;
    for (const [, name, value] of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
      vars.set(name, value.trim());
    }
  }
  return vars;
}

const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));

function luminance(channels) {
  const [r, g, b] = channels.map(c => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const tint = (fg, bg) => fg.map((c, i) => c * TINT_ALPHA + bg[i] * (1 - TINT_ALPHA));

const themes = {
  light: tokens([':root', "[data-theme='light']"]),
  dark: new Map([...tokens([':root', "[data-theme='light']"]), ...tokens(["[data-theme='dark']"])]),
};

for (const [theme, vars] of Object.entries(themes)) {
  const color = name => {
    const hex = vars.get(`--color-${name}`);
    assert.ok(hex, `--color-${name} is not declared in the ${theme} theme`);
    return rgb(hex);
  };

  describe(`${theme} theme contrast`, () => {
    it('keeps body, secondary and placeholder text at 4.5:1 on card, ground and raised surfaces', () => {
      for (const text of ['text-primary', 'text-secondary', 'text-placeholder']) {
        for (const surface of ['surface-card', 'surface-bg', 'surface-raised']) {
          const ratio = contrast(color(text), color(surface));
          assert.ok(ratio >= BODY_MIN, `${text} on ${surface} is ${ratio.toFixed(2)}`);
        }
      }
    });

    it('keeps accent text and the inverse label on an accent fill at 4.5:1', () => {
      assert.ok(contrast(color('accent-default'), color('surface-card')) >= BODY_MIN);
      assert.ok(contrast(color('text-inverse'), color('accent-default')) >= BODY_MIN);
    });

    for (const status of STATUS) {
      it(`reads ${status} as text on a card and on its own 15% tint`, () => {
        const fg = color(`status-${status}`);
        const card = color('surface-card');
        assert.ok(contrast(fg, card) >= BODY_MIN, `${status} on card`);
        const onTint = contrast(fg, tint(fg, card));
        assert.ok(onTint >= STATUS_TINT_MIN, `${status} on tint is ${onTint.toFixed(2)}`);
      });
    }
  });
}
