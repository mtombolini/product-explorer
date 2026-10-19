import type { TFunction } from 'i18next';

import { NETWORK_ERROR_CODE } from '../api/client';

/**
 * The explanation shown to the user when a request fails, in their
 * language. The API answers with stable error codes and an English
 * message for developers; the wording for people belongs to the
 * interface, so it is chosen here from the code.
 */
export function errorDescription(code: string | null, t: TFunction): string {
  return code === NETWORK_ERROR_CODE ? t('errors.network') : t('errors.server');
}
