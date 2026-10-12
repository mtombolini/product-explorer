import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

import type { CatalogueQuery } from '../../../api/types';
import { categoryName } from '../../../i18n/categoryNames';

interface ResultSummaryProps {
  /** Number of matching products, or null while they load. */
  total: number | null;
  query: CatalogueQuery;
}

/**
 * How many products match the current search and category, for example
 * "20 products" or "1 product for "ring" in Jewelery". It is a polite live
 * region: screen readers announce the new count after a search or filter
 * change without interrupting the user.
 */
export function ResultSummary({ total, query }: ResultSummaryProps) {
  const { t, i18n } = useTranslation();

  /**
   * Each combination is a whole sentence in the message files, so every
   * language can order the words its own way. `count` picks the plural.
   */
  function describe(count: number): string {
    const search = query.search;
    const category = categoryName(query.category, i18n.language);

    if (query.search && query.category) {
      return t('catalogue.summarySearchCategory', { count, search, category });
    }
    if (query.search) {
      return t('catalogue.summarySearch', { count, search });
    }
    if (query.category) {
      return t('catalogue.summaryCategory', { count, category });
    }
    return t('catalogue.summary', { count });
  }

  return (
    <Typography role="status" aria-live="polite" color="text.secondary">
      {total === null ? t('catalogue.loading') : describe(total)}
    </Typography>
  );
}
