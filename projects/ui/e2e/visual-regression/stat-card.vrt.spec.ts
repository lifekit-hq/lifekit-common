import {expect, test} from '@playwright/test';

import {openStory} from './open-story';

const STORIES = [
  'default',
  'with-positive-delta',
  'with-negative-delta',
  'zero-delta',
  'with-icon',
  'loading',
  'long-value',
  'all-cards',
];

for (const story of STORIES) {
  test(`stat-card/${story} — light`, async ({page}) => {
    await openStory(page, `components-statcard--${story}`, 'light');
    await page.waitForSelector('cmn-stat-card', {timeout: 10000});
    await expect(page).toHaveScreenshot(`stat-card-${story}-light.png`);
  });

  test(`stat-card/${story} — dark`, async ({page}) => {
    await openStory(page, `components-statcard--${story}`, 'dark');
    await page.waitForSelector('cmn-stat-card', {timeout: 10000});
    await expect(page).toHaveScreenshot(`stat-card-${story}-dark.png`);
  });
}
