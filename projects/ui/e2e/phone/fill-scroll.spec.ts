import {expect, type Page, test} from '@playwright/test';

import {openStory} from './phone-helpers';

// A fill page scrolls only its list. `cmn-page-container fill` holding a `cmn-page-scroll` is the
// whole contract: the shell bounds the page to what is left of `main` below the large title, so
// `main` never scrolls, at a desktop and a phone size, with a long list and with an empty one.
const READY = 'cmn-page-scroll';
const DESKTOP = {name: '1440x900', width: 1440, height: 900};
const PHONE = {name: '390x844', width: 390, height: 844};

const STORIES = {
  long: 'conformance-fill-app-layout--long-list',
  empty: 'conformance-fill-app-layout--empty-list',
  grouped: 'conformance-fill-app-layout--grouped-list',
  unscrolled: 'conformance-fill-app-layout--fill-without-list-scroll',
} as const;

interface Scroll {
  scrollHeight: number;
  clientHeight: number;
}

async function measure(page: Page, selector: string): Promise<Scroll> {
  return page.locator(selector).evaluate(el => ({
    scrollHeight: el.scrollHeight,
    clientHeight: el.clientHeight,
  }));
}

/** Every element under main that scrolls vertically, by overflow and by actual overflow. */
async function scrollers(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('main, main *'))
      .filter(el => {
        const overflow = getComputedStyle(el).overflowY;
        return (
          (overflow === 'auto' || overflow === 'scroll') && el.scrollHeight > el.clientHeight + 1
        );
      })
      .map(el => el.tagName.toLowerCase())
  );
}

for (const viewport of [DESKTOP, PHONE]) {
  test.describe(`fill page ${viewport.name}`, () => {
    test.use({
      viewport: {width: viewport.width, height: viewport.height},
      hasTouch: viewport === PHONE,
      isMobile: viewport === PHONE,
    });

    test('a long list scrolls inside itself and main does not scroll', async ({page}) => {
      await openStory(page, STORIES.long, 'light', READY);
      const main = await measure(page, 'main');
      expect(main.scrollHeight).toBe(main.clientHeight);
      const list = await measure(page, 'cmn-page-scroll');
      expect(list.scrollHeight).toBeGreaterThan(list.clientHeight);
      expect(await scrollers(page)).toEqual(['cmn-page-scroll']);
    });

    test('the list takes the free space below the content above it', async ({page}) => {
      await openStory(page, STORIES.long, 'light', READY);
      const geometry = await page.evaluate(() => {
        const main = document.querySelector('main') as HTMLElement;
        const list = document.querySelector('cmn-page-scroll') as HTMLElement;
        const above = document.querySelector('[data-above-list]') as HTMLElement;
        const style = getComputedStyle(main);
        return {
          listTop: list.getBoundingClientRect().top,
          aboveBottom: above.getBoundingClientRect().bottom,
          listBottom: list.getBoundingClientRect().bottom,
          mainBottom:
            main.getBoundingClientRect().bottom -
            parseFloat(style.paddingBottom) -
            parseFloat(getComputedStyle(list.parentElement as HTMLElement).paddingBottom),
        };
      });
      expect(geometry.listTop).toBeGreaterThanOrEqual(geometry.aboveBottom);
      expect(Math.abs(geometry.listBottom - geometry.mainBottom)).toBeLessThanOrEqual(1);
    });

    test('an empty list leaves nothing to scroll anywhere', async ({page}) => {
      await openStory(page, STORIES.empty, 'light', READY);
      const main = await measure(page, 'main');
      expect(main.scrollHeight).toBe(main.clientHeight);
      expect(await scrollers(page)).toEqual([]);
    });

    test('a grouped list page (transactions) scrolls only its list', async ({page}) => {
      await openStory(page, STORIES.grouped, 'light', READY);
      const main = await measure(page, 'main');
      expect(main.scrollHeight).toBe(main.clientHeight);
      expect(await scrollers(page)).toEqual(['cmn-page-scroll']);
    });
  });
}

test.describe(`fill page without a list scroller ${PHONE.name}`, () => {
  test.use({
    viewport: {width: PHONE.width, height: PHONE.height},
    hasTouch: true,
    isMobile: true,
  });

  test('main scrolls the page and keeps its bottom padding above the tab bar', async ({page}) => {
    await openStory(page, STORIES.unscrolled, 'light', '[data-row]');
    const geometry = await page.evaluate(() => {
      const main = document.querySelector('main') as HTMLElement;
      const box = document.querySelector('cmn-page-container > div') as HTMLElement;
      const rows = document.querySelectorAll('[data-row]');
      const last = rows[rows.length - 1] as HTMLElement;
      return {
        scrollHeight: main.scrollHeight,
        clientHeight: main.clientHeight,
        mainPaddingBottom: parseFloat(getComputedStyle(main).paddingBottom),
        boxPaddingBottom: parseFloat(getComputedStyle(box).paddingBottom),
        lastRowBottom:
          last.getBoundingClientRect().bottom - main.getBoundingClientRect().top + main.scrollTop,
      };
    });
    expect(geometry.scrollHeight).toBeGreaterThan(geometry.clientHeight);
    expect(geometry.boxPaddingBottom).toBeGreaterThan(0);
    const belowLastRow =
      geometry.scrollHeight - geometry.mainPaddingBottom - geometry.lastRowBottom;
    expect(belowLastRow).toBeGreaterThanOrEqual(geometry.boxPaddingBottom - 1);
  });
});
