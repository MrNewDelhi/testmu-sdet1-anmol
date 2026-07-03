import { expect, test } from '../../src/fixtures/testFixtures.js';
import { env } from '../../src/config/env.js';

test.describe('Generated Dashboard cases - executable', () => {
  test.beforeEach(async ({ loginPage, accountPage, registeredUser }) => {
    await loginPage.goto();
    await loginPage.login(registeredUser.email, registeredUser.password);
    await accountPage.expectLoaded();
  });

  test('dashboard-widgets-load', async ({ accountPage }) => {
    await expect(accountPage.heading).toBeVisible();
    await expect(accountPage.editAccountTile).toBeVisible();
    await expect(accountPage.changePasswordTile).toBeVisible();
  });

  test('dashboard-sidebar-links', async ({ accountPage }) => {
    await expect(accountPage.editAccountLink).toBeVisible();
    await expect(accountPage.passwordLink).toBeVisible();
    await expect(accountPage.addressBookLink).toBeVisible();
    await expect(accountPage.logoutLink).toBeEnabled();
  });

  test('dashboard-edit-account-navigation', async ({ page, accountPage }) => {
    await accountPage.editAccountLink.click();
    await expect(page).toHaveURL(/route=account\/edit/);
    await expect(page.locator('#input-firstname')).toBeVisible();
  });

  test('dashboard-guest-redirect', async ({ page, loginPage }) => {
    await page.context().clearCookies();
    await page.goto(`${env.webBaseUrl}/index.php?route=account/account`);
    await expect(page).toHaveURL(/route=account\/login/);
    await expect(loginPage.submitButton).toBeVisible();
  });

  test('dashboard-logout-clears-session', async ({ page, accountPage }) => {
    await accountPage.logout();
    await expect(page).toHaveURL(/route=account\/logout/);
    await accountPage.goto();
    await expect(page).toHaveURL(/route=account\/login/);
  });

  test('dashboard-responsive-layout', async ({ page, accountPage }) => {
    await page.setViewportSize({ width: 390, height: 780 });
    await accountPage.goto();
    await expect(accountPage.heading).toBeVisible();
    await expect(accountPage.changePasswordTile).toBeVisible();
    await expect(accountPage.logoutLink).toBeVisible();
  });

  test('dashboard-navigation-order', async ({ page, accountPage }) => {
    const before = await accountPage.sidebar.getByRole('link').allTextContents();
    await page.reload();
    const after = await accountPage.sidebar.getByRole('link').allTextContents();
    expect(after).toEqual(before);
  });
});
