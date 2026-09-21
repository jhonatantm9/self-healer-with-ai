import { expect, type Locator, type Page } from '@playwright/test';

export class ProductDetailsPage {
    readonly page: Page;
    readonly productTitle: Locator;
    readonly productImage: Locator;

    constructor(page: Page) {
        this.page = page;
        this.productTitle = page.getByTestId('product-nam');
        this.productImage = page.getByTestId('product-imag');
    }

    async expectProductInfoIsVisible() {
        await expect(this.productTitle).toBeVisible();
        await expect(this.productImage).toBeVisible();
    }
}