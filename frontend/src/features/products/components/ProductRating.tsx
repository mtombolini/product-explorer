import StarIcon from '@mui/icons-material/Star';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { visuallyHidden } from '@mui/utils';

interface ProductRatingProps {
  rate: number | null;
  count: number | null;
}

/**
 * The rating as a star, a number and the number of ratings. Screen
 * readers get a full sentence instead of the compact visual form.
 */
export function ProductRating({ rate, count }: ProductRatingProps) {
  if (rate === null) {
    return (
      <Typography variant="body2" color="text.secondary">
        No ratings yet
      </Typography>
    );
  }

  const value = rate.toFixed(1);
  const ratings = count ?? 0;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <StarIcon aria-hidden fontSize="small" />
      <Typography variant="body2" component="span" aria-hidden>
        {value} ({ratings})
      </Typography>
      <Box component="span" sx={visuallyHidden}>
        Rated {value} out of 5 by {ratings} customers
      </Box>
    </Box>
  );
}
