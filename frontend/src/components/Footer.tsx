import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

import { layout } from '../app/theme';

/** Page footer: says where the catalogue data comes from. */
export function Footer() {
  const { t } = useTranslation();

  return (
    <Box
      component="footer"
      sx={{ mt: 8, py: 4, borderTop: 1, borderColor: 'divider' }}
    >
      <Container maxWidth={false} sx={{ maxWidth: layout.contentMaxWidth }}>
        <Typography variant="body2" color="text.secondary">
          {t('layout.footer')}
        </Typography>
      </Container>
    </Box>
  );
}
