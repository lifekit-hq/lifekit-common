import {expect, test} from '@playwright/test';

import {openStory} from './open-story';

const STORIES = [
  'title-only',
  'with-subtitle',
  'with-action',
  'action-loading',
  'action-disabled',
  'long-title',
  'narrow',
  'with-secondary-action',
];

for (const story of STORIES) {
  test(`page-header/${story} — light`, async ({page}) => {
    await openStory(page, `components-pageheader--${story}`, 'light');
    await page.waitForSelector('cmn-page-header', {timeout: 10000});
    await expect(page).toHaveScreenshot(`page-header-${story}-light.png`);
  });

  test(`page-header/${story} — dark`, async ({page}) => {
    await openStory(page, `components-pageheader--${story}`, 'dark');
    await page.waitForSelector('cmn-page-header', {timeout: 10000});
    await expect(page).toHaveScreenshot(`page-header-${story}-dark.png`);
  });
}
