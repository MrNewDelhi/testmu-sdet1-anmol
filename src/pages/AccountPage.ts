import { expect, type Locator, type Page } from '@playwright/test';
import { env } from '../config/env.js';

export class AccountPage {
  readonly heading: Locator;
  readonly sidebar: Locator;
  readonly editAccountLink: Locator;
  readonly passwordLink: Locator;
  readonly addressBookLink: Locator;
  readonly logoutLink: Locator;
  readonly editAccountTile: Locator;
  readonly changePasswordTile: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'My Account' });
    this.sidebar = page.locator('#column-right');
    this.editAccountLink = this.sidebar.getByRole('link', { name: 'Edit Account' });
    this.passwordLink = this.sidebar.getByRole('link', { name: 'Password' });
    this.addressBookLink = this.sidebar.getByRole('link', { name: 'Address Book' });
    this.logoutLink = this.sidebar.getByRole('link', { name: 'Logout' });
    this.editAccountTile = page.getByRole('link', { name: 'Edit your account information' });
    this.changePasswordTile = page.getByRole('link', { name: 'Change your password' });
  }

  async goto(): Promise<void> {
    await this.page.goto(`${env.webBaseUrl}/index.php?route=account/account`);
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/route=account\/account/);
    await expect(this.heading).toBeVisible();
  }

  async logout(): Promise<void> {
    await this.logoutLink.click();
  }

  async openEditAccount(): Promise<void> {
    await this.editAccountLink.click();
  }
}
