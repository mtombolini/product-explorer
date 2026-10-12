import { ThemeProvider } from '@mui/material/styles';
import { render } from '@testing-library/react';
import { MotionConfig } from 'motion/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';

import { routes } from '../app/routes';
import { createStore } from '../app/store';
import { theme } from '../app/theme';
import { i18n } from '../i18n/i18n';

/**
 * Render the whole application at a given address, with a fresh store,
 * the real routes and the real theme. Navigation happens in memory.
 */
export function renderApp(initialPath = '/products') {
  const store = createStore(i18n.resolvedLanguage);
  const router = createMemoryRouter(routes, { initialEntries: [initialPath] });

  render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        {/* No animation in tests: elements are in their final state. */}
        <MotionConfig reducedMotion="always">
          <RouterProvider router={router} />
        </MotionConfig>
      </ThemeProvider>
    </Provider>,
  );

  return { store, router, user: userEvent.setup() };
}
