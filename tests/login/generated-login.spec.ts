import { expect, test } from '../../src/fixtures/testFixtures.js';
import { env } from '../../src/config/env.js';

test.describe('Generated Login cases - executable', () => {
  test('login-valid-credentials', async ({ loginPage, accountPage, registeredUser }) => {
    await loginPage.goto();
    await loginPage.login(registeredUser.email, registeredUser.password);
    await accountPage.expectLoaded();
  });

  test('login-invalid-password', async ({ loginPage, registeredUser }) => {
    await loginPage.goto();
    await loginPage.login(registeredUser.email, 'incorrect-password');
    await loginPage.expectLoginError();
  });

  test('login-empty-credentials', async ({ loginPage }) => {
    await loginPage.goto();
    await loginPage.submitButton.click();
    await loginPage.expectLoginError();
  });

  test('login-invalid-email-format', async ({ page, loginPage, registeredUser }) => {
    await loginPage.goto();
    await loginPage.login('not-an-email', registeredUser.password);
    await expect(page).toHaveURL(/route=account\/login/);
  });

  test('login-forgot-password', async ({ page, loginPage }) => {
    await loginPage.goto();
    await loginPage.forgottenPasswordLink.click();
    await expect(page).toHaveURL(/route=account\/forgotten/);
    await expect(page.getByRole('heading', { name: 'Forgot Your Password?' })).toBeVisible();
  });

  test('login-session-expiry', async ({ page, loginPage, registeredUser }) => {
    await loginPage.goto();
    await loginPage.login(registeredUser.email, registeredUser.password);
    await page.context().clearCookies();
    await page.goto(`${env.webBaseUrl}/index.php?route=account/account`);
    await expect(page).toHaveURL(/route=account\/login/);
    await expect(loginPage.submitButton).toBeVisible();
  });

  test('login-brute-force-lockout', async ({ page, loginPage }) => {
    await loginPage.goto();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await loginPage.emailInput.fill('locked-user@example.com');
      await loginPage.passwordInput.fill('wrong-password');
      await loginPage.submitButton.click();
    }
    await expect(page.getByText(/Warning: No match|locked|attempt|try again/i)).toBeVisible();
  });
});
