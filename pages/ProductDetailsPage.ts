import { expect, type Locator, type Page } from '@playwright/test';

export class ProductDetailsPage {
    readonly page: Page;
    readonly productTitle: Locator;
    readonly productImage: Locator;

    constructor(page: Page) {
        this.page = page;
        this.productTitle = page.getByTestId('product-name');
        this.productImage = page.getByTestId('product-image');
    }

    async expectProductInfoIsVisible() {
        await expect(this.productTitle).toBeVisible();
        await expect(this.productImage).toBeVisible();
    }
}