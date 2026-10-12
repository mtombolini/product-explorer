import Box from '@mui/material/Box';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { useAppDispatch, useAppSelector } from '../app/hooks';
import { layout } from '../app/theme';
import { useDocumentTitle } from '../app/useDocumentTitle';
import { useIsScrolled } from '../app/useIsScrolled';
import { PageHeading } from '../components/PageHeading';
import { StatusMessage } from '../components/StatusMessage';
import { catalogueUrl } from '../features/products/catalogueUrl';
import { CataloguePagination } from '../features/products/components/CataloguePagination';
import { CategoryFilter } from '../features/products/components/CategoryFilter';
import { ProductGrid } from '../features/products/components/ProductGrid';
import { ProductGridSkeleton } from '../features/products/components/ProductGridSkeleton';
import { ResultSummary } from '../features/products/components/ResultSummary';
import {
  fetchCategories,
  fetchProductPage,
} from '../features/products/productsSlice';
import { queryKey } from '../features/products/queryKey';
import {
  selectCategories,
  selectPage,
  selectPageProducts,
} from '../features/products/selectors';
import { useCatalogueQuery } from '../features/products/useCatalogueQuery';
import { errorDescription } from '../i18n/errorDescription';

/**
 * The catalogue: search (in the header), category filter, product grid
 * and pagination. The address bar says what to show; this page loads it
 * into the store and renders one of four states: loading, error, empty
 * or the list.
 */
export function ProductsPage() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { query, setCategory, clearFilters, pageUrl } = useCatalogueQuery();
  const key = queryKey(query);
  const isScrolled = useIsScrolled();

  const page = useAppSelector((state) => selectPage(state, key));
  const products = useAppSelector((state) => selectPageProducts(state, key));
  const categories = useAppSelector(selectCategories);

  useDocumentTitle(t('catalogue.title'));

  // Load the page the address asks for. The thunk decides whether a
  // request is needed: a page already in the store is not fetched again.
  useEffect(() => {
    dispatch(fetchProductPage({ query }));
  }, [dispatch, query]);

  // The categories are the same for every view: loaded once.
  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  const isLoading = page === undefined || page.status === 'loading';
  const hasFilters = query.search !== '' || query.category !== '';

  /** Ask again for the page and for the categories, if they failed. */
  function retry(): void {
    dispatch(fetchProductPage({ query }));
    dispatch(fetchCategories());
  }

  function renderContent() {
    if (isLoading) {
      return <ProductGridSkeleton />;
    }
    if (page.status === 'failed') {
      return (
        <StatusMessage
          tone="error"
          title={t('catalogue.errorTitle')}
          description={errorDescription(page.errorCode, t)}
          actionLabel={t('actions.tryAgain')}
          onAction={retry}
        />
      );
    }
    if (page.total === 0 && !hasFilters) {
      return (
        <StatusMessage
          title={t('catalogue.emptyTitle')}
          description={t('catalogue.emptyDescription')}
          actionLabel={t('actions.tryAgain')}
          onAction={() => dispatch(fetchProductPage({ query, force: true }))}
        />
      );
    }
    if (page.total === 0) {
      return (
        <StatusMessage
          title={t('catalogue.noResultsTitle')}
          description={t('catalogue.noResultsDescription')}
          actionLabel={t('catalogue.clearFilters')}
          onAction={clearFilters}
        />
      );
    }
    if (products.length === 0) {
      // There are results, but not on this page number.
      return (
        <StatusMessage
          title={t('catalogue.pastEndTitle')}
          description={t('catalogue.pastEndDescription', {
            page: page.totalPages,
          })}
          actionLabel={t('catalogue.firstPage')}
          onAction={() => navigate(pageUrl(1))}
        />
      );
    }
    return (
      <>
        <ProductGrid products={products} listUrl={catalogueUrl(query)} />
        {page.totalPages > 1 && (
          <CataloguePagination
            page={query.page}
            totalPages={page.totalPages}
            pageUrl={pageUrl}
          />
        )}
      </>
    );
  }

  return (
    <>
      <PageHeading>{t('catalogue.title')}</PageHeading>
      <Box
        sx={{
          // On desktop the filters stay in view, right under the sticky
          // header, whose height depends on whether it is compact.
          position: { md: 'sticky' },
          top: {
            md: isScrolled
              ? layout.headerHeight.compact
              : layout.headerHeight.regular,
          },
          zIndex: 1,
          bgcolor: 'background.default',
          py: 2,
          mb: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
        }}
      >
        <CategoryFilter
          categories={categories.items}
          selected={query.category}
          onSelect={setCategory}
        />
        {/* A failed request has no total to announce. */}
        {page?.status !== 'failed' && (
          <ResultSummary total={isLoading ? null : page.total} query={query} />
        )}
      </Box>
      {renderContent()}
    </>
  );
}
