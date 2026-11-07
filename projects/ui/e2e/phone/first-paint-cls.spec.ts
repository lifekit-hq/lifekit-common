import {expect, test} from '@playwright/test';

import {openStory} from './phone-helpers';

// A cold boot draws the shell and a layout-matching skeleton, then the session resolves and the
// page replaces it. That swap must not move the page: Core Web Vitals "good" is a layout shift of
// at most 0.1 (docs/PHONE-CONTRACT.md, "First paint"). Each Conformance/First Paint story boots
// with `accountPending` and the skeleton for its page kind; the story shows the loaded page when
// the window gets `cmn-first-paint-resolve`, and the shift is read across that swap only.
const CLS_LIMIT = 0.1;
const RESOLVE_EVENT = 'cmn-first-paint-resolve';
const READY = 'cmn-page[data-first-paint="loading"]';
const LOADED = 'cmn-page[data-first-paint="loaded"]';

const STORIES = [
  'list-phone',
  'card-phone',
  'detail-phone',
  'overview-phone',
  'list-desktop',
  'detail-desktop',
  'overview-desktop',
] as const;

for (const story of STORIES) {
  test(`${story} | resolving the session shifts the layout by at most ${CLS_LIMIT}`, async ({
    page,
  }) => {
    const size = story.endsWith('phone') ? {width: 390, height: 844} : {width: 1280, height: 800};
    await page.setViewportSize(size);
    await openStory(page, `conformance-first-paint--${story}`, 'light', READY);
    // The shell is up before the content: top bar, tab bar or sidebar are all on screen.
    await expect(page.locator('cmn-app-layout header')).toBeVisible();
    await expect(page.locator('cmn-page [role="status"]')).toHaveText('Loading');

    await page.evaluate(() => {
      const state = {value: 0};
      (window as unknown as {__cls: typeof state}).__cls = state;
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          const shift = entry as PerformanceEntry & {value: number; hadRecentInput: boolean};
          if (!shift.hadRecentInput) {
            state.value += shift.value;
          }
        }
      }).observe({type: 'layout-shift', buffered: false});
    });

    await page.evaluate(name => window.dispatchEvent(new Event(name)), RESOLVE_EVENT);
    await page.waitForSelector(LOADED, {state: 'visible'});
    // Two frames, so the shifts of the swap are reported before they are read.
    await page.evaluate(
      () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    );
    const cls = await page.evaluate(
      () => (window as unknown as {__cls: {value: number}}).__cls.value
    );

    test.info().annotations.push({type: 'cls', description: cls.toFixed(4)});
    expect(cls).toBeLessThanOrEqual(CLS_LIMIT);
  });
}
