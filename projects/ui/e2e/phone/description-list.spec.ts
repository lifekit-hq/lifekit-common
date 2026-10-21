import {expect, type Page, test} from '@playwright/test';

import {openStory} from './phone-helpers';

// cmn-description-list stacks each value under its label on a phone and sets them side by side
// from `sm` up; a long value wraps inside the list instead of scrolling the page sideways.
const DEFAULT_STORY = 'components-descriptionlist--default';
const LONG_STORY = 'components-descriptionlist--long-content';
const LIST_READY = 'cmn-description-list dl';
const PHONE = {width: 320, height: 667};
const WIDE = {width: 768, height: 1024};

/** For each row (its dt, then its dd), whether its value starts below its label rather than beside it. */
async function stacked(page: Page): Promise<boolean[]> {
  return page.locator('cmn-description-list dl > div').evaluateAll(rows =>
    rows.map(row => {
      const term = row.children[0].getBoundingClientRect();
      const value = row.children[1].getBoundingClientRect();
      return value.top >= term.bottom - 1;
    })
  );
}

test.describe(`description list ${PHONE.width}x${PHONE.height}`, () => {
  test.use({viewport: PHONE, hasTouch: true, isMobile: true});

  test('each value stacks under its label', async ({page}) => {
    await openStory(page, DEFAULT_STORY, 'light', LIST_READY);
    const rows = await stacked(page);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every(Boolean)).toBe(true);
  });

  test('long values wrap inside the list, nothing scrolls sideways', async ({page}) => {
    await openStory(page, LONG_STORY, 'light', LIST_READY);
    const overflow = await page.evaluate(() => {
      const found: string[] = [];
      const root = document.documentElement;
      if (root.scrollWidth > root.clientWidth) {
        found.push(`document is ${root.scrollWidth}px wide`);
      }
      for (const cell of document.querySelectorAll(
        'cmn-description-list dt, cmn-description-list dd'
      )) {
        if (cell.scrollWidth > cell.clientWidth) {
          found.push(
            `${cell.tagName.toLowerCase()} is ${cell.scrollWidth}px in ${cell.clientWidth}px`
          );
        }
      }
      return found;
    });
    expect(overflow).toEqual([]);
  });
});

test.describe(`description list ${WIDE.width}x${WIDE.height}`, () => {
  test.use({viewport: WIDE});

  test('each value sits beside its label', async ({page}) => {
    await openStory(page, DEFAULT_STORY, 'light', LIST_READY);
    const rows = await stacked(page);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.some(Boolean)).toBe(false);
  });
});
