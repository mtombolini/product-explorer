/**
 * The languages of the interface. To add one: write its messages in
 * `locales/`, add it here and register it in `i18n.ts`. The type system
 * reports any message that is missing. The code must also be added to
 * the `Language` enum of the backend: it is sent as `lang` with every
 * request, and the API answers 422 to a value it does not know.
 */
export const SUPPORTED_LANGUAGES = [
  // Each name is written in its own language, as the user expects it.
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];

/** Used when neither a stored choice nor the browser gives a language. */
export const DEFAULT_LANGUAGE: LanguageCode = 'en';

const STORAGE_KEY = 'product-explorer.language';

export function isSupportedLanguage(value: unknown): value is LanguageCode {
  return SUPPORTED_LANGUAGES.some((language) => language.code === value);
}

/** The language the user chose on an earlier visit, or null. */
function readStoredLanguage(): LanguageCode | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isSupportedLanguage(stored) ? stored : null;
  } catch {
    // Storage can be blocked (private mode, strict settings).
    return null;
  }
}

/**
 * The first language of the browser that the interface has, or null.
 * The browser lists them by preference, with a region ("es-CL"): only
 * the language part counts.
 */
function readBrowserLanguage(): LanguageCode | null {
  for (const tag of window.navigator.languages) {
    const code = tag.split('-')[0].toLowerCase();
    if (isSupportedLanguage(code)) return code;
  }
  return null;
}

/**
 * The language to start in: the one chosen on an earlier visit, then
 * the one of the browser, then the default.
 */
export function initialLanguage(): LanguageCode {
  return readStoredLanguage() ?? readBrowserLanguage() ?? DEFAULT_LANGUAGE;
}

/** Remember the chosen language for the next visit. */
export function storeLanguage(language: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Not being able to remember the choice must not break the page.
  }
}
