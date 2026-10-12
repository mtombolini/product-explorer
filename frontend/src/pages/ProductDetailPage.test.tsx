import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { installFakeApi, makeProduct } from '../test/fakeApi';
import { renderApp } from '../test/renderApp';

afterEach(() => {
  vi.unstubAllGlobals();
});

/** 20 products named "Item 01" to "Item 20": two pages of 12 and 8. */
const twoPages = Array.from({ length: 20 }, (_, index) =>
  makeProduct(index + 1, {
    title: `Item ${String(index + 1).padStart(2, '0')}`,
  }),
);

describe('product page: navigation without refetching', () => {
  it('opens a product from the list and goes back with no new request', async () => {
    const api = installFakeApi(twoPages);
    const { user, router } = renderApp('/products?page=2');

    await user.click(await screen.findByRole('link', { name: /Item 15/ }));

    // The product was in the list, so it renders from the store.
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Item 15' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Description of product 15')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/product/15');

    await user.click(screen.getByRole('button', { name: 'Back to products' }));

    // Same list, same page, and nothing was fetched along the way.
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Products' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Item 15' }),
    ).toBeInTheDocument();
    expect(router.state.location.search).toBe('?page=2');
    expect(api.requests.sort()).toEqual([
      '/api/categories',
      '/api/products?page=2&page_size=12&lang=en',
    ]);
  });

  it('keeps search and category when coming back', async () => {
    const api = installFakeApi([
      makeProduct(1, { title: 'Cotton shirt', category: 'clothing' }),
      makeProduct(2, { title: 'Gold ring', category: 'jewelery' }),
    ]);
    const { user, router } = renderApp(
      '/products?search=shirt&category=clothing',
    );

    await user.click(await screen.findByRole('link', { name: /Cotton shirt/ }));
    await screen.findByRole('heading', { level: 1, name: 'Cotton shirt' });
    await user.click(screen.getByRole('button', { name: 'Back to products' }));

    await screen.findByRole('heading', { level: 1, name: 'Products' });
    expect(router.state.location.search).toBe(
      '?search=shirt&category=clothing',
    );
    expect(
      screen.getByRole('textbox', { name: 'Search products' }),
    ).toHaveValue('shirt');
    expect(api.requestsTo('/api/products')).toHaveLength(1);
  });
});

describe('product page: direct visit', () => {
  it('fetches the product exactly once', async () => {
    const api = installFakeApi(twoPages);
    renderApp('/product/3');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Item 03' }),
    ).toBeInTheDocument();
    expect(api.requests).toEqual(['/api/products/3?lang=en']);
    // No history to go back to: the way back is a link to the catalogue.
    expect(
      screen.getByRole('link', { name: 'Back to products' }),
    ).toHaveAttribute('href', '/products');
  });

  it('shows not found for a product that does not exist', async () => {
    installFakeApi(twoPages);
    renderApp('/product/999');

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Product not found',
      }),
    ).toBeInTheDocument();
  });

  // The second id is a number, but larger than any id the API accepts.
  it.each(['/product/abc', '/product/9999999999'])(
    'shows not found for the malformed id in %s without calling the API',
    async (address) => {
      const api = installFakeApi(twoPages);
      renderApp(address);

      expect(
        await screen.findByRole('heading', {
          level: 1,
          name: 'Product not found',
        }),
      ).toBeInTheDocument();
      expect(api.requests).toEqual([]);
    },
  );

  it('shows an error with a retry that works', async () => {
    const api = installFakeApi(twoPages);
    api.isBroken = true;
    const { user } = renderApp('/product/3');

    expect(
      await screen.findByText('The product could not be loaded'),
    ).toBeInTheDocument();

    api.isBroken = false;
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Item 03' }),
    ).toBeInTheDocument();
  });
});

describe('routing', () => {
  it('redirects / to the catalogue', async () => {
    installFakeApi(twoPages);
    const { router } = renderApp('/');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Products' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/products');
  });

  it('shows the not-found page for an unknown address', async () => {
    installFakeApi(twoPages);
    renderApp('/nowhere');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Page not found' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Go to products' }),
    ).toHaveAttribute('href', '/products');
  });

  it('has the page landmarks and a skip link', async () => {
    installFakeApi(twoPages);
    renderApp('/products');

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Skip to main content' }),
    ).toHaveAttribute('href', '#main-content');
    await screen.findByRole('heading', { name: 'Item 01' });
  });
});

describe('product page: specifications', () => {
  const drive = makeProduct(9, {
    title: 'External drive',
    specifications: [
      { label: 'Capacity', value: '2 TB' },
      { label: 'Interface', value: 'USB 3.0' },
    ],
    specifications_language: 'en',
  });

  it('lists each specification as a label with its value, in order', async () => {
    installFakeApi([drive]);
    renderApp('/product/9');

    const section = await screen.findByRole('region', {
      name: 'Specifications',
    });
    expect(
      within(section)
        .getAllByRole('term')
        .map((term) => term.textContent),
    ).toEqual(['Capacity', 'Interface']);
    expect(
      within(section)
        .getAllByRole('definition')
        .map((definition) => definition.textContent),
    ).toEqual(['2 TB', 'USB 3.0']);
    // The description stays below, under its own heading.
    expect(
      screen.getByRole('heading', { level: 2, name: 'Description' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Description of product 9')).toBeInTheDocument();
  });

  it('shows no specifications section when the product has none', async () => {
    installFakeApi([makeProduct(3, { title: 'Plain product' })]);
    renderApp('/product/3');

    await screen.findByRole('heading', { level: 1, name: 'Plain product' });
    expect(
      screen.queryByRole('region', { name: 'Specifications' }),
    ).not.toBeInTheDocument();
  });

  it('marks the list with the language its text is in', async () => {
    installFakeApi([
      makeProduct(9, {
        specifications: [{ label: 'Capacidad', value: '2 TB' }],
        specifications_language: 'es',
      }),
    ]);
    renderApp('/product/9');

    const term = await screen.findByRole('term');
    expect(term.closest('dl')).toHaveAttribute('lang', 'es');
  });
});
