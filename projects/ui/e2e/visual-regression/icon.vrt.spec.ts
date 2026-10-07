import {expect, test} from '@playwright/test';

import {openStory} from './open-story';

const STORIES = [
  'default',
  'small',
  'large',
  'with-color',
  'with-aria-label',
  'all-sizes',
  'common-icons',
];

for (const story of STORIES) {
  test(`icon/${story} — light`, async ({page}) => {
    await openStory(page, `components-icon--${story}`, 'light');
    await page.waitForSelector('cmn-icon', {timeout: 10000}).catch(() => null);
    await expect(page).toHaveScreenshot(`icon-${story}-light.png`);
  });

  test(`icon/${story} — dark`, async ({page}) => {
    await openStory(page, `components-icon--${story}`, 'dark');
    await page.waitForSelector('cmn-icon', {timeout: 10000}).catch(() => null);
    await expect(page).toHaveScreenshot(`icon-${story}-dark.png`);
  });
}
