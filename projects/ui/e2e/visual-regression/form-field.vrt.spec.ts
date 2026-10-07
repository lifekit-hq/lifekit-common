import {expect, test} from '@playwright/test';

import {openStory} from './open-story';

const STORIES = [
  'default',
  'with-hint',
  'with-error',
  'required',
  'disabled',
  'full-reactive-form-example',
];

for (const story of STORIES) {
  test(`form-field/${story} — light`, async ({page}) => {
    await openStory(page, `components-form-field--${story}`, 'light');
    await page.waitForSelector('cmn-form-field, label', {timeout: 10000}).catch(() => null);
    await expect(page).toHaveScreenshot(`form-field-${story}-light.png`);
  });

  test(`form-field/${story} — dark`, async ({page}) => {
    await openStory(page, `components-form-field--${story}`, 'dark');
    await page.waitForSelector('cmn-form-field, label', {timeout: 10000}).catch(() => null);
    await expect(page).toHaveScreenshot(`form-field-${story}-dark.png`);
  });
}
