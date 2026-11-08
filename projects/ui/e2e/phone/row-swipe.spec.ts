import {expect, type Page, test} from '@playwright/test';

import {openStory} from './phone-helpers';

// cmn-list-item-row swipe actions on a real touch: the leading action under a swipe toward the end,
// the trailing under a swipe toward the start, the visible control kept, and a vertical pan left to
// the page. The unit spec drives the same gesture with synthetic pointer events; this one goes
// through the browser's own touch pipeline.
const STORY = 'components-listitemrow--swipe-actions';
const READY = 'cmn-list-item-row';
const PHONE = {width: 390, height: 844};
const SWIPE_PX = 120;
const STEPS = 6;

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
  await session.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
}

async function centreOf(page: Page, row: number): Promise<Point> {
  const box = await page.locator(`${READY} .touch-pan-y`).nth(row).boundingBox();
  if (!box) {
    throw new Error('the row surface is not on screen');
  }
  return {x: box.x + box.width / 2, y: box.y + box.height / 2};
}

/** How far the row surface is moved from the frame that clips it (the story pads the page). */
const surfaceX = (page: Page, row: number): Promise<number> =>
  page
    .locator(`${READY} .touch-pan-y`)
    .nth(row)
    .evaluate(
      el => el.getBoundingClientRect().x - (el.parentElement?.getBoundingClientRect().x ?? 0)
    );

test.describe(`row swipe ${PHONE.width}x${PHONE.height}`, () => {
  test.use({viewport: PHONE, hasTouch: true, isMobile: true});

  test.beforeEach(async ({page}) => {
    await openStory(page, STORY, 'light', READY);
  });

  test('a swipe toward the end uncovers the leading action', async ({page}) => {
    await touchDrag(page, await centreOf(page, 0), SWIPE_PX);
    await expect.poll(() => surfaceX(page, 0)).toBeGreaterThan(0);
    const tray = await page.getByRole('button', {name: 'Done Oat milk'}).boundingBox();
    // Settled open: the surface has moved by exactly the width of the tray it uncovered.
    await expect.poll(() => surfaceX(page, 0)).toBeCloseTo(tray?.width ?? 0, 0);
  });

  test('a swipe toward the start uncovers the trailing action', async ({page}) => {
    await touchDrag(page, await centreOf(page, 0), -SWIPE_PX);
    await expect.poll(() => surfaceX(page, 0)).toBeLessThan(0);
    const remove = await page.getByRole('button', {name: 'Remove Oat milk'}).boundingBox();
    expect((remove?.x ?? 0) + (remove?.width ?? 0)).toBeLessThanOrEqual(PHONE.width + 1);
  });

  test('a vertical pan does not open the row', async ({page}) => {
    await touchDrag(page, await centreOf(page, 0), 4, 60);
    expect(await surfaceX(page, 0)).toBe(0);
  });

  test('the visible control stays, and the actions are buttons a keyboard reaches', async ({
    page,
  }) => {
    await expect(page.getByRole('button', {name: 'More for Oat milk'})).toBeVisible();
    await page.getByRole('button', {name: 'Remove Oat milk'}).focus();
    await expect.poll(() => surfaceX(page, 0)).toBeLessThan(0);
    await page.keyboard.press('Escape');
    await expect.poll(() => surfaceX(page, 0)).toBe(0);
  });

  test('a revealed tray is at least a touch target', async ({page}) => {
    await page.getByRole('button', {name: 'Done Oat milk'}).focus();
    for (const name of ['Done Oat milk']) {
      const box = await page.getByRole('button', {name}).boundingBox();
      expect(box?.width).toBeGreaterThanOrEqual(44);
      expect(box?.height).toBeGreaterThanOrEqual(44);
    }
  });
});
