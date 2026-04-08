/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { Letter, Syllable, Word, SlovakNumber, PraiseEntry } from './types';

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
  { symbol: 'P',  label: 'Pes',      emoji: '🐕',   audioKey: 'p' },
  { symbol: 'R',  label: 'Ryba',     emoji: '🐟',   audioKey: 'r' },
  { symbol: 'S',  label: 'Slnko',    emoji: '☀️',   audioKey: 's' },
  { symbol: 'Š',  label: 'Šašo',     emoji: '🤡',   audioKey: 's-caron' },
  { symbol: 'T',  label: 'Tiger',    emoji: '🐯',   audioKey: 't' },
  { symbol: 'Ť',  label: 'Ťava',     emoji: '🐪',   audioKey: 't-caron' },
  { symbol: 'U',  label: 'Ucho',     emoji: '👂',   audioKey: 'u' },
  { symbol: 'Ú',  label: 'Úľ',       emoji: '🛖🐝', audioKey: 'u-acute' },
  { symbol: 'V',  label: 'Vlk',      emoji: '🐺',   audioKey: 'v' },
  { symbol: 'X',  label: 'Xylofón',  emoji: '🎹',   audioKey: 'x' },
  { symbol: 'Z',  label: 'Zebra',    emoji: '🦓',   audioKey: 'z' },
  { symbol: 'Ž',  label: 'Žaba',     emoji: '🐸',   audioKey: 'z-caron' },
];

// ---------------------------------------------------------------------------
// Words — Slovak words with syllable breakdowns.
// audioKey = lowercase ASCII transliteration (ž→z, š→s, č→c, ň→n, ľ→l, ú→u, etc.)
// ---------------------------------------------------------------------------
export const WORD_ITEMS: Word[] = [
  { word: 'Jahoda',   syllables: 'ja-ho-da',    emoji: '🍓', audioKey: 'jahoda' },
  { word: 'Mama',     syllables: 'ma-ma',        emoji: '👩', audioKey: 'mama' },
  { word: 'Malina',   syllables: 'ma-li-na',     emoji: '🫐', audioKey: 'malina' },
  { word: 'Tata',     syllables: 'ta-ta',        emoji: '👨', audioKey: 'tata' },
  { word: 'Lipa',     syllables: 'li-pa',        emoji: '🌳', audioKey: 'lipa' },
  { word: 'Lano',     syllables: 'la-no',        emoji: '🪢', audioKey: 'lano' },
  { word: 'Luna',     syllables: 'lu-na',        emoji: '🌙', audioKey: 'luna' },
  { word: 'Lopata',   syllables: 'lo-pa-ta',     emoji: '🪣', audioKey: 'lopata' },
  { word: 'Sova',     syllables: 'so-va',        emoji: '🦉', audioKey: 'sova' },
  { word: 'Sito',     syllables: 'si-to',        emoji: '🫙', audioKey: 'sito' },
  { word: 'Seno',     syllables: 'se-no',        emoji: '🌾', audioKey: 'seno' },
  { word: 'Pero',     syllables: 'pe-ro',        emoji: '✏️', audioKey: 'pero' },
  { word: 'Baba',     syllables: 'ba-ba',        emoji: '👵', audioKey: 'baba' },
  { word: 'Bota',     syllables: 'bo-ta',        emoji: '👟', audioKey: 'bota' },
  { word: 'Voda',     syllables: 'vo-da',        emoji: '💧', audioKey: 'voda' },
  { word: 'Vila',     syllables: 'vi-la',        emoji: '🏡', audioKey: 'vila' },
  { word: 'Vata',     syllables: 'va-ta',        emoji: '🧶', audioKey: 'vata' },
  { word: 'Veda',     syllables: 've-da',        emoji: '🔬', audioKey: 'veda' },
  { word: 'Deti',     syllables: 'de-ti',        emoji: '👦', audioKey: 'deti' },
  { word: 'Dino',     syllables: 'di-no',        emoji: '🦕', audioKey: 'dino' },
  { word: 'Doma',     syllables: 'do-ma',        emoji: '🏠', audioKey: 'doma' },
  { word: 'Dúha',     syllables: 'dú-ha',        emoji: '🌈', audioKey: 'duha' },
  { word: 'Dolina',   syllables: 'do-li-na',     emoji: '🏔️', audioKey: 'dolina' },
  { word: 'Noha',     syllables: 'no-ha',        emoji: '🦵', audioKey: 'noha' },
  { word: 'Nebo',     syllables: 'ne-bo',        emoji: '☁️', audioKey: 'nebo' },
  { word: 'Nuda',     syllables: 'nu-da',        emoji: '😴', audioKey: 'nuda' },
  { word: 'Ryba',     syllables: 'ry-ba',        emoji: '🐟', audioKey: 'ryba' },
  { word: 'Ruka',     syllables: 'ru-ka',        emoji: '🤚', audioKey: 'ruka' },
  { word: 'Ruža',     syllables: 'ru-ža',        emoji: '🌹', audioKey: 'ruza' },
  { word: 'Koza',     syllables: 'ko-za',        emoji: '🐐', audioKey: 'koza' },
  { word: 'Kino',     syllables: 'ki-no',        emoji: '🎬', audioKey: 'kino' },
  { word: 'Koleso',   syllables: 'ko-le-so',     emoji: '🎡', audioKey: 'koleso' },
  { word: 'Kukurica', syllables: 'ku-ku-ri-ca',  emoji: '🌽', audioKey: 'kukurica' },
  { word: 'Meno',     syllables: 'me-no',        emoji: '📛', audioKey: 'meno' },
  { word: 'Muha',     syllables: 'mu-ha',        emoji: '🪰', audioKey: 'muha' },
  { word: 'Misa',     syllables: 'mi-sa',        emoji: '🥣', audioKey: 'misa' },
  { word: 'Roboti',   syllables: 'ro-bo-ti',     emoji: '🤖', audioKey: 'roboti' },
  { word: 'Kačica',   syllables: 'ka-či-ca',     emoji: '🦆', audioKey: 'kacica' },
  { word: 'Žirafa',   syllables: 'ži-ra-fa',     emoji: '🦒', audioKey: 'zirafa' },
  { word: 'Žena',     syllables: 'že-na',        emoji: '👩', audioKey: 'zena' },
  { word: 'Šaty',     syllables: 'ša-ty',        emoji: '👗', audioKey: 'saty' },
  { word: 'Šoféri',   syllables: 'šo-fé-ri',     emoji: '🚗', audioKey: 'soferi' },
  { word: 'Baňa',     syllables: 'ba-ňa',        emoji: '⛏️', audioKey: 'bana' },
  { word: 'Poľana',   syllables: 'po-ľa-na',     emoji: '🌿', audioKey: 'polana' },
];

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
