import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import { useEffect, useRef } from 'react';
import { Outlet, ScrollRestoration, useLocation } from 'react-router';

import { layout } from '../app/theme';
import { SearchField } from '../features/products/components/SearchField';
import { Footer } from './Footer';
import { Header } from './Header';
import { MAIN_CONTENT_ID, SkipLink } from './SkipLink';

/**
 * After a change of page, move keyboard and screen reader focus to the
 * new page's heading (or to the main area while it is still loading).
 * Only the path counts: typing a search must not steal focus.
 */
function useFocusOnPageChange(): void {
  const { pathname } = useLocation();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const target =
      document.querySelector<HTMLElement>('main h1') ??
      document.getElementById(MAIN_CONTENT_ID);
    // preventScroll: the router restores the scroll position itself.
    target?.focus({ preventScroll: true });
  }, [pathname]);
}

/**
 * The frame shared by every page: skip link, header with search, the main
 * landmark where the current route renders, and the footer.
 */
export function AppLayout() {
  useFocusOnPageChange();

  return (
    <>
      <SkipLink />
      <Header search={<SearchField />} />
      <Box component="main" id={MAIN_CONTENT_ID} tabIndex={-1}>
        <Container
          maxWidth={false}
          sx={{ maxWidth: layout.contentMaxWidth, py: { xs: 3, md: 5 } }}
        >
          <Outlet />
        </Container>
      </Box>
      <Footer />
      {/* Back and forward restore the scroll position; a new page
          starts at the top. */}
      <ScrollRestoration />
    </>
  );
}
