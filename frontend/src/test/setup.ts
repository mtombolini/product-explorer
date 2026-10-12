// Adds matchers such as toBeInTheDocument() to Vitest's expect.
import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';

import { i18n } from '../i18n/i18n';
import { DEFAULT_LANGUAGE } from '../i18n/languages';

// jsdom does not implement scrolling and prints a warning when the router
// restores the scroll position. In the tests scrolling does nothing.
window.scrollTo = () => {};

// jsdom has no IntersectionObserver, which the cards use to appear when
// they scroll into view. In the tests every observed element counts as
// visible straight away.
class ImmediateIntersectionObserver implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = '0px';
  readonly scrollMargin = '0px';
  readonly thresholds = [0];
  private readonly callback: IntersectionObserverCallback;

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }

  observe(target: Element): void {
    const rect = target.getBoundingClientRect();
    const entry: IntersectionObserverEntry = {
      target,
      isIntersecting: true,
      intersectionRatio: 1,
      boundingClientRect: rect,
      intersectionRect: rect,
      rootBounds: null,
      time: 0,
    };
    this.callback([entry], this);
  }

  unobserve(): void {}

  disconnect(): void {}

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}
window.IntersectionObserver = ImmediateIntersectionObserver;

beforeEach(async () => {
  // Every test starts in English with no remembered language, whatever
  // the previous test chose.
  window.localStorage.clear();
  await i18n.changeLanguage(DEFAULT_LANGUAGE);
});

afterEach(() => {
  // Unmount what the test rendered, so tests cannot affect each other.
  cleanup();
});
