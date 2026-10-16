import {expect, test} from '@playwright/test';

import {openStory} from './open-story';

const STORIES = ['status-dots', 'status-dot-all-sizes'];

for (const story of STORIES) {
  for (const theme of ['light', 'dark'] as const) {
    test(`institution-avatar/${story} — ${theme}`, async ({page}) => {
      await openStory(page, `components-institutionavatar--${story}`, theme);
      await page.waitForSelector('cmn-institution-avatar', {timeout: 10000}).catch(() => null);
      await expect(page).toHaveScreenshot(`institution-avatar-${story}-${theme}.png`);
    });
  }
}
