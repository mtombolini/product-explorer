import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';

import type { CatalogueQuery } from '../../../api/types';
import { motionTokens } from '../../../app/motion';
import { layout } from '../../../app/theme';
import { useIsScrolled } from '../../../app/useIsScrolled';
import { CategoryFilter } from './CategoryFilter';
import { ResultSummary } from './ResultSummary';

interface CatalogueToolbarProps {
  categories: string[];
  query: CatalogueQuery;
  /** Matching products; null while loading; undefined when unknown. */
  total: number | null | undefined;
  onSelectCategory: (category: string) => void;
}

/**
 * The bar above the product grid: the category filter on the left and
 * the number of results on the right. On desktop it stays in view under
 * the header while the page scrolls.
 */
export function CatalogueToolbar({
  categories,
  query,
  total,
  onSelectCategory,
}: CatalogueToolbarProps) {
  const { t } = useTranslation();
  const isScrolled = useIsScrolled();
  const labelId = useId();

  return (
    <Box
      sx={{
        position: { md: 'sticky' },
        // Right under the header, which is shorter after scrolling.
        top: {
          md: isScrolled
            ? layout.headerHeight.wide.compact
            : layout.headerHeight.wide.regular,
        },
        transition: (theme) =>
          theme.transitions.create('top', {
            duration: motionTokens.duration.base * 1000,
            easing: theme.transitions.easing.easeOut,
          }),
        zIndex: 1,
        bgcolor: 'background.default',
        borderBottom: 1,
        borderColor: 'divider',
        py: 1.5,
        mb: 3,
        display: 'flex',
        alignItems: 'center',
        // Phones: label and count on one row, the buttons on the next.
        // Wider screens: everything on a single row.
        flexWrap: { xs: 'wrap', md: 'nowrap' },
        columnGap: 2,
        rowGap: 1,
      }}
    >
      <Typography
        id={labelId}
        component="span"
        variant="body2"
        sx={{ fontWeight: 'bold', color: 'text.secondary', flexShrink: 0 }}
      >
        {t('filter.title')}
      </Typography>
      {/* The count sits at the right end of the bar. It comes before the
          filter in the document only so that, on a phone, it shares the
          first row with the label. It is plain text, so the order of
          keyboard focus is not affected. */}
      <Box
        sx={{
          order: { md: 3 },
          ml: 'auto',
          // A long summary wraps inside its share of the bar instead of
          // pushing the buttons away.
          maxWidth: { md: '40%' },
          textAlign: 'right',
        }}
      >
        {total !== undefined && <ResultSummary total={total} query={query} />}
      </Box>
      <Box
        sx={{
          order: { md: 2 },
          flex: { xs: '1 0 100%', md: '0 1 auto' },
          // Lets the row of buttons scroll sideways when it does not fit.
          minWidth: 0,
          overflowX: 'auto',
          // Room for the focus ring, which the scroll box would cut off.
          p: 0.75,
          m: -0.75,
        }}
      >
        <CategoryFilter
          categories={categories}
          selected={query.category}
          onSelect={onSelectCategory}
          labelledBy={labelId}
        />
      </Box>
    </Box>
  );
}
