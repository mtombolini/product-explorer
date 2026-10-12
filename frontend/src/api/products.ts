import { getJson } from './client';
import type {
  CatalogueQuery,
  CategoryList,
  Product,
  ProductPage,
} from './types';

/** Products per page. 12 fills rows of 1, 2, 3 and 4 columns. */
export const PAGE_SIZE = 12;

/** GET /api/products: one page of the filtered catalogue. */
export function getProductPage(query: CatalogueQuery): Promise<ProductPage> {
  return getJson<ProductPage>('/api/products', {
    page: query.page,
    page_size: PAGE_SIZE,
    search: query.search,
    category: query.category,
  });
}

/** GET /api/products/{id}: one product. */
export function getProduct(id: number): Promise<Product> {
  return getJson<Product>(`/api/products/${id}`);
}

/** GET /api/categories: the values of the category filter. */
export function getCategories(): Promise<CategoryList> {
  return getJson<CategoryList>('/api/categories');
}
