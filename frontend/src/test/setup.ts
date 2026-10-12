// Adds matchers such as toBeInTheDocument() to Vitest's expect.
import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// jsdom does not implement scrolling and prints a warning when the router
// restores the scroll position. In the tests scrolling does nothing.
window.scrollTo = () => {};

afterEach(() => {
  // Unmount what the test rendered, so tests cannot affect each other.
  cleanup();
});
