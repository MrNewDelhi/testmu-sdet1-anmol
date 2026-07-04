import { expect, test } from '../../src/fixtures/apiFailureAnalysisFixtures.js';
import { env } from '../../src/config/env.js';

/**
 * Deliberately-failing API test whose real status is a 500.
 *
 * restful-booker returns 500 for a create with missing required fields. This
 * test expects 200, so it fails with an actual 500 — which the deterministic
 * classifier buckets as product-bug WITHOUT any xAI call (v10 + deterministic).
 *
 * Run with npm run test:self-healing:v7 / :v9 (this test is EXPECTED to fail).
 */
test('create booking with a missing payload succeeds', async ({ api }) => {
  const response = await api.post(`${env.apiBaseUrl}/booking`, {
    data: { firstname: 'OnlyName' },
  });

  // The API actually 500s on the incomplete payload; asserting 200 forces a
  // failure whose status alone classifies it (no LLM needed).
  expect(response.status()).toBe(200);
});
