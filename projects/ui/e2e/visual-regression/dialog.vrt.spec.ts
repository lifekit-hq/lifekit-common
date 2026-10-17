import {expect, type Page, test} from '@playwright/test';

import {openStory} from './open-story';

// Baselines are `*-win32.png`, like the rest of the suite. A phone is 390x844 (the contract's
// reference width); the desktop width proves the same stories stay the centred dialog.
const PHONE = {width: 390, height: 844};
const DESKTOP = {width: 1280, height: 800};

const PHONE_STORIES = [
  'sheet',
  'sheet-with-long-form',
  'sheet-that-cannot-be-dismissed',
  'full-screen',
  'full-screen-stepper',
  'action-sheet',
  'confirm-action-sheet',
] as const;

const DESKTOP_STORIES = [
  'desktop-unchanged',
  'confirm-action-sheet',
  'full-screen-stepper',
] as const;

// A sheet slides in; every shot and measurement is taken at rest.
async function settled(page: Page): Promise<void> {
  await page.waitForSelector('cmn-dialog-container');
  await page.waitForFunction(() => document.getAnimations().every(a => a.playState !== 'running'));
}

for (const theme of ['light', 'dark'] as const) {
  test.describe(`dialog phone presentations - ${theme}`, () => {
    test.use({viewport: PHONE});

    for (const story of PHONE_STORIES) {
      test(`dialog/${story}/phone - ${theme}`, async ({page}) => {
        await openStory(page, `components-dialog--${story}`, theme);
        await page.waitForSelector('cmn-dialog-container', {timeout: 10000});
        await settled(page);
        await expect(page).toHaveScreenshot(`dialog-${story}-phone-${theme}.png`);
      });
    }
  });

  test.describe(`dialog on desktop - ${theme}`, () => {
    test.use({viewport: DESKTOP});

    for (const story of DESKTOP_STORIES) {
      test(`dialog/${story}/desktop - ${theme}`, async ({page}) => {
        await openStory(page, `components-dialog--${story}`, theme);
        await page.waitForSelector('cmn-dialog-container', {timeout: 10000});
        await settled(page);
        await expect(page).toHaveScreenshot(`dialog-${story}-desktop-${theme}.png`);
      });
    }
  });
}

test.describe('dialog phone behaviour', () => {
  test.use({viewport: PHONE});

  test('a sheet is bottom-anchored, clear of the status bar, with a grabber', async ({page}) => {
    await openStory(page, 'components-dialog--sheet-with-long-form', 'light');
    const container = page.locator('cmn-dialog-container');
    await expect(container).toHaveAttribute('data-presentation', 'sheet');
    await expect(page.getByTestId('dialog-handle')).toBeVisible();
    await settled(page);
    const box = await container.boundingBox();
    expect(box?.y).toBeGreaterThan(0);
    expect((box?.y ?? 0) + (box?.height ?? 0)).toBeCloseTo(PHONE.height, 0);
  });

  test('a full-screen dialog fills the viewport and has no grabber', async ({page}) => {
    await openStory(page, 'components-dialog--full-screen', 'light');
    const container = page.locator('cmn-dialog-container');
    await expect(container).toHaveAttribute('data-presentation', 'full-screen');
    await expect(page.getByTestId('dialog-handle')).toHaveCount(0);
    await settled(page);
    const box = await container.boundingBox();
    expect(box).toMatchObject({x: 0, y: 0, width: PHONE.width, height: PHONE.height});
  });

  test('swiping the grabber down dismisses a sheet', async ({page}) => {
    await openStory(page, 'components-dialog--sheet', 'light');
    const handle = page.getByTestId('dialog-handle');
    await settled(page);
    const box = await handle.boundingBox();
    const x = (box?.x ?? 0) + (box?.width ?? 0) / 2;
    const y = (box?.y ?? 0) + (box?.height ?? 0) / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y + 60, {steps: 4});
    await page.mouse.move(x, y + 200, {steps: 4});
    await page.mouse.up();
    await expect(page.locator('cmn-dialog-container')).toHaveCount(0);
  });

  test('a locked sheet snaps back instead of dismissing', async ({page}) => {
    await openStory(page, 'components-dialog--sheet-that-cannot-be-dismissed', 'light');
    const handle = page.getByTestId('dialog-handle');
    await settled(page);
    const box = await handle.boundingBox();
    const x = (box?.x ?? 0) + (box?.width ?? 0) / 2;
    const y = (box?.y ?? 0) + (box?.height ?? 0) / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y + 300, {steps: 6});
    await page.mouse.up();
    await expect(page.locator('cmn-dialog-container')).toHaveCount(1);
  });

  test('the backdrop dismisses a sheet but not a locked one', async ({page}) => {
    await openStory(page, 'components-dialog--sheet', 'light');
    await settled(page);
    await page.mouse.click(PHONE.width / 2, 20);
    await expect(page.locator('cmn-dialog-container')).toHaveCount(0);

    await openStory(page, 'components-dialog--sheet-that-cannot-be-dismissed', 'light');
    await settled(page);
    await page.mouse.click(PHONE.width / 2, 20);
    await expect(page.locator('cmn-dialog-container')).toHaveCount(1);
  });
});

test.describe('dialog on desktop', () => {
  test.use({viewport: DESKTOP});

  test('stays a centred dialog with no grabber', async ({page}) => {
    await openStory(page, 'components-dialog--desktop-unchanged', 'light');
    const container = page.locator('cmn-dialog-container');
    await expect(container).toHaveAttribute('data-presentation', 'dialog');
    await expect(page.getByTestId('dialog-handle')).toHaveCount(0);
    const box = await container.boundingBox();
    expect((box?.x ?? 0) + (box?.width ?? 0) / 2).toBeCloseTo(DESKTOP.width / 2, 0);
    expect((box?.y ?? 0) + (box?.height ?? 0) / 2).toBeCloseTo(DESKTOP.height / 2, 0);
  });
});
