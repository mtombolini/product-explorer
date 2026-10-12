import type { CatalogueQuery } from '../../api/types';

export const CATALOGUE_PATH = '/products';

/** Same limits as the API, so a hand-edited address cannot cause a 422. */
export const MAX_FILTER_LENGTH = 100;
const MAX_PAGE = 1_000_000;

function cleanFilter(value: string | null): string {
  return (value ?? '').trim().slice(0, MAX_FILTER_LENGTH);
}

/**
 * Read the catalogue query from the address bar. Anything missing or
 * invalid falls back to the default: no search, no category, page 1.
 */
export function parseCatalogueQuery(params: URLSearchParams): CatalogueQuery {
  const page = Number(params.get('page'));
  const isValidPage = Number.isInteger(page) && page >= 1 && page <= MAX_PAGE;
  return {
    search: cleanFilter(params.get('search')),
    category: cleanFilter(params.get('category')),
    page: isValidPage ? page : 1,
  };
}

/**
 * The address of a catalogue view. Default values are left out, so the
 * plain catalogue is just "/products".
 */
export function catalogueUrl(query: CatalogueQuery): string {
  const params = new URLSearchParams();
  if (query.search) params.set('search', query.search);
  if (query.category) params.set('category', query.category);
  if (query.page > 1) params.set('page', String(query.page));
  const queryString = params.toString();
  return queryString ? `${CATALOGUE_PATH}?${queryString}` : CATALOGUE_PATH;
}
