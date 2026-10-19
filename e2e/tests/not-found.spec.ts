import { expect, test } from '@playwright/test';

test('shows a message for a product that does not exist', async ({ page }) => {
  await page.goto('/product/999999');

  await expect(
    page.getByRole('heading', { level: 1, name: 'Product not found' }),
  ).toBeVisible();
});

test('shows the not-found page for an unknown address', async ({ page }) => {
  await page.goto('/this-page-does-not-exist');

  await expect(
    page.getByRole('heading', { level: 1, name: 'Page not found' }),
  ).toBeVisible();
  // Exact: the logo link "Product Explorer, go to products" also matches.
  await expect(
    page.getByRole('link', { name: 'Go to products', exact: true }),
  ).toBeVisible();
});
