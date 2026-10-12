import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router';

import { motionTokens } from '../app/motion';
import { layout } from '../app/theme';
import { useIsScrolled } from '../app/useIsScrolled';
import { LanguageSwitcher } from './LanguageSwitcher';

interface HeaderProps {
  /** The search field, shown next to the brand. */
  search: ReactNode;
}

/**
 * The sticky page header: brand link and search. It stays visible while
 * the page scrolls, so search is always within reach, and becomes more
 * compact once the user has scrolled, to leave room for the products.
 */
export function Header({ search }: HeaderProps) {
  const { t } = useTranslation();
  const isScrolled = useIsScrolled();

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
          minHeight: isScrolled
            ? layout.headerHeight.compact
            : layout.headerHeight.regular,
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          columnGap: { xs: 1.5, sm: 3 },
          rowGap: 1,
          py: isScrolled ? 0.5 : 1.5,
          transition: (theme) =>
            theme.transitions.create(['min-height', 'padding'], {
              duration: motionTokens.duration.base * 1000,
              easing: theme.transitions.easing.easeOut,
            }),
        }}
      >
        <Link
          component={RouterLink}
          to="/products"
          // The name stays the same when the visible text is hidden.
          aria-label={t('layout.homeLink')}
          underline="none"
          color="inherit"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 1.5,
            minHeight: layout.touchTarget,
            fontWeight: 'bold',
            fontSize: '1.25rem',
            // On phones the brand has its own row until the header is
            // compact; then search and language sit next to the mark.
            flexBasis: { xs: isScrolled ? 'auto' : '100%', sm: 'auto' },
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
          {/* On phones the name gives its place to the search field
              once the header is compact. */}
          <Box
            component="span"
            sx={{
              display: { xs: isScrolled ? 'none' : 'inline', sm: 'inline' },
            }}
          >
            Product Explorer
          </Box>
        </Link>
        <Box
          sx={{
            flex: { xs: '1 1 150px', sm: '1 1 260px' },
            minWidth: 0,
            maxWidth: { sm: 560 },
            ml: { sm: 'auto' },
          }}
        >
          {search}
        </Box>
        <LanguageSwitcher />
      </Container>
    </Box>
  );
}
