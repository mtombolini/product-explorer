import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router';

import type { Product } from '../../../api/types';
import { formatCategory, formatPrice, isTopRated } from '../format';
import { ProductImage } from './ProductImage';
import { ProductRating } from './ProductRating';
import { TopRatedBadge } from './TopRatedBadge';

interface ProductCardProps {
  product: Product;
  /** Address of the list this card is shown in, for the way back. */
  listUrl: string;
}

/**
 * One product in the grid. The whole card is a single link to the
 * product page, so it is one stop for the keyboard and one large target
 * for touch.
 */
export function ProductCard({ product, listUrl }: ProductCardProps) {
  return (
    <Link
      component={RouterLink}
      to={`/product/${product.id}`}
      // The product page reads this to offer "Back to products".
      state={{ from: listUrl }}
      underline="none"
      color="inherit"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        height: '100%',
        p: 1.5,
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Box sx={{ position: 'relative' }}>
        {/* Empty alt: the title below already names the product. */}
        <ProductImage src={product.image_url} alt="" />
        {isTopRated(product) && (
          <Box sx={{ position: 'absolute', top: 8, left: 8 }}>
            <TopRatedBadge />
          </Box>
        )}
      </Box>
      <Typography variant="body2" color="text.secondary">
        {formatCategory(product.category)}
      </Typography>
      <Typography
        component="h2"
        variant="h3"
        sx={{
          // At most two lines, then an ellipsis.
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          // Reserve two lines so prices line up across a row.
          minHeight: '2.7em',
        }}
      >
        {product.title}
      </Typography>
      <Typography sx={{ fontSize: '1.375rem', fontWeight: 'bold' }}>
        {formatPrice(product.price)}
      </Typography>
      <ProductRating rate={product.rating_rate} count={product.rating_count} />
    </Link>
  );
}
