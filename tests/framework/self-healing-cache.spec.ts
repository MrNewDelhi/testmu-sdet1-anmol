import { expect, test } from '@playwright/test';
import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CONFIDENCE_THRESHOLD, scoreConfidence } from '../../src/framework/self-healing/confidence.js';
import { LocatorCache } from '../../src/framework/self-healing/LocatorCache.js';

test.describe('confidence scoring', () => {
  test('a unique id selector scores high', () => {
    const score = scoreConfidence('#actual-login-submit', 0.95, 1);
    expect(score.uniqueness).toBe(1);
    expect(score.stability).toBe(1);
    expect(score.computedConfidence).toBe(0.95);
    expect(score.computedConfidence).toBeGreaterThanOrEqual(CONFIDENCE_THRESHOLD);
  });

  test('multiple matches cap the score low even when the model is confident', () => {
    const score = scoreConfidence('#actual-login-submit', 0.99, 7);
    expect(score.uniqueness).toBe(0.3);
    // min(0.99, 0.3) * 1.0 = 0.3 -> below threshold, would be refused.
    expect(score.computedConfidence).toBe(0.3);
    expect(score.computedConfidence).toBeLessThan(CONFIDENCE_THRESHOLD);
  });

  test('positional selectors are penalized on stability', () => {
    const score = scoreConfidence('div:nth-child(3) > button', 0.9, 1);
    expect(score.stability).toBe(0.4);
    // min(0.9, 1) * 0.4 = 0.36
    expect(score.computedConfidence).toBe(0.36);
  });

  test('model confidence is clamped and used as an upper bound', () => {
    const score = scoreConfidence('#login', 2, 1); // model out of range
    expect(score.modelConfidence).toBe(1);
    expect(score.computedConfidence).toBe(1);
  });
});

test.describe('locator cache', () => {
  let dbPath: string;
  let cache: LocatorCache;

  test.beforeEach(() => {
    dbPath = join(tmpdir(), `locator-cache-${Date.now()}-${Math.random().toString(36).slice(2)}.sqlite`);
    cache = new LocatorCache(dbPath);
  });

  test.afterEach(() => {
    cache.close();
    rmSync(dbPath, { force: true });
  });

  const base = {
    pageKey: 'route=account/login',
    brokenSelector: '#does-not-exist',
    intent: 'The primary submit button',
    healedSelector: '#actual-login-submit',
    modelConfidence: 0.95,
    computedConfidence: 0.95,
    matchCount: 1,
    reason: 'stable id',
    domHash: 'abc123',
  };

  test('upsert then get returns the stored entry', () => {
    cache.upsert(base);
    const row = cache.get(base.pageKey, base.brokenSelector, base.intent);
    expect(row?.healed_selector).toBe('#actual-login-submit');
    expect(row?.computed_confidence).toBe(0.95);
    expect(row?.source).toBe('xai');
    expect(row?.hit_count).toBe(0);
  });

  test('recordHit increments hit_count', () => {
    cache.upsert(base);
    const row = cache.get(base.pageKey, base.brokenSelector, base.intent)!;
    cache.recordHit(row.id);
    cache.recordHit(row.id);
    const after = cache.get(base.pageKey, base.brokenSelector, base.intent);
    expect(after?.hit_count).toBe(2);
  });

  test('upsert on the same key updates the healed selector in place', () => {
    cache.upsert(base);
    cache.upsert({ ...base, healedSelector: '#new-submit', domHash: 'def456' });
    const row = cache.get(base.pageKey, base.brokenSelector, base.intent);
    expect(row?.healed_selector).toBe('#new-submit');
    expect(row?.dom_hash).toBe('def456');
  });

  test('a different intent is a different cache entry', () => {
    cache.upsert(base);
    expect(cache.get(base.pageKey, base.brokenSelector, 'A different intent')).toBeUndefined();
  });

  test('pageKey normalizes OpenCart route and plain paths', () => {
    expect(LocatorCache.pageKey('https://shop.test/index.php?route=account/login&x=1'))
      .toBe('route=account/login');
    expect(LocatorCache.pageKey('http://127.0.0.1:9323/demo/login.html'))
      .toBe('/demo/login.html');
  });
});
