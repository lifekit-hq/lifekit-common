#!/usr/bin/env node
/**
 * Inlines the pre-paint theme script from this package into an app's `index.html`, and re-pins
 * its sha256 in the app's CSP files. `--check` changes nothing and exits 1 when anything is out
 * of step, for lint and CI. Run it from the app's frontend directory:
 *
 *   lifekit-theme-sync                                   rewrite src/index.html
 *   lifekit-theme-sync --check                           exit 1 when it is out of sync
 *   lifekit-theme-sync --csp ../docker/nginx.conf        also pin the hash in that CSP file
 *
 * The page carries the script between `<!-- theme-init:start … -->` and
 * `<!-- theme-init:end -->` markers (see brand/sync.mjs and docs/BROWSER-CHROME.md).
 */
import {parseArgs} from 'node:util';

import {syncTheme, THEME_INIT_END, THEME_INIT_MARKER} from '../brand/sync.mjs';

const DEFAULT_HTML = 'src/index.html';

const USAGE =
  `usage: lifekit-theme-sync [--check] [--html ${DEFAULT_HTML}] [--csp <file>]…\n` +
  `  the page needs ${THEME_INIT_MARKER}\n  and ${THEME_INIT_END} around the inlined script`;

let parsed;
try {
  parsed = parseArgs({
    options: {
      check: {type: 'boolean', default: false},
      html: {type: 'string', default: DEFAULT_HTML},
      csp: {type: 'string', multiple: true, default: []},
      help: {type: 'boolean', short: 'h'},
    },
  });
} catch (error) {
  console.error(`${error.message}\n${USAGE}`);
  process.exit(2);
}

const {values} = parsed;
if (values.help) {
  console.log(USAGE);
  process.exit(0);
}

let stale;
try {
  stale = syncTheme({html: values.html, csp: values.csp, check: values.check});
} catch (error) {
  console.error(`lifekit-theme-sync: ${error.message}`);
  process.exit(2);
}

if (values.check && stale.length) {
  console.error(
    `lifekit-theme-sync: out of sync with @lifekit-hq/tokens: ${stale.join(', ')}\n` +
      '  run `lifekit-theme-sync` to rewrite'
  );
  process.exit(1);
}
console.log(
  stale.length
    ? `lifekit-theme-sync: updated ${stale.join(', ')}`
    : 'lifekit-theme-sync: theme script is in sync'
);
