import { expect, test } from '../../src/fixtures/failureAnalysisFixtures.js';

/**
 * Two tests that fail with the SAME error signature — a stand-in for a cascade
 * (one root cause failing many tests). In mode B the batched reporter dedups
 * them into a single LLM call and records cascadeCount = 2.
 *
 * Both are EXPECTED to fail. Run with: npm run test:self-healing:v9
 */
for (const scenario of ['first', 'second']) {
  test(`cascade ${scenario}: status shows the welcome banner`, async ({ page }) => {
    await page.goto('/demo/login.html');
    await page.fill('#input-email', 'candidate@testmu.ai');
    await page.fill('#input-password', 'correct-horse-battery-staple');
    await page.click('#actual-login-submit');

    await expect(page.locator('#status')).toHaveText('Welcome back');
  });
}
