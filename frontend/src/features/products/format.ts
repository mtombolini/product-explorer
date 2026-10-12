import type { Product } from '../../api/types';

/** Products rated this high or more get the "Top rated" badge. */
export const TOP_RATED_THRESHOLD = 4.5;

/**
 * 109.95 -> "$109.95" in English, "109,95 US$" in Spanish.
 * Fake Store prices have no currency; they are shown as US dollars.
 */
export function formatPrice(price: number, language: string): string {
  return new Intl.NumberFormat(language, {
    style: 'currency',
    currency: 'USD',
  }).format(price);
}

/** 3.9 -> "3.9" in English, "3,9" in Spanish. Always one decimal. */
export function formatRating(rate: number, language: string): string {
  return new Intl.NumberFormat(language, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(rate);
}

export function isTopRated(product: Product): boolean {
  return (
    product.rating_rate !== null && product.rating_rate >= TOP_RATED_THRESHOLD
  );
}
