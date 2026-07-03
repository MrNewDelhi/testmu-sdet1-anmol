import { expect, test } from '@playwright/test';
import { redactDeterministic } from '../../src/framework/privacy/redact.js';
import { FailureExplainer } from '../../src/framework/failure-analysis/FailureExplainer.js';
import type { XaiClient, FailureAnalysisRequest } from '../../src/ai/XaiClient.js';

test.describe('deterministic PII redaction', () => {
  test('redacts emails', () => {
    const { text, hits } = redactDeterministic('login failed for jane.doe@example.com today');
    expect(text).not.toContain('jane.doe@example.com');
    expect(text).toContain('[REDACTED_EMAIL]');
    expect(hits.email).toBe(1);
  });

  test('redacts JWTs, bearer tokens and API keys', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.abcDEF_123';
    const out = redactDeterministic(
      `jwt ${jwt} Authorization: Bearer opaque-Token_12345 key=xai-ABCDEFGHIJKLMNOP1234`,
    );
    expect(out.text).not.toContain('eyJhbGciOiJIUzI1NiJ9');
    expect(out.text).not.toContain('opaque-Token_12345');
    expect(out.text).not.toContain('xai-ABCDEFGHIJKLMNOP1234');
    expect(out.text).toContain('[REDACTED_JWT]');
    expect(out.text).toContain('[REDACTED_TOKEN]');
    expect(out.text).toContain('[REDACTED_API_KEY]');
  });

  test('redacts secret field values by field name, whatever the value shape', () => {
    // A password like "hunter2" matches no generic pattern — caught by its field.
    expect(redactDeterministic('{"password":"hunter2"}').text).toBe('{"password":"[REDACTED_SECRET]"}');
    expect(redactDeterministic('login pwd=hunter2&user=x').text).toContain('pwd=[REDACTED_SECRET]');
    expect(redactDeterministic('token: my-opaque-value').text).toContain('token: [REDACTED_SECRET]');
    expect(redactDeterministic('{"password":"hunter2"}').text).not.toContain('hunter2');
  });

  test('redacts SSNs', () => {
    expect(redactDeterministic('ssn 123-45-6789').text).toContain('[REDACTED_SSN]');
  });

  test('redacts a valid credit card but leaves an invalid number', () => {
    expect(redactDeterministic('card 4242 4242 4242 4242').text).toContain('[REDACTED_CREDIT_CARD]'); // Luhn-valid
    expect(redactDeterministic('order 1234 5678 9012 3456').text).toContain('1234 5678 9012 3456'); // Luhn-invalid
  });

  test('redacts public IPs but keeps loopback/private', () => {
    expect(redactDeterministic('from 203.0.113.7').text).toContain('[REDACTED_IP]');
    expect(redactDeterministic('server 127.0.0.1:9323').text).toContain('127.0.0.1');
    expect(redactDeterministic('lan 192.168.1.10').text).toContain('192.168.1.10');
  });
});

test('FailureExplainer redacts PII before sending to xAI', async () => {
  let sent: FailureAnalysisRequest | undefined;
  const fakeXai = {
    explainFailure: async (input: FailureAnalysisRequest) => {
      sent = input;
      return { summary: 's', category: 'test-bug' as const, rootCause: 'r', suggestedFix: 'f' };
    },
  } as unknown as XaiClient;

  await new FailureExplainer(fakeXai).explain({
    title: 'Login',
    error: 'expected dashboard for user@example.com with key xai-ABCDEFGHIJKLMNOP1234',
    url: 'https://app.test/login?email=user@example.com',
    domSnapshot: 'input#email value="user@example.com"',
  });

  expect(sent).toBeDefined();
  const blob = JSON.stringify(sent);
  expect(blob).not.toContain('user@example.com');
  expect(blob).not.toContain('xai-ABCDEFGHIJKLMNOP1234');
  expect(blob).toContain('[REDACTED_EMAIL]');
});
