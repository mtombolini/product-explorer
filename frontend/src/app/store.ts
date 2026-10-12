import { configureStore } from '@reduxjs/toolkit';

import { productsReducer } from '../features/products/productsSlice';

/**
 * Create a Redux store. The application creates one; each test creates
 * its own, so tests never share cached data.
 */
export function createStore() {
  return configureStore({
    reducer: { products: productsReducer },
  });
}

export type AppStore = ReturnType<typeof createStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
