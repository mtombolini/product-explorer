import { getJson } from './client';
import type {
  CatalogueQuery,
  CategoryList,
  Product,
  ProductPage,
} from './types';

/** Products per page. 12 fills rows of 1, 2, 3 and 4 columns. */
export const PAGE_SIZE = 12;

/**
 * GET /api/products: one page of the filtered catalogue, with titles and
 * descriptions in the given language when the catalogue has them.
 */
export function getProductPage(
  query: CatalogueQuery,
  language: string,
): Promise<ProductPage> {
  return getJson<ProductPage>('/api/products', {
    page: query.page,
    page_size: PAGE_SIZE,
    search: query.search,
    category: query.category,
    sort: query.sort,
    lang: language,
  });
}

/** GET /api/products/{id}: one product, in the given language. */
export function getProduct(id: number, language: string): Promise<Product> {
  return getJson<Product>(`/api/products/${id}`, { lang: language });
}

/** GET /api/categories: the values of the category filter. */
export function getCategories(): Promise<CategoryList> {
  return getJson<CategoryList>('/api/categories');
}
