import Typography from '@mui/material/Typography';

import type { CatalogueQuery } from '../../../api/types';
import { formatCategory } from '../format';

interface ResultSummaryProps {
  /** Number of matching products, or null while they load. */
  total: number | null;
  query: CatalogueQuery;
}

/** "20 products", "1 product for "ring" in Jewelery", ... */
function describe(total: number, query: CatalogueQuery): string {
  let text = total === 1 ? '1 product' : `${total} products`;
  if (query.search) text += ` for "${query.search}"`;
  if (query.category) text += ` in ${formatCategory(query.category)}`;
  return text;
}

/**
 * How many products match the current search and category. It is a
 * polite live region: screen readers announce the new count after a
 * search or filter change without interrupting the user.
 */
export function ResultSummary({ total, query }: ResultSummaryProps) {
  return (
    <Typography role="status" aria-live="polite" color="text.secondary">
      {total === null ? 'Loading products…' : describe(total, query)}
    </Typography>
  );
}
