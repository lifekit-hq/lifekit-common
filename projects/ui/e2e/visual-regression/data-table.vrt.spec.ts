import {expect, test} from '@playwright/test';

import {openStory} from './open-story';

const STORIES = [
  'default',
  'empty',
  'loading',
  'three-column-loading',
  'paginated',
  'clickable-rows',
  'aligned-columns',
  'many-rows-scrolling',
];

for (const story of STORIES) {
  test(`data-table/${story} — light`, async ({page}) => {
    await openStory(page, `components-datatable--${story}`, 'light');
    await page.waitForSelector('cmn-data-table', {timeout: 10000});
    await expect(page).toHaveScreenshot(`data-table-${story}-light.png`);
  });

  test(`data-table/${story} — dark`, async ({page}) => {
    await openStory(page, `components-datatable--${story}`, 'dark');
    await page.waitForSelector('cmn-data-table', {timeout: 10000});
    await expect(page).toHaveScreenshot(`data-table-${story}-dark.png`);
  });
}
