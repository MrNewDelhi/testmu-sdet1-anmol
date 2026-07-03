import { expect, test } from '@playwright/test';
import { FailureExplainer } from '../../src/framework/failure-analysis/FailureExplainer.js';

// v8: green in-suite test that exercises the real multimodal xAI call — it sends
// an actual page screenshot alongside the error/DOM so the model can see the page.
test('explains a failure with a page screenshot (multimodal xAI call)', async ({ page }) => {
  await page.goto('/demo/login.html');
  await page.fill('#input-email', 'candidate@testmu.ai');
  await page.fill('#input-password', 'correct-horse-battery-staple');
  await page.click('#actual-login-submit');

  const screenshotBase64 = (await page.screenshot()).toString('base64');

  const analysis = await new FailureExplainer().explain({
    title: 'Login > login shows the dashboard after submit',
    error:
      "Error: expect(locator).toHaveText(expected)\n"
      + "Expected string: \"Dashboard loaded\"\nReceived string: \"Login submitted\"",
    url: page.url(),
    domSnapshot: 'form#login-form > button#actual-login-submit "Sign in"; p#status "Login submitted"',
    screenshotBase64,
  });

  expect(analysis.summary.length).toBeGreaterThan(0);
  expect(analysis.suggestedFix.length).toBeGreaterThan(0);
  expect(['product-bug', 'environment', 'flaky', 'test-bug']).toContain(analysis.category);
});
