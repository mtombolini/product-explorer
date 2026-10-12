import Link from '@mui/material/Link';

/** The id of the main landmark, the target of the skip link. */
export const MAIN_CONTENT_ID = 'main-content';

/**
 * First focusable element of every page: lets keyboard users jump over
 * the header straight to the content. Hidden until it receives focus.
 */
export function SkipLink() {
  return (
    <Link
      href={`#${MAIN_CONTENT_ID}`}
      sx={{
        position: 'absolute',
        left: 16,
        top: 16,
        zIndex: 'tooltip',
        px: 2,
        py: 1,
        borderRadius: 1,
        bgcolor: 'background.paper',
        color: 'primary.main',
        fontWeight: 'bold',
        // Moved off screen until focused, then shown on top of the header.
        transform: 'translateY(-200%)',
        '&:focus': { transform: 'none' },
      }}
    >
      Skip to main content
    </Link>
  );
}
