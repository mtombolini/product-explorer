import Box from '@mui/material/Box';
import { useState } from 'react';

const PLACEHOLDER_URL = '/placeholder.svg';

interface ProductImageProps {
  /** Image path on our own origin, or null when there is no image. */
  src: string | null;
  /**
   * Text alternative. Pass an empty string when the product name is
   * already written next to the image, so it is not read twice.
   */
  alt: string;
  /** Load at once instead of when it nears the viewport. */
  eager?: boolean;
}

/**
 * A product picture in a square box of fixed proportions.
 *
 * The source pictures have very different shapes, so the box reserves the
 * space (no layout shift) and the picture is fitted inside it whole. A
 * missing or broken picture is replaced by a neutral placeholder.
 */
export function ProductImage({ src, alt, eager = false }: ProductImageProps) {
  const [hasLoaded, setHasLoaded] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);

  const showPlaceholder = src === null || hasFailed;

  return (
    <Box
      sx={{
        aspectRatio: '1 / 1',
        bgcolor: 'grey.100',
        borderRadius: 1,
        overflow: 'hidden',
        p: showPlaceholder ? 0 : 2,
      }}
    >
      <Box
        component="img"
        src={showPlaceholder ? PLACEHOLDER_URL : src}
        alt={showPlaceholder ? '' : alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={() => setHasLoaded(true)}
        onError={() => setHasFailed(true)}
        sx={{
          display: 'block',
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          // The pictures are cut-outs on white: multiply lets the grey
          // box show through instead of a white rectangle.
          mixBlendMode: 'multiply',
          opacity: hasLoaded ? 1 : 0,
          transition: (theme) =>
            theme.transitions.create('opacity', { duration: 200 }),
        }}
      />
    </Box>
  );
}
