import { expect, test } from '../../src/fixtures/failureAnalysisFixtures.js';

/**
 * Deliberately-failing test to demonstrate the v7 Failure Explainer.
 *
 * The login demo sets #status to "Login submitted", but this test asserts
 * "Dashboard loaded" on purpose. The auto failureAnalysis fixture captures the
 * page state + error, sends it to xAI, and attaches a plain-English explanation
 * that the FailureAnalysisReporter renders into failure-analysis.html.
 *
 * Run with: npm run test:self-healing:v7  (this test is EXPECTED to fail).
 */
test('login shows the dashboard after submit', async ({ page }) => {
  await page.goto('/demo/login.html');
  await page.fill('#input-email', 'candidate@testmu.ai');
  await page.fill('#input-password', 'correct-horse-battery-staple');
  await page.click('#actual-login-submit');

  await expect(page.locator('#status')).toHaveText('Dashboard loaded');
});
