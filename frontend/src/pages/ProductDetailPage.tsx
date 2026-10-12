import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { useEffect } from 'react';
import {
  Link as RouterLink,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router';

import type { Product } from '../api/types';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { layout } from '../app/theme';
import { useDocumentTitle } from '../app/useDocumentTitle';
import { PageHeading } from '../components/PageHeading';
import { StatusMessage } from '../components/StatusMessage';
import { CATALOGUE_PATH } from '../features/products/catalogueUrl';
import { ProductImage } from '../features/products/components/ProductImage';
import { ProductRating } from '../features/products/components/ProductRating';
import { TopRatedBadge } from '../features/products/components/TopRatedBadge';
import {
  formatCategory,
  formatPrice,
  isTopRated,
} from '../features/products/format';
import { fetchProduct } from '../features/products/productsSlice';
import {
  selectProduct,
  selectProductDetail,
} from '../features/products/selectors';

/** "12" -> 12. Anything that is not a positive whole number -> null. */
function parseProductId(value: string | undefined): number | null {
  if (value === undefined || !/^[1-9]\d{0,9}$/.test(value)) return null;
  return Number(value);
}

/** True when the user arrived here by clicking a card in the catalogue. */
function cameFromCatalogue(state: unknown): boolean {
  return (
    typeof state === 'object' &&
    state !== null &&
    'from' in state &&
    typeof state.from === 'string'
  );
}

/**
 * The way back to the list. Coming from the catalogue it goes back in
 * history, which restores the same search, category, page and scroll
 * position without a request. On a direct visit it links to the
 * catalogue.
 */
function BackToProducts() {
  const location = useLocation();
  const navigate = useNavigate();

  if (cameFromCatalogue(location.state)) {
    return (
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)}>
        Back to products
      </Button>
    );
  }
  return (
    <Button
      component={RouterLink}
      to={CATALOGUE_PATH}
      startIcon={<ArrowBackIcon />}
    >
      Back to products
    </Button>
  );
}

interface ProductViewProps {
  product: Product;
}

/** Two columns on desktop (image, then information), stacked on mobile. */
function ProductView({ product }: ProductViewProps) {
  return (
    <Box
      component="article"
      sx={{
        display: 'grid',
        gap: { xs: 3, md: 6 },
        gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) minmax(0, 1fr)' },
        alignItems: 'start',
      }}
    >
      <ProductImage src={product.image_url} alt={product.title} eager />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography color="text.secondary">
          {formatCategory(product.category)}
        </Typography>
        <PageHeading>{product.title}</PageHeading>
        <Typography sx={{ fontSize: '2rem', fontWeight: 'bold' }}>
          {formatPrice(product.price)}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <ProductRating
            rate={product.rating_rate}
            count={product.rating_count}
          />
          {isTopRated(product) && <TopRatedBadge />}
        </Box>
        <Typography sx={{ maxWidth: layout.readingWidth }}>
          {product.description}
        </Typography>
      </Box>
    </Box>
  );
}

/** Same two-column shape as the product, shown while it loads. */
function ProductViewSkeleton() {
  return (
    <Box
      aria-label="Loading product"
      role="status"
      sx={{
        display: 'grid',
        gap: { xs: 3, md: 6 },
        gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) minmax(0, 1fr)' },
      }}
    >
      <Skeleton
        variant="rounded"
        sx={{ aspectRatio: '1 / 1', height: 'auto' }}
      />
      <Box>
        <Skeleton width="30%" />
        <Skeleton height={72} />
        <Skeleton width="25%" height={56} />
        <Skeleton width="35%" />
        <Skeleton height={120} />
      </Box>
    </Box>
  );
}

/**
 * The page of one product.
 *
 * A product that was already seen in a list is in the store and renders
 * at once, with no request. On a direct visit the product is fetched
 * once. Unknown and malformed ids show a not-found message.
 */
export function ProductDetailPage() {
  const dispatch = useAppDispatch();
  const productId = parseProductId(useParams().id);

  const product = useAppSelector((state) =>
    productId === null ? undefined : selectProduct(state, productId),
  );
  const detail = useAppSelector((state) =>
    productId === null ? undefined : selectProductDetail(state, productId),
  );

  const isNotFound = productId === null || detail?.notFound === true;
  const hasFailed = detail?.status === 'failed' && !isNotFound;

  useDocumentTitle(
    product ? product.title : isNotFound ? 'Product not found' : 'Product',
  );

  // The thunk skips the request when the product is already in the store.
  useEffect(() => {
    if (productId !== null) {
      dispatch(fetchProduct(productId));
    }
  }, [dispatch, productId]);

  function renderContent() {
    if (product) {
      return <ProductView product={product} />;
    }
    if (isNotFound) {
      return (
        <>
          <PageHeading>Product not found</PageHeading>
          <Typography sx={{ mt: 2 }}>
            This product does not exist or is no longer in the catalogue.
          </Typography>
        </>
      );
    }
    if (hasFailed && productId !== null) {
      return (
        <StatusMessage
          tone="error"
          title="The product could not be loaded"
          description={detail?.error ?? 'Please try again.'}
          actionLabel="Try again"
          onAction={() => dispatch(fetchProduct(productId))}
        />
      );
    }
    return <ProductViewSkeleton />;
  }

  return (
    <>
      <Box sx={{ mb: 2, ml: -1 }}>
        <BackToProducts />
      </Box>
      {renderContent()}
    </>
  );
}
