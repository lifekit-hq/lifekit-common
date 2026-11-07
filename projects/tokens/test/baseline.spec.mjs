/**
 * The screenshot-baseline fixture (screen/baseline.mjs): the tests it registers per route, size
 * and scheme, and what each one does to a real page before it hands it to Playwright's
 * `toHaveScreenshot`. The comparison itself is Playwright's; a fake `expect` records what the
 * fixture asked for, so the contract (names, options, masks, settling, Linux only) is pinned here
 * and the pixels are pinned by the baselines of the app that calls it.
 */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {after, before, describe, it} from 'node:test';

import {
  BASELINE_PLATFORM,
  defineScreenBaselines,
  SCREEN_BASELINE_OPTIONS,
  SCREEN_BROWSER_ARGS,
  SCREEN_VIEWPORTS,
  screenBaselineConfig,
  screenBaselineName,
} from '../screen/index.mjs';

const require = createRequire(import.meta.url);
const {chromium} = require('@playwright/test');

const PAGE = 'data:text/html,<title>t</title><main id=m>hello</main>';

let browser;

before(async () => {
  browser = await chromium.launch();
});

after(async () => {
  await browser?.close();
});

/** A stand-in for the app's Playwright `test`/`expect` that records what the fixture registers. */
function fakePlaywright() {
  const registered = [];
  const describes = [];
  const skips = [];
  const fileUse = {};
  let scope = null;
  const test = (title, body) => registered.push({title, body, scope});
  test.describe = (title, define) => {
    scope = {title, use: {}};
    describes.push(scope);
    define();
    scope = null;
  };
  test.use = options => Object.assign(scope ? scope.use : fileUse, options);
  test.skip = (condition, reason) => skips.push({condition, reason});
  const screenshots = [];
  const expect = page => ({
    toHaveScreenshot: async (file, options) => screenshots.push({file, options, url: page.url()}),
  });
  return {test, expect, registered, describes, fileUse, skips, screenshots};
}

/** Runs one registered test body in a browser configured the way its describe asked for. */
async function run({registered}, title, scopeTitle, inspect = () => undefined) {
  const entry = registered.find(r => r.title === title && r.scope.title === scopeTitle);
  assert.ok(entry, `no test "${title}" in "${scopeTitle}"`);
  const context = await browser.newContext(entry.scope.use);
  try {
    const page = await context.newPage();
    await entry.body({page});
    return await inspect(page);
  } finally {
    await context.close();
  }
}

describe('screenBaselineConfig', () => {
  it('makes a missing or changed baseline fail instead of writing it', () => {
    const config = screenBaselineConfig();
    assert.equal(config.updateSnapshots, 'none');
    assert.deepEqual(config.expect.toHaveScreenshot, SCREEN_BASELINE_OPTIONS);
    assert.equal(SCREEN_BASELINE_OPTIONS.animations, 'disabled');
    assert.equal(SCREEN_BASELINE_OPTIONS.scale, 'css');
  });

  it('compares exactly: no differing pixel, no per-pixel colour slack', () => {
    assert.equal(SCREEN_BASELINE_OPTIONS.maxDiffPixelRatio, 0);
    assert.equal(SCREEN_BASELINE_OPTIONS.threshold, 0);
  });

  it('hands out a copy, so an app cannot change the fixture for another', () => {
    screenBaselineConfig().expect.toHaveScreenshot.maxDiffPixelRatio = 1;
    assert.equal(screenBaselineConfig().expect.toHaveScreenshot.maxDiffPixelRatio, 0);
  });
});

describe('screenBaselineName', () => {
  it('names a baseline by route, size and scheme', () => {
    assert.equal(
      screenBaselineName({name: 'list', size: 'phone', scheme: 'dark'}),
      'list-phone-dark.png'
    );
  });
});

describe('defineScreenBaselines', () => {
  it('registers every route at both sizes in both schemes, each size at its viewport', () => {
    const fake = fakePlaywright();
    defineScreenBaselines(fake, {
      routes: [
        {name: 'list', url: PAGE},
        {name: 'people', url: PAGE},
      ],
    });
    assert.deepEqual(
      fake.describes.map(d => d.title),
      ['screen baseline phone', 'screen baseline desktop']
    );
    assert.deepEqual(
      fake.registered.filter(r => r.scope.title.endsWith('phone')).map(r => r.title),
      ['list light', 'people light', 'list dark', 'people dark']
    );
    assert.equal(fake.registered.length, 8);
    const [phone, desktop] = fake.describes;
    assert.deepEqual(phone.use.viewport, SCREEN_VIEWPORTS.phone.viewport);
    assert.equal(phone.use.isMobile, true);
    assert.deepEqual(desktop.use.viewport, SCREEN_VIEWPORTS.desktop.viewport);
    for (const {use} of fake.describes) {
      assert.equal(use.timezoneId, 'UTC');
      assert.equal(use.locale, 'en-US');
    }
  });

  it('launches the browser rasterising whole tiles, so one page is one image', () => {
    const fake = fakePlaywright();
    defineScreenBaselines(fake, {routes: [{name: 'list', url: PAGE}]});
    assert.deepEqual(SCREEN_BROWSER_ARGS, ['--disable-partial-raster']);
    // Launch options are worker-wide: set for the spec file, never inside a describe group.
    assert.deepEqual(fake.fileUse.launchOptions, {args: ['--disable-partial-raster']});
    for (const {use} of fake.describes) assert.equal(use.launchOptions, undefined);
  });

  it('can be narrowed to one size or scheme', () => {
    const fake = fakePlaywright();
    defineScreenBaselines(fake, {
      routes: [{name: 'list', url: PAGE}],
      sizes: ['desktop'],
      schemes: ['dark'],
    });
    assert.deepEqual(
      fake.registered.map(r => [r.scope.title, r.title]),
      [['screen baseline desktop', 'list dark']]
    );
  });

  it('refuses two routes with one name and a size it does not know', () => {
    const routes = [
      {name: 'list', url: PAGE},
      {name: 'list', url: PAGE},
    ];
    assert.throws(
      () => defineScreenBaselines(fakePlaywright(), {routes}),
      /two routes are named "list"/
    );
    assert.throws(
      () => defineScreenBaselines(fakePlaywright(), {routes: [routes[0]], sizes: ['tablet']}),
      /unknown size "tablet"/
    );
  });

  it('opens the route in its scheme, settles it and captures the named baseline', async () => {
    const fake = fakePlaywright();
    const calls = [];
    defineScreenBaselines(fake, {
      routes: [
        {
          name: 'list',
          url: ({scheme, size}) => `${PAGE}#${size}-${scheme}`,
          prepare: (_page, variant) => calls.push(['prepare', variant]),
          ready: (_page, variant) => calls.push(['ready', variant]),
          mask: page => [page.locator('#m')],
          fullPage: true,
          maxDiffPixelRatio: 0.01,
        },
      ],
    });
    const dark = await run(fake, 'list dark', 'screen baseline phone', page =>
      page.evaluate(() => matchMedia('(prefers-color-scheme: dark)').matches)
    );
    assert.deepEqual(calls, [
      ['prepare', {size: 'phone', scheme: 'dark'}],
      ['ready', {size: 'phone', scheme: 'dark'}],
    ]);
    const [shot] = fake.screenshots;
    assert.equal(shot.file, 'list-phone-dark.png');
    assert.ok(shot.url.endsWith('#phone-dark'));
    assert.equal(shot.options.fullPage, true);
    assert.equal(shot.options.maxDiffPixelRatio, 0.01);
    assert.equal(shot.options.animations, 'disabled');
    assert.equal(shot.options.mask.length, 1);
    assert.equal(dark, true);
  });

  it('captures the viewport at the fixture ratio unless a route says otherwise', async () => {
    const fake = fakePlaywright();
    defineScreenBaselines(fake, {routes: [{name: 'list', url: PAGE}]});
    await run(fake, 'list light', 'screen baseline desktop');
    const [shot] = fake.screenshots;
    assert.equal(shot.options.fullPage, false);
    assert.equal(shot.options.maxDiffPixelRatio, SCREEN_BASELINE_OPTIONS.maxDiffPixelRatio);
    assert.deepEqual(shot.options.mask, []);
  });

  it('loosens only the screens a route keys, over the route ratio, and leaves the rest exact', async () => {
    const fake = fakePlaywright();
    defineScreenBaselines(fake, {
      routes: [
        {
          name: 'overview',
          url: PAGE,
          screenMaxDiffPixelRatio: {'overview-desktop-dark': 0.00002},
        },
        {
          name: 'detail',
          url: PAGE,
          maxDiffPixelRatio: 0.01,
          screenMaxDiffPixelRatio: {'detail-desktop-dark': 0.00002},
        },
      ],
    });
    const ratios = {};
    for (const [title, scope] of [
      ['overview dark', 'screen baseline desktop'],
      ['overview light', 'screen baseline desktop'],
      ['overview dark', 'screen baseline phone'],
      ['detail dark', 'screen baseline desktop'],
      ['detail light', 'screen baseline desktop'],
    ]) {
      await run(fake, title, scope);
      const shot = fake.screenshots.at(-1);
      ratios[shot.file] = shot.options.maxDiffPixelRatio;
    }
    assert.deepEqual(ratios, {
      'overview-desktop-dark.png': 0.00002,
      'overview-desktop-light.png': 0,
      'overview-phone-dark.png': 0,
      'detail-desktop-dark.png': 0.00002,
      'detail-desktop-light.png': 0.01,
    });
  });

  it('skips off Linux, saying why, and is live on Linux', async () => {
    const fake = fakePlaywright();
    defineScreenBaselines(fake, {routes: [{name: 'list', url: PAGE}]});
    await run(fake, 'list light', 'screen baseline phone');
    assert.equal(fake.skips.length, 1);
    assert.equal(fake.skips[0].condition, process.platform !== BASELINE_PLATFORM);
    assert.match(fake.skips[0].reason, /linux only; run them in CI/);
  });
});
