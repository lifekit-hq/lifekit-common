import {expect, test} from '@playwright/test';

import {openStory} from './phone-helpers';

// A skeleton and the content it stands in for are one height, not "within a few px": a card holding
// a figure keeps its height when the figure arrives. The ramp's line-height decides how tall a line
// of text is, so a skeleton for text is sized from the ramp (`cmn-skeleton text`), never from a
// literal rem that drifts when the ramp does.
const STORY = 'conformance-skeleton-geometry--geometry';
const READY = 'cmn-skeleton-geometry';
const PAIRS = ['hero', 'stat', 'chart', 'row', 'section'] as const;
const SUBPIXEL = 0.01;
const SIZES = [
  {name: '390x844', width: 390, height: 844},
  {name: '1280x800', width: 1280, height: 800},
] as const;

for (const size of SIZES) {
  test.describe(`skeleton height ${size.name}`, () => {
    test.use({viewport: {width: size.width, height: size.height}});

    for (const pair of PAIRS) {
      test(`${pair} | the skeleton and the loaded content are one height`, async ({page}) => {
        await openStory(page, STORY, 'light', READY);
        const heights = await page.locator(`[data-pair="${pair}"]`).evaluate(el => ({
          skeleton: el.querySelector('[data-skeleton]')?.getBoundingClientRect().height ?? 0,
          loaded: el.querySelector('[data-loaded]')?.getBoundingClientRect().height ?? 0,
        }));
        expect(heights.loaded).toBeGreaterThan(0);
        expect(Math.abs(heights.skeleton - heights.loaded)).toBeLessThan(SUBPIXEL);
      });
    }
  });
}
