/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { AudioClip, AudioSpec, Syllable, Word, LocaleContent, AudioPhraseKey } from './types';
import * as sk from './locales/sk';
import * as cs from './locales/cs';

export type { AudioPhraseKey } from './types';

export const COLORS = ['text-primary', 'text-success', 'text-accent-blue'];

export const TIMING = {
  AUDIO_DELAY_MS: 100,
  FEEDBACK_RESET_MS: 500,
};

export const COUNTING_EMOJIS: string[] = [
  '🍎', '⭐️', '🚗', '🐶', '🍦', '🎈', '🍭', '⚽️', '🦋', '🌈',
];

// ---------------------------------------------------------------------------
// Locale registry
// ---------------------------------------------------------------------------

export function deriveSyllableItems(wordItems: Word[]): Syllable[] {
  const syllableWordMap = new Map<string, Word[]>();
  for (const wordItem of wordItems) {
    for (const syl of wordItem.syllables.split('-')) {
      const key = syl.toUpperCase();
      if (!syllableWordMap.has(key)) syllableWordMap.set(key, []);
      const existing = syllableWordMap.get(key)!;
      if (!existing.includes(wordItem)) existing.push(wordItem);
    }
  }
  return Array.from(syllableWordMap.entries()).map(([symbol, words]) => ({
    symbol,
    audioKey: symbol.toLowerCase(),
    sourceWords: words,
  }));
}

const LOCALE_MAP: Record<string, typeof sk> = { sk, cs };

const _localeContentCache = new Map<string, LocaleContent>();

export function getLocaleContent(locale: string): LocaleContent {
  const cached = _localeContentCache.get(locale);
  if (cached) return cached;

  const data = LOCALE_MAP[locale] ?? LOCALE_MAP['sk'];
  // Fall back to sk if a locale has no content yet (a new language before its content exists).
  // Contract: a locale is considered "populated" when letterItems is non-empty.
  // When adding a new locale, populate letterItems first so this gate opens.
  const effective = data.LETTER_ITEMS.length > 0 ? data : LOCALE_MAP['sk'];
  const content: LocaleContent = {
    letterItems: effective.LETTER_ITEMS,
    wordItems: effective.WORD_ITEMS,
    syllableItems: deriveSyllableItems(effective.WORD_ITEMS),
    numberItems: effective.NUMBER_ITEMS,
    audioPhrases: effective.AUDIO_PHRASES,
    praiseEntries: effective.PRAISE_ENTRIES,
  };
  _localeContentCache.set(locale, content);
  return content;
}

// ---------------------------------------------------------------------------
// Helpers — locale-aware
// ---------------------------------------------------------------------------

export function getPhraseClip(locale: string, phraseKey: AudioPhraseKey): AudioClip {
  const phrase = getLocaleContent(locale).audioPhrases[phraseKey];
  return {
    path: `${locale}/phrases/${phrase.audioKey}`,
    fallbackText: phrase.text,
  };
}

export type AnswerAudioCategory = 'letters' | 'syllables' | 'numbers' | 'words';

export function getItemAudioClip(
  locale: string,
  category: AnswerAudioCategory,
  audioKey: string,
  fallbackText: string,
): AudioClip {
  return { path: `${locale}/${category}/${audioKey}`, fallbackText };
}

export function getWrongAnswerAudio(
  locale: string,
  category: AnswerAudioCategory,
  audioKey: string,
  fallbackText: string,
): AudioSpec {
  return {
    clips: [
      getItemAudioClip(locale, category, audioKey, fallbackText),
      getPhraseClip(locale, 'retry'),
    ],
  };
}

export function getItemAnnouncementAudio(
  locale: string,
  category: AnswerAudioCategory,
  audioKey: string,
  fallbackText: string,
): AudioSpec {
  return { clips: [getItemAudioClip(locale, category, audioKey, fallbackText)] };
}

