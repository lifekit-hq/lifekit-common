import {type BaselineRoute, defineScreenBaselines} from '@lifekit-hq/tokens/screen';
import {expect, type Locator, type Page, test} from '@playwright/test';

// The golden price screens (`Charts/Golden`): the price block at rest, and with the crosshair held
// on the plot, so the one combined pill, the moved headline and change pill are in the baseline,
// for one instrument and for one with a benchmark (two rows in the pill, in percent). Light and dark
// at both sizes. A mouse stands in for the finger here; the touch behaviour is checked at a real
// phone size in `e2e/phone/price-block-touch.spec.ts`.
const STORYBOOK_THEME = {light: 'light', dark: 'dark'} as const;
const SCRUB_FRACTION = 0.62;
const SETTLE_FRAMES = 60;

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

async function settledBox(page: Page, canvas: Locator): Promise<Box> {
  const frame = (): Promise<void> =>
    page.evaluate(() => new Promise<void>(done => requestAnimationFrame(() => done())));
  let previous = await canvas.boundingBox();
  for (let attempt = 0; attempt < SETTLE_FRAMES; attempt++) {
    await frame();
    await frame();
    const next = await canvas.boundingBox();
    if (next && previous && JSON.stringify(next) === JSON.stringify(previous)) {
      return next;
    }
    previous = next;
  }
  throw new Error('the price plot never settled');
}

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
        const canvas = page.locator('[data-price-golden] canvas').first();
        // The plot resizes as fonts load and the layout settles; the crosshair maps the pointer to
        // a date through the box, so measure only once the box is the same across two frames.
        await page.evaluate(() => document.fonts.ready);
        const box = await settledBox(page, canvas);
        await page.mouse.move(box.x + box.width * SCRUB_FRACTION, box.y + box.height * 0.6);
        const date = page.locator('[data-testid="price-pill-date"]').first();
        await date.waitFor({state: 'visible'});
        // Held on one date: the pill reads the same on two consecutive frames.
        const shown = await date.innerText();
        await page.evaluate(
          () => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)))
        );
        await expect(date).toHaveText(shown);
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
