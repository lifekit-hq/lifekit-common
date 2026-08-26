import {defineConfig, devices} from '@playwright/test';

// Smoke config: runs against the pre-built storybook-static directory.
// Run after `npm run build-storybook` to verify production-bundle correctness.
export default defineConfig({
  testDir: './e2e/smoke',
  fullyParallel: false,
  forbidOnly: !!process.env['CI'],
  retries: 0,
  workers: 1,
  reporter: [['json', {outputFile: 'e2e/smoke/results.json'}], ['list']],
  use: {
    baseURL: 'http://localhost:6007',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {...devices['Desktop Chrome']},
    },
  ],
  webServer: {
    command:
      "node -e \"require('http').createServer((req,res)=>{const fs=require('fs'),path=require('path'),dir='projects/ui/storybook-static',fp=path.join(dir,req.url.split('?')[0]==='/'?'index.html':req.url.split('?')[0]),ext=path.extname(fp);fs.readFile(fp,(e,d)=>{if(e){res.writeHead(404);res.end();}else{res.writeHead(200,{'Content-Type':{html:'text/html',js:'application/javascript',css:'text/css',json:'application/json'}[ext.slice(1)]||'application/octet-stream'});res.end(d);}});}).listen(6007)\"",
    url: 'http://localhost:6007',
    reuseExistingServer: true,
    timeout: 30000,
  },
});
