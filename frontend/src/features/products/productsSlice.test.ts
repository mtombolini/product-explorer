import { afterEach, describe, expect, it, vi } from 'vitest';

import { createStore } from '../../app/store';
import { installFakeApi, makeProduct } from '../../test/fakeApi';
import { fetchProduct, fetchProductPage } from './productsSlice';
import { queryKey } from './queryKey';

afterEach(() => {
  vi.unstubAllGlobals();
});

const firstPage = { search: '', category: '', page: 1 };

describe('products slice: caching', () => {
  it('stores a page by query key and its products by id', async () => {
    installFakeApi([makeProduct(1), makeProduct(2)]);
    const store = createStore();

    await store.dispatch(fetchProductPage({ query: firstPage }));

    const { pages, byId } = store.getState().products;
    expect(pages[queryKey(firstPage)]).toEqual({
      status: 'succeeded',
      ids: [1, 2],
      total: 2,
      totalPages: 1,
      errorCode: null,
    });
    expect(Object.keys(byId)).toEqual(['1', '2']);
  });

  it('does not request a cached page again unless forced', async () => {
    const api = installFakeApi([makeProduct(1)]);
    const store = createStore();

    await store.dispatch(fetchProductPage({ query: firstPage }));
    await store.dispatch(fetchProductPage({ query: firstPage }));
    expect(api.requests).toHaveLength(1);

    await store.dispatch(fetchProductPage({ query: firstPage, force: true }));
    expect(api.requests).toHaveLength(2);
  });

  it('sends only one request when the same page is asked twice at once', async () => {
    const api = installFakeApi([makeProduct(1)]);
    const store = createStore();

    await Promise.all([
      store.dispatch(fetchProductPage({ query: firstPage })),
      store.dispatch(fetchProductPage({ query: firstPage })),
    ]);

    expect(api.requests).toHaveLength(1);
  });

  it('requests a failed page again', async () => {
    const api = installFakeApi([makeProduct(1)]);
    const store = createStore();
    api.isBroken = true;

    await store.dispatch(fetchProductPage({ query: firstPage }));
    expect(store.getState().products.pages[queryKey(firstPage)]).toMatchObject({
      status: 'failed',
      errorCode: 'internal_error',
    });

    api.isBroken = false;
    await store.dispatch(fetchProductPage({ query: firstPage }));
    expect(store.getState().products.pages[queryKey(firstPage)].status).toBe(
      'succeeded',
    );
  });

  it('does not request a product that a list already brought', async () => {
    const api = installFakeApi([makeProduct(1)]);
    const store = createStore();
    await store.dispatch(fetchProductPage({ query: firstPage }));

    await store.dispatch(fetchProduct(1));

    expect(api.requestsTo('/api/products/')).toEqual([]);
  });

  it('marks an unknown product as not found', async () => {
    installFakeApi([]);
    const store = createStore();

    await store.dispatch(fetchProduct(7));

    expect(store.getState().products.details[7]).toEqual({
      status: 'failed',
      errorCode: 'product_not_found',
      notFound: true,
    });
  });
});
