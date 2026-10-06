/**
 * Reads brand colours from the canonical token file, so no asset or check ever carries
 * its own copy of a colour.
 */
import {readFileSync} from 'node:fs';

const THEME_CSS = new URL('../theme.css', import.meta.url);

/** Custom properties declared directly in the blocks whose selector matches `selector`. */
function declarations(css, selector) {
  const vars = new Map();
  const uncommented = css.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const [, selectors, body] of uncommented.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!selectors.split(',').some(s => s.trim() === selector)) continue;
    for (const [, name, value] of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
      vars.set(name, value.trim());
    }
  }
  return vars;
}

function required(vars, name, theme) {
  const value = vars.get(name);
  if (!value) throw new Error(`theme.css: ${name} is not declared in the ${theme} theme`);
  return value.toLowerCase();
}

/**
 * The brand palette, from `theme.css`:
 * - `tile` — the mark's tile, `--color-accent-700` (light): the lifekit petrol.
 * - `ink` — the glyph, `--color-text-inverse` (light).
 * - `surfaceLight` / `surfaceDark` — `--color-surface-bg` per theme: theme-color and
 *   manifest background.
 */
export function brandColors(css = readFileSync(THEME_CSS, 'utf8')) {
  const light = declarations(css, "[data-theme='light']");
  const dark = declarations(css, "[data-theme='dark']");
  return {
    tile: required(light, '--color-accent-700', 'light'),
    ink: required(light, '--color-text-inverse', 'light'),
    surfaceLight: required(light, '--color-surface-bg', 'light'),
    surfaceDark: required(dark, '--color-surface-bg', 'dark'),
  };
}
