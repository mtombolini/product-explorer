import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
import { ProductSpecifications } from '../features/products/components/ProductSpecifications';
import { TopRatedBadge } from '../features/products/components/TopRatedBadge';
import { formatPrice, isTopRated } from '../features/products/format';
import { fetchProduct } from '../features/products/productsSlice';
import {
  selectProduct,
  selectLanguage,
  selectProductDetail,
} from '../features/products/selectors';
import { categoryName } from '../i18n/categoryNames';
import { errorDescription } from '../i18n/errorDescription';

/** The largest product id, the same limit as the API. */
const MAX_PRODUCT_ID = 2_147_483_647;

/**
 * "12" -> 12. Anything that is not a positive whole number the API
 * accepts -> null.
 */
function parseProductId(value: string | undefined): number | null {
  if (value === undefined || !/^[1-9]\d{0,9}$/.test(value)) return null;
  const id = Number(value);
  return id > MAX_PRODUCT_ID ? null : id;
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
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  if (cameFromCatalogue(location.state)) {
    return (
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)}>
        {t('product.back')}
      </Button>
    );
  }
  return (
    <Button
      component={RouterLink}
      to={CATALOGUE_PATH}
      startIcon={<ArrowBackIcon />}
    >
      {t('product.back')}
    </Button>
  );
}

interface ProductViewProps {
  product: Product;
}

/** Two columns on desktop (image, then information), stacked on mobile. */
function ProductView({ product }: ProductViewProps) {
  const { t, i18n } = useTranslation();

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
      {/* The text alternative is the product name, in English too. */}
      <Box lang={product.language}>
        <ProductImage src={product.image_url} alt={product.title} eager />
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography color="text.secondary">
          {categoryName(product.category, i18n.language)}
        </Typography>
        {/* The text may be a translation or the original: the API says
            which language it is, for correct pronunciation. */}
        <PageHeading lang={product.language}>{product.title}</PageHeading>
        <Typography sx={{ fontSize: '2rem', fontWeight: 'bold' }}>
          {formatPrice(product.price, i18n.language)}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <ProductRating
            rate={product.rating_rate}
            count={product.rating_count}
          />
          {isTopRated(product) && <TopRatedBadge />}
        </Box>
        {/* The facts first, as a list that can be scanned; then the
            description, for whoever wants to read on. */}
        <ProductSpecifications
          specifications={product.specifications}
          language={product.specifications_language}
        />
        {product.description && (
          <Box component="section">
            <Typography component="h2" variant="h3" sx={{ mb: 1 }}>
              {t('product.description')}
            </Typography>
            <Typography
              lang={product.language}
              sx={{ maxWidth: layout.readingWidth }}
            >
              {product.description}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}

/** Same two-column shape as the product, shown while it loads. */
function ProductViewSkeleton() {
  const { t } = useTranslation();

  return (
    <Box
      aria-label={t('product.loading')}
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
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const productId = parseProductId(useParams().id);

  const product = useAppSelector((state) =>
    productId === null ? undefined : selectProduct(state, productId),
  );
  const detail = useAppSelector((state) =>
    productId === null ? undefined : selectProductDetail(state, productId),
  );
  const language = useAppSelector(selectLanguage);

  const isNotFound = productId === null || detail?.notFound === true;
  const hasFailed = detail?.status === 'failed' && !isNotFound;

  useDocumentTitle(
    product
      ? product.title
      : isNotFound
        ? t('product.notFoundTitle')
        : t('product.title'),
  );

  // The thunk skips the request when the product is already in the store.
  useEffect(() => {
    if (productId !== null) {
      dispatch(fetchProduct({ id: productId, language }));
    }
  }, [dispatch, productId, language]);

  function renderContent() {
    if (product) {
      return <ProductView product={product} />;
    }
    if (isNotFound) {
      return (
        <>
          <PageHeading>{t('product.notFoundTitle')}</PageHeading>
          <Typography sx={{ mt: 2 }}>
            {t('product.notFoundDescription')}
          </Typography>
        </>
      );
    }
    if (hasFailed && productId !== null) {
      return (
        <StatusMessage
          tone="error"
          title={t('product.errorTitle')}
          description={errorDescription(detail?.errorCode ?? null, t)}
          actionLabel={t('actions.tryAgain')}
          onAction={() => dispatch(fetchProduct({ id: productId, language }))}
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
