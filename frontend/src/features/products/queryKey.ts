import type { CatalogueQuery } from '../../api/types';

/**
 * The cache key of one catalogue view. Two queries with the same search,
 * category and page give the same key, so the page is fetched only once.
 */
export function queryKey(query: CatalogueQuery): string {
  return JSON.stringify([query.search, query.category, query.page]);
}
