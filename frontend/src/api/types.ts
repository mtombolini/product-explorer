/**
 * The shapes the backend returns, exactly as they travel over the wire
 * (snake_case). See "API contract" in docs/SPEC.md.
 */

/**
 * One fact about a product, for example "Capacity: 2 TB". The products
 * of one family have the same facts in the same order.
 */
export interface ProductSpecification {
  /** The attribute, the same in every language ("capacity"). */
  key: string;
  /** The name of its group: "General" or the product family. */
  group: string;
  label: string;
  /** Null when the source says nothing about this attribute. */
  value: string | null;
}

/** One product of the catalogue. */
export interface Product {
  id: number;
  title: string;
  description: string;
  /**
   * The language of `title` and `description`: the one that was asked
   * for when a translation exists, otherwise the language of the source.
   */
  language: string;
  price: number;
  category: string;
  /** Path on our own origin, or null when the product has no image. */
  image_url: string | null;
  rating_rate: number | null;
  rating_count: number | null;
  /** The facts in display order. Empty when the product has none. */
  specifications: ProductSpecification[];
  /** The language `specifications` are written in. */
  specifications_language: string;
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

/** The orders the API accepts in `sort`, in the order they are offered. */
export const SORT_ORDERS = ['price_asc', 'price_desc', 'rating_desc'] as const;

/** A sort order, or an empty string for the default order (by id). */
export type SortOrder = (typeof SORT_ORDERS)[number] | '';

/** What identifies one catalogue view: the filters, the order and the page. */
export interface CatalogueQuery {
  search: string;
  category: string;
  /** Inclusive price bounds; null when there is none. */
  minPrice: number | null;
  maxPrice: number | null;
  sort: SortOrder;
  page: number;
}
