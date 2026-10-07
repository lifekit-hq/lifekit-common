import {expect, test} from '@playwright/test';

import {openStory} from './open-story';

const STORIES = ['default', 'with-value', 'disabled', 'readonly', 'error', 'password', 'all-sizes'];

for (const story of STORIES) {
  test(`input/${story} — light`, async ({page}) => {
    await openStory(page, `components-input--${story}`, 'light');
    await page.waitForSelector('cmn-input, input', {timeout: 10000}).catch(() => null);
    await expect(page).toHaveScreenshot(`input-${story}-light.png`);
  });

  test(`input/${story} — dark`, async ({page}) => {
    await openStory(page, `components-input--${story}`, 'dark');
    await page.waitForSelector('cmn-input, input', {timeout: 10000}).catch(() => null);
    await expect(page).toHaveScreenshot(`input-${story}-dark.png`);
  });
}
