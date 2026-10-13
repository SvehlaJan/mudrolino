/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback } from 'react';
import { useContentLocale } from '../contexts/ContentContext';
import { translate, type TranslationValues } from '../i18n';

/**
 * Translates Slovak UI text into the family's language:
 * `t('Uložiť zálohu')`, `t('Verzia {version}', { version })`.
 * Pass literals only, so the i18n test can check every string has a translation.
 */
export function useT(): (text: string, values?: TranslationValues) => string {
  const locale = useContentLocale();
  return useCallback((text: string, values?: TranslationValues) => translate(locale, text, values), [locale]);
}
