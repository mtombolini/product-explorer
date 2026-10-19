import { expect, test } from '@playwright/test';

import {
  cardTitles,
  isProductList,
  productGrid,
  recordProductRequests,
} from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/products');
  // The count is only shown once the first page has arrived.
  await expect(page.getByRole('status')).toHaveText(/^\d+ products?$/);
});

test('loads the list with a result count', async ({ page }) => {
  await expect(
    page.getByRole('heading', { level: 1, name: 'Products' }),
  ).toBeVisible();
  await expect(cardTitles(page).first()).toBeVisible();
});

test('searches once, after the user stops typing', async ({ page }) => {
  const requests = recordProductRequests(page);

  // Key by key and faster than the 300 ms pause, like a person typing.
  await page
    .getByRole('textbox', { name: 'Search products' })
    .pressSequentially('shirt', { delay: 50 });

  await expect(page).toHaveURL(/\/products\?search=shirt$/);
  await expect(page.getByRole('status')).toHaveText(
    /^\d+ products? for "shirt"$/,
  );
  // Longer than the pause: a late request for "s", "sh"... would show up.
  await page.waitForTimeout(500);
  const searches = requests.filter((url) => url.searchParams.has('search'));
  expect(searches.map((url) => url.searchParams.get('search'))).toEqual([
    'shirt',
  ]);
});

test('filters by category', async ({ page }) => {
  await page.getByRole('button', { name: 'Jewelery', exact: true }).click();

  await expect(page).toHaveURL(/\/products\?category=jewelery$/);
  await expect(page.getByRole('status')).toHaveText(
    /^\d+ products? in Jewelery$/,
  );
  await expect(
    page.getByRole('button', { name: 'Jewelery', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  // Every card shown belongs to the category.
  const cards = productGrid(page).getByRole('listitem');
  await expect(cards.first()).toBeVisible();
  await expect(cards.filter({ hasNotText: 'Jewelery' })).toHaveCount(0);
});

test('sorts by price, low to high', async ({ page }) => {
  const sorted = page.waitForResponse(
    (response) =>
      isProductList(response) &&
      new URL(response.url()).searchParams.get('sort') === 'price_asc',
  );

  await page.getByRole('combobox', { name: /^Sort by/ }).click();
  await page.getByRole('option', { name: 'Price: low to high' }).click();

  await expect(page).toHaveURL(/\/products\?sort=price_asc$/);
  // The API answer is in price order, and the grid shows it in that order.
  const { items } = (await (await sorted).json()) as {
    items: { title: string; price: number }[];
  };
  const prices = items.map((item) => item.price);
  expect(prices).toEqual([...prices].sort((a, b) => a - b));
  await expect(cardTitles(page)).toHaveText(items.map((item) => item.title));
});

test('goes to the second page', async ({ page }) => {
  await page.getByRole('link', { name: 'Go to page 2', exact: true }).click();

  await expect(page).toHaveURL(/\/products\?page=2$/);
  await expect(
    page.getByRole('link', { name: 'page 2', exact: true }),
  ).toHaveAttribute('aria-current', 'page');
  await expect(cardTitles(page).first()).toBeVisible();
});
