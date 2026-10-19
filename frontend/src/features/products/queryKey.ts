import type { CatalogueQuery } from '../../api/types';

/**
 * The cache key of one catalogue view. Two queries with the same search,
 * category, price range, order and page give the same key, so the page is fetched only
 * once. Everything that changes what the API returns must be part of the
 * key: leaving the order out would show a page cached in another order.
 */
export function queryKey(query: CatalogueQuery): string {
  return JSON.stringify([
    query.search,
    query.category,
    query.minPrice,
    query.maxPrice,
    query.sort,
    query.page,
  ]);
}
