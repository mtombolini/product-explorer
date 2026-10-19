import { expect, test, type Page } from '@playwright/test';

import { cardTitles, isProductList } from './helpers';

/** The product list answer for a language, as soon as it arrives. */
function productListIn(page: Page, lang: string) {
  return page.waitForResponse(
    (response) =>
      isProductList(response) &&
      new URL(response.url()).searchParams.get('lang') === lang,
  );
}

test('switches to Spanish and keeps it after a reload', async ({ page }) => {
  await page.goto('/products');
  await expect(page.getByRole('status')).toHaveText(/^\d+ products?$/);
  const englishTitles = await cardTitles(page).allTextContents();

  const spanishList = productListIn(page, 'es');
  await page.getByRole('button', { name: 'Language: English' }).click();
  await page.getByRole('menuitemradio', { name: 'Español' }).click();

  // The interface text changes...
  await expect(
    page.getByRole('heading', { level: 1, name: 'Productos' }),
  ).toBeVisible();
  await expect(page.getByRole('status')).toHaveText(/^\d+ productos?$/);
  await expect(
    page.getByRole('textbox', { name: 'Buscar productos' }),
  ).toBeVisible();
  // ...and so does the catalogue text, which comes from the API again.
  const { items } = (await (await spanishList).json()) as {
    items: { title: string }[];
  };
  const spanishTitles = items.map((item) => item.title);
  // The grid is named after the page title, so its name is Spanish too.
  await expect(cardTitles(page, 'Productos')).toHaveText(spanishTitles);
  expect(spanishTitles).not.toEqual(englishTitles);

  // The choice is remembered: a reload starts in Spanish.
  const listAfterReload = productListIn(page, 'es');
  await page.reload();
  await listAfterReload;
  await expect(
    page.getByRole('heading', { level: 1, name: 'Productos' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Idioma: Español' }),
  ).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
});

test.describe('first visit with a Spanish browser', () => {
  test.use({ locale: 'es-CL' });

  test('starts in Spanish', async ({ page }) => {
    await page.goto('/products');

    await expect(
      page.getByRole('heading', { level: 1, name: 'Productos' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Idioma: Español' }),
    ).toBeVisible();
  });
});

test.describe('first visit with a browser in an unsupported language', () => {
  test.use({ locale: 'fr-FR' });

  test('starts in English', async ({ page }) => {
    await page.goto('/products');

    await expect(
      page.getByRole('heading', { level: 1, name: 'Products' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Language: English' }),
    ).toBeVisible();
  });
});
