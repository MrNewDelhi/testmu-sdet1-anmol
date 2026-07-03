import { expect, test } from '../../src/fixtures/testFixtures.js';

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
    await loginPage.submit();
    await loginPage.expectLoginError();
  });

  test('login-invalid-email-format', async ({ loginPage, registeredUser }) => {
    await loginPage.goto();
    await loginPage.login('not-an-email', registeredUser.password);
    await loginPage.expectOnLoginPage();
  });

  test('login-forgot-password', async ({ page, loginPage }) => {
    await loginPage.goto();
    await loginPage.forgottenPasswordLink.click();
    await expect(page).toHaveURL(/route=account\/forgotten/);
    await expect(page.getByRole('heading', { name: 'Forgot Your Password?' })).toBeVisible();
  });

  test('login-session-expiry', async ({ page, loginPage, accountPage, registeredUser }) => {
    await loginPage.goto();
    await loginPage.login(registeredUser.email, registeredUser.password);
    await accountPage.expectLoaded();
    // Invalidate the authenticated session, then hit a protected route.
    await page.context().clearCookies();
    await accountPage.goto();
    await loginPage.expectOnLoginPage();
  });

  test('login-brute-force-lockout', async ({ loginPage }) => {
    // OpenCart locks an account after 5 failed attempts (the 6th is blocked
    // with a lockout warning). A unique email keeps the 1-hour lock isolated
    // from the registered-user tests.
    const lockedEmail = `locked_${Date.now()}@example.com`;
    await loginPage.goto();
    for (let attempt = 0; attempt < 6; attempt += 1) {
      await loginPage.login(lockedEmail, 'wrong-password');
    }
    await loginPage.expectLockedOut();
  });
});
