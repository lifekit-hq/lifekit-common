/**
 * The screenshot-baseline fixture: every route of an app, at the phone and the desktop size, in
 * the light and the dark scheme, compared against a committed Linux baseline. It is the pixel
 * counterpart of the screen check (`checkScreen` judges composition, this holds the look still).
 * See docs/SCREEN-BASELINES.md in lifekit-common for wiring it into an app and CI.
 *
 *   import {expect, test} from '@playwright/test';
 *   import {defineScreenBaselines} from '@lifekit-hq/tokens/screen';
 *
 *   defineScreenBaselines({test, expect}, {routes: [{name: 'list', url: '/list'}]});
 *
 * Like the rest of `screen/` it imports no Playwright: the app hands in its own `test` and
 * `expect`, so the fixture runs against whichever Playwright the app installed.
 */
import {settleScreen} from './settle.mjs';
import {SCREEN_VIEWPORTS} from './viewports.mjs';

/** Baselines are rendered on Linux only: the machine that draws them is the machine CI runs on. */
export const BASELINE_PLATFORM = 'linux';

/** The schemes every route is captured in. */
export const BASELINE_SCHEMES = Object.freeze(['light', 'dark']);

/** The sizes every route is captured at (the keys of `SCREEN_VIEWPORTS`). */
export const BASELINE_SIZES = Object.freeze(['phone', 'desktop']);

/**
 * How a screen is captured. Animations and the caret are stilled and the image is sized in CSS
 * pixels (390 and 1280 wide, whatever the device scale factor), so a baseline is the screen and
 * not the machine's pixel density. The comparison is exact: no differing pixel and no per-pixel
 * colour slack, because a baseline is drawn and compared on the same CI runner image, so a change
 * of a word or a shade is never under the tolerance. A route may loosen its own
 * `maxDiffPixelRatio`, or one of its screens through `screenMaxDiffPixelRatio`, as an exception with a one-line reason (docs/SCREEN-BASELINES.md).
 */
export const SCREEN_BASELINE_OPTIONS = Object.freeze({
  animations: 'disabled',
  caret: 'hide',
  scale: 'css',
  maxDiffPixelRatio: 0,
  threshold: 0,
});

/**
 * The Chromium switches a baseline is rendered with. `--disable-partial-raster` makes every frame
 * rasterise each tile whole. Left on, Chromium paints only the damaged part of a tile over what the
 * tile already holds, and whether a tile was painted whole or in parts depends on when the page's
 * last invalidation landed relative to the frame, which is a matter of timing. The edges that were
 * painted twice come out a colour level or three off from the ones painted once: anti-aliased
 * rounded corners, circles and text edges. So one machine, under load, drew the same page as
 * several different images, and a baseline flaked by a few pixels from run to run. Rasterising
 * whole tiles draws one image every time (docs/SCREEN-BASELINES.md, "Why the raster is pinned").
 */
export const SCREEN_BROWSER_ARGS = Object.freeze(['--disable-partial-raster']);

/**
 * The part of a Playwright config the fixture owns, to spread into `defineConfig`. Playwright's
 * default for a missing baseline is to write it and carry on; `'none'` writes nothing, so a
 * missing or changed baseline fails the run until someone updates it on purpose
 * (`playwright test --update-snapshots=changed`, which overrides this).
 */
export function screenBaselineConfig() {
  return {
    updateSnapshots: 'none',
    expect: {toHaveScreenshot: {...SCREEN_BASELINE_OPTIONS}},
  };
}

/** The file stem of one baseline; Playwright adds the project and platform (`-chromium-linux`). */
export function screenBaselineName({name, size, scheme}) {
  return `${name}-${size}-${scheme}.png`;
}

/**
 * Settles the screen and compares it with its baseline.
 *
 * @param {import('./index.d.mts').ScreenPage} page
 * @param {{toHaveScreenshot: Function}} expectation  `expect(page)` of the app's Playwright
 * @param {string} file  the baseline's file name (`screenBaselineName`)
 * @param {import('./index.d.mts').CaptureBaselineOptions} [options]
 */
export async function captureScreenBaseline(page, expectation, file, options = {}) {
  const {fullPage = false, mask = [], timeout, ...overrides} = options;
  await settleScreen(page, {timeout});
  await expectation.toHaveScreenshot(file, {
    ...SCREEN_BASELINE_OPTIONS,
    ...overrides,
    fullPage,
    mask,
  });
}

/**
 * Registers one test per route, size and scheme. Run off Linux, the tests skip with the reason
 * rather than compare against a baseline another renderer drew.
 *
 * @param {{test: any, expect: any}} playwright  the app's `test` and `expect`
 * @param {import('./index.d.mts').DefineBaselinesOptions} options
 */
export function defineScreenBaselines(
  {test, expect},
  {routes, schemes = BASELINE_SCHEMES, sizes = BASELINE_SIZES}
) {
  const names = routes.map(route => route.name);
  const duplicate = names.find((name, index) => names.indexOf(name) !== index);
  if (duplicate) throw new Error(`screen baselines: two routes are named "${duplicate}"`);
  const unknown = sizes.find(size => !(size in SCREEN_VIEWPORTS));
  if (unknown) throw new Error(`screen baselines: unknown size "${unknown}"`);

  // The browser is launched once per worker, so Playwright only takes launch options for a whole
  // spec file (a describe group may not set them unless every test runs in parallel). The switches
  // replace any `launchOptions` the project sets, for the spec file that defines the baselines.
  test.use({launchOptions: {args: [...SCREEN_BROWSER_ARGS]}});

  for (const size of sizes) {
    test.describe(`screen baseline ${size}`, () => {
      // The machine's zone and language must not reach the pixels (dates, numbers).
      test.use({...SCREEN_VIEWPORTS[size], timezoneId: 'UTC', locale: 'en-US'});

      for (const scheme of schemes) {
        for (const route of routes) {
          test(`${route.name} ${scheme}`, async ({page}) => {
            test.skip(
              process.platform !== BASELINE_PLATFORM,
              `baselines are ${BASELINE_PLATFORM} only; run them in CI (docs/SCREEN-BASELINES.md)`
            );
            await page.emulateMedia({colorScheme: scheme, reducedMotion: 'reduce'});
            await route.prepare?.(page, {size, scheme});
            await page.goto(
              typeof route.url === 'function' ? route.url({size, scheme}) : route.url
            );
            await route.ready?.(page, {size, scheme});
            const file = screenBaselineName({name: route.name, size, scheme});
            // The screen's own ratio (keyed by its baseline name, without `.png`) wins over the route's.
            const maxDiffPixelRatio =
              route.screenMaxDiffPixelRatio?.[file.replace(/\.png$/, '')] ??
              route.maxDiffPixelRatio;
            await captureScreenBaseline(page, expect(page), file, {
              fullPage: route.fullPage,
              mask: route.mask?.(page) ?? [],
              ...(maxDiffPixelRatio === undefined ? {} : {maxDiffPixelRatio}),
            });
          });
        }
      }
    });
  }
}
