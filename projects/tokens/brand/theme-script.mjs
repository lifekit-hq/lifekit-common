/**
 * The pre-paint theme script: the one inline `<script>` every lifekit app puts in its
 * `<head>`, so the first paint already carries the stored or OS theme. Apps never copy it:
 * they inline this string (or `@lifekit-hq/tokens/brand/theme-init.js`, generated from it)
 * and pin {@link themeScriptCspHash} in their CSP.
 *
 * The stored choice is the `cmn-theme` key `ThemeService` writes (`light` | `dark`). No
 * stored choice means "follow the OS", so a stored value other than those two is ignored.
 *
 * A user's own colour (`cmn-theme-seed`, written by `ThemeService.setSeed` or the engine's
 * `storeSeed`) carries its palette already derived for each theme and contrast level, so the
 * script only picks the variant and sets it inline on `<html>` (CSSOM, so no `style-src` change).
 * Only `--color-*` names with a `#rrggbb` value are applied; a cache of another version is ignored.
 *
 * The body is part of the CSP hash: any edit, whitespace included, changes the hash, and
 * the hash test pins the current value so a change is always deliberate.
 */
import {createHash} from 'node:crypto';

import {SEED_CACHE_VERSION, SEED_STORAGE_KEY} from '../engine/runtime.mjs';

/** localStorage key shared with `ThemeService`. */
export const THEME_STORAGE_KEY = 'cmn-theme';

/**
 * Exact text between `<script>` and `</script>`, and byte for byte the shipped
 * `theme-init.js`, so the file inlined verbatim matches {@link themeScriptCspHash}.
 */
export const THEME_SCRIPT = `// Apply the stored/OS theme and the stored seed colour before first paint so pages never flash.
(function () {
  var root = document.documentElement;
  var theme = 'light';
  try {
    var stored = localStorage.getItem('${THEME_STORAGE_KEY}');
    if (stored === 'dark' || stored === 'light') theme = stored;
    else if (window.matchMedia('(prefers-color-scheme: dark)').matches) theme = 'dark';
  } catch (e) {}
  root.setAttribute('data-theme', theme);
  try {
    var seed = JSON.parse(localStorage.getItem('${SEED_STORAGE_KEY}'));
    if (!seed || seed.v !== ${SEED_CACHE_VERSION} || !seed.css) return;
    var more = window.matchMedia('(prefers-contrast: more)').matches;
    var tokens = seed.css[more ? theme + '-more' : theme] || {};
    for (var name in tokens) {
      if (/^--color-[a-z0-9-]+$/.test(name) && /^#[0-9a-f]{6}$/i.test(tokens[name]))
        root.style.setProperty(name, tokens[name]);
    }
  } catch (e) {}
})();
`;

/** The script as an HTML element, ready for `index.html`. */
export function themeScriptTag(script = THEME_SCRIPT) {
  return `<script>${script}</script>`;
}

/**
 * The CSP `script-src` source expression admitting the inline script, e.g.
 * `'sha256-…'`. The browser hashes the text between the tags, which is exactly `script`
 * (and so exactly the bytes of the shipped `theme-init.js`).
 */
export function themeScriptCspHash(script = THEME_SCRIPT) {
  return `'sha256-${createHash('sha256').update(script).digest('base64')}'`;
}
