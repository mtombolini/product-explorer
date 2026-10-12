import NativeSelect from '@mui/material/NativeSelect';
import OutlinedInput from '@mui/material/OutlinedInput';
import { useTranslation } from 'react-i18next';

import { SUPPORTED_LANGUAGES } from '../i18n/languages';

/**
 * Lets the user choose the language of the interface. The choice is
 * remembered for the next visit (see i18n/i18n.ts).
 *
 * It is a native select: familiar on every device, and it works with the
 * keyboard and with screen readers without extra code.
 */
export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();

  return (
    <NativeSelect
      // The outlined look of the search field next to it.
      input={<OutlinedInput size="small" />}
      value={i18n.resolvedLanguage}
      onChange={(event) => {
        void i18n.changeLanguage(String(event.target.value));
      }}
      inputProps={{ 'aria-label': t('layout.languageLabel') }}
      sx={{ bgcolor: 'background.paper' }}
    >
      {SUPPORTED_LANGUAGES.map((language) => (
        // lang: each name is read with the pronunciation of its language.
        <option key={language.code} value={language.code} lang={language.code}>
          {language.name}
        </option>
      ))}
    </NativeSelect>
  );
}
