import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

import { ApiError } from '../../api/client';
import { getCategories, getProduct, getProductPage } from '../../api/products';
import type {
  CatalogueQuery,
  CategoryList,
  Product,
  ProductPage,
} from '../../api/types';
import { DEFAULT_LANGUAGE } from '../../i18n/languages';
import { queryKey } from './queryKey';

export type RequestStatus = 'loading' | 'succeeded' | 'failed';

/** One cached list page: which products it holds and the totals. */
export interface PageEntry {
  status: RequestStatus;
  /** The request that wrote this entry; answers to any other are late. */
  requestId: string;
  ids: number[];
  total: number;
  totalPages: number;
  /** The code of the API error, for the interface to translate. */
  errorCode: string | null;
}

/** The state of the request for one single product. */
export interface DetailEntry {
  status: RequestStatus;
  /** The request that wrote this entry; answers to any other are late. */
  requestId: string;
  errorCode: string | null;
  /** True when the API answered 404 for this id. */
  notFound: boolean;
}

export interface CategoriesState {
  status: 'idle' | RequestStatus;
  items: string[];
  errorCode: string | null;
}

export interface ProductsState {
  /**
   * The language the catalogue text is requested in. Everything cached
   * below is in this language.
   */
  language: string;
  /** Every product seen so far, from lists or single requests. */
  byId: Record<number, Product>;
  /** List pages, cached by query key (search, category, order, page). */
  pages: Record<string, PageEntry>;
  /** Requests for single products, by product id. */
  details: Record<number, DetailEntry>;
  categories: CategoriesState;
}

/** An empty cache for the given language. */
export function createInitialState(language: string): ProductsState {
  return {
    language,
    byId: {},
    pages: {},
    details: {},
    categories: { status: 'idle', items: [], errorCode: null },
  };
}

/**
 * What a failed thunk reports to the reducers: the error code of the API
 * (or of the client, for a network failure) and the HTTP status. The
 * message shown to the user is chosen from the code, in their language.
 */
interface Failure {
  code: string;
  status: number;
}

interface ThunkConfig {
  state: { products: ProductsState };
  rejectValue: Failure;
}

const UNKNOWN_FAILURE: Failure = { code: 'unknown_error', status: 0 };

function toFailure(error: unknown): Failure {
  if (error instanceof ApiError) {
    return { code: error.code, status: error.status };
  }
  return UNKNOWN_FAILURE;
}

/**
 * Load one page of the catalogue.
 *
 * The request is skipped when that page is already cached or on its way.
 * A page that failed is requested again; `force` also refetches a page
 * that succeeded (used by "Try again" on an empty catalogue).
 */
export const fetchProductPage = createAsyncThunk<
  ProductPage,
  { query: CatalogueQuery; language: string; force?: boolean },
  ThunkConfig
>(
  'products/fetchPage',
  async ({ query, language }, { rejectWithValue }) => {
    try {
      return await getProductPage(query, language);
    } catch (error) {
      return rejectWithValue(toFailure(error));
    }
  },
  {
    condition: ({ query, force }, { getState }) => {
      const entry = getState().products.pages[queryKey(query)];
      if (!entry) return true;
      if (entry.status === 'loading') return false;
      return entry.status === 'failed' || force === true;
    },
  },
);

/**
 * Load one product by id.
 *
 * Skipped when the product is already in the store (for example because
 * a list page contained it) or its request is on its way.
 */
export const fetchProduct = createAsyncThunk<
  Product,
  { id: number; language: string },
  ThunkConfig
>(
  'products/fetchOne',
  async ({ id, language }, { rejectWithValue }) => {
    try {
      return await getProduct(id, language);
    } catch (error) {
      return rejectWithValue(toFailure(error));
    }
  },
  {
    condition: ({ id }, { getState }) => {
      const { byId, details } = getState().products;
      return byId[id] === undefined && details[id]?.status !== 'loading';
    },
  },
);

/** Load the category list. It is requested once and then reused. */
export const fetchCategories = createAsyncThunk<
  CategoryList,
  void,
  ThunkConfig
>(
  'products/fetchCategories',
  async (_, { rejectWithValue }) => {
    try {
      return await getCategories();
    } catch (error) {
      return rejectWithValue(toFailure(error));
    }
  },
  {
    condition: (_, { getState }) => {
      const { status } = getState().products.categories;
      return status === 'idle' || status === 'failed';
    },
  },
);

/**
 * True for the answer to a request that is no longer the one its entry is
 * waiting for: the language changed in between, which empties the cache.
 * It must not be stored: it would put text in the old language on screen,
 * or replace what a newer request for the same page already loaded.
 */
function isLate(
  entry: PageEntry | DetailEntry | undefined,
  requestId: string,
): boolean {
  return entry?.requestId !== requestId;
}

const productsSlice = createSlice({
  name: 'products',
  initialState: createInitialState(DEFAULT_LANGUAGE),
  reducers: {
    /**
     * The interface language changed. The cached titles and descriptions
     * are in the previous language, so they are dropped and the pages on
     * screen ask for them again. Categories are keys, the same in every
     * language, and stay.
     */
    languageChanged(state, action: PayloadAction<string>) {
      if (action.payload === state.language) return;
      state.language = action.payload;
      state.byId = {};
      state.pages = {};
      state.details = {};
    },
  },
  extraReducers: (builder) => {
    builder
      // One list page -----------------------------------------------------
      .addCase(fetchProductPage.pending, (state, action) => {
        state.pages[queryKey(action.meta.arg.query)] = {
          status: 'loading',
          requestId: action.meta.requestId,
          ids: [],
          total: 0,
          totalPages: 0,
          errorCode: null,
        };
      })
      .addCase(fetchProductPage.fulfilled, (state, action) => {
        const key = queryKey(action.meta.arg.query);
        if (isLate(state.pages[key], action.meta.requestId)) return;
        const page = action.payload;
        // Each product is stored once, by id, so the detail page can
        // show it later without asking the server again.
        for (const product of page.items) {
          state.byId[product.id] = product;
        }
        state.pages[key] = {
          status: 'succeeded',
          requestId: action.meta.requestId,
          ids: page.items.map((product) => product.id),
          total: page.total,
          totalPages: page.total_pages,
          errorCode: null,
        };
      })
      .addCase(fetchProductPage.rejected, (state, action) => {
        const key = queryKey(action.meta.arg.query);
        if (isLate(state.pages[key], action.meta.requestId)) return;
        const failure = action.payload ?? UNKNOWN_FAILURE;
        state.pages[key] = {
          status: 'failed',
          requestId: action.meta.requestId,
          ids: [],
          total: 0,
          totalPages: 0,
          errorCode: failure.code,
        };
      })
      // One product -------------------------------------------------------
      .addCase(fetchProduct.pending, (state, action) => {
        state.details[action.meta.arg.id] = {
          status: 'loading',
          requestId: action.meta.requestId,
          errorCode: null,
          notFound: false,
        };
      })
      .addCase(fetchProduct.fulfilled, (state, action) => {
        const { id } = action.meta.arg;
        if (isLate(state.details[id], action.meta.requestId)) return;
        state.byId[action.payload.id] = action.payload;
        state.details[id] = {
          status: 'succeeded',
          requestId: action.meta.requestId,
          errorCode: null,
          notFound: false,
        };
      })
      .addCase(fetchProduct.rejected, (state, action) => {
        const { id } = action.meta.arg;
        if (isLate(state.details[id], action.meta.requestId)) return;
        const failure = action.payload ?? UNKNOWN_FAILURE;
        state.details[id] = {
          status: 'failed',
          requestId: action.meta.requestId,
          errorCode: failure.code,
          notFound: failure.status === 404,
        };
      })
      // Categories --------------------------------------------------------
      .addCase(fetchCategories.pending, (state) => {
        state.categories.status = 'loading';
        state.categories.errorCode = null;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.categories.status = 'succeeded';
        state.categories.items = action.payload.items;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        const failure = action.payload ?? UNKNOWN_FAILURE;
        state.categories.status = 'failed';
        state.categories.errorCode = failure.code;
      });
  },
});

export const { languageChanged } = productsSlice.actions;
export const productsReducer = productsSlice.reducer;
