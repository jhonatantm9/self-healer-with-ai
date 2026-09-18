import { type Locator, type Page } from '@playwright/test';

export class HomePage {
    readonly page: Page;
    readonly firstProduct: Locator;
    readonly welcomeModal: Locator;

    constructor(page: Page) {
        this.page = page;
        this.firstProduct = page.getByTestId('product-link-1');
        this.welcomeModal = page.getByTestId('tour-modal');
    }

    async goto() {
        await this.page.goto('https://playground.qatools.dev/');
        if (await this.welcomeModal.isVisible()) {
            await this.welcomeModal.getByRole('button', { name: 'Skip tour' }).click();
        }
    }

    async clickFirstProduct() {
        await this.firstProduct.click();
    }
}