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
const create = await request.post('/booking', { data: validBookingPayload });
const { bookingid } = await create.json();
const response = await request.put(\`/booking/\${bookingid}\`, {
  data: validBookingPayload,
});
expect(response.status()).toBe(403);
`.trim(),
    assertions: ['Unauthorized PUT returns 403'],
    selfHealingValue: 'Useful for future classification between auth setup issue and real API regression.',
  },
  {
    id: 'api-read-booking-by-id',
    type: 'positive',
    title: 'Read a created booking by id',
    intent: 'Verify the R in CRUD: a created booking is retrievable by id.',
    playwrightDraft: `
const create = await request.post('/booking', { data: validBookingPayload });
const { bookingid } = await create.json();
const response = await request.get(\`/booking/\${bookingid}\`);
expect(response.status()).toBe(200);
const body = await response.json();
expect(body).toEqual(expect.objectContaining({
  firstname: validBookingPayload.firstname,
  lastname: validBookingPayload.lastname,
}));
`.trim(),
    assertions: ['GET by id returns 200', 'Body matches the created booking'],
    selfHealingValue: 'Not selector healing; a failure explainer can interpret contract drift on the read path.',
  },
  {
    id: 'api-update-booking-authorized',
    type: 'positive',
    title: 'Authorized update mutates the booking',
    intent: 'Verify the U in CRUD: an authenticated PUT updates fields.',
    playwrightDraft: `
const token = await createAuthToken(request);
const create = await request.post('/booking', { data: validBookingPayload });
const { bookingid } = await create.json();
const response = await request.put(\`/booking/\${bookingid}\`, {
  headers: { Cookie: \`token=\${token}\`, Accept: 'application/json', 'Content-Type': 'application/json' },
  data: { ...validBookingPayload, firstname: 'Updated', totalprice: 500 },
});
expect(response.status()).toBe(200);
expect(await response.json()).toEqual(expect.objectContaining({ firstname: 'Updated', totalprice: 500 }));
`.trim(),
    assertions: ['Authorized PUT returns 200', 'Updated fields are reflected in the response'],
    selfHealingValue: 'Useful for classification between an auth setup issue and a real mutation regression.',
  },
  {
    id: 'api-delete-booking-authorized',
    type: 'positive',
    title: 'Authorized delete removes the booking',
    intent: 'Verify the D in CRUD: an authenticated delete removes the resource.',
    playwrightDraft: `
const token = await createAuthToken(request);
const create = await request.post('/booking', { data: validBookingPayload });
const { bookingid } = await create.json();
const del = await request.delete(\`/booking/\${bookingid}\`, {
  headers: { Cookie: \`token=\${token}\`, Accept: 'application/json' },
});
expect(del.status()).toBe(201);
const after = await request.get(\`/booking/\${bookingid}\`);
expect(after.status()).toBe(404);
`.trim(),
    assertions: ['Authorized DELETE returns 201', 'The booking is gone afterwards (404)'],
    selfHealingValue: 'Not selector healing; supports lifecycle validation for future failure explanation.',
  },
  {
    id: 'api-not-found',
    type: 'negative',
    title: 'Non-existent booking id returns 404',
    intent: 'Verify 4xx error handling for a missing resource.',
    playwrightDraft: `
const response = await request.get('/booking/99999999');
expect(response.status()).toBe(404);
`.trim(),
    assertions: ['GET on a missing id returns 404'],
    selfHealingValue: 'Failure explainer can distinguish an expected 404 from an unexpected server error.',
  },
  {
    id: 'api-rate-limiting-burst',
    type: 'edge',
    title: 'Burst traffic is not rate-limited on this SUT',
    intent: 'Probe rate-limiting: restful-booker has no limiter, so a burst must all succeed.',
    playwrightDraft: `
const responses = await Promise.all(
  Array.from({ length: 15 }, () => request.get('/booking')),
);
// Against a throttled API some of these would be 429 and this assertion
// would fail, which is exactly the signal a rate-limit test should catch.
for (const response of responses) {
  expect(response.status()).toBe(200);
}
`.trim(),
    assertions: ['All burst requests return 200 (no rate limiting on this SUT)'],
    selfHealingValue: 'Helpful for flaky/environment classification when real rate limits create intermittent 429s.',
  },
];
