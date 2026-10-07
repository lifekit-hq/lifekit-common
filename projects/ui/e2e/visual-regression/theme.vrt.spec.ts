import {expect, type Page, test} from '@playwright/test';

import {openStory, type Theme} from './open-story';

// Guards the harness itself: every other spec snapshots a light/dark pair, and a pair that renders
// the same pixels tests nothing (the dark theme once silently never applied in this run).
const STORY = 'components-card--default';

async function render(page: Page, theme: Theme) {
  await openStory(page, STORY, theme);
  await page.waitForSelector('cmn-card');
  return {
    background: await page.evaluate(
      () => getComputedStyle(document.documentElement).backgroundColor
    ),
    screenshot: await page.screenshot(),
  };
}

test('dark and light render differently', async ({page}) => {
  const light = await render(page, 'light');
  const dark = await render(page, 'dark');

  expect(dark.background).not.toBe(light.background);
  expect(dark.screenshot.equals(light.screenshot)).toBe(false);
});
