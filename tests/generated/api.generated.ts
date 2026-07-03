import type { APIRequestContext } from '@playwright/test';
import type { GeneratedPlaywrightCase } from './login.generated.js';

export const validBookingPayload = {
  firstname: 'Anmol',
  lastname: 'SDET',
  totalprice: 180,
  depositpaid: true,
  bookingdates: {
    checkin: '2026-07-10',
    checkout: '2026-07-12',
  },
  additionalneeds: 'Breakfast',
};

export async function createAuthToken(request: APIRequestContext): Promise<string> {
  const response = await request.post('/auth', {
    data: { username: 'admin', password: 'password123' },
  });
  const body = await response.json() as { token: string };
  return body.token;
}

export const apiGeneratedCases: GeneratedPlaywrightCase[] = [
  {
    id: 'api-health-check',
    type: 'positive',
    title: 'Health check returns expected status',
    intent: 'Verify the API health endpoint is reachable before running CRUD tests.',
    playwrightDraft: `
const response = await request.get('/ping');
expect(response.status()).toBe(201);
`.trim(),
    assertions: ['GET /ping returns 201'],
    selfHealingValue: 'Not a locator case; useful as a precondition before AI-assisted failure explanation.',
  },
  {
    id: 'api-auth-token',
    type: 'positive',
    title: 'Successful auth returns token',
    intent: 'Verify valid API credentials return an auth token.',
    playwrightDraft: `
const response = await request.post('/auth', {
  data: { username: 'admin', password: 'password123' },
});
await expect(response).toBeOK();
const body = await response.json();
expect(body).toEqual(expect.objectContaining({ token: expect.any(String) }));
`.trim(),
    assertions: ['Auth response is OK', 'Response body includes token string'],
    selfHealingValue: 'Not selector healing; demonstrates where LLM failure explanation can interpret API body/status mismatches.',
  },
  {
    id: 'api-create-booking-schema',
    type: 'positive',
    title: 'Create booking returns id and schema-valid booking',
    intent: 'Verify booking creation returns both a booking id and typed booking body.',
    playwrightDraft: `
const response = await request.post('/booking', { data: validBookingPayload });
expect(response.status()).toBe(200);
const body = await response.json();
expect(body).toEqual(expect.objectContaining({
  bookingid: expect.any(Number),
  booking: expect.objectContaining({
    firstname: validBookingPayload.firstname,
    lastname: validBookingPayload.lastname,
  }),
}));
`.trim(),
    assertions: ['Status is 200', 'bookingid is numeric', 'booking body matches submitted data'],
    selfHealingValue: 'Useful for future failure explainer when schema or contract drift occurs.',
  },
  {
    id: 'api-auth-bad-credentials',
    type: 'negative',
    title: 'Bad credentials return explicit reason',
    intent: 'Verify invalid auth does not issue a token.',
    playwrightDraft: `
const response = await request.post('/auth', {
  data: { username: 'admin', password: 'wrong' },
});
expect(response.status()).toBe(200);
const body = await response.json();
expect(body).toEqual({ reason: 'Bad credentials' });
`.trim(),
    assertions: ['No token is returned', 'Bad credentials reason is present'],
    selfHealingValue: 'Good candidate for LLM explanation when API returns unexpected auth shape.',
  },
  {
    id: 'api-missing-fields',
    type: 'negative',
    title: 'Missing required booking fields are rejected',
    intent: 'Verify invalid booking payloads fail loudly.',
    playwrightDraft: `
const response = await request.post('/booking', {
  data: { firstname: 'OnlyName' },
});
expect([400, 422, 500]).toContain(response.status());
`.trim(),
    assertions: ['Invalid payload returns an error status'],
    selfHealingValue: 'Failure explainer can summarize whether this is expected validation behavior or a backend bug.',
  },
  {
    id: 'api-unauthorized-update',
    type: 'negative',
    title: 'Unauthorized update is rejected',
    intent: 'Verify protected mutation endpoints require auth.',
    playwrightDraft: `
const response = await request.put('/booking/1', {
  data: validBookingPayload,
});
expect(response.status()).toBe(403);
`.trim(),
    assertions: ['Unauthorized PUT returns 403'],
    selfHealingValue: 'Useful for future classification between auth setup issue and real API regression.',
  },
  {
    id: 'api-rate-limiting-burst',
    type: 'edge',
    title: 'Repeated safe requests remain stable or throttle predictably',
    intent: 'Verify burst traffic does not corrupt response shape.',
    playwrightDraft: `
const responses = await Promise.all(
  Array.from({ length: 10 }, () => request.get('/booking')),
);
for (const response of responses) {
  expect([200, 429]).toContain(response.status());
}
`.trim(),
    assertions: ['Each response is either successful or predictably throttled'],
    selfHealingValue: 'Helpful for flaky/environment classification when rate limits create intermittent failures.',
  },
];
