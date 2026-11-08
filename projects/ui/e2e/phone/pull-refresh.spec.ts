import {type CDPSession, expect, type Page, test} from '@playwright/test';

import {openStory} from './phone-helpers';

// Pull to refresh on a tab root (Apple HIG, Refreshing content), on a real touch. The unit specs
// drive the gesture with synthetic touch events; this goes through the browser's own touch
// pipeline, where `touchmove` must be cancelable for the pull not to turn into a scroll.
//
// Set PULL_REFRESH_SHOTS to a directory to save the held pull and the refreshing state as pictures.
const READY = 'cmn-app-layout main';
const STORIES = {
  page: 'conformance-pull-to-refresh--scrolling-page',
  list: 'conformance-pull-to-refresh--scrolling-list',
  none: 'conformance-pull-to-refresh--no-reload',
} as const;
const PHONE = {width: 390, height: 844};
const START = {x: 195, y: 260};
/** Finger travel that clears the threshold with room (the content follows at half). */
const PULL_PX = 190;
const STEPS = 12;
const FIRST_SYNC = 'Last synced 09:41';
const SECOND_SYNC = 'Last synced 09:42';

class Finger {
  private constructor(private readonly session: CDPSession) {}

  public static async on(page: Page): Promise<Finger> {
    return new Finger(await page.context().newCDPSession(page));
  }

  public async down(): Promise<void> {
    await this.session.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [START]});
  }

  public async dragTo(dy: number): Promise<void> {
    for (let i = 1; i <= STEPS; i++) {
      await this.session.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{x: START.x, y: START.y + (dy * i) / STEPS}],
      });
    }
  }

  public async up(): Promise<void> {
    await this.session.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
  }

  public async pull(dy: number): Promise<void> {
    await this.down();
    await this.dragTo(dy);
    await this.up();
  }
}

/** How far main is pulled down, in px. */
const pulled = (page: Page): Promise<number> =>
  page.locator('main').evaluate(el => new DOMMatrixReadOnly(getComputedStyle(el).transform).m42);

const chipOpacity = (page: Page): Promise<number> =>
  page
    .locator('[data-cmn-pull-indicator]')
    .evaluate(el => Number.parseFloat(getComputedStyle(el).opacity));

async function shot(page: Page, name: string): Promise<void> {
  const dir = process.env['PULL_REFRESH_SHOTS'];
  if (dir) {
    await page.screenshot({path: `${dir}/${name}.png`});
  }
}

test.describe(`pull to refresh ${PHONE.width}x${PHONE.height}`, () => {
  test.use({viewport: PHONE, hasTouch: true, isMobile: true});

  test('pulling the top of a tab root past the threshold reloads it, with progress until done', async ({
    page,
  }) => {
    await openStory(page, STORIES.page, 'light', READY);
    await expect(page.getByText(FIRST_SYNC)).toBeVisible();
    const finger = await Finger.on(page);

    await finger.down();
    await finger.dragTo(PULL_PX);
    expect(await pulled(page)).toBeGreaterThan(0);
    await expect.poll(() => chipOpacity(page)).toBe(1);
    await shot(page, 'pulling');

    await finger.up();
    await expect(page.getByRole('status')).toHaveText('Refreshing');
    await expect(page.locator('[data-cmn-pull-indicator] .animate-spin')).toBeVisible();
    await shot(page, 'refreshing');

    await expect(page.getByText(SECOND_SYNC)).toBeVisible();
    await expect(page.getByRole('status')).toHaveText('');
    await expect.poll(() => pulled(page)).toBe(0);
    await expect.poll(() => chipOpacity(page)).toBe(0);
  });

  test('a pull that stops short of the threshold settles back without reloading', async ({
    page,
  }) => {
    await openStory(page, STORIES.page, 'light', READY);
    await (await Finger.on(page)).pull(PULL_PX / 3);
    await expect.poll(() => pulled(page)).toBe(0);
    await expect(page.getByText(FIRST_SYNC)).toBeVisible();
    await expect(page.getByRole('status')).toHaveText('');
  });

  test('a page scrolled down scrolls back up instead of reloading', async ({page}) => {
    await openStory(page, STORIES.page, 'light', READY);
    await page.locator('main').evaluate(el => el.scrollTo(0, 120));
    await (await Finger.on(page)).pull(PULL_PX);
    await expect(page.getByRole('status')).toHaveText('');
    // Scrolled out of view, but still the first sync: nothing reloaded.
    await expect(page.getByText(FIRST_SYNC)).toBeAttached();
    expect(await pulled(page)).toBe(0);
  });

  test('a list that scrolls inside the page pulls only from its top', async ({page}) => {
    await openStory(page, STORIES.list, 'light', 'cmn-page-scroll');
    await page.locator('cmn-page-scroll').evaluate(el => el.scrollTo(0, 120));
    await (await Finger.on(page)).pull(PULL_PX);
    await expect(page.getByText(FIRST_SYNC)).toBeVisible();

    await page.locator('cmn-page-scroll').evaluate(el => el.scrollTo(0, 0));
    await (await Finger.on(page)).pull(PULL_PX);
    await expect(page.getByText(SECOND_SYNC)).toBeVisible();
  });

  test('a tab root with no reload does not move', async ({page}) => {
    await openStory(page, STORIES.none, 'light', READY);
    const finger = await Finger.on(page);
    await finger.down();
    await finger.dragTo(PULL_PX);
    expect(await pulled(page)).toBe(0);
    await shot(page, 'no-reload');
    await finger.up();
    await expect(page.getByRole('status')).toHaveText('');
  });

  test('under Reduce Motion the content stays still and the pull still reloads', async ({page}) => {
    await page.emulateMedia({reducedMotion: 'reduce'});
    await openStory(page, STORIES.page, 'light', READY);
    const finger = await Finger.on(page);

    await finger.down();
    await finger.dragTo(PULL_PX);
    expect(await pulled(page)).toBe(0);
    await expect.poll(() => chipOpacity(page)).toBe(1);
    await shot(page, 'reduce-motion-pulling');
    await finger.up();

    await expect(page.getByRole('status')).toHaveText('Refreshing');
    // A spinner keeps turning under Reduce Motion; nothing else moves.
    await expect(page.locator('[data-cmn-pull-indicator] .animate-spin')).toBeVisible();
    await expect(page.getByText(SECOND_SYNC)).toBeVisible();
    expect(await pulled(page)).toBe(0);
  });

  test('the browser gets no overscroll to chain: main still contains it', async ({page}) => {
    await openStory(page, STORIES.none, 'light', READY);
    expect(
      await page.locator('main').evaluate(el => getComputedStyle(el).overscrollBehaviorY)
    ).toBe('contain');
  });
});
