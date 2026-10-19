import ClearIcon from '@mui/icons-material/Clear';
import SearchIcon from '@mui/icons-material/Search';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useNavigation } from 'react-router';

import {
  CATALOGUE_PATH,
  catalogueUrl,
  MAX_FILTER_LENGTH,
  parseCatalogueQuery,
} from '../catalogueUrl';

/** Wait this long after the last key press before searching. */
const SEARCH_DEBOUNCE_MS = 300;

/**
 * The search box of the header.
 *
 * What the user types is local state; the search that is actually applied
 * lives in the URL. Typing updates the URL after a short pause (debounce),
 * so there is one request per pause instead of one per key.
 */
export function SearchField() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  // Not idle while the router changes page, for example while it loads
  // the file of the product page.
  const isChangingPage = useNavigation().state !== 'idle';

  const isOnCatalogue = location.pathname === CATALOGUE_PATH;
  const query = parseCatalogueQuery(new URLSearchParams(location.search));
  const appliedSearch = isOnCatalogue ? query.search : '';

  const [text, setText] = useState(appliedSearch);

  // When the applied search changes for another reason (back button,
  // "Clear filters", leaving the catalogue) the box follows it. This is
  // React's "adjust state when a value changes" pattern: it runs during
  // render and avoids an extra effect.
  const [lastApplied, setLastApplied] = useState(appliedSearch);
  if (appliedSearch !== lastApplied) {
    setLastApplied(appliedSearch);
    // Do not overwrite what the user is typing if it already matches
    // (the URL holds the trimmed text; the box may end with a space).
    if (text.trim() !== appliedSearch) {
      setText(appliedSearch);
    }
  }

  // When the user moves to another page before the pause ends, the text
  // that was not applied yet is dropped. Otherwise the pending search
  // would pull the user off the page just opened.
  const [lastPathname, setLastPathname] = useState(location.pathname);
  if (location.pathname !== lastPathname) {
    setLastPathname(location.pathname);
    if (text.trim() !== appliedSearch) {
      setText(appliedSearch);
    }
  }

  // Searching keeps the chosen category, price range and order when the
  // user is on the catalogue, and starts again from page 1.
  const category = isOnCatalogue ? query.category : '';
  const minPrice = isOnCatalogue ? query.minPrice : null;
  const maxPrice = isOnCatalogue ? query.maxPrice : null;
  const sort = isOnCatalogue ? query.sort : '';

  useEffect(() => {
    const search = text.trim();
    if (search === appliedSearch) return;
    // The user opened another page before the pause ended: no search.
    // Once that page is shown, the text not yet applied is dropped.
    if (isChangingPage) return;

    const timer = setTimeout(() => {
      // On the catalogue the current history entry is replaced, so "back"
      // does not step through every word typed. From another page it is
      // a normal navigation to the catalogue.
      navigate(
        catalogueUrl({ search, category, minPrice, maxPrice, sort, page: 1 }),
        { replace: isOnCatalogue },
      );
    }, SEARCH_DEBOUNCE_MS);
    // A new key press cancels the pending search.
    return () => clearTimeout(timer);
  }, [
    text,
    appliedSearch,
    category,
    minPrice,
    maxPrice,
    sort,
    isOnCatalogue,
    isChangingPage,
    navigate,
  ]);

  function handleSubmit(event: FormEvent): void {
    // Enter searches at once instead of waiting for the pause.
    event.preventDefault();
    const search = text.trim();
    if (search !== appliedSearch) {
      navigate(
        catalogueUrl({ search, category, minPrice, maxPrice, sort, page: 1 }),
        { replace: isOnCatalogue },
      );
    }
  }

  return (
    <Box component="form" role="search" onSubmit={handleSubmit}>
      <TextField
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={t('search.label')}
        fullWidth
        size="small"
        sx={{ borderRadius: 1 }}
        slotProps={{
          htmlInput: {
            'aria-label': t('search.label'),
            maxLength: MAX_FILTER_LENGTH,
            enterKeyHint: 'search',
          },
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon aria-hidden />
              </InputAdornment>
            ),
            endAdornment: text && (
              <InputAdornment position="end">
                <IconButton
                  aria-label={t('search.clear')}
                  edge="end"
                  onClick={() => setText('')}
                >
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
      />
    </Box>
  );
}
