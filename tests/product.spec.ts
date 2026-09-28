import { test, expect } from '../tests/fixtures';
import { HomePage } from '../pages/HomePage';
import { ProductDetailsPage } from '../pages/ProductDetailsPage';

test.describe('Flujo de Productos', () => {
    test('Debe redirigir al detalle del producto y mostrar su imagen y nombre', async ({ page }) => {
        const homePage = new HomePage(page);
        const productDetailsPage = new ProductDetailsPage(page);

        await homePage.goto();
        await homePage.clickFirstProduct();

        await expect(page).toHaveURL(/.*products.*/i);

        await productDetailsPage.expectProductInfoIsVisible();
    });

});