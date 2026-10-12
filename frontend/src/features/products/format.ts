import type { Product } from '../../api/types';

/** Products rated this high or more get the "Top rated" badge. */
export const TOP_RATED_THRESHOLD = 4.5;

// Fake Store prices have no currency; they are shown as US dollars.
const priceFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

/** 109.95 -> "$109.95" */
export function formatPrice(price: number): string {
  return priceFormatter.format(price);
}

/** "men's clothing" -> "Men's clothing" (sentence case). */
export function formatCategory(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

export function isTopRated(product: Product): boolean {
  return (
    product.rating_rate !== null && product.rating_rate >= TOP_RATED_THRESHOLD
  );
}
