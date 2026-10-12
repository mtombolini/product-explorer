import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { Fragment, useId } from 'react';
import { useTranslation } from 'react-i18next';

import type { ProductSpecification } from '../../../api/types';

interface ProductSpecificationsProps {
  specifications: ProductSpecification[];
  /** The language the labels and values are written in. */
  language: string;
}

/**
 * The key facts of a product as a list of label and value, which is
 * quicker to scan than a paragraph. It is a description list (dl), so
 * assistive technology reads each value together with its label.
 *
 * Renders nothing when the product has no specifications.
 */
export function ProductSpecifications({
  specifications,
  language,
}: ProductSpecificationsProps) {
  const { t } = useTranslation();
  const headingId = useId();

  if (specifications.length === 0) return null;

  return (
    <Box component="section" aria-labelledby={headingId}>
      <Typography id={headingId} component="h2" variant="h3" sx={{ mb: 1 }}>
        {t('product.specifications')}
      </Typography>
      <Box
        component="dl"
        // The rows are catalogue text: a translation or the original.
        lang={language}
        sx={{
          m: 0,
          display: 'grid',
          // Label and value side by side; stacked on a phone.
          gridTemplateColumns: { xs: '1fr', sm: 'minmax(9rem, 14rem) 1fr' },
          borderTop: 1,
          borderColor: 'divider',
        }}
      >
        {specifications.map((specification) => (
          <Fragment key={specification.label}>
            <Typography
              component="dt"
              variant="body2"
              color="text.secondary"
              sx={{
                pt: 1,
                pb: { xs: 0, sm: 1 },
                pr: 2,
                borderBottom: { sm: 1 },
                borderColor: { sm: 'divider' },
              }}
            >
              {specification.label}
            </Typography>
            <Typography
              component="dd"
              sx={{
                m: 0,
                pt: { xs: 0, sm: 1 },
                pb: 1,
                borderBottom: 1,
                borderColor: 'divider',
              }}
            >
              {specification.value}
            </Typography>
          </Fragment>
        ))}
      </Box>
    </Box>
  );
}
