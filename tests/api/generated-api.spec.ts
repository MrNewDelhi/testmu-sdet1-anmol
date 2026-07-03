import { expect, test, type APIRequestContext } from '@playwright/test';
import { env } from '../../src/config/env.js';

const bookingPayload = {
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

async function createAuthToken(request: APIRequestContext): Promise<string> {
  const response = await request.post(`${env.apiBaseUrl}/auth`, {
    data: { username: 'admin', password: 'password123' },
  });
  expect(response.status()).toBe(200);
  const body = await response.json() as { token: string };
  expect(body.token).toEqual(expect.any(String));
  return body.token;
}

async function createBooking(request: APIRequestContext): Promise<number> {
  const response = await request.post(`${env.apiBaseUrl}/booking`, {
    data: bookingPayload,
  });
  expect(response.status()).toBe(200);
  const body = await response.json() as { bookingid: number };
  return body.bookingid;
}

test.describe('Generated REST API cases - executable', () => {
  test('api-health-check', async ({ request }) => {
    const response = await request.get(`${env.apiBaseUrl}/ping`);
    expect(response.status()).toBe(201);
  });

  test('api-auth-token', async ({ request }) => {
    await createAuthToken(request);
  });

  test('api-create-booking-schema', async ({ request }) => {
    const response = await request.post(`${env.apiBaseUrl}/booking`, { data: bookingPayload });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toEqual(expect.objectContaining({
      bookingid: expect.any(Number),
      booking: expect.objectContaining({
        firstname: bookingPayload.firstname,
        lastname: bookingPayload.lastname,
      }),
    }));
  });

  test('api-auth-bad-credentials', async ({ request }) => {
    const response = await request.post(`${env.apiBaseUrl}/auth`, {
      data: { username: 'admin', password: 'wrong' },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ reason: 'Bad credentials' });
  });

  test('api-missing-fields', async ({ request }) => {
    const response = await request.post(`${env.apiBaseUrl}/booking`, {
      data: { firstname: 'OnlyName' },
    });
    expect([400, 422, 500]).toContain(response.status());
  });

  test('api-unauthorized-update', async ({ request }) => {
    const bookingId = await createBooking(request);
    const response = await request.put(`${env.apiBaseUrl}/booking/${bookingId}`, {
      data: bookingPayload,
    });
    expect(response.status()).toBe(403);
  });

  test('api-rate-limiting-burst', async ({ request }) => {
    const responses = await Promise.all(
      Array.from({ length: 10 }, () => request.get(`${env.apiBaseUrl}/booking`)),
    );
    for (const response of responses) {
      expect([200, 429]).toContain(response.status());
    }
  });
});
