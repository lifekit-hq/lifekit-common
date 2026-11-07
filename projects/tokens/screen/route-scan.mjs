/**
 * The route scan: every route of an app, at the phone and the desktop size, in the light and the
 * dark scheme, once its data has settled, through the design judge (the impeccable detector) and
 * axe-core. A finding fails the route unless the app accepted it, by name and with a reason. See
 * docs/ROUTE-SCAN.md in lifekit-common for wiring it into an app and CI.
 *
 *   import {expect, test} from '@playwright/test';
 *   import {defineRouteScans} from '@lifekit-hq/tokens/screen';
 *
 *   defineRouteScans({test, expect}, {routes: [{name: 'list', url: '/list'}]});
 *
 * Like the rest of `screen/` it imports no Playwright: the app hands in its own `test` and
 * `expect`, and the page it is handed supplies the browser the judge renders in.
 */
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

import {resolveEngine} from './engine.mjs';
import {freezeScreen, serveFrozen} from './freeze.mjs';
import {SCREEN_VIEWPORTS} from './viewports.mjs';

/** The schemes every route is scanned in. */
export const SCAN_SCHEMES = Object.freeze(['light', 'dark']);

/** The sizes every route is scanned at (the keys of `SCREEN_VIEWPORTS`). */
export const SCAN_SIZES = Object.freeze(['phone', 'desktop']);

/** The WCAG 2.2 AA rule sets axe-core checks. */
export const AXE_TAGS = Object.freeze(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']);

/** An axe violation of a lower impact is reported by axe but does not fail a route. */
export const BLOCKING_IMPACTS = Object.freeze(['serious', 'critical']);

/** The engine's exit code for "scanned, and found something". */
const FINDINGS_EXIT = 2;
/** One route, size and scheme: the freeze, the judge and axe. */
export const ROUTE_SCAN_TIMEOUT_MS = 120_000;
const SETTLE_TIMEOUT_MS = 30_000;

const run = promisify(execFile);

/**
 * Checks the accepted findings an app passes in: each names a rule, the routes it covers (route
 * names, or `*`) and a one-line reason. Throws, naming the entry, when one is incomplete.
 */
export function validateExceptions(exceptions = {}) {
  const entries = {impeccable: exceptions.impeccable ?? [], axe: exceptions.axe ?? []};
  for (const [kind, list] of Object.entries(entries)) {
    list.forEach((entry, index) => {
      const where = `route scan: ${kind} exception #${index + 1}`;
      if (!entry.rule) throw new Error(`${where} names no rule`);
      if (!Array.isArray(entry.routes) || !entry.routes.length)
        throw new Error(`${where} (${entry.rule}) names no routes; use ["*"] for every route`);
      if (!entry.reason?.trim()) throw new Error(`${where} (${entry.rule}) gives no reason`);
    });
  }
  return entries;
}

const covers = (entry, route) => entry.routes.includes('*') || entry.routes.includes(route);

/**
 * The design findings that fail the route: those no exception covers, and those beyond the `max`
 * (default 1) an exception allows per scan.
 *
 * @param {{antipattern: string, snippet: string}[]} findings
 * @param {string} route
 * @param {import('./index.d.mts').RouteScanException[]} exceptions
 */
export function blockingDesignFindings(findings, route, exceptions = []) {
  const used = new Map();
  return findings.filter(finding => {
    const entry = exceptions.find(
      e =>
        e.rule === finding.antipattern &&
        covers(e, route) &&
        (!e.match || finding.snippet.includes(e.match))
    );
    if (!entry) return true;
    const count = (used.get(entry) ?? 0) + 1;
    used.set(entry, count);
    return count > (entry.max ?? 1);
  });
}

/**
 * The axe violations that fail the route: serious or critical ones with at least one node no
 * exception covers. Each keeps only its uncovered nodes.
 *
 * @param {{id: string, impact?: string | null, help: string, nodes: {html: string, target: unknown[]}[]}[]} violations
 * @param {string} route
 * @param {import('./index.d.mts').RouteScanException[]} exceptions
 */
export function blockingAxeViolations(violations, route, exceptions = []) {
  return violations
    .filter(violation => BLOCKING_IMPACTS.includes(violation.impact ?? ''))
    .map(violation => ({
      rule: violation.id,
      impact: violation.impact,
      help: violation.help,
      nodes: violation.nodes
        .filter(
          node =>
            !exceptions.some(
              e =>
                e.rule === violation.id &&
                covers(e, route) &&
                (!e.match || node.html.includes(e.match))
            )
        )
        .map(node => node.target.join(' ')),
    }))
    .filter(violation => violation.nodes.length > 0);
}

/**
 * Asks the engine to judge the document served at `url`. The engine exits 2 when it found something
 * and 0 when it did not; any other exit is a failed scan, not a clean one.
 */
export async function judgeUrl({engine, url, viewport, browser, env = process.env}) {
  const args = [
    'detect',
    '--json',
    '--no-config',
    '--no-advisory',
    '--viewport',
    `${viewport.width}x${viewport.height}`,
    url,
  ];
  // The engine renders in a Chromium of its own: the page's, unless the caller names another
  // (a wrapper that turns the sandbox off in a container, say).
  const childEnv = {...env};
  const chosen = env.IMPECCABLE_BROWSER || browser;
  if (chosen) childEnv.IMPECCABLE_BROWSER = chosen;
  try {
    const {stdout} = await run(engine, args, {env: childEnv, maxBuffer: 64 * 1024 * 1024});
    return JSON.parse(stdout);
  } catch (error) {
    if (error.code !== FINDINGS_EXIT) {
      throw new Error(
        `route scan: the design judge failed on ${url} (exit ${error.code}): ${error.stderr ?? error.message}`
      );
    }
    return JSON.parse(error.stdout ?? '[]');
  }
}

let axeSource;
/**
 * axe-core's script, read once. It is a dependency of this package, so it resolves from here. A
 * dynamic import, not `import.meta`: Playwright loads this module as CommonJS from a TypeScript spec.
 */
async function loadAxeSource() {
  if (!axeSource) {
    const axe = await import('axe-core');
    axeSource = (axe.default ?? axe).source;
  }
  return axeSource;
}

/**
 * Runs axe-core over the page as it stands (WCAG 2.2 AA). Evaluated in the page rather than added
 * as a script tag, so a Content-Security-Policy that forbids inline script does not block it.
 *
 * @param {import('./index.d.mts').ScreenPage} page
 */
export async function runAxe(page) {
  await page.evaluate(await loadAxeSource());
  const result = await page.evaluate(
    tags => globalThis.axe.run(document, {runOnly: {type: 'tag', values: tags}}),
    [...AXE_TAGS]
  );
  return result.violations;
}

/**
 * Scans the screen `page` shows: freezes it once settled, has the design judge read the frozen
 * document, and runs axe over the live page.
 *
 * @param {import('./index.d.mts').RouteScanPage} page
 * @param {import('./index.d.mts').ScanRouteOptions} options
 * @returns {Promise<import('./index.d.mts').RouteScanResult>}
 */
export async function scanRoute(page, options) {
  const {route, size, exceptions = {}, timeout = SETTLE_TIMEOUT_MS} = options;
  const viewport = SCREEN_VIEWPORTS[size].viewport;
  const accepted = validateExceptions(exceptions);
  const engine = await resolveEngine({engine: options.engine});
  const browser = page.context().browser()?.browserType().executablePath();

  const html = await freezeScreen(page, {timeout});
  const frozen = await serveFrozen(html, page.url());
  let found;
  try {
    found = await judgeUrl({engine, url: frozen.url, viewport, browser});
  } finally {
    await frozen.close();
  }
  const violations = await runAxe(page);

  return {
    url: page.url(),
    route,
    design: blockingDesignFindings(found, route, accepted.impeccable).map(
      finding => `${finding.antipattern}: ${finding.snippet}`
    ),
    axe: blockingAxeViolations(violations, route, accepted.axe),
  };
}

/** One line per finding under a header naming the screen: what a failing route prints. */
export function formatRouteScan({url, route, design, axe}) {
  const lines = [
    `${route} (${url}): ${design.length} design and ${axe.length} accessibility finding(s)`,
  ];
  for (const finding of design) lines.push(`  design  ${finding}`);
  for (const violation of axe) {
    lines.push(`  axe     ${violation.rule} [${violation.impact}]: ${violation.help}`);
    for (const node of violation.nodes) lines.push(`            ${node}`);
  }
  return lines.join('\n');
}

/**
 * Registers one test per route, size and scheme.
 *
 * @param {{test: any, expect: any}} playwright  the app's `test` and `expect`
 * @param {import('./index.d.mts').DefineRouteScansOptions} options
 */
export function defineRouteScans(
  {test, expect},
  {routes, schemes = SCAN_SCHEMES, sizes = SCAN_SIZES, exceptions, engine, timeout}
) {
  const names = routes.map(route => route.name);
  const duplicate = names.find((name, index) => names.indexOf(name) !== index);
  if (duplicate) throw new Error(`route scan: two routes are named "${duplicate}"`);
  const unknown = sizes.find(size => !(size in SCREEN_VIEWPORTS));
  if (unknown) throw new Error(`route scan: unknown size "${unknown}"`);
  validateExceptions(exceptions);
  const known = new Set(['*', ...names]);
  for (const entry of [...(exceptions?.impeccable ?? []), ...(exceptions?.axe ?? [])]) {
    const stray = entry.routes.find(route => !known.has(route));
    if (stray)
      throw new Error(`route scan: the ${entry.rule} exception names unknown route "${stray}"`);
  }

  for (const size of sizes) {
    test.describe(`route scan ${size}`, () => {
      // The machine's zone and language must not reach the page (dates, numbers).
      test.use({...SCREEN_VIEWPORTS[size], timezoneId: 'UTC', locale: 'en-US'});

      for (const scheme of schemes) {
        for (const route of routes) {
          test(`${route.name} ${scheme}`, async ({page}) => {
            test.setTimeout(ROUTE_SCAN_TIMEOUT_MS);
            await page.emulateMedia({colorScheme: scheme, reducedMotion: 'reduce'});
            await route.prepare?.(page, {size, scheme});
            await page.goto(
              typeof route.url === 'function' ? route.url({size, scheme}) : route.url
            );
            await route.ready?.(page, {size, scheme});
            const result = await scanRoute(page, {
              route: route.name,
              size,
              exceptions,
              engine,
              timeout,
            });
            expect({design: result.design, axe: result.axe}, formatRouteScan(result)).toEqual({
              design: [],
              axe: [],
            });
          });
        }
      }
    });
  }
}
