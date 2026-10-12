/**
 * The shapes the backend returns, exactly as they travel over the wire
 * (snake_case). See "API contract" in docs/SPEC.md.
 */

/** One product of the catalogue. */
export interface Product {
  id: number;
  title: string;
  description: string;
  price: number;
  category: string;
  /** Path on our own origin, or null when the product has no image. */
  image_url: string | null;
  rating_rate: number | null;
  rating_count: number | null;
}

/** One page of products with the pagination metadata. */
export interface ProductPage {
  items: Product[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/** The distinct categories of the catalogue. */
export interface CategoryList {
  items: string[];
}

/** One invalid field reported by the API. */
export interface ApiErrorDetail {
  field: string;
  message: string;
}

/** The body of every error response of the API. */
export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    details: ApiErrorDetail[];
  };
}

/** What identifies one catalogue view: the filters and the page. */
export interface CatalogueQuery {
  search: string;
  category: string;
  page: number;
}
