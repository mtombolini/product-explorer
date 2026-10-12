import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import { motion } from 'motion/react';
import { useEffect, useRef } from 'react';
import { Outlet, ScrollRestoration, useLocation } from 'react-router';

import { motionTokens } from '../app/motion';
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
  const { pathname } = useLocation();
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
          {/* The key restarts the short fade when the page (not the
              search or the filter) changes. */}
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: motionTokens.revealOffset / 2 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: motionTokens.duration.base,
              ease: motionTokens.ease,
            }}
          >
            <Outlet />
          </motion.div>
        </Container>
      </Box>
      <Footer />
      {/* Back and forward restore the scroll position; a new page
          starts at the top. */}
      <ScrollRestoration />
    </>
  );
}
