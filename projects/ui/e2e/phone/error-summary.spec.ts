import {expect, test} from '@playwright/test';

import {openStory} from './phone-helpers';

// Where focus lands on a submit with errors (guardrails V2), at the narrowest phone width.
const SUMMARY_STORY = 'components-errorsummary--default';
const SHORT_SHEET_STORY = 'components-errorsummary--short-sheet';
const FORM_READY = 'form cmn-form-field';

test.use({viewport: {width: 320, height: 667}, hasTouch: true, isMobile: true});

test('a submit with errors moves focus to the summary, whose links focus their fields', async ({
  page,
}) => {
  await openStory(page, SUMMARY_STORY, 'light', FORM_READY);
  await page.getByRole('button', {name: 'Save details'}).click();

  const summary = page.locator('cmn-error-summary > div');
  await expect(summary).toBeFocused();
  await expect(summary.getByRole('link')).toHaveText([
    'This field is required.',
    'This field is required.',
    'This field is required.',
  ]);

  await summary.getByRole('link').nth(1).click();
  await expect(page.getByLabel('Email')).toBeFocused();
  await expect(page).toHaveURL(/iframe\.html/);
});

test('a short sheet form focuses its first invalid field and draws no summary', async ({page}) => {
  await openStory(page, SHORT_SHEET_STORY, 'light', FORM_READY);
  await page.getByLabel('Account name').fill('Joint savings');
  await page.getByRole('button', {name: 'Add account'}).click();

  await expect(page.getByLabel('Opening balance')).toBeFocused();
  await expect(page.locator('cmn-error-summary > div')).toHaveCount(0);
});
