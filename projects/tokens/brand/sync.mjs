/**
 * Keeps an app's copy of the pre-paint theme script in step with the package. Angular's
 * `index.html` has no include mechanism, so the script is written into the page between two
 * markers; this module is the one place that knows how, and `lifekit-theme-sync` is its CLI.
 *
 *   <!-- theme-init:start - generated from @lifekit-hq/tokens by lifekit-theme-sync; do not edit. -->
 *   <!-- prettier-ignore -->
 *   <script>…</script>
 *   <!-- theme-init:end -->
 *
 * An app whose CSP pins the script by hash hands over those files too: the one `'sha256-…'`
 * source in each `script-src` directive is rewritten to {@link themeScriptCspHash}.
 */
import {readFileSync, writeFileSync} from 'node:fs';

import {THEME_SCRIPT, themeScriptCspHash} from './theme-script.mjs';

const START_PREFIX = '<!-- theme-init:start';

/** The start marker as an app writes it, with the sentence that tells editors to leave it alone. */
export const THEME_INIT_MARKER = `${START_PREFIX} - generated from @lifekit-hq/tokens by lifekit-theme-sync; do not edit. -->`;

/** The end marker an app's `index.html` carries after the inlined script. */
export const THEME_INIT_END = '<!-- theme-init:end -->';

const escapeRegExp = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const BLOCK = new RegExp(
  `^([ \\t]*)(${escapeRegExp(START_PREFIX)}[^>]*-->\\r?\\n(?:[ \\t]*<!-- prettier-ignore -->\\r?\\n)?)` +
    `[\\s\\S]*?(\\r?\\n[ \\t]*${escapeRegExp(THEME_INIT_END)})`,
  'm'
);
const SCRIPT_SRC = /\bscript-src(?![-\w])[^;"\n]*/g;
const SHA256_SOURCE = /'sha256-[A-Za-z0-9+/=]+'/g;

/** `html` with the script between its theme-init markers replaced by `script`. */
export function inlineThemeScript(html, script = THEME_SCRIPT) {
  if (!BLOCK.test(html)) {
    throw new Error(
      `no theme-init block: put ${THEME_INIT_MARKER} and ${THEME_INIT_END} in <head> around the script`
    );
  }
  return html.replace(BLOCK, (_match, indent, open, close) => {
    const eol = open.includes('\r\n') ? '\r\n' : '\n';
    return `${indent}${open}${indent}<script>${script.replace(/\n/g, eol)}</script>${close}`;
  });
}

/** `text` (a CSP file) with the `sha256` source in every `script-src` replaced by `hash`. */
export function pinCspHash(text, hash = themeScriptCspHash()) {
  const directives = text.match(SCRIPT_SRC);
  if (!directives) throw new Error('no script-src directive');
  for (const directive of directives) {
    const pinned = directive.match(SHA256_SOURCE) ?? [];
    if (pinned.length !== 1) {
      throw new Error(
        `script-src must carry exactly one 'sha256-…' source (the theme script's), found ${pinned.length}`
      );
    }
  }
  return text.replace(SCRIPT_SRC, directive => directive.replace(SHA256_SOURCE, () => hash));
}

/**
 * Brings `html` and each `csp` file in step with the package, or only reports what is out of
 * step when `check` is set. Returns the paths that differ (and were rewritten unless `check`).
 * Throws, naming the file, when a file cannot be read or has nothing to update.
 */
export function syncTheme({html, csp = [], check = false}) {
  const script = THEME_SCRIPT;
  const hash = themeScriptCspHash(script);
  const targets = [
    {file: html, next: source => inlineThemeScript(source, script)},
    ...csp.map(file => ({file, next: source => pinCspHash(source, hash)})),
  ];
  const pending = targets.map(({file, next}) => {
    let source;
    try {
      source = readFileSync(file, 'utf8');
    } catch (error) {
      throw new Error(`${file}: ${error.code === 'ENOENT' ? 'no such file' : error.message}`);
    }
    try {
      return {file, source, updated: next(source)};
    } catch (error) {
      throw new Error(`${file}: ${error.message}`);
    }
  });
  const stale = pending.filter(({source, updated}) => updated !== source);
  if (!check) stale.forEach(({file, updated}) => writeFileSync(file, updated));
  return stale.map(({file}) => file);
}
