import { expect, test } from '@playwright/test';
import { classifyApiFailure } from '../../src/framework/failure-analysis/apiClassifier.js';

test.describe('deterministic API failure classification', () => {
  test('5xx is a product-bug', () => {
    expect(classifyApiFailure(500)?.category).toBe('product-bug');
    expect(classifyApiFailure(503)?.category).toBe('product-bug');
    expect(classifyApiFailure(500)?.deterministic).toBe(true);
  });

  test('429 and auth errors are environment', () => {
    expect(classifyApiFailure(429)?.category).toBe('environment');
    expect(classifyApiFailure(401)?.category).toBe('environment');
    expect(classifyApiFailure(403)?.category).toBe('environment');
  });

  test('4xx client errors are test-bug / contract drift', () => {
    expect(classifyApiFailure(400)?.category).toBe('test-bug');
    expect(classifyApiFailure(422)?.category).toBe('test-bug');
  });

  test('ambiguous statuses escalate to the LLM (null)', () => {
    expect(classifyApiFailure(200)).toBeNull(); // e.g. "expected 500, got 200"
    expect(classifyApiFailure(404)).toBeNull(); // could be ordering
  });
});
