import 'i18next';

import type { Messages } from './locales/en';

// Makes t('...') type-safe: a key that does not exist in the English
// messages is a compile error.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: Messages };
  }
}
