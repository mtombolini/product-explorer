import Pagination from '@mui/material/Pagination';
import PaginationItem from '@mui/material/PaginationItem';
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
  return (
    <Pagination
      page={page}
      count={totalPages}
      color="primary"
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
