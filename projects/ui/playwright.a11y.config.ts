import {defineConfig, devices} from '@playwright/test';

// Accessibility gate: axe-core over every story of the built Storybook, in light and dark (see
// e2e/a11y/a11y.spec.ts). Run after `npm run build-storybook`; CI does so in the `a11y` job.
const PORT = 6009;

export default defineConfig({
  testDir: './e2e/a11y',
  testMatch: '*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: 0,
  outputDir: './e2e/a11y/.output',
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    ...devices['Desktop Chrome'],
    // Settled state only: a colour measured mid-transition is not the colour users see.
    reducedMotion: 'reduce',
  },
  webServer: {
    command: `python3 -m http.server ${PORT} --bind 127.0.0.1 -d storybook-static`,
    url: `http://127.0.0.1:${PORT}/iframe.html`,
    reuseExistingServer: !process.env['CI'],
    timeout: 30000,
  },
});
