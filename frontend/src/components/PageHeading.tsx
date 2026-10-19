import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

interface PageHeadingProps {
  children: ReactNode;
  /** Set when the heading is in another language than the interface. */
  lang?: string;
}

/**
 * The single h1 of a page. It can receive focus from code (tabIndex -1),
 * which is how focus is moved to the new page after a route change.
 */
export function PageHeading({ children, lang }: PageHeadingProps) {
  return (
    <Typography
      component="h1"
      variant="h1"
      tabIndex={-1}
      lang={lang}
      sx={{ overflowWrap: 'anywhere' }}
    >
      {children}
    </Typography>
  );
}
