import { expect, type Locator, type Page } from '@playwright/test';
import { env } from '../config/env.js';

export interface TestUser {
  firstName: string;
  lastName: string;
  email: string;
  telephone: string;
  password: string;
}

export class RegisterPage {
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly emailInput: Locator;
  readonly telephoneInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmInput: Locator;
  readonly agreeLabel: Locator;
  readonly continueButton: Locator;

  constructor(private readonly page: Page) {
    this.firstNameInput = page.locator('#input-firstname');
    this.lastNameInput = page.locator('#input-lastname');
    this.emailInput = page.locator('#input-email');
    this.telephoneInput = page.locator('#input-telephone');
    this.passwordInput = page.locator('#input-password');
    this.confirmInput = page.locator('#input-confirm');
    this.agreeLabel = page.locator('label[for="input-agree"]');
    this.continueButton = page.locator('form[action*="account/register"] input[type="submit"][value="Continue"]');
  }

  async goto(): Promise<void> {
    await this.page.goto(`${env.webBaseUrl}/index.php?route=account/register`);
  }

  async register(user: TestUser): Promise<void> {
    await this.firstNameInput.fill(user.firstName);
    await this.lastNameInput.fill(user.lastName);
    await this.emailInput.fill(user.email);
    await this.telephoneInput.fill(user.telephone);
    await this.passwordInput.fill(user.password);
    await this.confirmInput.fill(user.password);
    await this.agreeLabel.click();
    await this.continueButton.click();
  }

  async expectSuccess(): Promise<void> {
    await expect(this.page).toHaveURL(/route=account\/success/);
  }
}
