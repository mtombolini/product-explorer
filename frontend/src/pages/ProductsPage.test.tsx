import { screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { installFakeApi, makeProduct } from '../test/fakeApi';
import { renderApp } from '../test/renderApp';

afterEach(() => {
  vi.unstubAllGlobals();
});

const catalogue = [
  makeProduct(1, { title: 'Cotton shirt', category: "men's clothing" }),
  makeProduct(2, { title: 'Silk shirt', category: "women's clothing" }),
  makeProduct(3, { title: 'Gold ring', category: 'jewelery' }),
];

/** 20 products named "Item 01" to "Item 20": two pages of 12 and 8. */
const twoPages = Array.from({ length: 20 }, (_, index) =>
  makeProduct(index + 1, {
    title: `Item ${String(index + 1).padStart(2, '0')}`,
  }),
);

function currentAddress(router: ReturnType<typeof renderApp>['router']) {
  const { pathname, search } = router.state.location;
  return pathname + search;
}

describe('catalogue: search and filter flow', () => {
  it('searches after a pause, then filters by category', async () => {
    const api = installFakeApi(catalogue);
    const { user, router } = renderApp('/products');

    // The list loads with every product.
    expect(
      await screen.findByRole('heading', { name: 'Gold ring' }),
    ).toBeInTheDocument();
    expect(screen.getByText('3 products')).toBeInTheDocument();

    // Typing searches once, after the pause, not once per key.
    await user.type(
      screen.getByRole('textbox', { name: 'Search products' }),
      'shirt',
    );
    await waitFor(() =>
      expect(
        screen.queryByRole('heading', { name: 'Gold ring' }),
      ).not.toBeInTheDocument(),
    );
    expect(screen.getByText('2 products for "shirt"')).toBeInTheDocument();
    expect(api.requests.filter((url) => url.includes('search='))).toEqual([
      '/api/products?page=1&page_size=12&search=shirt',
    ]);
    expect(currentAddress(router)).toBe('/products?search=shirt');

    // Choosing a category sends both filters and updates the address.
    await user.click(screen.getByRole('button', { name: "Men's clothing" }));
    await waitFor(() =>
      expect(
        screen.queryByRole('heading', { name: 'Silk shirt' }),
      ).not.toBeInTheDocument(),
    );
    expect(
      screen.getByRole('heading', { name: 'Cotton shirt' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('1 product for "shirt" in Men\'s clothing'),
    ).toBeInTheDocument();
    expect(api.requests).toContain(
      '/api/products?page=1&page_size=12&search=shirt&category=men%27s+clothing',
    );
    expect(currentAddress(router)).toBe(
      '/products?search=shirt&category=men%27s+clothing',
    );
    expect(
      screen.getByRole('button', { name: "Men's clothing" }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('keeps the focus in the search box when a search changes page', async () => {
    installFakeApi(catalogue);
    const { user, router } = renderApp('/product/3');
    await screen.findByRole('heading', { level: 1, name: 'Gold ring' });

    const searchBox = screen.getByRole('textbox', { name: 'Search products' });
    await user.type(searchBox, 'shi');
    await waitFor(() =>
      expect(currentAddress(router)).toBe('/products?search=shi'),
    );

    // The catalogue is on screen and the user goes on typing the word.
    await screen.findByRole('heading', { level: 1, name: 'Products' });
    expect(searchBox).toHaveFocus();
    await user.keyboard('rt');
    await waitFor(() =>
      expect(currentAddress(router)).toBe('/products?search=shirt'),
    );
  });

  it('drops a pending search when the user opens a product', async () => {
    installFakeApi(catalogue);
    const { user, router } = renderApp('/products');

    const card = await screen.findByRole('link', { name: /Gold ring/ });
    const searchBox = screen.getByRole('textbox', { name: 'Search products' });
    await user.type(searchBox, 'ring');
    // Before the pause ends, so the search has not been applied yet.
    await user.click(card);

    await screen.findByRole('heading', { level: 1, name: 'Gold ring' });
    expect(searchBox).toHaveValue('');
    // Longer than the pause: the search must not run after all.
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(currentAddress(router)).toBe('/product/3');
  });

  it('restores the view from the address', async () => {
    installFakeApi(catalogue);
    renderApp('/products?search=shirt&category=women%27s+clothing');

    expect(
      await screen.findByRole('heading', { name: 'Silk shirt' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('textbox', { name: 'Search products' }),
    ).toHaveValue('shirt');
    expect(
      screen.queryByRole('heading', { name: 'Cotton shirt' }),
    ).not.toBeInTheDocument();
  });
});

describe('catalogue: pagination and cache', () => {
  it('requests a new page once and reuses it afterwards', async () => {
    const api = installFakeApi(twoPages);
    const { user, router } = renderApp('/products');
    expect(
      await screen.findByRole('heading', { name: 'Item 01' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Go to page 2' }));
    expect(
      await screen.findByRole('heading', { name: 'Item 13' }),
    ).toBeInTheDocument();
    expect(currentAddress(router)).toBe('/products?page=2');
    expect(screen.getByRole('link', { name: 'page 2' })).toHaveAttribute(
      'aria-current',
      'page',
    );

    // Back to page 1 and forward to page 2 again: both come from the store.
    await user.click(screen.getByRole('link', { name: 'Go to page 1' }));
    expect(
      await screen.findByRole('heading', { name: 'Item 01' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Go to page 2' }));
    expect(
      await screen.findByRole('heading', { name: 'Item 13' }),
    ).toBeInTheDocument();

    expect(api.requestsTo('/api/products')).toEqual([
      '/api/products?page=1&page_size=12',
      '/api/products?page=2&page_size=12',
    ]);
    expect(api.requestsTo('/api/categories')).toHaveLength(1);
  });
});

describe('catalogue: states', () => {
  it('shows an error with a retry that works', async () => {
    const api = installFakeApi(catalogue);
    api.isBroken = true;
    const { user } = renderApp('/products');

    expect(
      await screen.findByText('The products could not be loaded'),
    ).toBeInTheDocument();

    api.isBroken = false;
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(
      await screen.findByRole('heading', { name: 'Gold ring' }),
    ).toBeInTheDocument();
  });

  it('offers to clear the filters when nothing matches', async () => {
    installFakeApi(catalogue);
    const { user, router } = renderApp('/products?search=zzz');

    expect(await screen.findByText('No products found')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));

    expect(
      await screen.findByRole('heading', { name: 'Gold ring' }),
    ).toBeInTheDocument();
    expect(currentAddress(router)).toBe('/products');
    expect(
      screen.getByRole('textbox', { name: 'Search products' }),
    ).toHaveValue('');
  });

  it('explains an empty catalogue and can ask again', async () => {
    const api = installFakeApi([]);
    const { user } = renderApp('/products');

    expect(
      await screen.findByText('The catalogue is empty'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Try again' }));

    await waitFor(() =>
      expect(api.requestsTo('/api/products')).toHaveLength(2),
    );
  });

  it('handles a page number past the end', async () => {
    installFakeApi(catalogue);
    const { user, router } = renderApp('/products?page=7');

    expect(
      await screen.findByText('This page does not exist'),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Go to the first page' }),
    );

    expect(
      await screen.findByRole('heading', { name: 'Gold ring' }),
    ).toBeInTheDocument();
    expect(currentAddress(router)).toBe('/products');
  });
});
