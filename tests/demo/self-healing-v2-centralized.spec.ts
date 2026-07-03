import { expect, test } from '../../src/fixtures/healingFixtures.js';

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
});
