import {type BaselineRoute, defineScreenBaselines} from '@lifekit-hq/tokens/screen';
import {expect, type Page, test} from '@playwright/test';

// The golden price screens (`Charts/Golden`): the price block at rest, and with the crosshair held
// on the plot, so the one combined pill, the moved headline and change pill are in the baseline,
// for one instrument and for one with a benchmark (two rows in the pill, in percent). Light and dark
// at both sizes. A mouse stands in for the finger here; the touch behaviour is checked at a real
// phone size in `e2e/phone/price-block-touch.spec.ts`.
const STORYBOOK_THEME = {light: 'light', dark: 'dark'} as const;
const SCRUB_FRACTION = 0.62;

function priceRoute(name: string, story: string, scrub: boolean): BaselineRoute {
  return {
    name,
    url: ({scheme}) =>
      `/iframe.html?id=charts-golden--${story}&viewMode=story&globals=theme:${STORYBOOK_THEME[scheme]}`,
    ready: async (page: Page): Promise<void> => {
      await page.locator('[data-price-golden] canvas').first().waitFor({state: 'visible'});
      // The plot is drawn once the headline has its price.
      await expect(page.locator('[data-testid="price-headline"]').first()).toContainText('$');
      if (scrub) {
        const box = await page.locator('[data-price-golden] canvas').first().boundingBox();
        if (!box) {
          throw new Error('the price plot has no box');
        }
        await page.mouse.move(box.x + box.width * SCRUB_FRACTION, box.y + box.height * 0.6);
        await page.locator('[data-testid="price-pill"]').first().waitFor({state: 'visible'});
      }
    },
  };
}

defineScreenBaselines(
  {test, expect},
  {
    routes: [
      priceRoute('price-block', 'price', false),
      priceRoute('price-block-scrub', 'price', true),
      priceRoute('price-block-compared', 'compared', false),
      priceRoute('price-block-compared-scrub', 'compared', true),
    ],
  }
);
