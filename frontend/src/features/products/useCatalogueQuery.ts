import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

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

  /** Remove search and category and go back to the first page. */
  function clearFilters(): void {
    navigate(catalogueUrl({ search: '', category: '', page: 1 }));
  }

  /** The address of another page of the same search and category. */
  function pageUrl(page: number): string {
    return catalogueUrl({ ...query, page });
  }

  return { query, setCategory, clearFilters, pageUrl };
}
