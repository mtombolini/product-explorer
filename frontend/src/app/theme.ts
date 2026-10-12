import { createTheme } from '@mui/material/styles';

/**
 * The one place where the look of the application is defined: colours,
 * type, spacing, shape and the component defaults. Components use these
 * tokens through the theme and never write raw values.
 */

/** Brand colours. Yellow is an accent and only ever sits behind dark text. */
const BLUE = '#0058A3';
const BLUE_DARK = '#00447F';
const YELLOW = '#FFDB00';
const INK = '#111111';
const INK_SOFT = '#484848';
const SURFACE = '#F5F5F5';
const LINE = '#DFDFDF';
const WHITE = '#FFFFFF';

/** Smallest comfortable size of anything that can be tapped. */
const TOUCH_TARGET = 44;

/** Layout values shared by several components. */
export const layout = {
  /** Widest the content is allowed to grow, in pixels. */
  contentMaxWidth: 1360,
  /** Height of the sticky header before and after scrolling. */
  headerHeight: { regular: 72, compact: 56 },
  /** Longest comfortable line of running text. */
  readingWidth: '68ch',
  touchTarget: TOUCH_TARGET,
} as const;

export const theme = createTheme({
  // Grid steps: 1 column, 2 from sm, 3 from md, 4 from lg.
  breakpoints: {
    values: { xs: 0, sm: 480, md: 768, lg: 1200, xl: 1536 },
  },
  palette: {
    primary: { main: BLUE, dark: BLUE_DARK, contrastText: WHITE },
    secondary: { main: YELLOW, contrastText: INK },
    text: { primary: INK, secondary: INK_SOFT },
    background: { default: WHITE, paper: WHITE },
    divider: LINE,
    grey: { 100: SURFACE },
  },
  // One unit of spacing is 8px: sx={{ p: 2 }} is 16px.
  spacing: 8,
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: '"Noto Sans", system-ui, -apple-system, "Segoe UI", sans-serif',
    // Only the two weights that are shipped with the application.
    fontWeightLight: 400,
    fontWeightRegular: 400,
    fontWeightMedium: 700,
    fontWeightBold: 700,
    // Headings grow with the viewport between a minimum and a maximum.
    h1: {
      fontSize: 'clamp(1.75rem, 1.4rem + 1.6vw, 2.5rem)',
      fontWeight: 700,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: 'clamp(1.375rem, 1.2rem + 0.8vw, 1.75rem)',
      fontWeight: 700,
      lineHeight: 1.25,
    },
    h3: { fontSize: '1.125rem', fontWeight: 700, lineHeight: 1.35 },
    body1: { fontSize: '1rem', lineHeight: 1.6 },
    body2: { fontSize: '0.875rem', lineHeight: 1.5 },
    // Sentence case everywhere: buttons are not upper-cased.
    button: { textTransform: 'none', fontWeight: 700, fontSize: '1rem' },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        // One clearly visible focus ring for every interactive element.
        ':focus-visible': {
          outline: `3px solid ${BLUE}`,
          outlineOffset: 2,
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { minHeight: TOUCH_TARGET, borderRadius: 999, paddingInline: 24 },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: { minWidth: TOUCH_TARGET, minHeight: TOUCH_TARGET },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          height: TOUCH_TARGET,
          borderRadius: 999,
          fontSize: '1rem',
          paddingInline: 4,
        },
      },
    },
    MuiPaginationItem: {
      styleOverrides: {
        root: {
          minWidth: TOUCH_TARGET,
          height: TOUCH_TARGET,
          borderRadius: 999,
          fontSize: '1rem',
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { minHeight: TOUCH_TARGET, borderRadius: 999 },
      },
    },
    MuiLink: {
      defaultProps: { underline: 'always' },
    },
  },
});
