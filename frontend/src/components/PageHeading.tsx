import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

interface PageHeadingProps {
  children: ReactNode;
}

/**
 * The single h1 of a page. It can receive focus from code (tabIndex -1),
 * which is how focus is moved to the new page after a route change.
 */
export function PageHeading({ children }: PageHeadingProps) {
  return (
    <Typography
      component="h1"
      variant="h1"
      tabIndex={-1}
      sx={{ overflowWrap: 'anywhere' }}
    >
      {children}
    </Typography>
  );
}
