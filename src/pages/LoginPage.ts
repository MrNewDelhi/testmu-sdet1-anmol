import { expect, type Locator, type Page } from '@playwright/test';
import { env } from '../config/env.js';

export class LoginPage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorAlert: Locator;
  readonly forgottenPasswordLink: Locator;

  constructor(private readonly page: Page) {
    this.emailInput = page.locator('#input-email');
    this.passwordInput = page.locator('#input-password');
    this.submitButton = page.locator('form[action*="account/login"] input[type="submit"][value="Login"]');
    this.errorAlert = page.locator('.alert-danger');
    this.forgottenPasswordLink = page.locator('form[action*="account/login"] a[href*="account/forgotten"]');
  }

  async goto(): Promise<void> {
    await this.page.goto(`${env.webBaseUrl}/index.php?route=account/login`);
  }

  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async expectLoginError(): Promise<void> {
    await expect(this.errorAlert).toBeVisible();
    await expect(this.errorAlert).toContainText(/No match for E-Mail Address|exceeded allowed number of login attempts/i);
  }
}
