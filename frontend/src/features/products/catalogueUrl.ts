import { SORT_ORDERS } from '../../api/types';
import type { CatalogueQuery, SortOrder } from '../../api/types';

export const CATALOGUE_PATH = '/products';

/** Same limits as the API, so a hand-edited address cannot cause a 422. */
export const MAX_FILTER_LENGTH = 100;
const MAX_PAGE = 1_000_000;
/** The largest price the API accepts (a NUMERIC(10, 2) column). */
const MAX_PRICE = 99_999_999.99;

function cleanFilter(value: string | null): string {
  return (value ?? '').trim().slice(0, MAX_FILTER_LENGTH);
}

/** A sort order the API knows, or the default for anything else. */
function parseSort(value: string | null): SortOrder {
  return SORT_ORDERS.find((order) => order === value) ?? '';
}

/** A price the API accepts, rounded to cents, or null. */
function parsePrice(value: string | null): number | null {
  if (value === null || value.trim() === '') return null;
  const price = Number(value);
  if (!Number.isFinite(price) || price < 0 || price > MAX_PRICE) return null;
  return Math.round(price * 100) / 100;
}

/**
 * Read the catalogue query from the address bar. Anything missing or
 * invalid falls back to the default: no search, no category, no price
 * range, the default order, page 1.
 */
export function parseCatalogueQuery(params: URLSearchParams): CatalogueQuery {
  const page = Number(params.get('page'));
  const isValidPage = Number.isInteger(page) && page >= 1 && page <= MAX_PAGE;
  let minPrice = parsePrice(params.get('min_price'));
  let maxPrice = parsePrice(params.get('max_price'));
  // A hand-edited address with the bounds the wrong way round: swap
  // them instead of sending a request the API rejects.
  if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
    [minPrice, maxPrice] = [maxPrice, minPrice];
  }
  return {
    search: cleanFilter(params.get('search')),
    category: cleanFilter(params.get('category')),
    minPrice,
    maxPrice,
    sort: parseSort(params.get('sort')),
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
  if (query.minPrice !== null) params.set('min_price', String(query.minPrice));
  if (query.maxPrice !== null) params.set('max_price', String(query.maxPrice));
  if (query.sort) params.set('sort', query.sort);
  if (query.page > 1) params.set('page', String(query.page));
  const queryString = params.toString();
  return queryString ? `${CATALOGUE_PATH}?${queryString}` : CATALOGUE_PATH;
}
