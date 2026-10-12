import Box from '@mui/material/Box';
import { motion } from 'motion/react';
import type { ReactNode } from 'react';

import type { Product } from '../../../api/types';
import { motionTokens } from '../../../app/motion';
import { ProductCard } from './ProductCard';

/** The widest grid has four columns; the stagger restarts on each row. */
const MAX_COLUMNS = 4;

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
      {products.map((product, index) => (
        // Each card fades in and rises a little the first time it enters
        // the viewport, slightly after its left neighbour.
        <motion.li
          key={product.id}
          initial={{ opacity: 0, y: motionTokens.revealOffset }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{
            duration: motionTokens.duration.slow,
            ease: motionTokens.ease,
            delay: (index % MAX_COLUMNS) * motionTokens.stagger,
          }}
        >
          <ProductCard product={product} listUrl={listUrl} />
        </motion.li>
      ))}
    </GridList>
  );
}
