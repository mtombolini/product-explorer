import { Navigate } from 'react-router';
import type { RouteObject } from 'react-router';

import { AppLayout } from '../components/AppLayout';
import { ProductsPage } from '../pages/ProductsPage';
import { UnexpectedErrorPage } from '../pages/UnexpectedErrorPage';

/**
 * The route table. The application gives it to a browser router and the
 * tests give it to a memory router, so both use exactly the same routes.
 *
 * The catalogue is the first page most visitors see, so it is in the main
 * bundle. The other pages are separate files, loaded the first time they
 * are opened: the router waits for the file before it changes page.
 */
export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    // Replaces the router's technical error screen if a page crashes.
    errorElement: <UnexpectedErrorPage />,
    children: [
      { path: '/', element: <Navigate to="/products" replace /> },
      { path: '/products', element: <ProductsPage /> },
      {
        path: '/product/:id',
        lazy: async () => ({
          Component: (await import('../pages/ProductDetailPage'))
            .ProductDetailPage,
        }),
      },
      {
        path: '*',
        lazy: async () => ({
          Component: (await import('../pages/NotFoundPage')).NotFoundPage,
        }),
      },
    ],
  },
];
