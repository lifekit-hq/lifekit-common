import {expect, test} from '@playwright/test';

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
    await page.goto(`/iframe.html?id=components-statcard--${story}&viewMode=story`);
    await page.waitForSelector('cmn-stat-card', {timeout: 10000});
    await expect(page).toHaveScreenshot(`stat-card-${story}-light.png`);
  });

  test(`stat-card/${story} — dark`, async ({page}) => {
    await page.goto(`/iframe.html?id=components-statcard--${story}&viewMode=story`);
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
    });
    await page.waitForSelector('cmn-stat-card', {timeout: 10000});
    await expect(page).toHaveScreenshot(`stat-card-${story}-dark.png`);
  });
}
