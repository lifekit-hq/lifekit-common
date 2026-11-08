/**
 * Test helper: the rules every design preset (`presets/<id>.css`) must meet. A preset is one CSS
 * file that overrides token names under `:root[data-preset='<id>']`; Carbon is the unscoped default
 * in theme.css, so it is never a preset file. See presets/README.md for the contract in prose.
 *
 * `checkPreset({id, css, themeCss})` returns the violations as sentences (an empty list is a pass),
 * so a spec can assert on the exact rule a bad preset breaks. The cascade is modelled for the two
 * things that decide a preset's result: it beats theme.css on specificity (0,2,0 against 0,1,0),
 * and within a file a dark rule beats the base rule, then source order decides.
 */
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const postcss = require('postcss');

/** The phone floor for a pressable control, in px (docs/PHONE-CONTRACT.md). */
export const TOUCH_FLOOR_PX = 44;
/** WCAG 1.4.11 non-text contrast, for the border that identifies a field. */
export const FIELD_BORDER_MIN = 3;
/** WCAG 1.4.3 text contrast, for a `-bg`/`-fg` pair a preset sets. */
export const TEXT_MIN = 4.5;

const PHONE_WIDTH = 390;
const ID = /^[a-z][a-z0-9-]*$/;
const FIELD_BORDER = /(field|input|select|checkbox).*border|border.*(field|input|select|checkbox)/;
const SURFACES = ['--color-surface-card', '--color-surface-bg'];
const SELECTOR = /^:root\[data-preset=(['"])([^'"]+)\1\](\[data-theme=(['"])(light|dark)\4\])?$/;
const DARK = /data-theme=['"]dark['"]/;
const UNREADABLE_COLOUR = /color-mix|rgba?\(|hsla?\(|oklch|oklab|var\(/i;

/** Every declaration in a rule, with where it sits: dark scope, media query, source order. */
function declarations(root) {
  const found = [];
  root.walkDecls(decl => {
    if (decl.parent.type !== 'rule') return;
    let media = null;
    for (let p = decl.parent.parent; p; p = p.parent) {
      if (p.type === 'atrule' && p.name === 'media') media = p.params.replace(/\s+/g, ' ').trim();
    }
    found.push({
      prop: decl.prop,
      value: decl.value.trim(),
      dark: DARK.test(decl.parent.selector),
      media,
      order: found.length,
    });
  });
  return found;
}

/** Whether a media query holds at `width`; anything but a width query is treated as not matching. */
function mediaMatches(media, width) {
  if (media === null) return true;
  const queries = [...media.matchAll(/\((min|max)-width:\s*(\d+(?:\.\d+)?)px\)/g)];
  const rest = media.replace(/\((min|max)-width:\s*[\d.]+px\)/g, '').replace(/\band\b/g, '');
  if (queries.length === 0 || rest.trim() !== '') return false;
  return queries.every(([, kind, px]) => (kind === 'min' ? width >= +px : width <= +px));
}

/** The winning declaration of `prop` in a theme at a width, or `undefined`. */
function winner(decls, prop, {theme, width}) {
  return decls
    .filter(d => d.prop === prop && (theme === 'dark' || !d.dark) && mediaMatches(d.media, width))
    .sort((a, b) => Number(a.dark) - Number(b.dark) || a.order - b.order)
    .at(-1);
}

function toRgb(value) {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim());
  if (!hex) return null;
  const full = hex[1].length === 3 ? [...hex[1]].map(c => c + c).join('') : hex[1];
  return [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16));
}

function luminance(channels) {
  const [r, g, b] = channels.map(c => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export function checkPreset({id, css, themeCss}) {
  const problems = [];
  const fail = message => problems.push(message);

  if (!ID.test(id) || id === 'carbon') {
    fail(`id "${id}" must be a lowercase id other than carbon (Carbon is the unscoped default)`);
  }

  const base = declarations(postcss.parse(themeCss));
  const preset = postcss.parse(css);
  const own = declarations(preset);

  preset.walkRules(rule => {
    if (rule.parent.type === 'atrule' && rule.parent.name === 'font-face') return;
    for (const selector of rule.selectors) {
      const match = SELECTOR.exec(selector.trim());
      if (!match || match[2] !== id) {
        fail(
          `selector "${selector.trim()}" must be :root[data-preset='${id}'], optionally with [data-theme='dark']`
        );
      }
    }
    if (rule.parent.type === 'atrule' && rule.parent.name !== 'media') {
      fail(`@${rule.parent.name} is not allowed around a preset rule (only @media)`);
    }
  });
  preset.walkAtRules('font-face', face => {
    face.walkDecls('src', decl => {
      if (/url\(\s*['"]?(https?:)?\/\//i.test(decl.value)) {
        fail(`@font-face src "${decl.value}" is remote; self-host the font (no font CDN)`);
      }
    });
  });

  const themeProps = new Set(base.map(d => d.prop));
  for (const d of own) {
    if (!d.prop.startsWith('--')) {
      fail(`${d.prop} is not a custom property; a preset only sets tokens`);
    } else if (d.prop.startsWith('--color-')) {
      fail(
        `${d.prop} overrides a colour; colour stays on the seed axis, a preset never sets --color-*`
      );
    } else if (!themeProps.has(d.prop)) {
      fail(
        `${d.prop} is not declared in theme.css; add the hook there with its Carbon value first`
      );
    }
  }

  // The preset's base rule is more specific than theme.css's dark block and its media rules, so it
  // would flatten them. A preset that sets a token with a dark or per-width value restates both.
  for (const d of own.filter(o => !o.dark && o.media === null)) {
    if (
      base.some(b => b.prop === d.prop && b.dark) &&
      !own.some(o => o.prop === d.prop && o.dark)
    ) {
      fail(`${d.prop} has a dark value in theme.css; restate it under [data-theme='dark'] too`);
    }
    for (const b of base.filter(x => x.prop === d.prop && x.media !== null)) {
      if (!own.some(o => o.prop === d.prop && o.media === b.media)) {
        fail(`${d.prop} changes under @media ${b.media} in theme.css; restate it there too`);
      }
    }
  }

  /** `name` as the page computes it for a theme and width, `var()` chains followed, or `null`. */
  const resolve = (name, ctx, seen = new Set()) => {
    const decl = winner(own, name, ctx) ?? winner(base, name, ctx);
    if (!decl || seen.has(name)) return null;
    const chain = new Set(seen).add(name);
    let broken = false;
    const value = decl.value.replace(
      /var\(\s*(--[\w-]+)\s*(?:,\s*([^)]*))?\)/g,
      (_, ref, fallback) => {
        const inner = resolve(ref, ctx, chain);
        if (inner !== null) return inner;
        if (fallback !== undefined) return fallback.trim();
        broken = true;
        return '';
      }
    );
    return broken ? null : value;
  };

  const phone = {theme: 'light', width: PHONE_WIDTH};
  for (const name of ['--size-touch', '--cmn-control-h']) {
    const match = /^(-?\d+(?:\.\d+)?)px$/.exec(resolve(name, phone)?.trim() ?? '');
    if (!match) {
      fail(`${name} does not resolve to a px length at phone width`);
    } else if (Number(match[1]) < TOUCH_FLOOR_PX) {
      fail(
        `${name} is ${match[1]}px at phone width (max-width: 767px); the touch floor is ${TOUCH_FLOOR_PX}px` +
          (name === '--cmn-control-h' ? '. Restate it in a @media (max-width: 767px) block.' : '')
      );
    }
  }

  const names = [...new Set(own.map(o => o.prop))];
  for (const theme of ['light', 'dark']) {
    const ctx = {theme, width: 1280};
    const colour = name => {
      const value = resolve(name, ctx);
      const rgb = value === null ? null : toRgb(value);
      if (!rgb) fail(`${name} does not resolve to a #hex colour in the ${theme} theme`);
      return rgb;
    };
    const surfaces = SURFACES.map(name => [name, colour(name)]);

    for (const name of names.filter(n => FIELD_BORDER.test(n))) {
      const value = resolve(name, ctx);
      const hex = value === null ? null : /#[0-9a-f]{3,6}\b/i.exec(value);
      if (!hex) {
        if (value === null || UNREADABLE_COLOUR.test(value)) {
          fail(
            `${name} has no #hex colour the test can read in the ${theme} theme; use a --color-* role`
          );
        }
        continue; // widths, `none`, `transparent`: a field with no border colour to test
      }
      for (const [surface, surfaceRgb] of surfaces) {
        const got = surfaceRgb ? ratio(toRgb(hex[0]), surfaceRgb) : Infinity;
        if (got < FIELD_BORDER_MIN) {
          fail(
            `${name} is ${got.toFixed(2)}:1 on ${surface} in the ${theme} theme; a field border needs ${FIELD_BORDER_MIN}:1`
          );
        }
      }
    }

    const pairs = new Set(
      names.filter(n => /-(bg|fg)$/.test(n)).map(n => n.replace(/-(bg|fg)$/, ''))
    );
    for (const stem of pairs) {
      if (!themeProps.has(`${stem}-bg`) || !themeProps.has(`${stem}-fg`)) continue;
      const [bg, fg] = [colour(`${stem}-bg`), colour(`${stem}-fg`)];
      if (bg && fg && ratio(bg, fg) < TEXT_MIN) {
        fail(
          `${stem}-fg on ${stem}-bg is ${ratio(bg, fg).toFixed(2)}:1 in the ${theme} theme; text needs ${TEXT_MIN}:1`
        );
      }
    }
  }

  return problems;
}
