import {expect, test} from '@playwright/test';

import {openStory} from './open-story';

const STORIES = ['card', 'bare', 'with-actions', 'long-text'];

const VIEWPORTS = [
  {name: 'phone-320', width: 320, height: 667},
  {name: 'phone-390', width: 390, height: 844},
  {name: 'desktop', width: 1280, height: 800},
];

for (const viewport of VIEWPORTS) {
  test.describe(viewport.name, () => {
    test.use({viewport: {width: viewport.width, height: viewport.height}});

    for (const story of STORIES) {
      test(`empty-state/${story} — light`, async ({page}) => {
        await openStory(page, `components-empty-state--${story}`, 'light');
        await page.waitForSelector('cmn-empty-state', {timeout: 10000});
        await expect(page).toHaveScreenshot(`empty-state-${story}-${viewport.name}-light.png`);
      });
    }

    test('empty-state/with-actions — dark', async ({page}) => {
      await openStory(page, 'components-empty-state--with-actions', 'dark');
      await page.waitForSelector('cmn-empty-state', {timeout: 10000});
      await expect(page).toHaveScreenshot(`empty-state-with-actions-${viewport.name}-dark.png`);
    });
  });
}
