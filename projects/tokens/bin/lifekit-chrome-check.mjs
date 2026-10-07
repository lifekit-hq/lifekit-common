#!/usr/bin/env node
/**
 * Fails when an app's built output drifts from the lifekit browser-chrome standard
 * (docs/BROWSER-CHROME.md in lifekit-common). Run it in CI after the app build:
 *
 *   lifekit-chrome-check --app fs --name "Finance Sentry" dist/finance-sentry/browser
 *
 * An app served under a sub-path passes it with `--base-path /console/`.
 */
import {parseArgs} from 'node:util';

import {checkBrowserChrome} from '../brand/check.mjs';
import {BRAND_APPS} from '../brand/mark.mjs';
import {normalizeBasePath} from '../brand/standard.mjs';

const USAGE =
  `usage: lifekit-chrome-check --app <${BRAND_APPS.join('|')}> [--name "<App name>"] ` +
  '[--index index.html] [--base-path /] <dist-dir>';

let parsed;
try {
  parsed = parseArgs({
    allowPositionals: true,
    options: {
      app: {type: 'string'},
      name: {type: 'string'},
      index: {type: 'string', default: 'index.html'},
      'base-path': {type: 'string', default: '/'},
      help: {type: 'boolean', short: 'h'},
    },
  });
} catch (error) {
  console.error(`${error.message}\n${USAGE}`);
  process.exit(2);
}

const {values, positionals} = parsed;
if (values.help) {
  console.log(USAGE);
  process.exit(0);
}
if (!values.app || !BRAND_APPS.includes(values.app) || positionals.length !== 1) {
  console.error(USAGE);
  process.exit(2);
}

let basePath;
try {
  basePath = normalizeBasePath(values['base-path']);
} catch (error) {
  console.error(`--base-path: ${error.message}\n${USAGE}`);
  process.exit(2);
}

const problems = checkBrowserChrome({
  distDir: positionals[0],
  app: values.app,
  appName: values.name,
  index: values.index,
  basePath,
});

if (problems.length) {
  console.error(`lifekit-chrome-check: ${problems.length} deviation(s) from the standard`);
  for (const {rule, message} of problems) console.error(`  ✗ [${rule}] ${message}`);
  process.exit(1);
}
console.log(`lifekit-chrome-check: ${positionals[0]} follows the browser-chrome standard`);
