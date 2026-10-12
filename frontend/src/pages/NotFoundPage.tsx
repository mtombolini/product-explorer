import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router';

import { PageHeading } from '../components/PageHeading';
import { useDocumentTitle } from '../app/useDocumentTitle';

/** Shown for any address that is not a page of the application. */
export function NotFoundPage() {
  useDocumentTitle('Page not found');

  return (
    <>
      <PageHeading>Page not found</PageHeading>
      <Typography sx={{ mt: 2, mb: 3 }}>
        This address does not match any page. Check the link or go back to the
        catalogue.
      </Typography>
      <Button component={RouterLink} to="/products" variant="contained">
        Go to products
      </Button>
    </>
  );
}
