/**
 * The languages of the interface. To add one: write its messages in
 * `locales/`, add it here and register it in `i18n.ts`. The type system
 * reports any message that is missing.
 */
export const SUPPORTED_LANGUAGES = [
  // Each name is written in its own language, as the user expects it.
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];

/** Used on a first visit and whenever a stored value is not usable. */
export const DEFAULT_LANGUAGE: LanguageCode = 'en';

/** The language of the catalogue itself (titles and descriptions). */
export const CATALOGUE_LANGUAGE: LanguageCode = 'en';

const STORAGE_KEY = 'product-explorer.language';

export function isSupportedLanguage(value: unknown): value is LanguageCode {
  return SUPPORTED_LANGUAGES.some((language) => language.code === value);
}

/** The language the user chose on an earlier visit, or the default. */
export function readStoredLanguage(): LanguageCode {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isSupportedLanguage(stored) ? stored : DEFAULT_LANGUAGE;
  } catch {
    // Storage can be blocked (private mode, strict settings).
    return DEFAULT_LANGUAGE;
  }
}

/** Remember the chosen language for the next visit. */
export function storeLanguage(language: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Not being able to remember the choice must not break the page.
  }
}
