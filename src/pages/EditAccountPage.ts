import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Edit-account form reached from the My Account dashboard
 * (route=account/edit). Modeled so dashboard navigation tests do not reach
 * into raw page locators for another page's fields.
 */
export class EditAccountPage {
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;

  constructor(private readonly page: Page) {
    this.firstNameInput = page.locator('#input-firstname');
    this.lastNameInput = page.locator('#input-lastname');
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/route=account\/edit/);
    await expect(this.firstNameInput).toBeVisible();
  }
}
