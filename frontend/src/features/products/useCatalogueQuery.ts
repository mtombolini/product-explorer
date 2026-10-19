import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

import type { SortOrder } from '../../api/types';
import type { PriceRange } from './components/PriceFilter';
import { catalogueUrl, parseCatalogueQuery } from './catalogueUrl';

/**
 * The catalogue view described by the address bar, and the ways to change
 * it. The URL is the single source of truth: nothing here is kept in
 * component state, so back, forward, reload and shared links all work.
 */
export function useCatalogueQuery() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const query = useMemo(
    () => parseCatalogueQuery(searchParams),
    [searchParams],
  );

  /** Choosing a category starts again from the first page. */
  function setCategory(category: string): void {
    navigate(catalogueUrl({ ...query, category, page: 1 }));
  }

  /** A new order starts again from the first page. */
  function setSort(sort: SortOrder): void {
    navigate(catalogueUrl({ ...query, sort, page: 1 }));
  }

  /** A new price range starts again from the first page. */
  function setPriceRange(range: PriceRange): void {
    navigate(
      catalogueUrl({
        ...query,
        minPrice: range.min,
        maxPrice: range.max,
        page: 1,
      }),
    );
  }

  /** Remove every filter and go back to the first page. */
  function clearFilters(): void {
    navigate(
      catalogueUrl({
        ...query,
        search: '',
        category: '',
        minPrice: null,
        maxPrice: null,
        page: 1,
      }),
    );
  }

  /** The address of another page of the same search, category and order. */
  function pageUrl(page: number): string {
    return catalogueUrl({ ...query, page });
  }

  return { query, setCategory, setSort, setPriceRange, clearFilters, pageUrl };
}
