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
