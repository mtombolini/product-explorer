import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';

import type { CatalogueQuery, SortOrder } from '../../../api/types';
import { motionTokens } from '../../../app/motion';
import { layout } from '../../../app/theme';
import { useIsScrolled } from '../../../app/useIsScrolled';
import { CategoryFilter } from './CategoryFilter';
import { PriceFilter } from './PriceFilter';
import type { PriceRange } from './PriceFilter';
import { ResultSummary } from './ResultSummary';
import { SortSelect } from './SortSelect';

interface CatalogueToolbarProps {
  categories: string[];
  query: CatalogueQuery;
  /** Matching products; null while loading; undefined when unknown. */
  total: number | null | undefined;
  onSelectCategory: (category: string) => void;
  onSelectSort: (sort: SortOrder) => void;
  onSelectPriceRange: (range: PriceRange) => void;
}

/**
 * The bar above the product grid, with every control of the list: the
 * category filter, the number of results it gives and, at the right end,
 * the order. It is one row on a wide screen when it fits, and two or
 * three rows otherwise. On a wide screen it stays in view under the
 * header while the page scrolls.
 */
export function CatalogueToolbar({
  categories,
  query,
  total,
  onSelectCategory,
  onSelectSort,
  onSelectPriceRange,
}: CatalogueToolbarProps) {
  const { t } = useTranslation();
  const isScrolled = useIsScrolled();
  const sortLabelId = useId();

  return (
    // The outer box is the part that sticks. It is as wide as the page
    // content and has the page colour, so the products scrolling behind
    // the bar do not show around its rounded corners.
    <Box
      sx={{
        position: { lg: 'sticky' },
        // Right under the header, which is shorter after scrolling.
        top: {
          lg: isScrolled
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
        py: 1.5,
        mb: 1.5,
      }}
    >
      <Box
        sx={{
          bgcolor: 'grey.100',
          borderRadius: 2,
          px: 1.5,
          py: 1,
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          columnGap: 3,
          rowGap: 1,
        }}
      >
        <Box
          sx={{
            // Can shrink, so the row of buttons scrolls sideways when it
            // does not fit. Below the wide layout it takes a row of its
            // own.
            flex: { xs: '1 1 100%', lg: '0 1 auto' },
            minWidth: 0,
          }}
        >
          <CategoryFilter
            categories={categories}
            selected={query.category}
            onSelect={onSelectCategory}
            label={t('filter.title')}
          />
        </Box>

        {/* The number of results follows the filter that produced it;
            the order sits at the right end of the bar. */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            // On a phone the count and the order do not fit side by
            // side: the order goes to a line of its own.
            flexWrap: 'wrap',
            columnGap: 2,
            rowGap: 1,
            flex: { xs: '1 1 100%', lg: '1 1 auto' },
            minWidth: 0,
          }}
        >
          {total !== undefined && <ResultSummary total={total} query={query} />}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              minWidth: 0,
              // Keeps the order at the right end while the count loads.
              ml: 'auto',
              // On a phone the price and the order share a full row, half
              // each; from 480 px they take the width of their content.
              width: { xs: '100%', sm: 'auto' },
            }}
          >
            <Box sx={{ flex: { xs: '1 1 0', sm: '0 0 auto' }, minWidth: 0 }}>
              <PriceFilter
                value={{ min: query.minPrice, max: query.maxPrice }}
                onChange={onSelectPriceRange}
              />
            </Box>
            {/* Hidden on phones to leave room; it still names the select. */}
            <Typography
              id={sortLabelId}
              component="span"
              variant="body2"
              color="text.secondary"
              sx={{ display: { xs: 'none', sm: 'block' }, flexShrink: 0 }}
            >
              {t('sort.title')}
            </Typography>
            <Box sx={{ flex: { xs: '1 1 0', sm: '0 0 auto' }, minWidth: 0 }}>
              <SortSelect
                value={query.sort}
                onChange={onSelectSort}
                labelledBy={sortLabelId}
              />
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
