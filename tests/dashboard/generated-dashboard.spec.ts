import { expect, test } from '../../src/fixtures/testFixtures.js';

test.describe('Generated Dashboard cases - account (executable)', () => {
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

  test('dashboard-edit-account-navigation', async ({ accountPage, editAccountPage }) => {
    await accountPage.openEditAccount();
    await editAccountPage.expectLoaded();
  });

  test('dashboard-guest-redirect', async ({ page, accountPage, loginPage }) => {
    await page.context().clearCookies();
    await accountPage.goto();
    await loginPage.expectOnLoginPage();
  });

  test('dashboard-logout-clears-session', async ({ page, accountPage, loginPage }) => {
    await accountPage.logout();
    await expect(page).toHaveURL(/route=account\/logout/);
    await accountPage.goto();
    await loginPage.expectOnLoginPage();
  });

  test('dashboard-responsive-layout', async ({ page, accountPage }) => {
    await page.setViewportSize({ width: 390, height: 780 });
    await accountPage.goto();
    await expect(accountPage.heading).toBeVisible();
    await expect(accountPage.changePasswordTile).toBeVisible();
    await expect(accountPage.logoutLink).toBeVisible();
  });
});

test.describe('Generated Dashboard cases - catalog data and sorting (executable)', () => {
  test('dashboard-data-accuracy', async ({ catalogPage }) => {
    await catalogPage.goto();
    const { from, to, total } = await catalogPage.resultsSummary();
    // The "Showing {from} to {to} of {total}" banner must match reality:
    // the rendered product count equals the size of the shown range.
    const rendered = await catalogPage.visibleProductCount();
    expect(rendered).toBe(to - from + 1);
    expect(total).toBeGreaterThanOrEqual(rendered);
  });

  test('dashboard-filter-sort', async ({ catalogPage }) => {
    await catalogPage.goto();
    await catalogPage.sortBy('Price (Low > High)');
    const prices = await catalogPage.visiblePrices();
    expect(prices.length).toBeGreaterThan(1);
    const ascending = [...prices].sort((a, b) => a - b);
    expect(prices).toEqual(ascending);
  });
});
