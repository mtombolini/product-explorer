import Box from '@mui/material/Box';
import Rating from '@mui/material/Rating';
import Typography from '@mui/material/Typography';
import { visuallyHidden } from '@mui/utils';
import { useTranslation } from 'react-i18next';

import { formatRating } from '../format';

interface ProductRatingProps {
  rate: number | null;
  count: number | null;
  /** The product page spells out the number of ratings. */
  detailed?: boolean;
}

/**
 * The rating as five stars filled up to the score, the score and the
 * number of ratings. Screen readers get a full sentence instead of the
 * visual form.
 */
export function ProductRating({
  rate,
  count,
  detailed = false,
}: ProductRatingProps) {
  const { t, i18n } = useTranslation();

  if (rate === null) {
    return (
      <Typography variant="body2" color="text.secondary">
        {t('product.noRatings')}
      </Typography>
    );
  }

  const value = formatRating(rate, i18n.language);
  const ratings = count ?? 0;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
      <Box
        aria-hidden
        sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}
      >
        <Rating
          value={rate}
          precision={0.1}
          readOnly
          size={detailed ? 'medium' : 'small'}
          // Dark stars: the default amber is too pale on white.
          sx={{ color: 'text.primary' }}
        />
        <Typography
          variant={detailed ? 'body1' : 'body2'}
          component="span"
          sx={{ fontWeight: 'bold' }}
        >
          {value}
        </Typography>
        <Typography
          variant={detailed ? 'body1' : 'body2'}
          component="span"
          color="text.secondary"
        >
          {detailed
            ? t('product.ratingCount', { count: ratings })
            : `(${ratings})`}
        </Typography>
      </Box>
      <Box component="span" sx={visuallyHidden}>
        {t('product.ratingText', { rate: value, count: ratings })}
      </Box>
    </Box>
  );
}
