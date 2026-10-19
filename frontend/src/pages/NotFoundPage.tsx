import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router';

import { PageHeading } from '../components/PageHeading';
import { useDocumentTitle } from '../app/useDocumentTitle';

/** Shown for any address that is not a page of the application. */
export function NotFoundPage() {
  const { t } = useTranslation();
  useDocumentTitle(t('notFound.title'));

  return (
    <>
      <PageHeading>{t('notFound.title')}</PageHeading>
      <Typography sx={{ mt: 2, mb: 3 }}>{t('notFound.description')}</Typography>
      <Button component={RouterLink} to="/products" variant="contained">
        {t('notFound.action')}
      </Button>
    </>
  );
}
