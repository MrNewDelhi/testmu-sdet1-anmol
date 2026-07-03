import 'dotenv/config';
import { defineConfig, devices } from '@playwright/test';

/**
 * Dedicated config for the v7 Failure Explainer demo.
 *
 * It runs a deliberately-failing test (so the test itself reports "failed" — that
 * is the point) with the custom FailureAnalysisReporter, which writes
 * playwright-report/failure-analysis.html from the xAI explanation attached by
 * the failureAnalysis fixture. Kept separate so `npm test` stays green.
 */
// mode A (default) analyzes per test; mode B batches + enriches after the run.
const reporterModule = process.env.FAILURE_ANALYSIS_MODE === 'b'
  ? './src/reporters/BatchedFailureAnalysisReporter.ts'
  : './src/reporters/FailureAnalysisReporter.ts';

export default defineConfig({
  testDir: './tests/failure-demo',
  timeout: 30_000,
  retries: 0,
  reporter: [
    ['list'],
    [reporterModule],
  ],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://127.0.0.1:9323',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run serve:demo',
    url: process.env.BASE_URL ?? 'http://127.0.0.1:9323',
    reuseExistingServer: !process.env.CI,
    timeout: 10_000,
  },
});
