import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { layout } from '../app/theme';

/**
 * Last resort: shown by the router when a page fails to render because
 * of a bug. A plain message is better than a blank or technical screen.
 */
export function UnexpectedErrorPage() {
  return (
    <Box
      component="main"
      sx={{ maxWidth: layout.readingWidth, mx: 'auto', p: 4 }}
    >
      <Typography component="h1" variant="h1" gutterBottom>
        Something went wrong
      </Typography>
      <Typography sx={{ mb: 3 }}>
        The page could not be shown. Reloading usually fixes it.
      </Typography>
      <Button variant="contained" onClick={() => window.location.reload()}>
        Reload the page
      </Button>
    </Box>
  );
}
