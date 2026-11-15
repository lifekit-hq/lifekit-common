import {expect, type Page, test} from '@playwright/test';

import {MIN_TARGET, openStory} from './phone-helpers';

// cmn-price-block on a real touch pipeline (Chromium's own, via the DevTools protocol, with
// `hasTouch` and `isMobile`): a horizontal drag across the plot reads it, a vertical one scrolls the
// page, the pill stays clear of the finger and the six period tabs are touch targets down to a
// 320px-wide phone. This is emulation, not a physical device; the findings are noted in the PR and in
// docs/PHONE-CONTRACT.md.
const STORY = 'components-priceblock--golden';
const READY = 'cmn-price-block canvas';
const STEPS = 8;
const SWEEP = [
  {width: 320, height: 640},
  {width: 360, height: 740},
  {width: 390, height: 844},
] as const;
const DRAG_FRACTION = 0.45;
const START_FRACTION = 0.2;
const FINGER_ROW = 0.75;

interface Point {
  x: number;
  y: number;
}

async function touchDrag(page: Page, from: Point, dx: number, dy = 0): Promise<void> {
  const session = await page.context().newCDPSession(page);
  const at = (i: number): Point[] => [{x: from.x + (dx * i) / STEPS, y: from.y + (dy * i) / STEPS}];
  await session.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: at(0)});
  for (let i = 1; i <= STEPS; i++) {
    await session.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: at(i)});
  }
  return session
    .send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []})
    .then(() => undefined);
}

/** Holds the finger down and moving, without lifting, so the read can be inspected under it. */
async function touchHold(page: Page, from: Point, dx: number): Promise<() => Promise<void>> {
  const session = await page.context().newCDPSession(page);
  const at = (i: number): Point[] => [{x: from.x + (dx * i) / STEPS, y: from.y}];
  await session.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: at(0)});
  for (let i = 1; i <= STEPS; i++) {
    await session.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: at(i)});
  }
  return async () => {
    await session.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
  };
}

async function plot(page: Page): Promise<{x: number; y: number; width: number; height: number}> {
  const box = await page.locator(READY).first().boundingBox();
  if (!box) {
    throw new Error('the price plot is not on screen');
  }
  return box;
}

for (const size of SWEEP) {
  test.describe(`price block touch ${size.width}x${size.height}`, () => {
    test.use({viewport: size, hasTouch: true, isMobile: true});

    test.beforeEach(async ({page}) => {
      await openStory(page, STORY, 'light', READY);
      await page.locator('cmn-price-block').first().scrollIntoViewIfNeeded();
    });

    test('a horizontal drag across the plot reads it and lets go on release', async ({page}) => {
      const box = await plot(page);
      const headline = page.locator('[data-testid="price-headline"]').first();
      const resting = await headline.textContent();
      const from = {x: box.x + box.width * START_FRACTION, y: box.y + box.height * FINGER_ROW};
      const lift = await touchHold(page, from, box.width * DRAG_FRACTION);
      const pill = page.locator('[data-testid="price-pill"]').first();
      await expect(pill).toBeVisible();
      await expect(page.locator('[data-testid="price-pill-date"]').first()).toContainText(/\d{4}/);
      expect(await headline.textContent()).not.toBe(resting);
      // The page did not scroll sideways under the finger.
      expect(await page.evaluate(() => window.scrollX)).toBe(0);
      await lift();
      await expect(pill).toBeHidden();
      expect(await headline.textContent()).toBe(resting);
    });

    test('the pill sits above the finger, never under it', async ({page}) => {
      const box = await plot(page);
      const touchY = box.y + box.height * FINGER_ROW;
      const lift = await touchHold(
        page,
        {x: box.x + box.width * START_FRACTION, y: touchY},
        box.width * DRAG_FRACTION
      );
      const pill = await page.locator('[data-testid="price-pill"]').first().boundingBox();
      expect(pill).not.toBeNull();
      expect((pill?.y ?? 0) + (pill?.height ?? 0)).toBeLessThan(touchY);
      // And inside the screen at both edges.
      expect(pill?.x ?? -1).toBeGreaterThanOrEqual(0);
      expect((pill?.x ?? 0) + (pill?.width ?? 0)).toBeLessThanOrEqual(size.width);
      await lift();
    });

    test('every period tab is a touch target', async ({page}) => {
      const tabs = page.locator('cmn-price-block').first().getByRole('tab');
      expect(await tabs.count()).toBe(6);
      for (const tab of await tabs.all()) {
        const box = await tab.boundingBox();
        expect(box?.width).toBeGreaterThanOrEqual(MIN_TARGET);
        expect(box?.height).toBeGreaterThanOrEqual(MIN_TARGET);
      }
      const row = await page.locator('[data-testid="price-periods"]').first().boundingBox();
      expect(row?.x ?? -1).toBeGreaterThanOrEqual(0);
      expect((row?.x ?? 0) + (row?.width ?? 0)).toBeLessThanOrEqual(size.width);
    });

    test('a tap on a tab changes the period', async ({page}) => {
      await page.locator('cmn-price-block').first().getByRole('tab', {name: '6M'}).tap();
      await expect(
        page.locator('cmn-price-block').first().getByRole('tab', {name: '6M'})
      ).toHaveAttribute('aria-selected', 'true');
    });
  });
}

test.describe('price block touch: a vertical drag scrolls the page', () => {
  // Short enough that the page must scroll.
  test.use({viewport: {width: 390, height: 480}, hasTouch: true, isMobile: true});

  test('and does not leave a read behind', async ({page}) => {
    await openStory(page, STORY, 'light', READY);
    const box = await plot(page);
    const before = await page.evaluate(() => window.scrollY);
    await touchDrag(page, {x: box.x + box.width / 2, y: Math.min(box.y + 200, 460)}, 0, -160);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before);
    await expect(page.locator('[data-testid="price-pill"]').first()).toBeHidden();
  });
});
