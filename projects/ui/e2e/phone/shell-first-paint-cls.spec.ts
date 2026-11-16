import {expect, test} from '@playwright/test';

// The shell must not move after its first paint: a routed page declares its large title in route
// data, and the shell has to know it on the frame the page first renders, or the title box is
// inserted above a page that is already on screen. The observer starts before the page loads and
// reads buffered entries, so the very first frames count. Docs/PHONE-CONTRACT.md, "First paint".
// Layout shift 0.000 at the three decimals Web Vitals reports. The webfont swap of the search
// button's key hint is the one thing left that moves (about 0.00003), and it is not the shell.
const SHELL_SHIFT_LIMIT = 0.0005;
const SETTLE_MS = 1500;

const SIZES = {
  desktop: {width: 1280, height: 800},
  phone: {width: 390, height: 844},
} as const;

for (const [name, size] of Object.entries(SIZES)) {
  test(`${name} | routed shell does not shift after its first paint`, async ({page}) => {
    await page.setViewportSize(size);
    await page.addInitScript(() => {
      const state = {value: 0};
      (window as unknown as {__cls: typeof state}).__cls = state;
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          const shift = entry as PerformanceEntry & {value: number; hadRecentInput: boolean};
          if (!shift.hadRecentInput) {
            state.value += shift.value;
          }
        }
      }).observe({type: 'layout-shift', buffered: true});
    });
    await page.goto('/iframe.html?id=conformance-routed-app-layout--routed&viewMode=story');
    await page.waitForSelector('cmn-app-layout [data-cmn-page-title], cmn-app-layout h1', {
      state: 'visible',
    });
    await page.waitForTimeout(SETTLE_MS);
    const cls = await page.evaluate(
      () => (window as unknown as {__cls: {value: number}}).__cls.value
    );

    test.info().annotations.push({type: 'cls', description: cls.toFixed(4)});
    expect(cls).toBeLessThanOrEqual(SHELL_SHIFT_LIMIT);
  });
}
