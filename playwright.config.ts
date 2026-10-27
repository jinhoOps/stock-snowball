import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.PLAYWRIGHT_PORT ?? '5173');
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PLAYWRIGHT_PORT');
const baseURL = 'http://127.0.0.1:' + port;

export default defineConfig({
  testDir: './e2e',
  outputDir: 'test-results/playwright',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL,
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port ' + port + ' --strictPort',
    url: baseURL + '/stock-snowball/',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } },
    },
    {
      name: 'mobile-chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } },
    },
  ],
});
