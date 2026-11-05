/**
 * The skeleton-conformance check (screen/skeleton.mjs): a routed fixture page waits on /api/items,
 * the check holds that request, measures the skeleton, releases it and measures the loaded page.
 * It passes on a skeleton drawn to the page's sections and fails on a deliberately drifted one.
 * The check runs in a real Chromium, as an app's e2e runs it.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {after, before, describe, it} from 'node:test';

import {
  checkSkeleton,
  compareSections,
  formatSkeleton,
  SCREEN_VIEWPORTS,
  SKELETON_RULES,
  SKELETON_TOLERANCE_PX,
} from '../screen/index.mjs';

const require = createRequire(import.meta.url);
const {chromium} = require('@playwright/test');

const PAGE = readFileSync(new URL('./fixtures/skeleton/page.html', import.meta.url), 'utf8');
const ORIGIN = 'http://app.test';
const ITEMS = ['Rent', 'Groceries', 'Transit'];
const HOLD = '**/api/**';

let browser;

before(async () => {
  browser = await chromium.launch();
});

after(async () => {
  await browser?.close();
});

/** Opens the fixture as an app's e2e would: its own mocks serve the document and the data. */
async function check(search = '', size = 'desktop', options = {}) {
  const context = await browser.newContext(SCREEN_VIEWPORTS[size]);
  const page = await context.newPage();
  const answered = [];
  await page.route(`${ORIGIN}/**`, route => {
    const {pathname} = new URL(route.request().url());
    if (pathname === '/api/items') {
      answered.push(pathname);
      return route.fulfill({json: {items: ITEMS}});
    }
    return route.fulfill({contentType: 'text/html', body: PAGE});
  });
  try {
    const result = await checkSkeleton(page, {
      url: `${ORIGIN}/now${search}`,
      hold: HOLD,
      ...options,
    });
    return {result, answered};
  } finally {
    await context.close();
  }
}

const rulesOf = result => [...new Set(result.findings.map(finding => finding.rule))].sort();

describe('skeleton rules', () => {
  it('names each rule once, with the sentence it enforces', () => {
    assert.deepEqual(
      SKELETON_RULES.map(rule => rule.id),
      ['K0', 'K1', 'K2']
    );
    assert.equal(new Set(SKELETON_RULES.map(rule => rule.name)).size, SKELETON_RULES.length);
    assert.equal(SKELETON_TOLERANCE_PX, 8);
  });
});

describe('checkSkeleton', () => {
  for (const size of ['phone', 'desktop']) {
    it(`passes a skeleton drawn to the page's sections, at ${size}`, async () => {
      const {result, answered} = await check('', size);
      assert.deepEqual(result.findings, [], formatSkeleton(result));
      assert.equal(result.held, 1);
      assert.deepEqual(
        result.skeleton.map(section => section.key),
        ['summary', 'chart', 'list']
      );
      assert.deepEqual(
        result.loaded.map(section => section.key),
        ['summary', 'chart', 'list']
      );
      assert.deepEqual(answered, ['/api/items'], 'the held request was released to the app mock');
    });
  }

  it('fails a skeleton whose section is taller than the loaded one by more than 8px', async () => {
    const {result} = await check('?summary=140');
    assert.deepEqual(rulesOf(result), ['K2'], formatSkeleton(result));
    assert.match(result.findings[0].message, /summary/);
    assert.match(result.findings[0].message, /height 140px vs 96px \(44px off\)/);
  });

  it('reports the sections below a drifted one that moved with it', async () => {
    const {result} = await check('?summary=140');
    const moved = result.findings.map(finding => finding.message).join('\n');
    assert.match(moved, /chart.*top/);
    assert.match(moved, /list.*top/);
  });

  it('accepts a skeleton that is off by no more than the tolerance', async () => {
    const {result} = await check('?summary=104');
    assert.deepEqual(result.findings, [], formatSkeleton(result));
  });

  it('holds the skeleton to a tighter tolerance when asked', async () => {
    const {result} = await check('?summary=104', 'desktop', {tolerance: 4});
    assert.deepEqual(rulesOf(result), ['K2']);
  });

  it('fails a skeleton that leaves a section out', async () => {
    const {result} = await check('?drop=chart');
    assert.ok(rulesOf(result).includes('K1'), formatSkeleton(result));
    assert.ok(
      result.findings.some(finding =>
        /the skeleton has no stand-in for section\[chart\]/.test(finding.message)
      ),
      formatSkeleton(result)
    );
  });

  it('fails a skeleton that draws a section the page does not have', async () => {
    const {result} = await check('?extra=1');
    assert.ok(
      result.findings.some(finding =>
        /draws section\[footer\] that the loaded page does not have/.test(finding.message)
      ),
      formatSkeleton(result)
    );
  });

  it('reports a page that never shows a skeleton while its data is out', async () => {
    const {result} = await check('?inert=1', 'desktop', {timeout: 1500});
    assert.ok(rulesOf(result).includes('K0'), formatSkeleton(result));
    assert.match(result.findings[0].message, /nothing on screen was loading/);
  });

  it('reports a hold pattern that matched nothing', async () => {
    const {result} = await check('', 'desktop', {hold: '**/nothing/**', timeout: 1500});
    assert.ok(
      result.findings.some(
        finding => finding.rule === 'K0' && /no request matched `hold`/.test(finding.message)
      ),
      formatSkeleton(result)
    );
  });

  it('reports a page still loading after its data lands, without comparing sections', async () => {
    const {result} = await check('?stuck=1', 'desktop', {timeout: 1500});
    assert.deepEqual(rulesOf(result), ['K0'], formatSkeleton(result));
    assert.match(result.findings[0].message, /still loading after the held data was released/);
    assert.deepEqual(result.loaded, []);
  });

  it('does not bury a failed load under section findings when K0 is ignored', async () => {
    const {result} = await check('?stuck=1', 'desktop', {timeout: 1500, ignore: ['K0']});
    assert.deepEqual(result.findings, [], formatSkeleton(result));
  });

  it('skips the rules an app ignores', async () => {
    const {result} = await check('?summary=140', 'desktop', {ignore: ['K2']});
    assert.deepEqual(result.findings, []);
  });

  it('compares the sections a selector names instead of the template columns', async () => {
    const {result} = await check('?summary=140', 'desktop', {
      sections: '[data-cmn-section="chart"]',
    });
    assert.deepEqual(
      result.skeleton.map(section => section.key),
      ['chart']
    );
    assert.ok(
      result.findings.every(finding => /chart/.test(finding.message)),
      formatSkeleton(result)
    );
  });

  it('asks for the route and the requests to hold', async () => {
    await assert.rejects(checkSkeleton({}, {hold: HOLD}), /`url`/);
    await assert.rejects(checkSkeleton({}, {url: '/'}), /`hold`/);
  });

  it('formats one line per finding under a header naming the route', async () => {
    const {result} = await check('?summary=140');
    const lines = formatSkeleton(result).split('\n');
    assert.match(
      lines[0],
      /^http:\/\/app\.test\/now\?summary=140 \[3 skeleton \/ 3 loaded sections, 1 request\(s\) held\]: \d+ skeleton finding\(s\)$/
    );
    assert.match(lines[1], /^ {2}K2 section-box: /);
  });
});

describe('compareSections', () => {
  const box = (key, top, height, left = 0, width = 600) => ({
    key,
    label: key,
    text: '',
    top,
    height,
    left,
    width,
  });

  it('pairs sections by key and by position', () => {
    assert.deepEqual(compareSections([box('#1', 0, 50)], [box('#1', 4, 55)]), []);
  });

  it('names every edge that is off', () => {
    const [finding] = compareSections([box('a', 0, 50, 0, 600)], [box('a', 20, 90, 16, 500)]);
    assert.match(finding.message, /top 0px vs 20px/);
    assert.match(finding.message, /left 0px vs 16px/);
    assert.match(finding.message, /width 600px vs 500px/);
    assert.match(finding.message, /height 50px vs 90px/);
  });
});
