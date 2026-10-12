import Box from '@mui/material/Box';
import type { ReactNode } from 'react';

import type { Product } from '../../../api/types';
import { ProductCard } from './ProductCard';

interface GridListProps {
  children: ReactNode;
  label: string;
}

/**
 * The responsive list shared by the real grid and its skeleton:
 * 1 column on phones, then 2, 3 and 4 as the screen widens.
 */
export function GridList({ children, label }: GridListProps) {
  return (
    <Box
      component="ul"
      aria-label={label}
      sx={{
        listStyle: 'none',
        m: 0,
        p: 0,
        display: 'grid',
        gap: { xs: 2, md: 3 },
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(2, 1fr)',
          md: 'repeat(3, 1fr)',
          lg: 'repeat(4, 1fr)',
        },
      }}
    >
      {children}
    </Box>
  );
}

interface ProductGridProps {
  products: Product[];
  /** Address of the current list, passed on to each card. */
  listUrl: string;
}

/** The products of one catalogue page, as a list of cards. */
export function ProductGrid({ products, listUrl }: ProductGridProps) {
  return (
    <GridList label="Products">
      {products.map((product) => (
        <li key={product.id}>
          <ProductCard product={product} listUrl={listUrl} />
        </li>
      ))}
    </GridList>
  );
}
