import 'dotenv/config';
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  // Generated design artifacts and the deliberately-failing v7 demo are excluded
  // from the default run (the v7 demo runs via playwright.failure-demo.config.ts).
  testIgnore: ['**/tests/generated/**', '**/tests/failure-demo/**'],
  timeout: 30_000,
  expect: {
    timeout: 5_000
  },
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }]
  ],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://127.0.0.1:9323',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  webServer: {
    command: 'npm run serve:demo',
    url: process.env.BASE_URL ?? 'http://127.0.0.1:9323',
    reuseExistingServer: !process.env.CI,
    timeout: 10_000
  }
});
