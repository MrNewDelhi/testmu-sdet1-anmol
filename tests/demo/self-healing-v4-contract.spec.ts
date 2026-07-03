import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { XaiClient } from '../../src/ai/XaiClient.js';
import { SelfHealingService } from '../../src/framework/self-healing/SelfHealingService.js';
import { LocatorCache } from '../../src/framework/self-healing/LocatorCache.js';
import { DeterministicLocator } from '../../src/framework/self-healing/DeterministicLocator.js';
import type { TargetContract } from '../../src/framework/self-healing/contract.js';

// Force the xAI path so this demo isolates the contract guardrail on the model's
// answer (the deterministic layer would otherwise resolve this correctly itself).
function noDeterministic(): DeterministicLocator {
  return { candidates: async () => [], locatorsFor: async () => [] } as unknown as DeterministicLocator;
}

const BROKEN = '#submit-login-button-does-not-exist';
const INTENT = 'The primary submit button for the login form';

// The contract that distinguishes the submit button from the header nav link:
// a submit-typed button inside the login form, not an <a> that navigates.
const SUBMIT_CONTRACT: TargetContract = {
  role: 'button',
  type: 'submit',
  withinForm: '#login-form',
  textLike: 'sign ?in|login',
};

/** A fake xAI client that returns a fixed selector, so we test OUR guardrail. */
function fakeXai(selector: string, confidence = 0.95): XaiClient {
  return {
    repairSelector: async () => ({
      selector,
      confidence,
      reason: 'fixed response for guardrail test',
    }),
  } as unknown as XaiClient;
}

test.describe('self-healing v4 - contract disambiguation', () => {
  let dbPath: string;
  let cache: LocatorCache;

  test.beforeEach(async ({ page }) => {
    dbPath = join(tmpdir(), `v4-cache-${Date.now()}-${Math.random().toString(36).slice(2)}.sqlite`);
    cache = new LocatorCache(dbPath);
    await page.goto('/demo/login-ambiguous.html');
    await page.fill('#input-email', 'candidate@testmu.ai');
    await page.fill('#input-password', 'correct-horse-battery-staple');
  });

  test.afterEach(() => {
    cache.close();
    rmSync(dbPath, { force: true });
  });

  test('refuses a confident but wrong heal (the header login link)', async ({ page }) => {
    // The model confidently returns the header nav link: a unique, stable <a>
    // that would pass existence and confidence checks but is the wrong element.
    const healing = new SelfHealingService(page, fakeXai('#nav-login'), cache, noDeterministic());

    await expect(healing.locator(BROKEN, INTENT, SUBMIT_CONTRACT)).rejects.toThrow(/contract/i);

    // Nothing was clicked or navigated: the guardrail refused before acting.
    await expect(page.locator('#status')).toHaveText('');
    expect(healing.events).toHaveLength(0);
  });

  test('accepts and validates the correct submit button', async ({ page }, testInfo) => {
    const healing = new SelfHealingService(page, fakeXai('#actual-login-submit'), cache, noDeterministic());

    const button = await healing.locator(BROKEN, INTENT, SUBMIT_CONTRACT);
    await button.click();

    await expect(page.locator('#status')).toHaveText('Login submitted');
    expect(healing.events).toHaveLength(1);
    expect(healing.events[0].contractValidated).toBe(true);
    expect(healing.events[0].version).toBe('v4-contract');

    await testInfo.attach('self-healing-v4', {
      body: JSON.stringify(healing.events.at(-1), null, 2),
      contentType: 'application/json',
    });
  });

  test('real xAI heal is steered by the contract and validated end to end', async ({ page }) => {
    // End-to-end with the real model: the enriched intent guides recall and the
    // contract guards precision. The healed element must be the form submit.
    const healing = new SelfHealingService(page, new XaiClient(), cache, noDeterministic());

    const button = await healing.locator(BROKEN, INTENT, SUBMIT_CONTRACT);
    await button.click();

    await expect(page.locator('#status')).toHaveText('Login submitted');
    expect(healing.events[0].contractValidated).toBe(true);
  });
});
