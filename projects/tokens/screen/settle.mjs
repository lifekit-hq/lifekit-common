/**
 * Waiting for a rendered screen to hold still, shared by the screen check (`checkScreen` judges
 * the loaded page) and the skeleton check (`checkSkeleton` measures the loading state and the
 * loaded state). Plain ES modules driving the Playwright `page` they are handed.
 */

export const DEFAULT_SETTLE_TIMEOUT_MS = 10_000;
/** How long the DOM must stay unchanged to count as settled (a route rendering, data arriving). */
const QUIET_MS = 300;

/** What marks a region as still loading: the skeleton component, `aria-busy`, or the opt-in flag. */
export const LOADING_SELECTOR = 'cmn-skeleton, [aria-busy="true"], [data-cmn-loading]';

/**
 * Waits until the DOM has stayed unchanged for a moment and two frames have painted after that. A
 * page that never stops changing (a clock, an animation) is judged at `timeout`.
 *
 * @param {import('./index.d.mts').ScreenPage} page
 * @param {number} [timeout]
 */
export async function waitForQuietDom(page, timeout = DEFAULT_SETTLE_TIMEOUT_MS) {
  await page.evaluate(
    ({quiet, limit}) =>
      new Promise(resolve => {
        let timer;
        let settled = false;
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
 * Waits for the screen the owner would see: web fonts loaded, no skeleton or busy region left on
 * screen, the DOM quiet for a moment (the route has rendered and its data has landed), and two
 * frames painted after that. Judging earlier scores the loading state, not the page.
 *
 * @param {import('./index.d.mts').ScreenPage} page
 * @param {{timeout?: number}} [options]
 */
export async function settleScreen(page, {timeout = DEFAULT_SETTLE_TIMEOUT_MS} = {}) {
  await page.waitForFunction(
    selector => {
      if (document.readyState !== 'complete' || document.fonts.status !== 'loaded') return false;
      return [...document.querySelectorAll(selector)].every(el => {
        const r = el.getBoundingClientRect();
        return r.width === 0 || r.height === 0;
      });
    },
    LOADING_SELECTOR,
    {timeout}
  );
  await waitForQuietDom(page, timeout);
}
