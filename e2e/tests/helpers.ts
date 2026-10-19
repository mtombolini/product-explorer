import type { Locator, Page, Request, Response } from '@playwright/test';

/** True for a request to the product list (not to a single product). */
export function isProductList(message: Request | Response): boolean {
  return new URL(message.url()).pathname === '/api/products';
}

/**
 * Record every product request the page makes from now on, list and
 * single product alike, so a test can check what was (not) fetched.
 */
export function recordProductRequests(page: Page): URL[] {
  const requests: URL[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.pathname.startsWith('/api/products')) requests.push(url);
  });
  return requests;
}

/** The grid of product cards of the catalogue page. */
export function productGrid(page: Page, name = 'Products'): Locator {
  return page.getByRole('list', { name, exact: true });
}

/** The titles of the cards, in the order they are shown. */
export function cardTitles(page: Page, name?: string): Locator {
  return productGrid(page, name).getByRole('heading');
}
