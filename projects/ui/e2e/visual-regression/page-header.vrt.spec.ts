import {expect, test} from '@playwright/test';

const STORIES = [
  'title-only',
  'with-subtitle',
  'with-action',
  'action-loading',
  'action-disabled',
  'long-title',
  'narrow',
  'with-secondary-action',
];

for (const story of STORIES) {
  test(`page-header/${story} — light`, async ({page}) => {
    await page.goto(`/iframe.html?id=components-pageheader--${story}&viewMode=story`);
    await page.waitForSelector('cmn-page-header', {timeout: 10000});
    await expect(page).toHaveScreenshot(`page-header-${story}-light.png`);
  });

  test(`page-header/${story} — dark`, async ({page}) => {
    await page.goto(`/iframe.html?id=components-pageheader--${story}&viewMode=story`);
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
    });
    await page.waitForSelector('cmn-page-header', {timeout: 10000});
    await expect(page).toHaveScreenshot(`page-header-${story}-dark.png`);
  });
}
