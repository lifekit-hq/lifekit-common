/**
 * The screen-composition check: run it from an app's Playwright e2e against each route, at the
 * phone and the desktop size, once the data has settled. See docs/SCREEN-CHECK.md in
 * lifekit-common for wiring it into CI; `lifekit-chrome-check screen <url>` runs it ad hoc.
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

export {inspectScreen, SCREEN_RULES} from './rules.mjs';

/** The two sizes every route is checked at: an iPhone (390x844) and a 1280 laptop. */
export const SCREEN_VIEWPORTS = Object.freeze({
  phone: Object.freeze({
    viewport: Object.freeze({width: 390, height: 844}),
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  }),
  desktop: Object.freeze({viewport: Object.freeze({width: 1280, height: 800})}),
});

const DEFAULT_SETTLE_TIMEOUT_MS = 10_000;
/** How long the DOM must stay unchanged to count as settled (a route rendering, data arriving). */
const QUIET_MS = 300;

/**
 * Waits for the screen the owner would see: web fonts loaded, no skeleton or busy region left on
 * screen, the DOM quiet for a moment (the route has rendered and its data has landed), and two
 * frames painted after that. Judging earlier scores the loading state, not the page.
 *
 * @param {import('./index.d.mts').ScreenPage} page
 * @param {{timeout?: number}} [options]
 */
export async function settleScreen(page, {timeout = DEFAULT_SETTLE_TIMEOUT_MS} = {}) {
  await page.waitForFunction(
    () => {
      if (document.readyState !== 'complete' || document.fonts.status !== 'loaded') return false;
      const busy = document.querySelectorAll(
        'cmn-skeleton, [aria-busy="true"], [data-cmn-loading]'
      );
      return [...busy].every(el => {
        const r = el.getBoundingClientRect();
        return r.width === 0 || r.height === 0;
      });
    },
    undefined,
    {timeout}
  );
  await page.evaluate(
    ({quiet, limit}) =>
      new Promise(resolve => {
        let timer;
        let settled = false;
        // A page that never stops changing (a clock, an animation) is judged at the limit.
        const done = () => {
          if (settled) return;
          settled = true;
          observer.disconnect();
          clearTimeout(timer);
          clearTimeout(cap);
          requestAnimationFrame(() => requestAnimationFrame(resolve));
        };
        const observer = new MutationObserver(() => {
          clearTimeout(timer);
          timer = setTimeout(done, quiet);
        });
        observer.observe(document.body, {childList: true, subtree: true, attributes: true});
        timer = setTimeout(done, quiet);
        const cap = setTimeout(done, limit);
      }),
    {quiet: QUIET_MS, limit: timeout}
  );
}

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
