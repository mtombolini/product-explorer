import { configureStore } from '@reduxjs/toolkit';

import {
  createInitialState,
  productsReducer,
} from '../features/products/productsSlice';
import { DEFAULT_LANGUAGE } from '../i18n/languages';

/**
 * Create a Redux store. The application creates one; each test creates
 * its own, so tests never share cached data.
 *
 * `language` is the language of the interface at that moment: the
 * catalogue text is requested in it from the first request.
 */
export function createStore(language: string = DEFAULT_LANGUAGE) {
  return configureStore({
    reducer: { products: productsReducer },
    preloadedState: { products: createInitialState(language) },
  });
}

export type AppStore = ReturnType<typeof createStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
