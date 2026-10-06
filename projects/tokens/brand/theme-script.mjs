/**
 * The pre-paint theme script: the one inline `<script>` every lifekit app puts in its
 * `<head>`, so the first paint already carries the stored or OS theme. Apps never copy it:
 * they inline this string (or `@lifekit-hq/tokens/brand/theme-init.js`, generated from it)
 * and pin {@link themeScriptCspHash} in their CSP.
 *
 * The stored choice is the `cmn-theme` key `ThemeService` writes (`light` | `dark`). No
 * stored choice means "follow the OS", so a stored value other than those two is ignored.
 *
 * The body is part of the CSP hash: any edit, whitespace included, changes the hash, and
 * the hash test pins the current value so a change is always deliberate.
 */
import {createHash} from 'node:crypto';

/** localStorage key shared with `ThemeService`. */
export const THEME_STORAGE_KEY = 'cmn-theme';

/**
 * Exact text between `<script>` and `</script>`, and byte for byte the shipped
 * `theme-init.js`, so the file inlined verbatim matches {@link themeScriptCspHash}.
 */
export const THEME_SCRIPT = `// Apply the stored/OS theme before first paint so pages never flash light.
(function () {
  var theme = 'light';
  try {
    var stored = localStorage.getItem('${THEME_STORAGE_KEY}');
    if (stored === 'dark' || stored === 'light') theme = stored;
    else if (window.matchMedia('(prefers-color-scheme: dark)').matches) theme = 'dark';
  } catch (e) {}
  document.documentElement.setAttribute('data-theme', theme);
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
