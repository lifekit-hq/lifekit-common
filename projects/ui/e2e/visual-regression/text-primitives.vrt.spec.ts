import {expect, test} from '@playwright/test';

import {openStory} from './open-story';

const STORIES = [
  {id: 'primitives-link--variants', selector: 'cmn-link-showcase', name: 'link-variants'},
  {id: 'primitives-link--in-running-text', selector: 'cmn-link-in-text', name: 'link-in-text'},
  {id: 'primitives-code-block--default', selector: '.cmn-code-block', name: 'code-block'},
  {
    id: 'primitives-code-block--capped-height',
    selector: '.cmn-code-block',
    name: 'code-block-capped',
  },
  {
    id: 'primitives-code-block--long-line-phone',
    selector: '.cmn-code-block',
    name: 'code-block-long-line',
  },
];

const VIEWPORTS = [
  {name: 'phone-390', width: 390, height: 844},
  {name: 'desktop', width: 1280, height: 800},
];

for (const viewport of VIEWPORTS) {
  test.describe(viewport.name, () => {
    test.use({viewport: {width: viewport.width, height: viewport.height}});

    for (const story of STORIES) {
      for (const theme of ['light', 'dark'] as const) {
        test(`${story.name} — ${theme}`, async ({page}) => {
          await openStory(page, story.id, theme);
          await page.waitForSelector(story.selector, {timeout: 10000});
          await expect(page).toHaveScreenshot(`${story.name}-${viewport.name}-${theme}.png`);
        });
      }
    }
  });
}
