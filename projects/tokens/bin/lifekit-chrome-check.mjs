#!/usr/bin/env node
/**
 * Fails when an app's built output drifts from the lifekit browser-chrome standard
 * (docs/BROWSER-CHROME.md in lifekit-common). Run it in CI after the app build:
 *
 *   lifekit-chrome-check --app fs --name "Finance Sentry" dist/finance-sentry/browser
 *
 * An app served under a sub-path passes it with `--base-path /console/`.
 *
 * `lifekit-chrome-check drift <path…>` is the other check: it scans source for design drift
 * (see drift/index.mjs and docs/BROWSER-CHROME.md).
 */
import {parseArgs} from 'node:util';

import {checkBrowserChrome} from '../brand/check.mjs';
import {BRAND_APPS} from '../brand/mark.mjs';
import {normalizeBasePath} from '../brand/standard.mjs';
import {checkDrift, DRIFT_RULES} from '../drift/index.mjs';

const USAGE =
  `usage: lifekit-chrome-check --app <${BRAND_APPS.join('|')}> [--name "<App name>"] ` +
  '[--index index.html] [--base-path /] <dist-dir>\n       lifekit-chrome-check drift [<path>…]';

const DRIFT_USAGE =
  'usage: lifekit-chrome-check drift [<path>…]   (files or directories; default: the current directory)\n' +
  `rules: ${DRIFT_RULES.join(', ')}`;

function runDrift(args) {
  if (args.includes('-h') || args.includes('--help')) {
    console.log(DRIFT_USAGE);
    process.exit(0);
  }
  const flag = args.find(arg => arg.startsWith('-'));
  if (flag) {
    console.error(`unknown option ${flag}\n${DRIFT_USAGE}`);
    process.exit(2);
  }
  const paths = args.length ? args : ['.'];
  let result;
  try {
    result = checkDrift(paths);
  } catch (error) {
    console.error(`lifekit-chrome-check drift: ${error.message}`);
    process.exit(2);
  }
  const {files, findings} = result;
  if (findings.length) {
    console.error(`lifekit-chrome-check drift: ${findings.length} finding(s) in ${files} file(s)`);
    for (const {file, line, rule, message} of findings) {
      console.error(`  ✗ ${file}:${line} [${rule}] ${message}`);
    }
    process.exit(1);
  }
  console.log(`lifekit-chrome-check drift: ${files} file(s), no design drift`);
  process.exit(0);
}

if (process.argv[2] === 'drift') runDrift(process.argv.slice(3));

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
