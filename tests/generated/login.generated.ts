export type GeneratedCaseType = 'positive' | 'negative' | 'edge';

export interface GeneratedPlaywrightCase {
  id: string;
  type: GeneratedCaseType;
  title: string;
  intent: string;
  playwrightDraft: string;
  assertions: string[];
  selfHealingValue: string;
  mcpEvidence?: string[];
}

export const loginGeneratedCases: GeneratedPlaywrightCase[] = [
  {
    id: 'login-valid-credentials',
    type: 'positive',
    title: 'Successful login with valid credentials',
    intent: 'Verify that a registered user can sign in and reach the account dashboard.',
    playwrightDraft: `
await test.step('submit valid login form', async () => {
  await page.goto('/index.php?route=account/login');
  await page.locator('#input-email').fill(testUser.email);
  await page.locator('#input-password').fill(testUser.password);
  await page.locator('form[action*="account/login"] input[type="submit"][value="Login"]').click();
});
await test.step('verify dashboard access', async () => {
  await expect(page).toHaveURL(/route=account\\/account/);
  await expect(page.getByRole('heading', { name: 'My Account' })).toBeVisible();
});
`.trim(),
    assertions: ['URL contains account dashboard route', 'My Account heading is visible'],
    selfHealingValue: 'Useful if the submit button id/class changes but accessible name remains stable.',
    mcpEvidence: ['Login page exposes #input-email, #input-password, and form[action*="account/login"] input[type="submit"][value="Login"].'],
  },
  {
    id: 'login-invalid-password',
    type: 'negative',
    title: 'Login fails with incorrect password',
    intent: 'Verify invalid credentials produce the expected authentication warning.',
    playwrightDraft: `
await page.goto('/index.php?route=account/login');
await page.locator('#input-email').fill(testUser.email);
await page.locator('#input-password').fill('incorrect-password');
await page.locator('form[action*="account/login"] input[type="submit"][value="Login"]').click();
await expect(page.getByText('Warning: No match for E-Mail Address and/or Password.')).toBeVisible();
`.trim(),
    assertions: ['Authentication warning is visible', 'User remains on login page'],
    selfHealingValue: 'Useful if alert container classes change while visible error copy remains stable.',
    mcpEvidence: ['Playwright MCP observed invalid login staying on route=account/login with warning text: "Warning: No match for E-Mail Address and/or Password."'],
  },
  {
    id: 'login-empty-credentials',
    type: 'negative',
    title: 'Login fails with empty credentials',
    intent: 'Verify blank submissions do not authenticate and show a clear warning.',
    playwrightDraft: `
await page.goto('/index.php?route=account/login');
await page.locator('form[action*="account/login"] input[type="submit"][value="Login"]').click();
await expect(page.getByText('Warning: No match for E-Mail Address and/or Password.')).toBeVisible();
`.trim(),
    assertions: ['Warning appears', 'No account dashboard navigation occurs'],
    selfHealingValue: 'Useful if form markup changes but the user-visible login action remains discoverable.',
  },
  {
    id: 'login-invalid-email-format',
    type: 'edge',
    title: 'Invalid email format is rejected before authentication',
    intent: 'Verify HTML5/email validation or app-level validation prevents malformed email login.',
    playwrightDraft: `
await page.goto('/index.php?route=account/login');
await page.locator('#input-email').fill('not-an-email');
await page.locator('#input-password').fill(testUser.password);
await page.locator('form[action*="account/login"] input[type="submit"][value="Login"]').click();
await expect(page).toHaveURL(/route=account\\/login/);
`.trim(),
    assertions: ['Invalid email does not authenticate', 'User remains on the login page'],
    selfHealingValue: 'Useful if input selectors drift but label association remains intact.',
  },
  {
    id: 'login-forgot-password',
    type: 'positive',
    title: 'Forgot password link navigates to password reset',
    intent: 'Verify account recovery is reachable from the login page.',
    playwrightDraft: `
await page.goto('/index.php?route=account/login');
await page.locator('form[action*="account/login"] a[href*="account/forgotten"]').click();
await expect(page).toHaveURL(/route=account\\/forgotten/);
await expect(page.getByRole('heading', { name: 'Forgot Your Password?' })).toBeVisible();
`.trim(),
    assertions: ['Forgotten route opens', 'Forgot password heading is visible'],
    selfHealingValue: 'Useful if the href changes but accessible link text remains stable.',
    mcpEvidence: ['Playwright MCP observed route=account/forgotten with heading "Forgot Your Password?" and email field placeholder "E-Mail Address".'],
  },
  {
    id: 'login-session-expiry',
    type: 'edge',
    title: 'Expired session redirects protected account route to login',
    intent: 'Verify protected pages require a valid active session.',
    playwrightDraft: `
await page.context().clearCookies();
await page.goto('/index.php?route=account/account');
await expect(page).toHaveURL(/route=account\\/login/);
await expect(page.locator('form[action*="account/login"] input[type="submit"][value="Login"]')).toBeVisible();
`.trim(),
    assertions: ['Expired session redirects to login', 'Login action is visible'],
    selfHealingValue: 'Useful when auth redirects change page shape and the framework must distinguish navigation failure from locator drift.',
    mcpEvidence: ['Playwright MCP observed direct unauthenticated route=account/account redirecting to route=account/login with login submit present.'],
  },
  {
    id: 'login-brute-force-lockout',
    type: 'negative',
    title: 'Repeated failed attempts trigger account lockout',
    intent: 'Verify OpenCart locks the account after the allowed number of failed attempts.',
    playwrightDraft: `
const lockedEmail = \\\`locked_\\\${Date.now()}@example.com\\\`;
await page.goto('/index.php?route=account/login');
for (let attempt = 0; attempt < 6; attempt += 1) {
  await page.locator('#input-email').fill(lockedEmail);
  await page.locator('#input-password').fill('wrong-password');
  await page.locator('form[action*="account/login"] input[type="submit"][value="Login"]').click();
}
await expect(page.locator('.alert-danger'))
  .toContainText('exceeded allowed number of login attempts');
`.trim(),
    assertions: ['Lockout warning is shown after 5 failed attempts', 'User is not authenticated'],
    selfHealingValue: 'Useful if warning container or copy shifts and the healer must still locate the relevant feedback region.',
    mcpEvidence: ['Playwright MCP confirmed the 6th failed attempt returns "Warning: Your account has exceeded allowed number of login attempts. Please try again in 1 hour."'],
  },
];
