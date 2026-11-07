import {expect, test} from '@playwright/test';

import {openStory, settleFrames} from './phone-helpers';

// A disclosure opens in place: the section grows downwards and its header stays exactly where it was,
// to the pixel, so the thumb that opened it is still on it and an exact position check holds.
const STORY = 'conformance-disclosure-in-page--opens-in-place';
const READY = 'cmn-disclosure-row';
const HEADER = 'cmn-disclosure-row button[aria-controls]';
const SIZES = [
  {name: '390x844', width: 390, height: 844, touch: true},
  {name: '1280x800', width: 1280, height: 800, touch: false},
] as const;

for (const size of SIZES) {
  test.describe(`disclosure in place ${size.name}`, () => {
    test.use({
      viewport: {width: size.width, height: size.height},
      hasTouch: size.touch,
      isMobile: size.touch,
    });

    test('opening keeps the header where it was', async ({page}) => {
      await openStory(page, STORY, 'light', READY);
      const header = page.locator(HEADER);
      await header.scrollIntoViewIfNeeded();
      await settleFrames(page);
      const top = (): Promise<number> => header.evaluate(el => el.getBoundingClientRect().top);
      const before = await top();

      await header.click();
      await expect(header).toHaveAttribute('aria-expanded', 'true');
      await settleFrames(page);
      expect(await top()).toBe(before);
    });
  });
}
