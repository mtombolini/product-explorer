import { useDispatch, useSelector } from 'react-redux';

import type { AppDispatch, RootState } from './store';

/** useDispatch that knows about thunks. */
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();

/** useSelector that knows the shape of the store. */
export const useAppSelector = useSelector.withTypes<RootState>();
