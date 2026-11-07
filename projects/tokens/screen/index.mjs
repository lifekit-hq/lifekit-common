/**
 * The screen-composition check: run it from an app's Playwright e2e against each route, at the
 * phone and the desktop size, once the data has settled. See docs/SCREEN-CHECK.md in
 * lifekit-common for wiring it into CI; `lifekit-chrome-check screen <url>` runs it ad hoc. The
 * same settled page also goes through the design judge and axe-core: `defineRouteScans`
 * (docs/ROUTE-SCAN.md).
 *
 *   import {checkScreen, formatScreen, SCREEN_VIEWPORTS} from '@lifekit-hq/tokens/screen';
 *
 *   test.use(SCREEN_VIEWPORTS.phone);
 *   test('list', async ({page}) => {
 *     await page.goto('/list');
 *     const result = await checkScreen(page);
 *     expect(result.findings, formatScreen(result)).toEqual([]);
 *   });
 *
 * It needs no Playwright import of its own: it drives the `page` it is handed.
 */
import {inspectScreen, SCREEN_RULES} from './rules.mjs';
import {settleScreen} from './settle.mjs';
import {SCREEN_VIEWPORTS} from './viewports.mjs';

export {inspectScreen, SCREEN_RULES} from './rules.mjs';
export {
  BASELINE_PLATFORM,
  BASELINE_SCHEMES,
  BASELINE_SIZES,
  captureScreenBaseline,
  defineScreenBaselines,
  SCREEN_BASELINE_OPTIONS,
  screenBaselineConfig,
  screenBaselineName,
} from './baseline.mjs';
export {settleScreen} from './settle.mjs';
export {
  IMPECCABLE_ENGINES,
  IMPECCABLE_VERSION,
  pinnedEnginePath,
  resolveEngine,
} from './engine.mjs';
export {freezeScreen, serveFrozen} from './freeze.mjs';
export {
  AXE_TAGS,
  BLOCKING_IMPACTS,
  blockingAxeViolations,
  blockingDesignFindings,
  defineRouteScans,
  formatRouteScan,
  ROUTE_SCAN_TIMEOUT_MS,
  runAxe,
  SCAN_SCHEMES,
  SCAN_SIZES,
  scanRoute,
  validateExceptions,
} from './route-scan.mjs';
export {SCREEN_VIEWPORTS} from './viewports.mjs';
export {
  checkSkeleton,
  compareSections,
  formatSkeleton,
  measureSections,
  SKELETON_RULES,
  SKELETON_TOLERANCE_PX,
} from './skeleton.mjs';

/**
 * Checks the screen `page` shows against every rule (C0-C10), after settling it.
 *
 * @param {import('./index.d.mts').ScreenPage} page
 * @param {import('./index.d.mts').CheckScreenOptions} [options]
 * @returns {Promise<import('./index.d.mts').ScreenResult>}
 */
export async function checkScreen(page, {kind = null, ignore = [], settle = true, timeout} = {}) {
  if (settle) await settleScreen(page, {timeout});
  const result = await page.evaluate(inspectScreen, {kind, ignore});
  return {url: page.url(), ...result};
}

/** One line per finding, prefixed by the rule's id and name, under a header naming the screen. */
export function formatScreen({url, kind, template, findings}) {
  const where = template ? `${kind ?? 'unknown'} template` : 'no template';
  const head = `${url} [${where}]: ${findings.length} composition finding(s)`;
  const names = new Map(SCREEN_RULES.map(rule => [rule.id, rule.name]));
  return [
    head,
    ...findings.map(({rule, message}) => `  ${rule} ${names.get(rule)}: ${message}`),
  ].join('\n');
}
