import Box from '@mui/material/Box';
import { visuallyHidden } from '@mui/utils';
import { useTranslation } from 'react-i18next';

import { formatPrice, priceParts } from '../format';

interface ProductPriceProps {
  price: number;
  /** The large form of the product page; the card uses the small one. */
  large?: boolean;
}

/**
 * The price, set apart from the product name next to it: the amount is
 * large and the currency small and light. Screen readers get the price
 * as one plain text.
 */
export function ProductPrice({ price, large = false }: ProductPriceProps) {
  const { i18n } = useTranslation();

  return (
    <Box
      component="p"
      sx={{ m: 0, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}
    >
      <Box component="span" aria-hidden>
        {priceParts(price, i18n.language).map((part, index) => (
          <Box
            component="span"
            // The parts of one price never change order.
            key={index}
            sx={
              part.isCurrency
                ? { fontSize: large ? '1.125rem' : '0.875rem' }
                : { fontSize: large ? '2.5rem' : '1.5rem', fontWeight: 'bold' }
            }
          >
            {part.text}
          </Box>
        ))}
      </Box>
      <Box component="span" sx={visuallyHidden}>
        {formatPrice(price, i18n.language)}
      </Box>
    </Box>
  );
}
