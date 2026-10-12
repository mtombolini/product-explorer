import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';

import type { CatalogueQuery, SortOrder } from '../../../api/types';
import { motionTokens } from '../../../app/motion';
import { layout } from '../../../app/theme';
import { useIsScrolled } from '../../../app/useIsScrolled';
import { CategoryFilter } from './CategoryFilter';
import { ResultSummary } from './ResultSummary';
import { SortSelect } from './SortSelect';

interface CatalogueToolbarProps {
  categories: string[];
  query: CatalogueQuery;
  /** Matching products; null while loading; undefined when unknown. */
  total: number | null | undefined;
  onSelectCategory: (category: string) => void;
  onSelectSort: (sort: SortOrder) => void;
}

/** The small bold text that names a control of the toolbar. */
const labelStyle = {
  fontWeight: 'bold',
  color: 'text.secondary',
  flexShrink: 0,
} as const;

/**
 * The bar above the product grid, with every control of the list: the
 * category filter, the order and, at the right end, the number of
 * results. It is one row on a wide screen and two rows below that. On a
 * wide screen it stays in view under the header while the page scrolls.
 */
export function CatalogueToolbar({
  categories,
  query,
  total,
  onSelectCategory,
  onSelectSort,
}: CatalogueToolbarProps) {
  const { t } = useTranslation();
  const isScrolled = useIsScrolled();
  const categoryLabelId = useId();
  const sortLabelId = useId();

  return (
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
        borderBottom: 1,
        borderColor: 'divider',
        py: 1.5,
        mb: 3,
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        columnGap: 3,
        rowGap: 1.5,
      }}
    >
      {/* Category: the label and the buttons. */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: { xs: 'wrap', md: 'nowrap' },
          columnGap: 2,
          rowGap: 1,
          minWidth: 0,
          flex: { xs: '1 1 100%', lg: '0 1 auto' },
        }}
      >
        <Typography
          id={categoryLabelId}
          component="span"
          variant="body2"
          sx={labelStyle}
        >
          {t('filter.title')}
        </Typography>
        <Box
          sx={{
            // Lets the row of buttons scroll sideways when it does not
            // fit; on a phone it takes a row of its own.
            flex: { xs: '1 0 100%', md: '0 1 auto' },
            minWidth: 0,
            overflowX: 'auto',
            // Room for the focus ring, which the scroll box would cut.
            p: 0.75,
            m: -0.75,
          }}
        >
          <CategoryFilter
            categories={categories}
            selected={query.category}
            onSelect={onSelectCategory}
            labelledBy={categoryLabelId}
          />
        </Box>
      </Box>

      {/* Order on the left of this group, result count at the right end. */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          columnGap: 3,
          rowGap: 1,
          flex: { xs: '1 1 100%', lg: '1 1 auto' },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            ml: { lg: 'auto' },
          }}
        >
          <Typography
            id={sortLabelId}
            component="span"
            variant="body2"
            sx={labelStyle}
          >
            {t('sort.title')}
          </Typography>
          <SortSelect
            value={query.sort}
            onChange={onSelectSort}
            labelledBy={sortLabelId}
          />
        </Box>
        <Box sx={{ ml: 'auto', textAlign: 'right' }}>
          {total !== undefined && <ResultSummary total={total} query={query} />}
        </Box>
      </Box>
    </Box>
  );
}
