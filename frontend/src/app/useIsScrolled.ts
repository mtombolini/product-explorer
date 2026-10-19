import useScrollTrigger from '@mui/material/useScrollTrigger';

/** Scroll distance, in pixels, after which the header becomes compact. */
const SCROLL_THRESHOLD = 24;

/**
 * True once the page has been scrolled a little. The header uses it to
 * become compact, and the filter bar to stay right below the header.
 */
export function useIsScrolled(): boolean {
  // disableHysteresis: only the position counts, not the direction.
  return useScrollTrigger({
    disableHysteresis: true,
    threshold: SCROLL_THRESHOLD,
  });
}
