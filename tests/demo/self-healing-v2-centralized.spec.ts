import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '../../src/fixtures/healingFixtures.js';
import { XaiClient } from '../../src/ai/XaiClient.js';
import { SelfHealingService } from '../../src/framework/self-healing/SelfHealingService.js';
import { LocatorCache } from '../../src/framework/self-healing/LocatorCache.js';

const BROKEN = '#submit-login-button-does-not-exist';
const INTENT = 'The primary submit button for the login form';

test.describe('self-healing v2 - centralized framework fixture', () => {
  test('repairs a broken locator through the shared healing fixture', async ({ page, healing }, testInfo) => {
    await page.goto('/demo/login.html');

    await page.fill('#input-email', 'candidate@testmu.ai');
    await page.fill('#input-password', 'correct-horse-battery-staple');

    const loginButton = await healing.locator(BROKEN, INTENT);

    await loginButton.click();

    await expect(page.locator('#status')).toHaveText('Login submitted');
    await testInfo.attach('self-healing-v2', {
      body: JSON.stringify(healing.events.at(-1), null, 2),
      contentType: 'application/json',
    });
  });

  test('reuses a healed locator from the SQLite cache without a second xAI call', async ({ page }, testInfo) => {
    await page.goto('/demo/login.html');
    await page.fill('#input-email', 'candidate@testmu.ai');
    await page.fill('#input-password', 'correct-horse-battery-staple');

    // Isolated cache file so the first call is a guaranteed cold miss.
    const dbPath = join(tmpdir(), `demo-cache-${Date.now()}.sqlite`);
    const cache = new LocatorCache(dbPath);

    // Count real xAI calls to prove the second lookup never reaches the network.
    const realXai = new XaiClient();
    let xaiCalls = 0;
    const countingXai = {
      repairSelector: async (input: Parameters<XaiClient['repairSelector']>[0]) => {
        xaiCalls += 1;
        return realXai.repairSelector(input);
      },
    } as XaiClient;

    const healing = new SelfHealingService(page, countingXai, cache);

    // First call: cold cache -> heal via xAI and persist the result.
    await healing.locator(BROKEN, INTENT);
    // Second call: same break -> served from the SQLite cache.
    const cached = await healing.locator(BROKEN, INTENT);
    await cached.click();

    await expect(page.locator('#status')).toHaveText('Login submitted');

    expect(xaiCalls, 'xAI should be called exactly once across both lookups').toBe(1);
    expect(healing.events[0].source).toBe('xai');
    expect(healing.events[1].source).toBe('cache');
    expect(healing.events[1].computedConfidence).toBeGreaterThanOrEqual(0.5);

    const row = cache.get(LocatorCache.pageKey(page.url()), BROKEN, INTENT);
    expect(row?.hit_count).toBe(1);

    await testInfo.attach('self-healing-cache', {
      body: JSON.stringify(healing.events, null, 2),
      contentType: 'application/json',
    });

    cache.close();
    rmSync(dbPath, { force: true });
  });
});
