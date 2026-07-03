import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { XaiClient } from '../../src/ai/XaiClient.js';
import { SelfHealingService } from '../../src/framework/self-healing/SelfHealingService.js';
import { LocatorCache } from '../../src/framework/self-healing/LocatorCache.js';

const BROKEN = '#submit-login-button-does-not-exist';
const INTENT = 'The primary submit button for the login form';

/** xAI stub that must never be called in these cache-fallback flows. */
function countingXai(): { xai: XaiClient; calls: { n: number } } {
  const calls = { n: 0 };
  const xai = {
    repairSelector: async () => {
      calls.n += 1;
      return { selector: '#actual-login-submit', confidence: 0.95, reason: 'counted' };
    },
  } as XaiClient;
  return { xai, calls };
}

test.describe('self-healing v6 - multi-locator resilient cache', () => {
  let dbPath: string;
  let cache: LocatorCache;

  test.beforeEach(async ({ page }) => {
    dbPath = join(tmpdir(), `v6-cache-${Date.now()}-${Math.random().toString(36).slice(2)}.sqlite`);
    cache = new LocatorCache(dbPath);
    await page.goto('/demo/login-ambiguous.html');
    await page.fill('#input-email', 'candidate@testmu.ai');
    await page.fill('#input-password', 'correct-horse-battery-staple');
  });

  test.afterEach(() => {
    cache.close();
    rmSync(dbPath, { force: true });
  });

  test('stores several attribute-diverse locators for the target', async ({ page }) => {
    const { xai } = countingXai();
    const healing = new SelfHealingService(page, xai, cache);

    await healing.locator(BROKEN, INTENT);

    const row = cache.get(LocatorCache.pageKey(page.url()), BROKEN, INTENT)!;
    const locators = JSON.parse(row.locators) as Array<{ selector: string; strategy: string }>;
    // id + data-testid + form+type are all present, so no single attribute is a
    // single point of failure.
    expect(locators.map((l) => l.strategy)).toEqual(
      expect.arrayContaining(['id', 'data-testid', 'form+type']),
    );
  });

  test('heals from a fallback locator when the primary attribute changes', async ({ page }) => {
    const { xai, calls } = countingXai();
    const healing = new SelfHealingService(page, xai, cache);

    // Warm the cache (deterministic, no xAI): stores #id, [data-testid], form+type.
    await healing.locator(BROKEN, INTENT);
    expect(calls.n).toBe(0);

    // Simulate drift: the id is renamed, so the primary #actual-login-submit
    // no longer resolves — but the data-testid locator still does.
    await page.evaluate(() => {
      document.querySelector('#actual-login-submit')?.setAttribute('id', 'renamed-submit');
    });

    const button = await healing.locator(BROKEN, INTENT);
    await button.click();

    await expect(page.locator('#status')).toHaveText('Login submitted');
    expect(calls.n, 'fallback locator should heal without any xAI call').toBe(0);

    const last = healing.events.at(-1)!;
    expect(last.source).toBe('cache');
    expect(last.version).toBe('v6-multi-locator');
    expect(last.locatorStrategy).toBe('data-testid');
  });
});
