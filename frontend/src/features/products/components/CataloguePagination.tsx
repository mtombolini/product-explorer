import Pagination from '@mui/material/Pagination';
import PaginationItem from '@mui/material/PaginationItem';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router';

interface CataloguePaginationProps {
  page: number;
  totalPages: number;
  /** Returns the address of a given page of the current list. */
  pageUrl: (page: number) => string;
}

/**
 * Numbered pagination. Every item is a real link, so the current page is
 * always in the address bar, "back" returns to the previous page and a
 * page can be opened in a new tab. MUI marks the current page with
 * aria-current.
 */
export function CataloguePagination({
  page,
  totalPages,
  pageUrl,
}: CataloguePaginationProps) {
  const { t } = useTranslation();

  /** The accessible name of each item, in the current language. */
  function itemLabel(type: string, itemPage: number | null, selected: boolean) {
    if (type === 'previous') return t('pagination.previous');
    if (type === 'next') return t('pagination.next');
    const key = selected ? 'pagination.currentPage' : 'pagination.goToPage';
    return t(key, { page: itemPage });
  }

  return (
    <Pagination
      page={page}
      count={totalPages}
      aria-label={t('pagination.label')}
      getItemAriaLabel={itemLabel}
      color="primary"
      shape="rounded"
      // Fewer neighbours, so the row fits a 360px screen.
      siblingCount={0}
      sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}
      renderItem={(item) => (
        <PaginationItem
          component={RouterLink}
          to={pageUrl(item.page ?? 1)}
          {...item}
        />
      )}
    />
  );
}
