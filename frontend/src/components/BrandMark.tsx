import Box from '@mui/material/Box';

interface BrandMarkProps {
  /** Width and height in pixels. */
  size?: number;
}

/**
 * The mark of the application, drawn for this project: a catalogue grid
 * whose fourth cell is a magnifying glass, for "exploring products". It
 * takes the yellow accent of the theme.
 *
 * Decorative: the link around it carries the accessible name.
 */
export function BrandMark({ size = 30 }: BrandMarkProps) {
  return (
    <Box
      component="svg"
      viewBox="0 0 32 32"
      aria-hidden
      focusable="false"
      sx={{
        width: size,
        height: size,
        flexShrink: 0,
        color: 'secondary.main',
      }}
    >
      <rect x="2" y="2" width="12" height="12" rx="3" fill="currentColor" />
      <rect x="18" y="2" width="12" height="12" rx="3" fill="currentColor" />
      <rect x="2" y="18" width="12" height="12" rx="3" fill="currentColor" />
      <circle
        cx="23"
        cy="23"
        r="4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        d="M26.6 26.6 30 30"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </Box>
  );
}
