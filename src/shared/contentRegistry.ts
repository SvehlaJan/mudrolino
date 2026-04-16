/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { AudioClip, Letter, Syllable, Word, LocaleContent, AudioPhraseKey } from './types';
import * as sk from './locales/sk';
import * as cs from './locales/cs';

export type { AudioPhraseKey } from './types';

export const COLORS = ['text-primary', 'text-success', 'text-accent-blue'];
export const BG_COLORS = ['bg-primary', 'bg-success', 'bg-accent-blue'];

export const TIMING = {
  AUDIO_DELAY_MS: 100,
  FEEDBACK_RESET_MS: 500,
  SUCCESS_SHOW_DELAY_MS: 500,
  SUCCESS_OVERLAY_DURATION_MS: 3000,
  COUNTING_OPTIONS_DELAY_MS: 2000,
};

export const COUNTING_EMOJIS: string[] = [
  '🍎', '⭐️', '🚗', '🐶', '🍦', '🎈', '🍭', '⚽️', '🦋', '🌈',
];

// ---------------------------------------------------------------------------
// Locale registry
// ---------------------------------------------------------------------------

function _deriveSyllableItems(wordItems: Word[]): Syllable[] {
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
  // Fall back to sk if locale has no content yet (e.g. cs stub).
  // Contract: a locale is considered "populated" when letterItems is non-empty.
  // When adding a new locale, populate letterItems first so this gate opens.
  const effective = data.LETTER_ITEMS.length > 0 ? data : LOCALE_MAP['sk'];
  const content: LocaleContent = {
    letterItems: effective.LETTER_ITEMS,
    wordItems: effective.WORD_ITEMS,
    syllableItems: _deriveSyllableItems(effective.WORD_ITEMS),
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

export function getAlphabetItems(locale: string, includeAccentedLetters: boolean): Letter[] {
  const letters = getLocaleContent(locale).letterItems;
  if (includeAccentedLetters) return letters;
  return letters.filter((l) => l.symbol.normalize('NFD') === l.symbol);
}

export function getNumberItemsInRange(locale: string, range: { start: number; end: number }) {
  return getLocaleContent(locale).numberItems.filter(
    (n) => n.value >= range.start && n.value <= range.end,
  );
}

