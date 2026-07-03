import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { XaiClient } from '../../src/ai/XaiClient.js';
import { SelfHealingService } from '../../src/framework/self-healing/SelfHealingService.js';
import { LocatorCache } from '../../src/framework/self-healing/LocatorCache.js';
import type { TargetContract } from '../../src/framework/self-healing/contract.js';

const BROKEN = '#submit-login-button-does-not-exist';

const SUBMIT_CONTRACT: TargetContract = {
  role: 'button',
  type: 'submit',
  withinForm: '#login-form',
  textLike: 'sign ?in|login',
};

/** A fake xAI client that counts calls, so we can assert it is never used. */
function countingXai(selector: string): { xai: XaiClient; calls: { n: number } } {
  const calls = { n: 0 };
  const xai = {
    repairSelector: async () => {
      calls.n += 1;
      return { selector, confidence: 0.95, reason: 'counted call' };
    },
  } as XaiClient;
  return { xai, calls };
}

test.describe('self-healing v5 - deterministic-first (token cost)', () => {
  let dbPath: string;
  let cache: LocatorCache;

  test.beforeEach(async ({ page }) => {
    dbPath = join(tmpdir(), `v5-cache-${Date.now()}-${Math.random().toString(36).slice(2)}.sqlite`);
    cache = new LocatorCache(dbPath);
    await page.goto('/demo/login-ambiguous.html');
    await page.fill('#input-email', 'candidate@testmu.ai');
    await page.fill('#input-password', 'correct-horse-battery-staple');
  });

  test.afterEach(() => {
    cache.close();
    rmSync(dbPath, { force: true });
  });

  test('resolves by unique keywords locally with no xAI call', async ({ page }, testInfo) => {
    // Intent keywords {submit, login} uniquely pick the submit button
    // (id "actual-login-submit"); the header link lacks "submit".
    const { xai, calls } = countingXai('#never-used');
    const healing = new SelfHealingService(page, xai, cache);

    const button = await healing.locator(BROKEN, 'The primary submit button for the login form');
    await button.click();

    await expect(page.locator('#status')).toHaveText('Login submitted');
    expect(calls.n, 'xAI must not be called when the locator resolves locally').toBe(0);
    expect(healing.events[0].source).toBe('deterministic');
    expect(healing.events[0].version).toBe('v5-deterministic');
    expect(healing.events[0].selector).toBe('#actual-login-submit');

    await testInfo.attach('self-healing-v5', {
      body: JSON.stringify(healing.events.at(-1), null, 2),
      contentType: 'application/json',
    });
  });

  test('resolves by contract locally with no xAI call', async ({ page }) => {
    const { xai, calls } = countingXai('#never-used');
    const healing = new SelfHealingService(page, xai, cache);

    const button = await healing.locator(BROKEN, 'The submit button', SUBMIT_CONTRACT);
    await button.click();

    await expect(page.locator('#status')).toHaveText('Login submitted');
    expect(calls.n).toBe(0);
    expect(healing.events[0].source).toBe('deterministic');
  });

  test('escalates to xAI when the intent is ambiguous', async ({ page }) => {
    // Keyword {login} matches both the header link and the submit button
    // (its id contains "login"), so deterministic resolution cannot decide
    // and the service falls back to the model.
    const { xai, calls } = countingXai('#actual-login-submit');
    const healing = new SelfHealingService(page, xai, cache);

    const button = await healing.locator(BROKEN, 'The login');
    await button.click();

    await expect(page.locator('#status')).toHaveText('Login submitted');
    expect(calls.n, 'ambiguous intent should escalate to xAI').toBe(1);
    expect(healing.events[0].source).toBe('xai');
  });
});
