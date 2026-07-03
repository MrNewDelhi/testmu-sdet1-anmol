import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { XaiClient } from '../../src/ai/XaiClient.js';
import { SelfHealingService } from '../../src/framework/self-healing/SelfHealingService.js';
import { LocatorCache } from '../../src/framework/self-healing/LocatorCache.js';
import { DeterministicLocator } from '../../src/framework/self-healing/DeterministicLocator.js';

const BROKEN = '#submit-login-button-does-not-exist';
const INTENT = 'The primary submit button for the login form';

// Isolate the xAI path: v3 is about the confidence gate and the cache, not the
// deterministic shortcut (that is v5).
function noDeterministic(): DeterministicLocator {
  return { candidates: async () => [], locatorsFor: async () => [] } as unknown as DeterministicLocator;
}

function fixedXai(selector: string, confidence = 0.95): { xai: XaiClient; calls: { n: number } } {
  const calls = { n: 0 };
  const xai = {
    repairSelector: async () => {
      calls.n += 1;
      return { selector, confidence, reason: 'fixed response' };
    },
  } as unknown as XaiClient;
  return { xai, calls };
}

test.describe('self-healing v3 - confidence gate and cache', () => {
  let dbPath: string;
  let cache: LocatorCache;

  test.beforeEach(async ({ page }) => {
    dbPath = join(tmpdir(), `v3-cache-${Date.now()}-${Math.random().toString(36).slice(2)}.sqlite`);
    cache = new LocatorCache(dbPath);
    await page.goto('/demo/login-ambiguous.html');
    await page.fill('#input-email', 'candidate@testmu.ai');
    await page.fill('#input-password', 'correct-horse-battery-staple');
  });

  test.afterEach(() => {
    cache.close();
    rmSync(dbPath, { force: true });
  });

  test('refuses an ambiguous repair on low computed confidence', async ({ page }) => {
    // 'nav a' matches two links: high model confidence but low uniqueness, so
    // the computed score falls below the threshold and the heal is refused.
    const { xai } = fixedXai('nav a', 0.95);
    const healing = new SelfHealingService(page, xai, cache, noDeterministic());

    await expect(healing.locator(BROKEN, INTENT)).rejects.toThrow(/confidence/i);
    await expect(page.locator('#status')).toHaveText('');
  });

  test('caches the repair so a repeat break skips the second xAI call', async ({ page }, testInfo) => {
    const { xai, calls } = fixedXai('#actual-login-submit');
    const healing = new SelfHealingService(page, xai, cache, noDeterministic());

    await healing.locator(BROKEN, INTENT);        // cold: heals via xAI, caches
    const cached = await healing.locator(BROKEN, INTENT); // warm: served from cache
    await cached.click();

    await expect(page.locator('#status')).toHaveText('Login submitted');
    expect(calls.n, 'xAI should be called exactly once across both lookups').toBe(1);
    expect(healing.events[0].source).toBe('xai');
    expect(healing.events[1].source).toBe('cache');

    const row = cache.get(LocatorCache.pageKey(page.url()), BROKEN, INTENT);
    expect(row?.hit_count).toBe(1);

    await testInfo.attach('self-healing-v3', {
      body: JSON.stringify(healing.events, null, 2),
      contentType: 'application/json',
    });
  });
});
