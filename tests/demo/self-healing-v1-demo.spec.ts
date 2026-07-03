import { expect, test } from '@playwright/test';
import { NaiveSelfHealingLocator } from '../../src/agents/self-healing/NaiveSelfHealingLocator.js';

test.describe('self-healing v1 - naive xAI locator repair', () => {
  test('repairs a deliberately wrong login button locator using DOM context', async ({ page }, testInfo) => {
    await page.goto('/demo/login.html');

    await page.fill('#input-email', 'candidate@testmu.ai');
    await page.fill('#input-password', 'correct-horse-battery-staple');

    const healer = new NaiveSelfHealingLocator(page);
    const loginButton = await healer.locate(
      '#submit-login-button-does-not-exist',
      'The primary submit button for the login form',
    );

    await loginButton.click();

    await expect(page.locator('#status')).toHaveText('Login submitted');
    await testInfo.attach('self-healing-v1', {
      body: JSON.stringify(healer.heals.at(-1), null, 2),
      contentType: 'application/json',
    });
  });
});
