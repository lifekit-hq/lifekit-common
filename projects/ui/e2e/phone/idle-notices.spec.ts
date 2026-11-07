import {expect, test} from '@playwright/test';

import {openStory, settleFrames} from './phone-helpers';

// A notice that is not showing costs the page nothing. An app projects the offline banner, the
// update prompt and the install hint as three children of the shell's notices column; with none of
// them showing, the column has no height and the page starts where it does without them, so a
// sticky page header never starts a gap down (`--cmn-sticky-top` follows the column's height).
const READY = 'cmn-page[data-cmn-page]';
const SIZES = [
  {name: 'phone 390x844', width: 390, height: 844, story: 'phone'},
  {name: 'desktop 1280x800', width: 1280, height: 800, story: 'desktop'},
] as const;

for (const size of SIZES) {
  test.describe(`idle notices ${size.name}`, () => {
    test.use({viewport: {width: size.width, height: size.height}});

    test('the notices column takes no height and the page title does not move', async ({page}) => {
      await openStory(page, `templates-list--${size.story}`, 'light', READY);
      await settleFrames(page);
      const title = (): Promise<number> =>
        page.locator('[data-cmn-page-title]').evaluate(el => el.getBoundingClientRect().top);
      const without = await title();

      await openStory(page, `templates-list--${size.story}-with-app-chrome`, 'light', READY);
      await settleFrames(page);
      const column = await page.locator('[data-cmn-notices]').evaluate(el => ({
        height: el.getBoundingClientRect().height,
        children: el.children.length,
      }));
      expect(column.children, 'the three notices are there, each its own child').toBe(3);
      expect(column.height).toBe(0);
      expect(await title()).toBe(without);
    });
  });
}
