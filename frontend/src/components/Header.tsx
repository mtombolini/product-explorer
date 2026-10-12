import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router';

import { layout } from '../app/theme';

interface HeaderProps {
  /** The search field, shown next to the brand. */
  search: ReactNode;
}

/**
 * The sticky page header: brand link and search. It stays visible while
 * the page scrolls, so search is always within reach.
 */
export function Header({ search }: HeaderProps) {
  return (
    <Box
      component="header"
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 'appBar',
        bgcolor: 'primary.main',
        color: 'primary.contrastText',
        // The blue focus ring would not show on the blue header.
        '& :focus-visible': { outlineColor: 'secondary.main' },
      }}
    >
      <Container
        maxWidth={false}
        sx={{
          maxWidth: layout.contentMaxWidth,
          minHeight: layout.headerHeight.regular,
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          columnGap: 3,
          rowGap: 1,
          py: 1.5,
        }}
      >
        <Link
          component={RouterLink}
          to="/products"
          underline="none"
          color="inherit"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 1.5,
            minHeight: layout.touchTarget,
            fontWeight: 'bold',
            fontSize: '1.25rem',
          }}
        >
          {/* Original mark: a plain yellow tile, decorative only. */}
          <Box
            aria-hidden
            sx={{
              width: 28,
              height: 28,
              borderRadius: 0.75,
              bgcolor: 'secondary.main',
            }}
          />
          Product Explorer
        </Link>
        <Box sx={{ flex: '1 1 260px', maxWidth: 560, ml: { sm: 'auto' } }}>
          {search}
        </Box>
      </Container>
    </Box>
  );
}
