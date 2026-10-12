import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import {
  DEFAULT_LANGUAGE,
  readStoredLanguage,
  storeLanguage,
  SUPPORTED_LANGUAGES,
} from './languages';
import { en } from './locales/en';
import { es } from './locales/es';

/**
 * Set up translations. Importing this module once (in main.tsx and in the
 * test setup) is enough: components then call useTranslation().
 */
i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
  },
  // The language chosen on an earlier visit, otherwise English.
  lng: readStoredLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: SUPPORTED_LANGUAGES.map((language) => language.code),
  // React already escapes text, so i18next must not escape it again.
  interpolation: { escapeValue: false },
  // The messages are bundled, so there is nothing to wait for.
  initAsync: false,
});

/** Tell assistive technology and the browser which language is shown. */
function setDocumentLanguage(language: string): void {
  document.documentElement.lang = language;
}

setDocumentLanguage(i18n.language);

i18n.on('languageChanged', (language) => {
  setDocumentLanguage(language);
  storeLanguage(language);
});

export { i18n };
