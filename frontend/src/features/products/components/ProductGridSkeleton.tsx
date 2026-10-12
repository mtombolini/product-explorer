import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';

import { PAGE_SIZE } from '../../../api/products';
import { GridList } from './ProductGrid';

/**
 * Placeholder shown while a catalogue page loads. It uses the same grid
 * and the same card proportions as the real list, so nothing jumps when
 * the products arrive.
 */
export function ProductGridSkeleton() {
  return (
    <GridList label="Loading products">
      {Array.from({ length: PAGE_SIZE }, (_, index) => (
        <Box
          component="li"
          key={index}
          aria-hidden
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            p: 1.5,
            borderRadius: 2,
            border: 1,
            borderColor: 'divider',
          }}
        >
          <Skeleton
            variant="rounded"
            sx={{ aspectRatio: '1 / 1', height: 'auto' }}
          />
          <Skeleton width="40%" />
          <Skeleton height={48} />
          <Skeleton width="30%" height={36} />
          <Skeleton width="35%" />
        </Box>
      ))}
    </GridList>
  );
}
