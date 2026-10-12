// Noto Sans is bundled with the application, so the browser never asks a
// font CDN for it. Only the two weights the theme uses are loaded.
import '@fontsource/noto-sans/latin-400.css';
import '@fontsource/noto-sans/latin-700.css';

import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { MotionConfig } from 'motion/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';

import { routes } from './app/routes';
import { createStore } from './app/store';
import { theme } from './app/theme';

const store = createStore();
const router = createBrowserRouter(routes);

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('index.html has no element with id "root".');
}

createRoot(rootElement).render(
  <StrictMode>
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {/* "user": follow the reduced-motion setting of the system. */}
        <MotionConfig reducedMotion="user">
          <RouterProvider router={router} />
        </MotionConfig>
      </ThemeProvider>
    </Provider>
  </StrictMode>,
);
