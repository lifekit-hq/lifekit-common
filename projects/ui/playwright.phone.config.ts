import {defineConfig, devices} from '@playwright/test';

// Phone conformance suite: checks docs/PHONE-CONTRACT.md against the built Storybook app-layout
// stories. Run after `npm run build-storybook`. Report-only by default: violations are recorded
// and summarised but the run stays green. Set PHONE_CONFORMANCE=gate to make them fail.
const PORT = 6008;

export default defineConfig({
  testDir: './e2e/phone',
  testMatch: '*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: 0,
  outputDir: './e2e/phone/.output',
  reporter: [['list'], ['./e2e/phone/summary-reporter.ts']],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    ...devices['Desktop Chrome'],
  },
  webServer: {
    command: `python3 -m http.server ${PORT} --bind 127.0.0.1 -d storybook-static`,
    url: `http://127.0.0.1:${PORT}/iframe.html`,
    reuseExistingServer: !process.env['CI'],
    timeout: 30000,
  },
});
