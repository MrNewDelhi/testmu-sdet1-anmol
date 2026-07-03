import type { GeneratedPlaywrightCase } from './login.generated.js';

export const dashboardGeneratedCases: GeneratedPlaywrightCase[] = [
  {
    id: 'dashboard-widgets-load',
    type: 'positive',
    title: 'Dashboard account widgets load after login',
    intent: 'Verify the My Account dashboard renders expected account action areas.',
    playwrightDraft: `
await accountPage.goto('/index.php?route=account/account');
await expect(page.getByRole('heading', { name: 'My Account' })).toBeVisible();
await expect(page.getByRole('link', { name: 'Edit your account information' })).toBeVisible();
await expect(page.getByRole('link', { name: 'Change your password' })).toBeVisible();
`.trim(),
    assertions: ['Dashboard heading is visible', 'Primary account action links render'],
    selfHealingValue: 'Useful if dashboard tiles change wrapper markup but accessible link names remain stable.',
  },
  {
    id: 'dashboard-sidebar-links',
    type: 'positive',
    title: 'Sidebar account links are visible and enabled',
    intent: 'Verify the authenticated account navigation exposes expected destinations.',
    playwrightDraft: `
const accountNav = page.locator('#column-right');
await expect(accountNav.getByRole('link', { name: 'Edit Account' })).toBeVisible();
await expect(accountNav.getByRole('link', { name: 'Password' })).toBeVisible();
await expect(accountNav.getByRole('link', { name: 'Address Book' })).toBeVisible();
await expect(accountNav.getByRole('link', { name: 'Logout' })).toBeEnabled();
`.trim(),
    assertions: ['Core account navigation links are visible', 'Logout link is enabled'],
    selfHealingValue: 'Useful if navigation list classes drift but role/link names remain usable.',
  },
  {
    id: 'dashboard-edit-account-navigation',
    type: 'positive',
    title: 'Edit Account link navigates to edit form',
    intent: 'Verify dashboard navigation opens the edit-account page.',
    playwrightDraft: `
await page.locator('#column-right').getByRole('link', { name: 'Edit Account' }).click();
await expect(page).toHaveURL(/route=account\\/edit/);
await expect(page.getByLabel('First Name')).toBeVisible();
`.trim(),
    assertions: ['Edit account route opens', 'Edit form fields are visible'],
    selfHealingValue: 'Useful if sidebar markup moves but the link name remains the user contract.',
  },
  {
    id: 'dashboard-guest-redirect',
    type: 'negative',
    title: 'Guest access to account dashboard redirects to login',
    intent: 'Verify permission-based visibility prevents anonymous account access.',
    playwrightDraft: `
await page.context().clearCookies();
await page.goto('/index.php?route=account/account');
await expect(page).toHaveURL(/route=account\\/login/);
await expect(page.locator('form[action*="account/login"] input[type="submit"][value="Login"]')).toBeVisible();
`.trim(),
    assertions: ['Guest is redirected', 'No account-only dashboard controls are visible'],
    selfHealingValue: 'Useful because the framework should classify this as auth/navigation state, not heal to a lookalike account widget.',
    mcpEvidence: ['Playwright MCP observed direct account-dashboard access redirecting guests back to route=account/login.'],
  },
  {
    id: 'dashboard-logout-clears-session',
    type: 'positive',
    title: 'Logout clears authenticated dashboard session',
    intent: 'Verify logout ends the account session and blocks returning to dashboard.',
    playwrightDraft: `
await page.locator('#column-right').getByRole('link', { name: 'Logout' }).click();
await expect(page).toHaveURL(/route=account\\/logout/);
await page.goto('/index.php?route=account/account');
await expect(page).toHaveURL(/route=account\\/login/);
`.trim(),
    assertions: ['Logout route opens', 'Dashboard access redirects after logout'],
    selfHealingValue: 'Useful if logout link placement changes across responsive layouts.',
  },
  {
    id: 'dashboard-responsive-layout',
    type: 'edge',
    title: 'Dashboard remains usable on mobile viewport',
    intent: 'Verify account navigation and primary dashboard links remain visible on mobile.',
    playwrightDraft: `
await page.setViewportSize({ width: 390, height: 780 });
await page.goto('/index.php?route=account/account');
await expect(page.getByRole('heading', { name: 'My Account' })).toBeVisible();
await expect(page.getByRole('link', { name: 'Change your password' })).toBeVisible();
await expect(page.locator('#column-right').getByRole('link', { name: 'Logout' })).toBeVisible();
`.trim(),
    assertions: ['Dashboard heading remains visible', 'Important account actions remain usable'],
    selfHealingValue: 'Useful when responsive DOM ordering changes and selectors need semantic recovery.',
  },
  {
    id: 'dashboard-navigation-order',
    type: 'edge',
    title: 'Account navigation order stays predictable after refresh',
    intent: 'Verify account navigation order does not unexpectedly shuffle.',
    playwrightDraft: `
const nav = page.locator('#column-right');
const before = await nav.getByRole('link').allTextContents();
await page.reload();
const after = await nav.getByRole('link').allTextContents();
expect(after).toEqual(before);
`.trim(),
    assertions: ['Navigation labels remain in the same order after reload'],
    selfHealingValue: 'Useful if list wrappers change and order-sensitive selectors become brittle.',
  },
];
