/**
 * The six static drift rules. Each takes a CSS-shaped `(prop, value)` pair and returns a message
 * when the value drifts from the lifekit contract, or `null`.
 *
 * Adapted from pbakaus/impeccable (Apache-2.0, https://github.com/pbakaus/impeccable, v0.1.11):
 * the `layout-transition` matcher (`crates/detect/src/regex_matchers.rs`) and the
 * `design-system-font-size` / `-radius` / `-color` checks (`crates/detect/src/design_system.rs`).
 * Changes: reimplemented in JavaScript, the allowed type ramp and radius scale are read from this
 * package's preset and `theme.css` instead of a DESIGN.md, `layout-transition` is narrowed to
 * width and height, and the `font-family` and `html { font-size }` rules are lifekit's own.
 * See NOTICE.md.
 */
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);

/** The contract the rem scale assumes. */
const ROOT_PX = 16;
const PX_TOLERANCE = 0.01;
/** The smallest text size that stays legible; DESIGN.md "The 12px Floor". */
export const TEXT_FLOOR_PX = 12;

function toPx(value) {
  const match = /^(-?\d*\.?\d+)(px|rem|pt)?$/.exec(value.trim().toLowerCase());
  if (!match) return null;
  const n = Number(match[1]);
  const unit = match[2] ?? 'px';
  if (unit === 'rem') return n * ROOT_PX;
  if (unit === 'pt') return (n * 4) / 3;
  return n;
}

/** The type ramp (px), from the preset's `cmn-*` font sizes. */
export const TEXT_RAMP_PX = Object.values(
  require('../tailwind/preset.cjs').theme.extend.fontSize
).map(([size]) => toPx(size));

/** The radius scale (px): every `--radius-*` in theme.css. The pill is any radius from 99px up. */
export const RADIUS_SCALE_PX = [
  ...readFileSync(new URL('../theme.css', import.meta.url), 'utf8').matchAll(
    /--radius-[\w-]+:\s*([^;]+);/g
  ),
]
  .map(([, value]) => toPx(value))
  .filter(px => px !== null);
const PILL_PX = 99;

const CSS_WIDE = /^(inherit|initial|unset|revert|revert-layer)$/i;
const onScale = (px, scale) => scale.some(step => Math.abs(step - px) <= PX_TOLERANCE);
const formatPx = list => list.map(px => `${+px.toFixed(2)}`).join('/');

/** Splits on top-level commas (not those inside parentheses). */
function splitList(value) {
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < value.length; i++) {
    if (value[i] === '(') depth++;
    else if (value[i] === ')') depth--;
    else if (value[i] === ',' && depth === 0) {
      parts.push(value.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(value.slice(start));
  return parts.map(p => p.trim()).filter(Boolean);
}

const clean = value => value.replace(/!important\s*$/i, '').trim();

/** (a) A font stack must start from a token: `var(--font-sans)`, `var(--font-mono)` or inherit. */
export function fontFamilyMessage(value) {
  const first = splitList(clean(value))[0];
  if (first === undefined || /^var\(/i.test(first) || CSS_WIDE.test(first)) return null;
  return `font-family starts with the literal ${first}; use var(--font-sans) or var(--font-mono)`;
}

/** (c) Text size: on the type ramp and at or above the 12px floor. */
export function textSizeMessage(value) {
  const text = clean(value).toLowerCase();
  if (text.includes('var(') || CSS_WIDE.test(text) || text === '100%' || text === '1em')
    return null;
  const px = toPx(text);
  if (px !== null && px < TEXT_FLOOR_PX - PX_TOLERANCE) {
    return `font-size ${value} is below the ${TEXT_FLOOR_PX}px floor; use the type ramp (text-cmn-*)`;
  }
  if (px !== null && onScale(px, TEXT_RAMP_PX)) return null;
  return `font-size ${value} is off the type ramp (${formatPx(TEXT_RAMP_PX)}px); use text-cmn-*`;
}

/** (d) Radius: every corner on the scale, a pill, a circle, none, or a token. */
export function radiusMessage(value) {
  const text = clean(value).toLowerCase();
  if (text.includes('var(') || CSS_WIDE.test(text) || text === 'none') return null;
  const offScale = text
    .split(/[\s/]+/)
    .filter(Boolean)
    .filter(part => {
      if (part === '0' || part === '50%' || part === '100%') return false;
      const px = toPx(part);
      return px === null || (px > PX_TOLERANCE && px < PILL_PX && !onScale(px, RADIUS_SCALE_PX));
    });
  if (!offScale.length) return null;
  return `radius ${offScale.join(' ')} is off the scale (${formatPx(RADIUS_SCALE_PX)}px, pill); use var(--radius-*) or rounded-cmn-*`;
}

const LAYOUT_PROPERTY = /(?<![\w-])(?:(?:min|max)-)?(?:width|height)(?![\w-])/gi;

/** (f) A transition on width or height animates layout. `all` is left to the browser, as upstream. */
export function layoutTransitionMessage(value) {
  const text = clean(value);
  if (/(?<![\w-])all(?![\w-])/i.test(text)) return null;
  const found = [...new Set(text.match(LAYOUT_PROPERTY)?.map(p => p.toLowerCase()))];
  if (!found.length) return null;
  return `transition on ${found.join(', ')} animates layout; animate transform or opacity`;
}

/** A selector that targets the document root: `html`, `:root`, with attribute/class/pseudo parts. */
const ROOT_SELECTOR = /^(?:html|:root)(?:\[[^\]]*\]|[.#][\w-]+|::?[\w-]+(?:\([^)]*\))?)*$/i;
const NEUTRAL_ROOT_SIZES = new Set(['100%', '16px', '1rem']);

/** (e) The rem contract: nothing resizes the root, so every token keeps its meaning. */
export function rootFontSizeMessage(selector, value) {
  const targetsRoot = selector.split(',').some(part => ROOT_SELECTOR.test(part.trim()));
  if (!targetsRoot || NEUTRAL_ROOT_SIZES.has(clean(value).toLowerCase())) return null;
  return `${selector.trim()} sets font-size ${value}; the rem scale assumes the 16px root, so leave it alone`;
}

const HEX = /(?<![\w&#/.=-])(?<!url\(['"]?)#(?:[\da-f]{8}|[\da-f]{6}|[\da-f]{3,4})(?![\w-])/gi;
/** A colour function, not a same-named call: its first argument is a channel, `none`, `from` or a colour space. */
const COLOR_FUNCTION =
  /(?<![\w-])(?:(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(\s*(?=[\d.+-]|none\b|from\b|calc\()|color\(\s*(?=[a-z-]+\d*\s+[\d.+-]|from\b))/gi;

function normalizeHex(hex) {
  const digits = hex.slice(1).toLowerCase();
  return `#${digits.length <= 4 ? [...digits].map(d => d + d).join('') : digits}`;
}

/** The palette: every hex colour theme.css defines, in either theme. */
export const TOKEN_COLOURS = new Set(
  [
    ...readFileSync(new URL('../theme.css', import.meta.url), 'utf8').matchAll(/#[\da-f]{3,8}\b/gi),
  ].map(([hex]) => normalizeHex(hex))
);

/** `text` with every match of `pattern` overwritten by spaces (newlines kept), so offsets hold. */
export const blank = (text, pattern) => text.replace(pattern, m => m.replace(/[^\n]/g, ' '));

/**
 * (b) Colour literals in a value that match no token: a hex colour outside the palette, or a colour
 * function not built from a token. A hex equal to a token value (a `var()` fallback that mirrors
 * the token) is not drift; one that matches nothing is a stale or invented colour.
 * Returns `{literal, index}[]`, `index` being the offset in `value`.
 */
export function colourLiterals(value) {
  const text = blank(value, /url\([^)]*\)/gi);
  const found = [...text.matchAll(HEX)]
    .filter(([hex]) => !TOKEN_COLOURS.has(normalizeHex(hex)))
    .map(m => ({literal: m[0], index: m.index}));
  for (const match of text.matchAll(COLOR_FUNCTION)) {
    let depth = 1;
    let end = match.index + match[0].length;
    while (end < text.length && depth) {
      if (text[end] === '(') depth++;
      else if (text[end] === ')') depth--;
      end++;
    }
    const call = text.slice(match.index, end);
    if (!call.includes('var(')) found.push({literal: call, index: match.index});
  }
  return found;
}
