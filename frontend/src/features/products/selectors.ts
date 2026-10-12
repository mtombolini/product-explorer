import { createSelector } from '@reduxjs/toolkit';

import type { RootState } from '../../app/store';

/** The cached list page for a query key, or undefined if never loaded. */
export const selectPage = (state: RootState, key: string) =>
  state.products.pages[key];

/**
 * The products of a cached list page, in order.
 *
 * Memoised: it returns the same array until the page or its products
 * change, so the grid does not re-render for unrelated updates.
 */
export const selectPageProducts = createSelector(
  [
    (state: RootState) => state.products.byId,
    (state: RootState, key: string) => state.products.pages[key]?.ids,
  ],
  (byId, ids) => (ids ?? []).map((id) => byId[id]),
);

/** One product from the cache, or undefined when it was never loaded. */
export const selectProduct = (state: RootState, id: number) =>
  state.products.byId[id];

/** The request state of one single product. */
export const selectProductDetail = (state: RootState, id: number) =>
  state.products.details[id];

export const selectCategories = (state: RootState) => state.products.categories;
