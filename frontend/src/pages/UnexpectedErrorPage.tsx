import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

import { layout } from '../app/theme';

/**
 * Last resort: shown by the router when a page fails to render because
 * of a bug. A plain message is better than a blank or technical screen.
 */
export function UnexpectedErrorPage() {
  const { t } = useTranslation();

  return (
    <Box
      component="main"
      sx={{ maxWidth: layout.readingWidth, mx: 'auto', p: 4 }}
    >
      <Typography component="h1" variant="h1" gutterBottom>
        {t('crash.title')}
      </Typography>
      <Typography sx={{ mb: 3 }}>{t('crash.description')}</Typography>
      <Button variant="contained" onClick={() => window.location.reload()}>
        {t('crash.action')}
      </Button>
    </Box>
  );
}
