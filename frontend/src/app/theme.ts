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
/** Edge of a control: dark enough to be seen against white (4.5:1). */
const CONTROL_LINE = '#767676';
const WHITE = '#FFFFFF';

/**
 * Heights of controls, in pixels. With a mouse they are compact. On a
 * touch screen (the `pointer: coarse` media query) they grow to 44px,
 * the smallest size that is comfortable for a finger.
 */
const CONTROL_HEIGHT = 40;
const COMPACT_CONTROL_HEIGHT = 36;
const TOUCH_TARGET = 44;
const TOUCH_SCREEN = '@media (pointer: coarse)';

/** Layout values shared by several components. */
export const layout = {
  /** Widest the content is allowed to grow, in pixels. */
  contentMaxWidth: 1360,
  /**
   * Height of the fixed header: full at the top of the page, compact
   * after scrolling. On phones the full header has two rows. In rem, so
   * it grows with the reader's font size.
   */
  headerHeight: {
    phone: { regular: '7.5rem', compact: '3.75rem' },
    wide: { regular: '4.5rem', compact: '3.5rem' },
  },
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
  // Slightly rounded corners everywhere; no pill shapes.
  shape: { borderRadius: 6 },
  typography: {
    fontFamily: '"Noto Sans", system-ui, -apple-system, "Segoe UI", sans-serif',
    // Only the two weights that are shipped with the application.
    fontWeightLight: 400,
    fontWeightRegular: 400,
    fontWeightMedium: 700,
    fontWeightBold: 700,
    // Headings grow with the viewport between a minimum and a maximum.
    h1: {
      fontSize: 'clamp(1.625rem, 1.35rem + 1.2vw, 2.125rem)',
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
        // MUI removes the outline of its own controls and marks keyboard
        // focus with a class instead, so those classes are listed too.
        ':focus-visible, .MuiButtonBase-root.Mui-focusVisible, .MuiInputBase-root.Mui-focused':
          {
            outline: `3px solid ${BLUE}`,
            outlineOffset: 2,
          },
        // People who ask their system for less motion get none of the
        // non-essential animation: transitions, ripples, shimmer and
        // smooth scrolling all become instant. (The Motion library is
        // told the same thing through MotionConfig.)
        '@media (prefers-reduced-motion: reduce)': {
          '*, *::before, *::after': {
            animationDuration: '0.01ms !important',
            animationIterationCount: '1 !important',
            transitionDuration: '0.01ms !important',
            scrollBehavior: 'auto !important',
          },
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        // The default placeholder is too pale to read comfortably.
        input: { '&::placeholder': { color: INK_SOFT, opacity: 1 } },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          minHeight: CONTROL_HEIGHT,
          [TOUCH_SCREEN]: { minHeight: TOUCH_TARGET },
        },
        // On touch screens the field itself, not only the box around
        // it, is 44px tall: 23px of text plus this padding.
        input: { [TOUCH_SCREEN]: { paddingBlock: 10.5 } },
      },
    },
    // The sort select of the toolbar: as tall as the buttons next to it.
    MuiSelect: {
      styleOverrides: {
        root: {
          minHeight: COMPACT_CONTROL_HEIGHT,
          [TOUCH_SCREEN]: { minHeight: TOUCH_TARGET },
        },
        select: { paddingBlock: 6.5 },
      },
    },
    MuiSkeleton: {
      // A light sweep across the placeholder instead of a pulse.
      defaultProps: { animation: 'wave' },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          minHeight: CONTROL_HEIGHT,
          paddingInline: 20,
          [TOUCH_SCREEN]: { minHeight: TOUCH_TARGET },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          minWidth: CONTROL_HEIGHT,
          minHeight: CONTROL_HEIGHT,
          [TOUCH_SCREEN]: { minWidth: TOUCH_TARGET, minHeight: TOUCH_TARGET },
        },
      },
    },
    // The category filter: joined rectangular buttons, one of them filled.
    MuiToggleButton: {
      styleOverrides: {
        root: {
          minHeight: COMPACT_CONTROL_HEIGHT,
          paddingBlock: 0,
          paddingInline: 14,
          color: INK,
          borderColor: CONTROL_LINE,
          fontWeight: 400,
          whiteSpace: 'nowrap',
          [TOUCH_SCREEN]: { minHeight: TOUCH_TARGET },
          '&.Mui-selected, &.Mui-selected:hover': {
            backgroundColor: BLUE,
            borderColor: BLUE,
            color: WHITE,
          },
        },
      },
    },
    MuiPaginationItem: {
      styleOverrides: {
        root: {
          minWidth: COMPACT_CONTROL_HEIGHT,
          height: COMPACT_CONTROL_HEIGHT,
          fontSize: '1rem',
          [TOUCH_SCREEN]: { minWidth: TOUCH_TARGET, height: TOUCH_TARGET },
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          minHeight: CONTROL_HEIGHT,
          [TOUCH_SCREEN]: { minHeight: TOUCH_TARGET },
        },
      },
    },
    MuiLink: {
      defaultProps: { underline: 'always' },
    },
  },
});
