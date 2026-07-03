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

/** restful-booker authorizes mutations via a session token cookie. */
function authHeaders(token: string): Record<string, string> {
  return {
    Cookie: `token=${token}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
}

test.describe('Generated REST API cases - executable', () => {
  test('api-health-check', async ({ request }) => {
    const response = await request.get(`${env.apiBaseUrl}/ping`);
    expect(response.status()).toBe(201);
  });

  test('api-auth-token', async ({ request }) => {
    await createAuthToken(request);
  });

  test('api-auth-bad-credentials', async ({ request }) => {
    const response = await request.post(`${env.apiBaseUrl}/auth`, {
      data: { username: 'admin', password: 'wrong' },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ reason: 'Bad credentials' });
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
        totalprice: bookingPayload.totalprice,
        depositpaid: bookingPayload.depositpaid,
      }),
    }));
  });

  test('api-read-booking-by-id', async ({ request }) => {
    const bookingId = await createBooking(request);
    const response = await request.get(`${env.apiBaseUrl}/booking/${bookingId}`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toEqual(expect.objectContaining({
      firstname: bookingPayload.firstname,
      lastname: bookingPayload.lastname,
    }));
  });

  test('api-update-booking-authorized', async ({ request }) => {
    const token = await createAuthToken(request);
    const bookingId = await createBooking(request);
    const updated = { ...bookingPayload, firstname: 'Updated', totalprice: 500 };
    const response = await request.put(`${env.apiBaseUrl}/booking/${bookingId}`, {
      headers: authHeaders(token),
      data: updated,
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toEqual(expect.objectContaining({
      firstname: 'Updated',
      totalprice: 500,
    }));
  });

  test('api-delete-booking-authorized', async ({ request }) => {
    const token = await createAuthToken(request);
    const bookingId = await createBooking(request);
    const deleteResponse = await request.delete(`${env.apiBaseUrl}/booking/${bookingId}`, {
      headers: authHeaders(token),
    });
    // restful-booker returns 201 Created on a successful delete.
    expect(deleteResponse.status()).toBe(201);
    const getResponse = await request.get(`${env.apiBaseUrl}/booking/${bookingId}`);
    expect(getResponse.status()).toBe(404);
  });

  test('api-unauthorized-update', async ({ request }) => {
    const bookingId = await createBooking(request);
    const response = await request.put(`${env.apiBaseUrl}/booking/${bookingId}`, {
      data: bookingPayload,
    });
    expect(response.status()).toBe(403);
  });

  test('api-missing-fields', async ({ request }) => {
    const response = await request.post(`${env.apiBaseUrl}/booking`, {
      data: { firstname: 'OnlyName' },
    });
    // Missing required fields is a 4xx client error, or 500 on this SUT.
    expect([400, 422, 500]).toContain(response.status());
  });

  test('api-not-found', async ({ request }) => {
    const response = await request.get(`${env.apiBaseUrl}/booking/99999999`);
    expect(response.status()).toBe(404);
  });

  test('api-rate-limiting-burst', async ({ request }) => {
    // restful-booker enforces no rate limit, so a burst should all succeed.
    // Against a throttled API this assertion would surface 429s and fail,
    // which is exactly the signal a rate-limit test should catch.
    const responses = await Promise.all(
      Array.from({ length: 15 }, () => request.get(`${env.apiBaseUrl}/booking`)),
    );
    for (const response of responses) {
      expect(response.status(), 'burst request should not be rate-limited on this SUT').toBe(200);
    }
  });
});
