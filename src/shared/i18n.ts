/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CS_TRANSLATIONS } from './locales/cs.ui';

/** Languages a family can choose; content and UI exist for each. */
export const SUPPORTED_LOCALES = ['sk', 'cs'] as const;
export type SupportedLocale = typeof SUPPORTED_LOCALES[number];

export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/** Picks Czech for Czech browsers and Slovak for everyone else. */
export function detectLocale(languages: readonly string[]): SupportedLocale {
  for (const language of languages) {
    const primary = language.toLowerCase().split('-')[0];
    if (primary === 'cs') return 'cs';
    if (primary === 'sk') return 'sk';
  }
  return 'sk';
}

/** BCP 47 tag for `Intl`, `toLocaleUpperCase` and `<html lang>`. */
export function localeTag(locale: string): string {
  return locale === 'cs' ? 'cs-CZ' : 'sk-SK';
}

/**
 * Marks Slovak UI text defined outside components (settings labels, validation
 * messages) for translation without translating it. Translate it where it is
 * shown, with `translate` or `useT`. The i18n test finds every marked string.
 */
export function msg<T extends string>(text: T): T {
  return text;
}

export type TranslationValues = Record<string, string | number>;

/** The `t` function from `useT`, for helpers that format text outside a component. */
export type Translate = (text: string, values?: TranslationValues) => string;

function interpolate(text: string, values: TranslationValues): string {
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in values ? String(values[name]) : match));
}

/**
 * Slovak text is the source and the lookup key. Other languages translate it
 * through their table and fall back to Slovak for anything not yet translated.
 */
export function translate(locale: string, text: string, values?: TranslationValues): string {
  const translated = locale === 'cs' ? CS_TRANSLATIONS[text] ?? text : text;
  return values ? interpolate(translated, values) : translated;
}
