import {expect, test} from '@playwright/test';

// Proves that <lk-line-chart> is registered and renders in the production-mode
// Storybook bundle — the key risk mitigated by the sideEffects fix.
test('lk-line-chart registers and renders its shadow root in production build', async ({page}) => {
  await page.goto('/iframe.html?id=elements-lklinechart--default&viewMode=story');

  // Wait for Storybook's story root to appear
  await page.waitForSelector('#storybook-root', {timeout: 15000});

  // The custom element must be defined in the registry
  const isDefined = await page.evaluate(() => !!customElements.get('lk-line-chart'));
  expect(isDefined).toBe(true);

  // The element must exist in the DOM and have rendered its shadow root
  const hasShadowRoot = await page.evaluate(() => {
    const el = document.querySelector('#storybook-root lk-line-chart');
    return el !== null && el.shadowRoot !== null;
  });
  expect(hasShadowRoot).toBe(true);

  // A canvas must be present inside the shadow root (Chart.js rendered)
  const hasCanvas = await page.evaluate(() => {
    const el = document.querySelector('#storybook-root lk-line-chart');
    return el?.shadowRoot?.querySelector('canvas') !== null;
  });
  expect(hasCanvas).toBe(true);
});

// The canvas keeps the colours it was built with, so the element must redraw itself when the
// theme flips: the line colour it draws has to follow --color-accent-default light -> dark -> light.
test('lk-line-chart redraws with the new theme colours when data-theme flips', async ({page}) => {
  await page.goto('/iframe.html?id=elements-lklinechart--default&viewMode=story');
  await page.waitForSelector('#storybook-root lk-line-chart canvas', {timeout: 15000});

  const setTheme = (theme: 'light' | 'dark') =>
    page.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme);

  // Read the canvas pixels, so this proves the redraw rather than an internal config.
  const drawn = (): Promise<string> =>
    page.evaluate(() => {
      const canvas = document
        .querySelector('#storybook-root lk-line-chart')
        ?.shadowRoot?.querySelector('canvas');
      return canvas ? canvas.toDataURL() : '';
    });

  // Chart.js animates the first draw, so wait it out: only then do the pixels hold still and a
  // change in them can only come from a rebuild.
  const ANIMATION_SETTLE_MS = 1500;
  await setTheme('light');
  await page.waitForTimeout(ANIMATION_SETTLE_MS);
  const light = await drawn();
  expect(await drawn()).toBe(light);

  await setTheme('dark');
  await expect.poll(drawn, {timeout: 5000}).not.toBe(light);
  await page.waitForTimeout(ANIMATION_SETTLE_MS);
  const dark = await drawn();

  await setTheme('light');
  await expect.poll(drawn, {timeout: 5000}).not.toBe(dark);
});
