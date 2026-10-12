import Link from '@mui/material/Link';
import { useTranslation } from 'react-i18next';

import { layout } from '../app/theme';

/** The id of the main landmark, the target of the skip link. */
export const MAIN_CONTENT_ID = 'main-content';

/**
 * First focusable element of every page: lets keyboard users jump over
 * the header straight to the content. Hidden until it receives focus.
 */
export function SkipLink() {
  const { t } = useTranslation();

  return (
    <Link
      href={`#${MAIN_CONTENT_ID}`}
      sx={{
        position: 'absolute',
        left: 16,
        top: 16,
        zIndex: 'tooltip',
        display: 'inline-flex',
        alignItems: 'center',
        minHeight: layout.touchTarget,
        px: 2,
        borderRadius: 1,
        bgcolor: 'background.paper',
        color: 'primary.main',
        fontWeight: 'bold',
        // Moved off screen until focused, then shown on top of the header.
        transform: 'translateY(-200%)',
        '&:focus': { transform: 'none' },
      }}
    >
      {t('layout.skipToContent')}
    </Link>
  );
}
