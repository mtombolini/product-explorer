import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router';

import { motionTokens } from '../app/motion';
import { layout } from '../app/theme';
import { useIsScrolled } from '../app/useIsScrolled';
import { BrandMark } from './BrandMark';
import { LanguageSwitcher } from './LanguageSwitcher';

interface HeaderProps {
  /** The search field, shown between the brand and the language menu. */
  search: ReactNode;
}

/**
 * The page header: brand, search and language. It is always visible and
 * becomes shorter once the user has scrolled, to leave room for the
 * products.
 *
 * It is `position: fixed`, with a spacer of constant height holding its
 * place in the page. Its own height can therefore change without moving
 * the content below. (A sticky header that changes height moves the
 * page, the browser corrects the scroll position, and near the top the
 * two keep undoing each other: the header visibly jitters.)
 */
export function Header({ search }: HeaderProps) {
  const { t } = useTranslation();
  const isScrolled = useIsScrolled();
  const size = isScrolled ? 'compact' : 'regular';

  return (
    <>
      <Box
        component="header"
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 'appBar',
          height: {
            xs: layout.headerHeight.phone[size],
            sm: layout.headerHeight.wide[size],
          },
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          // A shadow separates the header from the content under it.
          boxShadow: isScrolled ? 4 : 0,
          transition: (theme) =>
            theme.transitions.create(['height', 'box-shadow'], {
              duration: motionTokens.duration.base * 1000,
              easing: theme.transitions.easing.easeOut,
            }),
          // The blue focus ring would not show on the blue header.
          '& :focus-visible, & .MuiButtonBase-root.Mui-focusVisible, & .MuiInputBase-root:has(:focus-visible)':
            { outlineColor: 'secondary.main' },
        }}
      >
        <Container
          maxWidth={false}
          sx={{
            maxWidth: layout.contentMaxWidth,
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            alignContent: 'center',
            flexWrap: 'wrap',
            columnGap: { xs: 1, sm: 3 },
            rowGap: 1,
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
              fontSize: '1.25rem',
              // On phones the brand has its own row until the header is
              // compact; then search and language sit next to the mark.
              flexBasis: { xs: isScrolled ? 'auto' : '100%', sm: 'auto' },
            }}
          >
            <BrandMark />
            {/* The name in two weights. On phones it gives its place to
                the search field once the header is compact. */}
            <Box
              component="span"
              sx={{
                display: { xs: isScrolled ? 'none' : 'inline', sm: 'inline' },
                fontWeight: 'regular',
                letterSpacing: '-0.01em',
              }}
            >
              <Box component="span" sx={{ fontWeight: 'bold' }}>
                Product
              </Box>{' '}
              Explorer
            </Box>
          </Link>
          <Box
            sx={{
              flex: { xs: '1 1 120px', sm: '1 1 260px' },
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
      {/* Holds the place of the fixed header. Its height never changes. */}
      <Box
        aria-hidden
        sx={{
          height: {
            xs: layout.headerHeight.phone.regular,
            sm: layout.headerHeight.wide.regular,
          },
        }}
      />
    </>
  );
}
