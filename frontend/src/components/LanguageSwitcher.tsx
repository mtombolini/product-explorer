import CheckIcon from '@mui/icons-material/Check';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LanguageIcon from '@mui/icons-material/Language';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ListItemIcon from '@mui/material/ListItemIcon';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { SUPPORTED_LANGUAGES } from '../i18n/languages';

/**
 * Lets the user choose the language of the interface: a button in the
 * header that opens a menu with one item per language. The choice is
 * remembered for the next visit (see i18n/i18n.ts).
 *
 * The menu is MUI's: it opens with Enter or Space, moves with the arrow
 * keys, closes with Escape and returns focus to the button.
 */
export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  // The button the menu hangs from; null while the menu is closed.
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const menuId = useId();

  const isOpen = anchor !== null;
  const current =
    SUPPORTED_LANGUAGES.find(
      (language) => language.code === i18n.resolvedLanguage,
    ) ?? SUPPORTED_LANGUAGES[0];

  function choose(code: string): void {
    setAnchor(null);
    void i18n.changeLanguage(code);
  }

  return (
    <>
      <Button
        color="inherit"
        // "Language: English". It contains the visible text, as speech
        // input users say what they see.
        aria-label={`${t('layout.languageLabel')}: ${current.name}`}
        aria-haspopup="menu"
        aria-controls={isOpen ? menuId : undefined}
        aria-expanded={isOpen}
        onClick={(event) => setAnchor(event.currentTarget)}
        endIcon={<ExpandMoreIcon />}
        sx={{ flexShrink: 0, fontWeight: 400, px: 1.5 }}
      >
        {/* The globe gives way to the search field on phones. */}
        <Box
          component="span"
          aria-hidden
          sx={{ display: { xs: 'none', sm: 'inline-flex' }, mr: 1 }}
        >
          <LanguageIcon fontSize="small" />
        </Box>
        {current.name}
      </Button>
      <Menu
        id={menuId}
        anchorEl={anchor}
        open={isOpen}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {SUPPORTED_LANGUAGES.map((language) => {
          const isCurrent = language.code === current.code;
          return (
            <MenuItem
              key={language.code}
              role="menuitemradio"
              aria-checked={isCurrent}
              selected={isCurrent}
              // Each name is read with the pronunciation of its language.
              lang={language.code}
              onClick={() => choose(language.code)}
            >
              <ListItemIcon>
                {isCurrent && <CheckIcon fontSize="small" />}
              </ListItemIcon>
              {language.name}
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
}
