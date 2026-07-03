import { expect, test } from '../../src/fixtures/apiFailureAnalysisFixtures.js';
import { env } from '../../src/config/env.js';

/**
 * Deliberately-failing API test to demonstrate v10.
 *
 * It creates a booking (which returns 200) but asserts 500 on purpose. Because
 * there is no page, the failure fixture sends the RAW request and response to
 * xAI instead of a DOM/screenshot. Run with npm run test:self-healing:v7 / :v9
 * (this test is EXPECTED to fail).
 */
test('create booking returns a server error', async ({ api }) => {
  const response = await api.post(`${env.apiBaseUrl}/booking`, {
    data: {
      firstname: 'Anmol',
      lastname: 'SDET',
      totalprice: 180,
      depositpaid: true,
      bookingdates: { checkin: '2026-07-10', checkout: '2026-07-12' },
    },
  });

  // The API actually returns 200; asserting 500 forces a failure whose raw
  // request/response is the only useful context.
  expect(response.status()).toBe(500);
});
