import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { ApiError } from '../../api/client';
import { getCategories, getProduct, getProductPage } from '../../api/products';
import type {
  CatalogueQuery,
  CategoryList,
  Product,
  ProductPage,
} from '../../api/types';
import { queryKey } from './queryKey';

export type RequestStatus = 'loading' | 'succeeded' | 'failed';

/** One cached list page: which products it holds and the totals. */
export interface PageEntry {
  status: RequestStatus;
  ids: number[];
  total: number;
  totalPages: number;
  /** The code of the API error, for the interface to translate. */
  errorCode: string | null;
}

/** The state of the request for one single product. */
export interface DetailEntry {
  status: RequestStatus;
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
  /** Every product seen so far, from lists or single requests. */
  byId: Record<number, Product>;
  /** List pages, cached by query key (search + category + page). */
  pages: Record<string, PageEntry>;
  /** Requests for single products, by product id. */
  details: Record<number, DetailEntry>;
  categories: CategoriesState;
}

const initialState: ProductsState = {
  byId: {},
  pages: {},
  details: {},
  categories: { status: 'idle', items: [], errorCode: null },
};

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
  { query: CatalogueQuery; force?: boolean },
  ThunkConfig
>(
  'products/fetchPage',
  async ({ query }, { rejectWithValue }) => {
    try {
      return await getProductPage(query);
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
export const fetchProduct = createAsyncThunk<Product, number, ThunkConfig>(
  'products/fetchOne',
  async (id, { rejectWithValue }) => {
    try {
      return await getProduct(id);
    } catch (error) {
      return rejectWithValue(toFailure(error));
    }
  },
  {
    condition: (id, { getState }) => {
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

const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // One list page -----------------------------------------------------
      .addCase(fetchProductPage.pending, (state, action) => {
        state.pages[queryKey(action.meta.arg.query)] = {
          status: 'loading',
          ids: [],
          total: 0,
          totalPages: 0,
          errorCode: null,
        };
      })
      .addCase(fetchProductPage.fulfilled, (state, action) => {
        const page = action.payload;
        // Each product is stored once, by id, so the detail page can
        // show it later without asking the server again.
        for (const product of page.items) {
          state.byId[product.id] = product;
        }
        state.pages[queryKey(action.meta.arg.query)] = {
          status: 'succeeded',
          ids: page.items.map((product) => product.id),
          total: page.total,
          totalPages: page.total_pages,
          errorCode: null,
        };
      })
      .addCase(fetchProductPage.rejected, (state, action) => {
        const failure = action.payload ?? UNKNOWN_FAILURE;
        state.pages[queryKey(action.meta.arg.query)] = {
          status: 'failed',
          ids: [],
          total: 0,
          totalPages: 0,
          errorCode: failure.code,
        };
      })
      // One product -------------------------------------------------------
      .addCase(fetchProduct.pending, (state, action) => {
        state.details[action.meta.arg] = {
          status: 'loading',
          errorCode: null,
          notFound: false,
        };
      })
      .addCase(fetchProduct.fulfilled, (state, action) => {
        state.byId[action.payload.id] = action.payload;
        state.details[action.meta.arg] = {
          status: 'succeeded',
          errorCode: null,
          notFound: false,
        };
      })
      .addCase(fetchProduct.rejected, (state, action) => {
        const failure = action.payload ?? UNKNOWN_FAILURE;
        state.details[action.meta.arg] = {
          status: 'failed',
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

export const productsReducer = productsSlice.reducer;
