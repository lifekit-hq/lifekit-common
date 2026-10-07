import {expect, test} from '@playwright/test';

import {openStory} from './open-story';

const STORIES = ['primary', 'secondary', 'destructive', 'loading', 'disabled', 'all-sizes'];

for (const story of STORIES) {
  test(`button/${story} — light`, async ({page}) => {
    await openStory(page, `components-button--${story}`, 'light');
    await page.waitForSelector('cmn-button, [data-testid]', {timeout: 10000}).catch(() => null);
    await expect(page).toHaveScreenshot(`button-${story}-light.png`);
  });

  test(`button/${story} — dark`, async ({page}) => {
    await openStory(page, `components-button--${story}`, 'dark');
    await page.waitForSelector('cmn-button, [data-testid]', {timeout: 10000}).catch(() => null);
    await expect(page).toHaveScreenshot(`button-${story}-dark.png`);
  });
}
