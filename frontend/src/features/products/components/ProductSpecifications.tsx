import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { visuallyHidden } from '@mui/utils';
import { Fragment, useId } from 'react';
import { useTranslation } from 'react-i18next';

import type { ProductSpecification } from '../../../api/types';

interface ProductSpecificationsProps {
  specifications: ProductSpecification[];
  /** The language the labels and values are written in. */
  language: string;
}

interface SpecificationGroup {
  name: string;
  lines: ProductSpecification[];
}

/** Lines that follow each other with the same group form one group. */
function groupLines(
  specifications: ProductSpecification[],
): SpecificationGroup[] {
  const groups: SpecificationGroup[] = [];
  for (const line of specifications) {
    const last = groups.at(-1);
    if (last?.name === line.group) {
      last.lines.push(line);
    } else {
      groups.push({ name: line.group, lines: [line] });
    }
  }
  return groups;
}

/**
 * The facts of a product as lists of label and value, which are quicker
 * to scan than a paragraph. The lines come from a taxonomy: a general
 * group that every product has, then the group of its product family.
 * Products of one family show the same lines, so a line the source says
 * nothing about is shown with a dash. Each list is a description list
 * (dl), so assistive technology reads each value with its label.
 *
 * Renders nothing when the product has no specifications.
 */
export function ProductSpecifications({
  specifications,
  language,
}: ProductSpecificationsProps) {
  const { t, i18n } = useTranslation();
  const headingId = useId();

  if (specifications.length === 0) return null;

  return (
    <Box component="section" aria-labelledby={headingId}>
      <Typography id={headingId} component="h2" variant="h3" sx={{ mb: 1 }}>
        {t('product.specifications')}
      </Typography>
      {/* The groups, labels and values are catalogue text: a
          translation or the original. */}
      <Box
        lang={language}
        sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
      >
        {groupLines(specifications).map((group) => (
          <Box key={group.name}>
            <Typography
              component="h3"
              variant="body2"
              sx={{
                fontWeight: 'bold',
                bgcolor: 'grey.100',
                px: 1.5,
                py: 0.75,
                borderRadius: 1,
              }}
            >
              {group.name}
            </Typography>
            <Box
              component="dl"
              sx={{
                m: 0,
                px: 1.5,
                display: 'grid',
                // Label and value side by side; stacked on a phone.
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'minmax(9rem, 14rem) 1fr',
                },
              }}
            >
              {group.lines.map((line) => (
                <Fragment key={line.key}>
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
                    {line.label}
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
                    {line.value ?? (
                      // Interface text, inside catalogue text.
                      <Box component="span" lang={i18n.language}>
                        <Box
                          component="span"
                          aria-hidden
                          sx={{ color: 'text.secondary' }}
                        >
                          —
                        </Box>
                        <Box component="span" sx={visuallyHidden}>
                          {t('product.notSpecified')}
                        </Box>
                      </Box>
                    )}
                  </Typography>
                </Fragment>
              ))}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
