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

/** The marker comments an app's `index.html` carries around the inlined script. */
export const THEME_INIT_START = '<!-- theme-init:start';
export const THEME_INIT_END = '<!-- theme-init:end -->';

/** The start marker as an app writes it, with the sentence that tells editors to leave it alone. */
export const THEME_INIT_MARKER =
  '<!-- theme-init:start - generated from @lifekit-hq/tokens by lifekit-theme-sync; do not edit. -->';

const BLOCK =
  /^([ \t]*)(<!-- theme-init:start[^>]*-->\n(?:[ \t]*<!-- prettier-ignore -->\n)?)[\s\S]*?(\n[ \t]*<!-- theme-init:end -->)/m;
const SCRIPT_SRC = /script-src\b[^;"\n]*/g;
const SHA256_SOURCE = /'sha256-[A-Za-z0-9+/=]+'/g;

/** `html` with the script between its theme-init markers replaced by `script`. */
export function inlineThemeScript(html, script = THEME_SCRIPT) {
  if (!BLOCK.test(html)) {
    throw new Error(
      `no theme-init block: put ${THEME_INIT_MARKER} and ${THEME_INIT_END} in <head> around the script`
    );
  }
  return html.replace(
    BLOCK,
    (_match, indent, open, close) => `${indent}${open}${indent}<script>${script}</script>${close}`
  );
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
  const stale = [];
  for (const {file, next} of targets) {
    let source;
    try {
      source = readFileSync(file, 'utf8');
    } catch (error) {
      throw new Error(`${file}: ${error.code === 'ENOENT' ? 'no such file' : error.message}`);
    }
    let updated;
    try {
      updated = next(source);
    } catch (error) {
      throw new Error(`${file}: ${error.message}`);
    }
    if (updated === source) continue;
    stale.push(file);
    if (!check) writeFileSync(file, updated);
  }
  return stale;
}
