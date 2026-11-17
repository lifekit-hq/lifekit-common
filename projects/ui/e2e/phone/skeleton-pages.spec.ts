import {checkSkeleton, formatSkeleton, SCREEN_VIEWPORTS} from '@lifekit-hq/tokens/screen';
import {expect, test} from '@playwright/test';

// The page-level skeleton conformance check (docs/SCREEN-CHECK.md, "The skeleton check") over the
// page skeleton presets. skeleton-conformance.stories.ts holds each part preset to the component it
// copies; this holds each page preset (`list`, `card`, `detail`, `overview`) to a whole page of its
// kind: the fixture story fetches its data, draws the preset while the request is held and the
// real blocks once it lands, and `checkSkeleton` compares the two states block by block.
//
// The bar is the library's own and takes no exceptions: a finding here is a preset that drifted
// from the page it stands in for, fixed in the preset, not accepted in this file. A consuming app
// calls `checkSkeleton` the same way on its own routes.
const STORIES = ['list', 'card', 'detail', 'overview'] as const;
const DATA = '**/api/skeleton-pages/**';

for (const [size, viewport] of Object.entries(SCREEN_VIEWPORTS)) {
  test.describe(`page skeleton ${size}`, () => {
    test.use(viewport);

    for (const story of STORIES) {
      test(`${story} | the skeleton lays out like the loaded page`, async ({page}) => {
        await page.route(DATA, route => route.fulfill({json: {}}));
        const result = await checkSkeleton(page, {
          url: `/iframe.html?id=conformance-skeleton-pages--${story}&viewMode=story&globals=theme:light`,
          hold: DATA,
        });
        expect(result.findings, formatSkeleton(result)).toEqual([]);
        // A check that compared nothing would pass on any page.
        expect(result.loaded.length).toBeGreaterThan(0);
        expect(result.held).toBeGreaterThan(0);
      });
    }
  });
}
