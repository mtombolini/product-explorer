import { ThemeProvider } from '@mui/material/styles';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';

import { routes } from '../app/routes';
import { createStore } from '../app/store';
import { theme } from '../app/theme';

/**
 * Render the whole application at a given address, with a fresh store,
 * the real routes and the real theme. Navigation happens in memory.
 */
export function renderApp(initialPath = '/products') {
  const store = createStore();
  const router = createMemoryRouter(routes, { initialEntries: [initialPath] });

  render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <RouterProvider router={router} />
      </ThemeProvider>
    </Provider>,
  );

  return { store, router, user: userEvent.setup() };
}
