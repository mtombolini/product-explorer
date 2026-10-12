import { Navigate } from 'react-router';
import type { RouteObject } from 'react-router';

import { AppLayout } from '../components/AppLayout';
import { NotFoundPage } from '../pages/NotFoundPage';
import { ProductDetailPage } from '../pages/ProductDetailPage';
import { ProductsPage } from '../pages/ProductsPage';

/**
 * The route table. The application gives it to a browser router and the
 * tests give it to a memory router, so both use exactly the same routes.
 */
export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <Navigate to="/products" replace /> },
      { path: '/products', element: <ProductsPage /> },
      { path: '/product/:id', element: <ProductDetailPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
