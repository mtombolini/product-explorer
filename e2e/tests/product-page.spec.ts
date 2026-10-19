import { expect, test } from '@playwright/test';

import { cardTitles, productGrid, recordProductRequests } from './helpers';

declare global {
  interface Window {
    /** window.scrollY when the user clicked, recorded by the test. */
    scrollAtClick?: number;
  }
}

test('goes back to the same place in the list without a new request', async ({
  page,
}) => {
  await page.goto('/products?sort=price_asc');
  await expect(cardTitles(page).first()).toBeVisible();

  // Scroll down the list, as a user looking for a product would.
  await page.mouse.wheel(0, 800);
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(0);

  // Playwright scrolls the card into view before clicking it, so the
  // position to restore is the one at the moment of the click.
  await page.evaluate(() => {
    document.addEventListener(
      'click',
      () => {
        window.scrollAtClick = window.scrollY;
      },
      { capture: true, once: true },
    );
  });
  const card = productGrid(page).getByRole('link').last();
  const title = (await card.getByRole('heading').textContent()) ?? '';
  await card.click();

  await expect(
    page.getByRole('heading', { level: 1, name: title.trim() }),
  ).toBeVisible();
  const scrollAtClick = await page.evaluate(() => window.scrollAtClick);
  expect(scrollAtClick).toBeGreaterThan(0);

  const requests = recordProductRequests(page);
  await page.getByRole('button', { name: 'Back to products' }).click();

  await expect(page).toHaveURL(/\/products\?sort=price_asc$/);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Products' }),
  ).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBe(scrollAtClick);
  // The list came from the store, not from the API.
  expect(requests).toEqual([]);
});
