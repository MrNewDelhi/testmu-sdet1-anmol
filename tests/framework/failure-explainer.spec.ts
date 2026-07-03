import { expect, test } from '@playwright/test';
import { FailureExplainer } from '../../src/framework/failure-analysis/FailureExplainer.js';

// Green in-suite test that exercises the real xAI failure-analysis call on a
// simulated failure context (so CI covers the LLM integration without a red
// test). The deliberately-failing end-to-end demo lives in tests/failure-demo.
test('explains a simulated test failure via a real xAI call', async () => {
  const analysis = await new FailureExplainer().explain({
    title: 'Login > login shows the dashboard after submit',
    error:
      "Error: expect(locator).toHaveText(expected)\n"
      + "Expected string: \"Dashboard loaded\"\n"
      + "Received string: \"Login submitted\"\n"
      + "  locator resolved to <p id=\"status\">Login submitted</p>",
    url: 'http://127.0.0.1:9323/demo/login.html',
    domSnapshot:
      '1. parent=form#login-form <input id="input-email" type="email">\n'
      + '2. parent=form#login-form <input id="input-password" type="password">\n'
      + '3. parent=form#login-form <button id="actual-login-submit" type="submit"> text="Sign in"',
  });

  expect(analysis.summary.length).toBeGreaterThan(0);
  expect(analysis.rootCause.length).toBeGreaterThan(0);
  expect(analysis.suggestedFix.length).toBeGreaterThan(0);
  expect(['product-bug', 'environment', 'flaky', 'test-bug']).toContain(analysis.category);
});
