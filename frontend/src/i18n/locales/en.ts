/**
 * English interface copy. This file defines the shape every other
 * language must have: a missing key in another language is a type error.
 *
 * Keys ending in _one and _other are plural forms; the right one is
 * chosen from the `count` value. {{name}} is replaced by a value.
 */
export const en = {
  layout: {
    skipToContent: 'Skip to main content',
    homeLink: 'Product Explorer, go to products',
    languageLabel: 'Language',
    footer:
      'Product Explorer is a demonstration project. The catalogue was imported from Fake Store API and is served from our own database.',
  },
  search: {
    label: 'Search products',
    clear: 'Clear search',
  },
  filter: {
    title: 'Category',
    all: 'All',
  },
  sort: {
    title: 'Sort by',
    default: 'Default order',
    priceAsc: 'Price: low to high',
    priceDesc: 'Price: high to low',
  },
  catalogue: {
    title: 'Products',
    loading: 'Loading products…',
    summary_one: '{{count}} product',
    summary_other: '{{count}} products',
    summarySearch_one: '{{count}} product for "{{search}}"',
    summarySearch_other: '{{count}} products for "{{search}}"',
    summaryCategory_one: '{{count}} product in {{category}}',
    summaryCategory_other: '{{count}} products in {{category}}',
    summarySearchCategory_one:
      '{{count}} product for "{{search}}" in {{category}}',
    summarySearchCategory_other:
      '{{count}} products for "{{search}}" in {{category}}',
    errorTitle: 'The products could not be loaded',
    emptyTitle: 'The catalogue is empty',
    emptyDescription:
      'The products have not been imported yet. Run the import and try again.',
    noResultsTitle: 'No products found',
    noResultsDescription:
      'Nothing matches your search and category. Try other words or clear the filters.',
    clearFilters: 'Clear filters',
    pastEndTitle: 'This page does not exist',
    pastEndDescription: 'The results end at page {{page}}.',
    firstPage: 'Go to the first page',
  },
  pagination: {
    label: 'Pagination',
    goToPage: 'Go to page {{page}}',
    currentPage: 'page {{page}}',
    previous: 'Go to previous page',
    next: 'Go to next page',
  },
  product: {
    title: 'Product',
    back: 'Back to products',
    loading: 'Loading product',
    notFoundTitle: 'Product not found',
    notFoundDescription:
      'This product does not exist or is no longer in the catalogue.',
    errorTitle: 'The product could not be loaded',
    topRated: 'Top rated',
    specifications: 'Specifications',
    description: 'Description',
    noRatings: 'No ratings yet',
    ratingText_one: 'Rated {{rate}} out of 5 by {{count}} customer',
    ratingText_other: 'Rated {{rate}} out of 5 by {{count}} customers',
  },
  notFound: {
    title: 'Page not found',
    description:
      'This address does not match any page. Check the link or go back to the catalogue.',
    action: 'Go to products',
  },
  crash: {
    title: 'Something went wrong',
    description: 'The page could not be shown. Reloading usually fixes it.',
    action: 'Reload the page',
  },
  errors: {
    network:
      'The server could not be reached. Check your connection and try again.',
    server: 'The server could not answer. Please try again in a moment.',
  },
  actions: {
    tryAgain: 'Try again',
  },
};

/** The shape of a complete translation. */
export type Messages = typeof en;
