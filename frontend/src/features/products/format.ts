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

/** One piece of a formatted price: the currency sign or the rest. */
export interface PricePart {
  text: string;
  isCurrency: boolean;
}

/**
 * The same text as formatPrice, split so the currency can be styled
 * apart from the amount: "109,95 US$" -> "109,95 " and "US$".
 */
export function priceParts(price: number, language: string): PricePart[] {
  const parts = new Intl.NumberFormat(language, {
    style: 'currency',
    currency: 'USD',
  }).formatToParts(price);
  const merged: PricePart[] = [];
  for (const part of parts) {
    const isCurrency = part.type === 'currency';
    const last = merged.at(-1);
    if (last && last.isCurrency === isCurrency) {
      last.text += part.value;
    } else {
      merged.push({ text: part.value, isCurrency });
    }
  }
  return merged;
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
