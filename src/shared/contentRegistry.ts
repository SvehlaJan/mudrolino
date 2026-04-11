/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { AudioClip, AudioPhrase, Letter, Syllable, Word, SlovakNumber, PraiseEntry } from './types';
import { WORD_ITEMS } from './wordItems.generated';

export const COLORS = ['text-primary', 'text-success', 'text-accent-blue'];
export const BG_COLORS = ['bg-primary', 'bg-success', 'bg-accent-blue'];

export const TIMING = {
  AUDIO_DELAY_MS: 100,
  FEEDBACK_RESET_MS: 500,
  SUCCESS_SHOW_DELAY_MS: 500,
  SUCCESS_OVERLAY_DURATION_MS: 3000,
  COUNTING_OPTIONS_DELAY_MS: 2000,
};

// ---------------------------------------------------------------------------
// Shared audio phrases
// ---------------------------------------------------------------------------
export const AUDIO_PHRASES = {
  findLetter: { text: 'Nájdi písmenko', audioKey: 'najdi-pismeno' },
  thisIsLetter: { text: 'Toto je písmenko', audioKey: 'toto-je-pismeno' },
  retry: { text: 'Skús to znova.', audioKey: 'skus-to-znova' },
  number: { text: 'Číslo', audioKey: 'cislo' },
  syllable: { text: 'Slabika', audioKey: 'slabika' },
  thisIsSyllable: { text: 'Toto je slabika', audioKey: 'toto-je-slabika' },
  countItems: { text: 'Spočítaj predmety', audioKey: 'spocitaj-predmety' },
  yesThereAre: { text: 'Áno, je ich', audioKey: 'ano-je-ich' },
  noThereAre: { text: 'Nie, je ich', audioKey: 'nie-je-ich' },
  whatIsWrittenHere: { text: 'Čo tu je napísané?', audioKey: 'co-tu-je-napisane' },
  thisIsWord: { text: 'Toto je slovo', audioKey: 'toto-je-slovo' },
  neverMind: { text: 'Nevadí!', audioKey: 'nevadi' },
  correctAnswerIs: { text: 'Správna odpoveď je', audioKey: 'spravna-odpoved' },
} as const satisfies Record<string, AudioPhrase>;

export type AudioPhraseKey = keyof typeof AUDIO_PHRASES;

export const AUDIO_PHRASE_LIST = Object.values(AUDIO_PHRASES);

export function getPhraseClip(phraseKey: AudioPhraseKey): AudioClip {
  const phrase = AUDIO_PHRASES[phraseKey];
  return {
    path: `phrases/${phrase.audioKey}`,
    fallbackText: phrase.text,
  };
}

// ---------------------------------------------------------------------------
// Letters — active Slovak alphabet (entries with complete emoji + label only).
// Phase 1 settings UI will introduce ALL_LETTER_SYMBOLS for the full 46.
// ---------------------------------------------------------------------------
export const LETTER_ITEMS: Letter[] = [
  { symbol: 'A',  label: 'Auto',     emoji: '🚗',   audioKey: 'a' },
  { symbol: 'Á',  label: 'Áno',      emoji: '👍',   audioKey: 'a-acute' },
  { symbol: 'B',  label: 'Baran',    emoji: '🐏',   audioKey: 'b' },
  { symbol: 'C',  label: 'Citrón',   emoji: '🍋',   audioKey: 'c' },
  { symbol: 'Č',  label: 'Čajík',    emoji: '🫖',   audioKey: 'c-caron' },
  { symbol: 'D',  label: 'Dúha',     emoji: '🌈',   audioKey: 'd' },
  { symbol: 'Ď',  label: 'Ďakujem',  emoji: '🫶',   audioKey: 'd-caron' },
  { symbol: 'DZ', label: 'Dzúra',    emoji: '🕳️',   audioKey: 'dz' },
  { symbol: 'DŽ', label: 'Džungľa',  emoji: '🌴',   audioKey: 'dz-caron' },
  { symbol: 'E',  label: 'Euro',     emoji: '💶',   audioKey: 'e' },
  { symbol: 'É',  label: '',         emoji: '🤩',   audioKey: 'e-acute' },
  { symbol: 'F',  label: 'Farba',    emoji: '🎨',   audioKey: 'f' },
  { symbol: 'G',  label: 'Gitara',   emoji: '🎸',   audioKey: 'g' },
  { symbol: 'H',  label: 'Hrad',     emoji: '🏰',   audioKey: 'h' },
  { symbol: 'CH', label: 'Chlieb',   emoji: '🍞',   audioKey: 'ch' },
  { symbol: 'I',  label: 'Iskra',    emoji: '⚡',   audioKey: 'i' },
  { symbol: 'Í',  label: 'Írsko',    emoji: '🇮🇪',   audioKey: 'i-acute' },
  { symbol: 'J',  label: 'Jahoda',   emoji: '🍓',   audioKey: 'j' },
  { symbol: 'K',  label: 'Kľúč',     emoji: '🗝️',   audioKey: 'k' },
  { symbol: 'L',  label: 'Líška',    emoji: '🦊',   audioKey: 'l' },
  { symbol: 'Ľ',  label: 'Ľad',      emoji: '🧊',   audioKey: 'l-caron' },
  { symbol: 'M',  label: 'Mesiac',   emoji: '🌙',   audioKey: 'm' },
  { symbol: 'N',  label: 'Nos',      emoji: '👃',   audioKey: 'n' },
  { symbol: 'Ň',  label: 'Ňufák',    emoji: '👃',   audioKey: 'n-caron' },
  { symbol: 'O',  label: 'Ovca',     emoji: '🐑',   audioKey: 'o' },
  { symbol: 'Ó',  label: '',         emoji: '🤩',   audioKey: 'o-acute' },
  { symbol: 'Ô',  label: '',         emoji: '🤩',   audioKey: 'o-circumflex' },
  { symbol: 'P',  label: 'Pes',      emoji: '🐕',   audioKey: 'p' },
  { symbol: 'Q',  label: '',         emoji: '🤩',   audioKey: 'q' },
  { symbol: 'R',  label: 'Ryba',     emoji: '🐟',   audioKey: 'r' },
  { symbol: 'S',  label: 'Slnko',    emoji: '☀️',   audioKey: 's' },
  { symbol: 'Š',  label: 'Šašo',     emoji: '🤡',   audioKey: 's-caron' },
  { symbol: 'T',  label: 'Tiger',    emoji: '🐯',   audioKey: 't' },
  { symbol: 'Ť',  label: 'Ťava',     emoji: '🐪',   audioKey: 't-caron' },
  { symbol: 'U',  label: 'Ucho',     emoji: '👂',   audioKey: 'u' },
  { symbol: 'Ú',  label: 'Úľ',       emoji: '🛖🐝', audioKey: 'u-acute' },
  { symbol: 'V',  label: 'Vlk',      emoji: '🐺',   audioKey: 'v' },
  { symbol: 'X',  label: 'Xylofón',  emoji: '🎹',   audioKey: 'x' },
  { symbol: 'Y',  label: '',         emoji: '🤩',   audioKey: 'y' },
  { symbol: 'Ý',  label: '',         emoji: '🤩',   audioKey: 'y-acute' },
  { symbol: 'Z',  label: 'Zebra',    emoji: '🦓',   audioKey: 'z' },
  { symbol: 'Ž',  label: 'Žaba',     emoji: '🐸',   audioKey: 'z-caron' },
];

function containsDiacritics(value: string): boolean {
  return value.normalize('NFD') !== value;
}

export function getAlphabetItems(includeAccentedLetters: boolean): Letter[] {
  if (includeAccentedLetters) {
    return LETTER_ITEMS;
  }

  return LETTER_ITEMS.filter((letter) => !containsDiacritics(letter.symbol));
}

// ---------------------------------------------------------------------------
// Words — source of truth: data/words.csv  (run `npm run codegen` to update)
// ---------------------------------------------------------------------------
export { WORD_ITEMS };

// Derive SYLLABLE_ITEMS from WORD_ITEMS.
const _syllableWordMap = new Map<string, Word[]>();
for (const wordItem of WORD_ITEMS) {
  for (const syl of wordItem.syllables.split('-')) {
    const key = syl.toUpperCase();
    if (!_syllableWordMap.has(key)) _syllableWordMap.set(key, []);
    const existing = _syllableWordMap.get(key)!;
    if (!existing.includes(wordItem)) existing.push(wordItem);
  }
}

export const SYLLABLE_ITEMS: Syllable[] = Array.from(_syllableWordMap.entries()).map(
  ([symbol, words]) => ({
    symbol,
    audioKey: symbol.toLowerCase(),
    sourceWords: words,
  })
);

// ---------------------------------------------------------------------------
// Numbers 1–20
// ---------------------------------------------------------------------------
export const NUMBER_ITEMS: SlovakNumber[] = Array.from({ length: 20 }, (_, i) => ({
  value: i + 1,
  audioKey: String(i + 1),
}));

export function getNumberItemsInRange(range: { start: number; end: number }) {
  return NUMBER_ITEMS.filter(n => n.value >= range.start && n.value <= range.end);
}

// ---------------------------------------------------------------------------
// Counting game emojis
// ---------------------------------------------------------------------------
export const COUNTING_EMOJIS: string[] = [
  '🍎', '⭐️', '🚗', '🐶', '🍦', '🎈', '🍭', '⚽️', '🦋', '🌈',
];

// ---------------------------------------------------------------------------
// Praise entries
// ---------------------------------------------------------------------------
export const PRAISE_ENTRIES: PraiseEntry[] = [
  { emoji: '🌟', text: 'Výborne!',      audioKey: 'vyborne' },
  { emoji: '🎉', text: 'Skvelá práca!', audioKey: 'skvela-praca' },
  { emoji: '⭐', text: 'Si šikovný!',   audioKey: 'si-sikovny' },
  { emoji: '🏆', text: 'To je ono!',    audioKey: 'to-je-ono' },
  { emoji: '🌈', text: 'Úžasné!',       audioKey: 'uzasne' },
  { emoji: '🎊', text: 'Paráda!',       audioKey: 'parada' },
];
