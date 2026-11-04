/**
 * `lifekit-chrome-check screen`: the screen-composition check run ad hoc against URLs, at the
 * phone and desktop sizes. An app's CI calls `checkScreen` from its own Playwright e2e instead,
 * where it already serves the app with its data (docs/SCREEN-CHECK.md).
 *
 * Playwright is the app's own dev dependency (`@playwright/test` or `playwright`), resolved from
 * the working directory; the tokens package does not ship a browser.
 */
import {createRequire} from 'node:module';
import {join} from 'node:path';
import {parseArgs} from 'node:util';

import {checkScreen, formatScreen, SCREEN_RULES, SCREEN_VIEWPORTS} from './index.mjs';

export const SCREEN_USAGE =
  'usage: lifekit-chrome-check screen [--viewport phone|desktop|both] [--color-scheme light|dark]\n' +
  '                                   [--kind <kind>] [--ignore C6,C9] [--settle-timeout <ms>] <url>…\n' +
  `rules: ${SCREEN_RULES.map(rule => `${rule.id} ${rule.name}`).join(', ')}`;

const VIEWPORT_CHOICES = {phone: ['phone'], desktop: ['desktop'], both: ['phone', 'desktop']};
const SCHEMES = new Set(['light', 'dark']);
const RULE_IDS = new Set(SCREEN_RULES.map(rule => rule.id));

/** Parses the subcommand's arguments; throws with a message naming what is wrong. */
export function parseScreenArgs(args) {
  const {values, positionals} = parseArgs({
    args,
    allowPositionals: true,
    options: {
      viewport: {type: 'string', default: 'both'},
      'color-scheme': {type: 'string', default: 'light'},
      kind: {type: 'string'},
      ignore: {type: 'string', default: ''},
      'settle-timeout': {type: 'string'},
      help: {type: 'boolean', short: 'h'},
    },
  });
  if (values.help) return {help: true};
  const viewports = VIEWPORT_CHOICES[values.viewport];
  if (!viewports)
    throw new Error(`--viewport must be phone, desktop or both, not ${values.viewport}`);
  if (!SCHEMES.has(values['color-scheme'])) {
    throw new Error(`--color-scheme must be light or dark, not ${values['color-scheme']}`);
  }
  const ignore = values.ignore ? values.ignore.split(',').map(id => id.trim()) : [];
  const unknown = ignore.filter(id => !RULE_IDS.has(id));
  if (unknown.length) throw new Error(`--ignore names unknown rule(s): ${unknown.join(', ')}`);
  const timeout =
    values['settle-timeout'] === undefined ? undefined : Number(values['settle-timeout']);
  if (timeout !== undefined && !(timeout > 0))
    throw new Error('--settle-timeout must be a positive number of ms');
  if (!positionals.length) throw new Error('name at least one URL');
  return {
    help: false,
    urls: positionals,
    viewports,
    colorScheme: values['color-scheme'],
    kind: values.kind ?? null,
    ignore,
    timeout,
  };
}

function loadChromium() {
  const require = createRequire(join(process.cwd(), 'package.json'));
  for (const name of ['@playwright/test', 'playwright']) {
    try {
      return require(name).chromium;
    } catch {
      // try the next one
    }
  }
  throw new Error('needs @playwright/test or playwright installed in the current project');
}

/** Runs the subcommand and exits: 0 when every screen is clean, 1 on findings, 2 on misuse. */
export async function runScreen(args) {
  let options;
  try {
    options = parseScreenArgs(args);
  } catch (error) {
    console.error(`lifekit-chrome-check screen: ${error.message}\n${SCREEN_USAGE}`);
    process.exit(2);
  }
  if (options.help) {
    console.log(SCREEN_USAGE);
    process.exit(0);
  }
  let chromium;
  try {
    chromium = loadChromium();
  } catch (error) {
    console.error(`lifekit-chrome-check screen: ${error.message}`);
    process.exit(2);
  }
  const browser = await chromium.launch();
  let failed = 0;
  try {
    for (const size of options.viewports) {
      const context = await browser.newContext({
        ...SCREEN_VIEWPORTS[size],
        colorScheme: options.colorScheme,
        serviceWorkers: 'block',
      });
      const page = await context.newPage();
      for (const url of options.urls) {
        await page.goto(url, {waitUntil: 'networkidle'});
        const result = await checkScreen(page, {
          kind: options.kind,
          ignore: options.ignore,
          timeout: options.timeout,
        });
        const report = formatScreen({...result, url: `${url} [${size}]`});
        if (result.findings.length) {
          failed++;
          console.error(report);
        } else {
          console.log(report);
        }
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }
  process.exit(failed ? 1 : 0);
}
