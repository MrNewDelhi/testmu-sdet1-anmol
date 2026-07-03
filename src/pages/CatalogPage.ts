import { expect, type Locator, type Page } from '@playwright/test';
import { env } from '../config/env.js';

/**
 * Product catalog / listing page of the LambdaTest eCommerce Playground.
 *
 * The OpenCart "My Account" page has no data grid, filters, or sortable
 * widgets, so the assignment's Dashboard scenarios "data accuracy" and
 * "filter/sort behavior" are exercised against the store's real data surface:
 * a category listing with a Sort-By control, per-product prices, and a
 * "Showing X to Y of Z" results banner.
 */
export class CatalogPage {
  /** Default category = Desktops (path=20), a stable listing of 75 products. */
  private readonly path: number;
  readonly sortSelect: Locator;
  readonly productCards: Locator;
  readonly resultsBanner: Locator;

  constructor(private readonly page: Page, path = 20) {
    this.path = path;
    // Sort <select> ids are generated dynamically, so anchor on the stable
    // .content-sort-by toolbar container instead of the id.
    this.sortSelect = page.locator('.content-sort-by select.custom-select').first();
    this.productCards = page.locator('.product-layout');
    this.resultsBanner = page.getByText(/Showing \d+ to \d+ of \d+/).first();
  }

  async goto(): Promise<void> {
    await this.page.goto(`${env.webBaseUrl}/index.php?route=product/category&path=${this.path}`);
    await expect(this.resultsBanner).toBeVisible();
  }

  /** Selecting an option triggers `location = this.value`, i.e. a full navigation. */
  async sortBy(label: string): Promise<void> {
    await Promise.all([
      this.page.waitForLoadState('load'),
      this.sortSelect.selectOption({ label }),
    ]);
    await expect(this.resultsBanner).toBeVisible();
  }

  /** Numeric prices in listing order, using the displayed (`.price-new`) value. */
  async visiblePrices(): Promise<number[]> {
    const texts = await this.productCards.locator('.price-new').allInnerTexts();
    return texts.map((t) => Number(t.replace(/[^0-9.]/g, '')));
  }

  async visibleProductCount(): Promise<number> {
    return this.productCards.count();
  }

  /** Parses the "Showing {from} to {to} of {total}" results banner. */
  async resultsSummary(): Promise<{ from: number; to: number; total: number }> {
    const text = (await this.resultsBanner.innerText()).trim();
    const match = text.match(/Showing (\d+) to (\d+) of (\d+)/);
    if (!match) {
      throw new Error(`Results banner text did not match expected format: "${text}"`);
    }
    return { from: Number(match[1]), to: Number(match[2]), total: Number(match[3]) };
  }
}
