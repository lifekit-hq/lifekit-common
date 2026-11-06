import {screenBaselineConfig} from '@lifekit-hq/tokens/screen';
import {defineConfig, devices} from '@playwright/test';

// Screen baselines (docs/SCREEN-BASELINES.md): the reference app's screens at 390 and 1280, light
// and dark, against the Linux baselines committed next to the spec. Run after
// `npm run build-storybook`. `screenBaselineConfig()` makes a missing or changed baseline a failure;
// `npm run test:screens:update` is the one step that rewrites them.
const PORT = 6009;

export default defineConfig({
  ...screenBaselineConfig(),
  testDir: './e2e/screens',
  testMatch: '*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: 0,
  outputDir: './e2e/screens/.output',
  reporter: process.env['CI'] ? [['list'], ['html', {open: 'never'}]] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
  },
  // Named, so a baseline reads `<screen>-chromium-linux.png`.
  projects: [{name: 'chromium', use: {...devices['Desktop Chrome']}}],
  webServer: {
    command: `python3 -m http.server ${PORT} --bind 127.0.0.1 -d storybook-static`,
    url: `http://127.0.0.1:${PORT}/iframe.html`,
    reuseExistingServer: !process.env['CI'],
    timeout: 30000,
  },
});
