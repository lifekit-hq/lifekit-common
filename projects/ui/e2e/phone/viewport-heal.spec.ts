import {expect, type Page, test} from '@playwright/test';

import {layoutStory, openStory, settleFrames} from './phone-helpers';

// The tab bar sits on the screen's bottom edge: the `fixed inset-0` frame follows the window as it
// changes height, with no text input involved. Chromium measures the viewport correctly on its own,
// so this holds the contract (and that the re-measure on resize leaves the geometry and the scroll
// position alone); the iOS stale-viewport bug itself is covered by the unit specs with fake windows.
const WIDTH = 390;
const FULL_HEIGHT = 844;
const SHORT_HEIGHT = 782;
const SCROLLED = 40;
const TOLERANCE = 1;

test.use({
  viewport: {width: WIDTH, height: FULL_HEIGHT},
  hasTouch: true,
  isMobile: true,
});

/** How far the frame and the tab bar end from the window's bottom edge. */
async function gapsToBottom(page: Page): Promise<{frame: number; tabBar: number}> {
  return page.evaluate(() => {
    const bottom = (selector: string): number =>
      (document.querySelector(selector) as HTMLElement).getBoundingClientRect().bottom;
    return {
      frame: window.innerHeight - bottom('cmn-app-layout > div'),
      tabBar: window.innerHeight - bottom('cmn-bottom-tab-bar'),
    };
  });
}

test('the frame and tab bar follow the window when it gets shorter and when it grows back', async ({
  page,
}) => {
  await openStory(page, layoutStory('phone'));
  for (const height of [SHORT_HEIGHT, FULL_HEIGHT]) {
    await page.setViewportSize({width: WIDTH, height});
    await settleFrames(page);
    const gaps = await gapsToBottom(page);
    expect(Math.abs(gaps.frame)).toBeLessThanOrEqual(TOLERANCE);
    expect(Math.abs(gaps.tabBar)).toBeLessThanOrEqual(TOLERANCE);
  }
});

test('a resize keeps the page where it was scrolled', async ({page}) => {
  await openStory(page, layoutStory('phone'));
  await page.locator('main').evaluate((main, top) => main.scrollTo({top}), SCROLLED);
  const before = await page.locator('main').evaluate(main => main.scrollTop);
  await page.setViewportSize({width: WIDTH, height: SHORT_HEIGHT});
  await settleFrames(page);
  const after = await page.locator('main').evaluate(main => main.scrollTop);
  expect(after).toBe(before);
});
