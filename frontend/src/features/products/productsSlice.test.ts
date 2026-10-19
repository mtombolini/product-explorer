import { afterEach, describe, expect, it, vi } from 'vitest';

import { createStore } from '../../app/store';
import { installFakeApi, makeProduct } from '../../test/fakeApi';
import {
  fetchCategories,
  fetchProduct,
  fetchProductPage,
  languageChanged,
} from './productsSlice';
import { queryKey } from './queryKey';

afterEach(() => {
  vi.unstubAllGlobals();
});

const firstPage = {
  search: '',
  category: '',
  minPrice: null,
  maxPrice: null,
  sort: '',
  page: 1,
} as const;

describe('products slice: caching', () => {
  it('stores a page by query key and its products by id', async () => {
    installFakeApi([makeProduct(1), makeProduct(2)]);
    const store = createStore();

    await store.dispatch(
      fetchProductPage({ query: firstPage, language: 'en' }),
    );

    const { pages, byId } = store.getState().products;
    expect(pages[queryKey(firstPage)]).toEqual({
      status: 'succeeded',
      requestId: expect.any(String),
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

    await store.dispatch(
      fetchProductPage({ query: firstPage, language: 'en' }),
    );
    await store.dispatch(
      fetchProductPage({ query: firstPage, language: 'en' }),
    );
    expect(api.requests).toHaveLength(1);

    await store.dispatch(
      fetchProductPage({ query: firstPage, language: 'en', force: true }),
    );
    expect(api.requests).toHaveLength(2);
  });

  it('sends only one request when the same page is asked twice at once', async () => {
    const api = installFakeApi([makeProduct(1)]);
    const store = createStore();

    await Promise.all([
      store.dispatch(fetchProductPage({ query: firstPage, language: 'en' })),
      store.dispatch(fetchProductPage({ query: firstPage, language: 'en' })),
    ]);

    expect(api.requests).toHaveLength(1);
  });

  it('requests a failed page again', async () => {
    const api = installFakeApi([makeProduct(1)]);
    const store = createStore();
    api.isBroken = true;

    await store.dispatch(
      fetchProductPage({ query: firstPage, language: 'en' }),
    );
    expect(store.getState().products.pages[queryKey(firstPage)]).toMatchObject({
      status: 'failed',
      errorCode: 'internal_error',
    });

    api.isBroken = false;
    await store.dispatch(
      fetchProductPage({ query: firstPage, language: 'en' }),
    );
    expect(store.getState().products.pages[queryKey(firstPage)].status).toBe(
      'succeeded',
    );
  });

  it('does not request a product that a list already brought', async () => {
    const api = installFakeApi([makeProduct(1)]);
    const store = createStore();
    await store.dispatch(
      fetchProductPage({ query: firstPage, language: 'en' }),
    );

    await store.dispatch(fetchProduct({ id: 1, language: 'en' }));

    expect(api.requestsTo('/api/products/')).toEqual([]);
  });

  it('marks an unknown product as not found', async () => {
    installFakeApi([]);
    const store = createStore();

    await store.dispatch(fetchProduct({ id: 7, language: 'en' }));

    expect(store.getState().products.details[7]).toEqual({
      status: 'failed',
      requestId: expect.any(String),
      errorCode: 'product_not_found',
      notFound: true,
    });
  });
});

describe('products slice: language', () => {
  it('empties the cached text but keeps the categories', async () => {
    installFakeApi([makeProduct(1)]);
    const store = createStore('en');
    await store.dispatch(
      fetchProductPage({ query: firstPage, language: 'en' }),
    );
    await store.dispatch(fetchCategories());

    store.dispatch(languageChanged('es'));

    const state = store.getState().products;
    expect(state.language).toBe('es');
    expect(state.pages).toEqual({});
    expect(state.byId).toEqual({});
    expect(state.categories.items).toEqual(['electronics']);
  });

  it('does nothing when the language is the same', async () => {
    installFakeApi([makeProduct(1)]);
    const store = createStore('en');
    await store.dispatch(
      fetchProductPage({ query: firstPage, language: 'en' }),
    );

    store.dispatch(languageChanged('en'));

    expect(Object.keys(store.getState().products.byId)).toEqual(['1']);
  });

  it('drops the answer to a request made before the language changed', async () => {
    installFakeApi([makeProduct(1)]);
    const store = createStore('en');

    const list = store.dispatch(
      fetchProductPage({ query: firstPage, language: 'en' }),
    );
    const single = store.dispatch(fetchProduct({ id: 1, language: 'en' }));
    store.dispatch(languageChanged('es'));
    await Promise.all([list, single]);

    // The English answers arrived after the change: nothing is stored.
    const state = store.getState().products;
    expect(state.pages).toEqual({});
    expect(state.byId).toEqual({});
    expect(state.details).toEqual({});
  });

  it('keeps a loaded page when an older request for it fails late', async () => {
    const api = installFakeApi([makeProduct(1)]);
    const store = createStore('en');

    // The first English request fails, but its answer is still on its
    // way while the language goes to Spanish and back to English.
    api.isBroken = true;
    const late = store.dispatch(
      fetchProductPage({ query: firstPage, language: 'en' }),
    );
    api.isBroken = false;
    store.dispatch(languageChanged('es'));
    store.dispatch(languageChanged('en'));
    const current = store.dispatch(
      fetchProductPage({ query: firstPage, language: 'en' }),
    );
    await Promise.all([late, current]);

    // Same language and same page as the late answer: only the request
    // id tells them apart.
    expect(api.requests).toHaveLength(2);
    expect(store.getState().products.pages[queryKey(firstPage)]).toMatchObject({
      status: 'succeeded',
      ids: [1],
    });
  });
});
