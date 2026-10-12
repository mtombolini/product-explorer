import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { layout } from '../app/theme';

/** Page footer: says where the catalogue data comes from. */
export function Footer() {
  return (
    <Box
      component="footer"
      sx={{ mt: 8, py: 4, borderTop: 1, borderColor: 'divider' }}
    >
      <Container maxWidth={false} sx={{ maxWidth: layout.contentMaxWidth }}>
        <Typography variant="body2" color="text.secondary">
          Product Explorer is a demonstration project. The catalogue was
          imported from Fake Store API and is served from our own database.
        </Typography>
      </Container>
    </Box>
  );
}
