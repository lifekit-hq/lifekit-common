import {expect, test} from '@playwright/test';

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
    await page.goto(`/iframe.html?id=components-datatable--${story}&viewMode=story`);
    await page.waitForSelector('cmn-data-table', {timeout: 10000});
    await expect(page).toHaveScreenshot(`data-table-${story}-light.png`);
  });

  test(`data-table/${story} — dark`, async ({page}) => {
    await page.goto(`/iframe.html?id=components-datatable--${story}&viewMode=story`);
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
    });
    await page.waitForSelector('cmn-data-table', {timeout: 10000});
    await expect(page).toHaveScreenshot(`data-table-${story}-dark.png`);
  });
}
