import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { useAppDispatch, useAppSelector } from '../app/hooks';
import { useDocumentTitle } from '../app/useDocumentTitle';
import { PageHeading } from '../components/PageHeading';
import { StatusMessage } from '../components/StatusMessage';
import { catalogueUrl } from '../features/products/catalogueUrl';
import { CataloguePagination } from '../features/products/components/CataloguePagination';
import { CatalogueToolbar } from '../features/products/components/CatalogueToolbar';
import { ProductGrid } from '../features/products/components/ProductGrid';
import { ProductGridSkeleton } from '../features/products/components/ProductGridSkeleton';
import {
  fetchCategories,
  fetchProductPage,
} from '../features/products/productsSlice';
import { queryKey } from '../features/products/queryKey';
import {
  selectCategories,
  selectLanguage,
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
  const { query, setCategory, setSort, clearFilters, pageUrl } =
    useCatalogueQuery();
  const key = queryKey(query);

  const page = useAppSelector((state) => selectPage(state, key));
  const products = useAppSelector((state) => selectPageProducts(state, key));
  const categories = useAppSelector(selectCategories);
  const language = useAppSelector(selectLanguage);

  useDocumentTitle(t('catalogue.title'));

  // Load the page the address asks for, in the current language. The
  // thunk decides whether a request is needed: a page already in the
  // store is not fetched again. A change of language empties the store,
  // and this effect then asks for the page in the new language.
  useEffect(() => {
    dispatch(fetchProductPage({ query, language }));
  }, [dispatch, query, language]);

  // The categories are the same for every view: loaded once.
  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  const isLoading = page === undefined || page.status === 'loading';
  const hasFilters = query.search !== '' || query.category !== '';

  /** Ask again for the page and for the categories, if they failed. */
  function retry(): void {
    dispatch(fetchProductPage({ query, language }));
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
          onAction={() =>
            dispatch(fetchProductPage({ query, language, force: true }))
          }
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
      <CatalogueToolbar
        categories={categories.items}
        query={query}
        // null while loading; a failed request has no total to announce.
        total={
          isLoading ? null : page.status === 'failed' ? undefined : page.total
        }
        onSelectCategory={setCategory}
        onSelectSort={setSort}
      />
      {renderContent()}
    </>
  );
}
