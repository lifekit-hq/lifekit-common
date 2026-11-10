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
 *
 * `lifekit-chrome-check icons <path…>` fails when the app's source uses a Lucide icon name that
 * `<cmn-icon>` would render empty (see icons/index.mjs and docs/BROWSER-CHROME.md).
 *
 * `lifekit-chrome-check screen <url…>` checks rendered screens' composition at the phone and
 * desktop sizes (see screen/index.mjs and docs/SCREEN-CHECK.md).
 */
import {parseArgs} from 'node:util';

import {checkBrowserChrome} from '../brand/check.mjs';
import {BRAND_APPS} from '../brand/mark.mjs';
import {normalizeBasePath} from '../brand/standard.mjs';
import {checkDrift, DRIFT_RULES} from '../drift/index.mjs';
import {checkIcons, ICON_RULES} from '../icons/index.mjs';
import {runScreen, SCREEN_USAGE} from '../screen/cli.mjs';

const USAGE =
  `usage: lifekit-chrome-check --app <${BRAND_APPS.join('|')}> [--name "<App name>"] ` +
  '[--index index.html] [--base-path /] <dist-dir>\n       lifekit-chrome-check drift [<path>…]\n' +
  '       lifekit-chrome-check icons [<path>…]\n' +
  `       ${SCREEN_USAGE.split('\n')[0].replace(/^usage: /, '')} (see screen --help)`;

const DRIFT_USAGE =
  'usage: lifekit-chrome-check drift [<path>…]   (files or directories; default: the current directory)\n' +
  `rules: ${DRIFT_RULES.join(', ')}`;

const ICONS_USAGE =
  "usage: lifekit-chrome-check icons [<path>…]   (one app's source: files or directories; default: the current directory)\n" +
  `rules: ${ICON_RULES.join(', ')}`;

function runIcons(args) {
  if (args.includes('-h') || args.includes('--help')) {
    console.log(ICONS_USAGE);
    process.exit(0);
  }
  const flag = args.find(arg => arg.startsWith('-'));
  if (flag) {
    console.error(`unknown option ${flag}\n${ICONS_USAGE}`);
    process.exit(2);
  }
  let result;
  try {
    result = checkIcons(args.length ? args : ['.']);
  } catch (error) {
    console.error(`lifekit-chrome-check icons: ${error.message}`);
    process.exit(2);
  }
  const {files, findings} = result;
  if (findings.length) {
    console.error(`lifekit-chrome-check icons: ${findings.length} finding(s) in ${files} file(s)`);
    for (const {file, line, rule, message} of findings) {
      console.error(`  ✗ ${file}:${line} [${rule}] ${message}`);
    }
    process.exit(1);
  }
  console.log(`lifekit-chrome-check icons: ${files} file(s), every icon renders`);
  process.exit(0);
}

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
if (process.argv[2] === 'icons') runIcons(process.argv.slice(3));
if (process.argv[2] === 'screen') await runScreen(process.argv.slice(3));

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
