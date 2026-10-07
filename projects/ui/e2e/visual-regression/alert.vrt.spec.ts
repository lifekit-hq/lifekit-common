import {expect, test} from '@playwright/test';

import {openStory} from './open-story';

const STORIES = [
  'info',
  'success',
  'warning',
  'error',
  'with-title',
  'dismissible',
  'with-long-content',
];

for (const story of STORIES) {
  test(`alert/${story} — light`, async ({page}) => {
    await openStory(page, `components-alert--${story}`, 'light');
    await page.waitForSelector('cmn-alert', {timeout: 10000}).catch(() => null);
    await expect(page).toHaveScreenshot(`alert-${story}-light.png`);
  });

  test(`alert/${story} — dark`, async ({page}) => {
    await openStory(page, `components-alert--${story}`, 'dark');
    await page.waitForSelector('cmn-alert', {timeout: 10000}).catch(() => null);
    await expect(page).toHaveScreenshot(`alert-${story}-dark.png`);
  });
}
