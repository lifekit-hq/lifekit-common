import {expect, test} from '@playwright/test';

import {openStory} from './open-story';

const STORIES = ['default', 'elevated', 'no-padding', 'all-padding-sizes', 'with-nested-content'];

for (const story of STORIES) {
  test(`card/${story} — light`, async ({page}) => {
    await openStory(page, `components-card--${story}`, 'light');
    await page.waitForSelector('cmn-card', {timeout: 10000}).catch(() => null);
    await expect(page).toHaveScreenshot(`card-${story}-light.png`);
  });

  test(`card/${story} — dark`, async ({page}) => {
    await openStory(page, `components-card--${story}`, 'dark');
    await page.waitForSelector('cmn-card', {timeout: 10000}).catch(() => null);
    await expect(page).toHaveScreenshot(`card-${story}-dark.png`);
  });
}
