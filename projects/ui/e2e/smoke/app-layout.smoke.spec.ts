import {expect, type Page, test} from '@playwright/test';

// Runs against the production Storybook bundle (real Tailwind CSS), which unit tests cannot do.
// Guards the iOS home-screen regression: the shell must be pinned to the layout viewport (never
// sized with viewport units) so the document cannot scroll, and the floating tab labels must fit.

const SCREENSHOT_DIR = process.env['LAYOUT_SHOTS'];
const PHONE = {width: 402, height: 874};
const TABLET = {width: 820, height: 1180};
const DESKTOP = {width: 1440, height: 900};
const IOS_STATUS_BAR = 62;
const ROOT_FONT_SIZES = ['14px', '16px'];
const THEMES = ['light', 'dark'];

async function open(page: Page, story: string, theme: string, rootFont = '16px') {
  await page.goto(
    `/iframe.html?id=components-app-layout--${story}&viewMode=story&globals=theme:${theme}`
  );
  await page.waitForSelector('cmn-app-layout > div', {state: 'visible'});
  await page.addStyleTag({content: `html{font-size:${rootFont}}`});
}

async function shot(page: Page, name: string) {
  if (SCREENSHOT_DIR) {
    await page.screenshot({path: `${SCREENSHOT_DIR}/${name}.png`});
  }
}

function documentOverflow(page: Page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    return {
      doc: root.scrollHeight - root.clientHeight,
      body: document.body.scrollHeight - document.body.clientHeight,
    };
  });
}

for (const theme of THEMES) {
  for (const rootFont of ROOT_FONT_SIZES) {
    test(`phone overlay, ${theme}, ${rootFont} root: shell fixed, tab labels fit`, async ({
      page,
    }) => {
      // iOS shape: the screen is taller than the page's real viewport by the status bar.
      await page.setViewportSize({width: PHONE.width, height: PHONE.height - IOS_STATUS_BAR});
      await open(page, 'phone-overlay', theme, rootFont);

      const root = page.locator('cmn-app-layout > div').first();
      expect(await root.evaluate(el => getComputedStyle(el).position)).toBe('fixed');
      const box = await root.boundingBox();
      expect(box).toEqual({x: 0, y: 0, width: PHONE.width, height: PHONE.height - IOS_STATUS_BAR});
      expect(await documentOverflow(page)).toEqual({doc: 0, body: 0});

      const labels = page.locator('cmn-bottom-tab-bar nav > button span.truncate');
      expect(await labels.count()).toBeGreaterThan(0);
      for (const label of await labels.all()) {
        const {clientHeight, scrollHeight} = await label.evaluate(el => ({
          clientHeight: el.clientHeight,
          scrollHeight: el.scrollHeight,
        }));
        expect(clientHeight).toBe(scrollHeight);
      }

      // The pill fits its content and sits fully inside the viewport.
      const nav = await page.locator('cmn-bottom-tab-bar nav').boundingBox();
      expect(nav?.height).toBe(64);
      expect((nav?.y ?? 0) + (nav?.height ?? 0)).toBeLessThanOrEqual(PHONE.height - IOS_STATUS_BAR);
      const overflow = await page
        .locator('cmn-bottom-tab-bar nav')
        .evaluate(el => el.scrollHeight - el.clientHeight);
      expect(overflow).toBeLessThanOrEqual(0);
      await shot(page, `phone-${theme}-${rootFont}`);
    });
  }

  for (const [name, size] of [
    ['tablet', TABLET],
    ['desktop', DESKTOP],
  ] as const) {
    test(`${name}, ${theme}: shell fixed, only main scrolls`, async ({page}) => {
      await page.setViewportSize(size);
      await open(page, 'scrolling-content', theme);
      const root = page.locator('cmn-app-layout > div').first();
      expect(await root.evaluate(el => getComputedStyle(el).position)).toBe('fixed');
      expect(await documentOverflow(page)).toEqual({doc: 0, body: 0});
      const main = page.locator('cmn-app-layout main');
      expect(await main.evaluate(el => el.scrollHeight > el.clientHeight)).toBe(true);
      await shot(page, `${name}-${theme}`);
    });
  }
}
