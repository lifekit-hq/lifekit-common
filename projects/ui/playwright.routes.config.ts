import {defineConfig, devices} from '@playwright/test';

// Route scan (docs/ROUTE-SCAN.md): the design judge and axe-core over the golden screens of the
// page templates, at 390 and 1280, light and dark. Run after `npm run build-storybook`; CI does so
// in the `routes` job. The first run downloads the pinned impeccable engine into ~/.impeccable.
const PORT = 6010;

export default defineConfig({
  testDir: './e2e/routes',
  testMatch: '*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: 0,
  outputDir: './e2e/routes/.output',
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    ...devices['Desktop Chrome'],
  },
  webServer: {
    stdout: 'ignore',
    command: `python3 -m http.server ${PORT} --bind 127.0.0.1 -d storybook-static`,
    url: `http://127.0.0.1:${PORT}/iframe.html`,
    reuseExistingServer: !process.env['CI'],
    timeout: 30000,
  },
});
