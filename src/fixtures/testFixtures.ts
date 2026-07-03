import { test as base, expect } from '@playwright/test';
import { env } from '../config/env.js';
import { AccountPage } from '../pages/AccountPage.js';
import { CatalogPage } from '../pages/CatalogPage.js';
import { EditAccountPage } from '../pages/EditAccountPage.js';
import { LoginPage } from '../pages/LoginPage.js';
import { RegisterPage, type TestUser } from '../pages/RegisterPage.js';
import { makeUser } from '../utils/userFactory.js';

type AppFixtures = {
  accountPage: AccountPage;
  catalogPage: CatalogPage;
  editAccountPage: EditAccountPage;
  loginPage: LoginPage;
  registerPage: RegisterPage;
  registeredUser: TestUser;
};

export const test = base.extend<AppFixtures>({
  accountPage: async ({ page }, use) => {
    await use(new AccountPage(page));
  },
  catalogPage: async ({ page }, use) => {
    await use(new CatalogPage(page));
  },
  editAccountPage: async ({ page }, use) => {
    await use(new EditAccountPage(page));
  },
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  registerPage: async ({ page }, use) => {
    await use(new RegisterPage(page));
  },
  registeredUser: async ({ page }, use) => {
    const user = makeUser();
    const registerPage = new RegisterPage(page);
    await registerPage.goto();
    await registerPage.register(user);
    await registerPage.expectSuccess();
    await page.goto(`${env.webBaseUrl}/index.php?route=account/logout`);
    await use(user);
  },
});

export { expect };
