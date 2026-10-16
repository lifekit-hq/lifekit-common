import {expect, test} from '@playwright/test';

import {openStory} from './open-story';

const STORIES = ['avatar-status-dots'];

for (const story of STORIES) {
  for (const theme of ['light', 'dark'] as const) {
    test(`disclosure-row/${story} — ${theme}`, async ({page}) => {
      await openStory(page, `components-disclosurerow--${story}`, theme);
      await page.waitForSelector('cmn-disclosure-row', {timeout: 10000}).catch(() => null);
      await expect(page).toHaveScreenshot(`disclosure-row-${story}-${theme}.png`);
    });
  }
}
