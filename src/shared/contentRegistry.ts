/**
 * Central content registry — single source of truth for all game content.
 * Replaces constants.ts.
 */
import { ContentItem, PraiseEntry, WordItem } from './types';

// UI colour helpers (moved from constants.ts)
export const COLORS = ['text-primary', 'text-success', 'text-accent-blue'];
export const BG_COLORS = ['bg-primary', 'bg-success', 'bg-accent-blue'];

// Shared timing constants (ms)
export const TIMING = {
  AUDIO_DELAY_MS: 100,
  FEEDBACK_RESET_MS: 500,
  SUCCESS_SHOW_DELAY_MS: 500,
  SUCCESS_OVERLAY_DURATION_MS: 3000,
  COUNTING_OPTIONS_DELAY_MS: 2000,
};

// ---------------------------------------------------------------------------
// Letters — full Slovak alphabet (46 entries).
// Items with emoji: undefined are TBD and filtered out of game grids at runtime.
// ---------------------------------------------------------------------------
export const LETTER_ITEMS: ContentItem[] = [
  { symbol: 'A',  label: 'Auto',     emoji: '🚗', audioKey: 'a',            category: 'letter' },
  { symbol: 'Á',  label: 'Áno',      emoji: '👍', audioKey: 'a-acute',      category: 'letter' },
  { symbol: 'Ä',  label: undefined,  emoji: undefined, audioKey: 'a-umlaut',category: 'letter' },
  { symbol: 'B',  label: 'Baran',    emoji: '🐏', audioKey: 'b',            category: 'letter' },
  { symbol: 'C',  label: 'Citrón',   emoji: '🍋', audioKey: 'c',            category: 'letter' },
  { symbol: 'Č',  label: 'Čajík',    emoji: '🫖', audioKey: 'c-caron',      category: 'letter' },
  { symbol: 'D',  label: 'Dúha',     emoji: '🌈', audioKey: 'd',            category: 'letter' },
  { symbol: 'Ď',  label: 'Ďakujem',  emoji: '🫶', audioKey: 'd-caron',      category: 'letter' },
  { symbol: 'DZ', label: 'Dzúra',    emoji: '🕳️', audioKey: 'dz',           category: 'letter' },
  { symbol: 'DŽ', label: 'Džungľa',  emoji: '🌴', audioKey: 'dz-caron',     category: 'letter' },
  { symbol: 'E',  label: 'Euro',     emoji: '💶', audioKey: 'e',            category: 'letter' },
  { symbol: 'É',  label: undefined,  emoji: undefined, audioKey: 'e-acute', category: 'letter' },
  { symbol: 'F',  label: 'Farba',    emoji: '🎨', audioKey: 'f',            category: 'letter' },
  { symbol: 'G',  label: 'Gitara',   emoji: '🎸', audioKey: 'g',            category: 'letter' },
  { symbol: 'H',  label: 'Hrad',     emoji: '🏰', audioKey: 'h',            category: 'letter' },
  { symbol: 'CH', label: 'Chlieb',   emoji: '🍞', audioKey: 'ch',           category: 'letter' },
  { symbol: 'I',  label: 'Iskra',    emoji: '⚡', audioKey: 'i',            category: 'letter' },
  { symbol: 'Í',  label: 'Írsko',    emoji: '🇮🇪', audioKey: 'i-acute',      category: 'letter' },
  { symbol: 'J',  label: 'Jahoda',   emoji: '🍓', audioKey: 'j',            category: 'letter' },
  { symbol: 'K',  label: 'Kľúč',     emoji: '🗝️', audioKey: 'k',            category: 'letter' },
  { symbol: 'L',  label: 'Líška',    emoji: '🦊', audioKey: 'l',            category: 'letter' },
  { symbol: 'Ľ',  label: 'Ľad',      emoji: '🧊', audioKey: 'l-caron',      category: 'letter' },
  { symbol: 'Ĺ',  label: undefined,  emoji: undefined, audioKey: 'l-acute',  category: 'letter' },
  { symbol: 'M',  label: 'Mesiac',   emoji: '🌙', audioKey: 'm',            category: 'letter' },
  { symbol: 'N',  label: 'Nos',      emoji: '👃', audioKey: 'n',            category: 'letter' },
  { symbol: 'Ň',  label: 'Ňufák',    emoji: '👃', audioKey: 'n-caron',  category: 'letter' },
  { symbol: 'O',  label: 'Ovca',     emoji: '🐑', audioKey: 'o',            category: 'letter' },
  { symbol: 'Ó',  label: undefined,  emoji: undefined, audioKey: 'o-acute',  category: 'letter' },
  { symbol: 'Ô',  label: undefined,  emoji: undefined, audioKey: 'o-circumflex', category: 'letter' },
  { symbol: 'P',  label: 'Pes',      emoji: '🐕', audioKey: 'p',            category: 'letter' },
  { symbol: 'Q',  label: undefined,  emoji: undefined, audioKey: 'q',        category: 'letter' },
  { symbol: 'R',  label: 'Ryba',     emoji: '🐟', audioKey: 'r',            category: 'letter' },
  { symbol: 'Ŕ',  label: undefined,  emoji: undefined, audioKey: 'r-acute',  category: 'letter' },
  { symbol: 'S',  label: 'Slnko',    emoji: '☀️', audioKey: 's',            category: 'letter' },
  { symbol: 'Š',  label: 'Šašo',     emoji: '🤡', audioKey: 's-caron',      category: 'letter' },
  { symbol: 'T',  label: 'Tiger',    emoji: '🐯', audioKey: 't',            category: 'letter' },
  { symbol: 'Ť',  label: 'Ťava',     emoji: '🐪', audioKey: 't-caron',      category: 'letter' },
  { symbol: 'U',  label: 'Ucho',     emoji: '👂', audioKey: 'u',            category: 'letter' },
  { symbol: 'Ú',  label: 'Úľ',       emoji: '🛖🐝', audioKey: 'u-acute',      category: 'letter' },
  { symbol: 'V',  label: 'Vlk',      emoji: '🐺', audioKey: 'v',            category: 'letter' },
  { symbol: 'W',  label: undefined,  emoji: undefined, audioKey: 'w',        category: 'letter' },
  { symbol: 'X',  label: 'Xylofón',  emoji: '🎹', audioKey: 'x',            category: 'letter' },
  { symbol: 'Y',  label: undefined,  emoji: undefined, audioKey: 'y',        category: 'letter' },
  { symbol: 'Ý',  label: undefined,  emoji: undefined, audioKey: 'y-acute',  category: 'letter' },
  { symbol: 'Z',  label: 'Zebra',    emoji: '🦓', audioKey: 'z',            category: 'letter' },
  { symbol: 'Ž',  label: 'Žaba',     emoji: '🐸', audioKey: 'z-caron',      category: 'letter' },
];

/** Letters that have emoji/label defined — safe to use in game grids */
export const ACTIVE_LETTER_ITEMS = LETTER_ITEMS.filter(
  (item): item is ContentItem & { emoji: string; label: string } =>
    item.emoji !== undefined && item.label !== undefined
);

// ---------------------------------------------------------------------------
// Words — curated Slovak words with syllable breakdowns.
// Syllables are derived from this list; extend it to add more game content.
// ---------------------------------------------------------------------------
export const WORD_ITEMS: WordItem[] = [
  { word: 'Jahoda',   syllables: 'ja-ho-da',    emoji: '🍓' },
  { word: 'Mama',     syllables: 'ma-ma',        emoji: '👩' },
  { word: 'Malina',   syllables: 'ma-li-na',     emoji: '🫐' },
  { word: 'Tata',     syllables: 'ta-ta',        emoji: '👨' },
  { word: 'Lipa',     syllables: 'li-pa',        emoji: '🌳' },
  { word: 'Lano',     syllables: 'la-no',        emoji: '🪢' },
  { word: 'Luna',     syllables: 'lu-na',        emoji: '🌙' },
  { word: 'Lopata',   syllables: 'lo-pa-ta',     emoji: '🪣' },
  { word: 'Sova',     syllables: 'so-va',        emoji: '🦉' },
  { word: 'Sito',     syllables: 'si-to',        emoji: '🫙' },
  { word: 'Seno',     syllables: 'se-no',        emoji: '🌾' },
  { word: 'Pero',     syllables: 'pe-ro',        emoji: '✏️' },
  { word: 'Baba',     syllables: 'ba-ba',        emoji: '👵' },
  { word: 'Bota',     syllables: 'bo-ta',        emoji: '👟' },
  { word: 'Voda',     syllables: 'vo-da',        emoji: '💧' },
  { word: 'Vila',     syllables: 'vi-la',        emoji: '🏡' },
  { word: 'Vata',     syllables: 'va-ta',        emoji: '🧶' },
  { word: 'Veda',     syllables: 've-da',        emoji: '🔬' },
  { word: 'Deti',     syllables: 'de-ti',        emoji: '👦' },
  { word: 'Dino',     syllables: 'di-no',        emoji: '🦕' },
  { word: 'Doma',     syllables: 'do-ma',        emoji: '🏠' },
  { word: 'Dúha',     syllables: 'dú-ha',        emoji: '🌈' },
  { word: 'Dolina',   syllables: 'do-li-na',     emoji: '🏔️' },
  { word: 'Noha',     syllables: 'no-ha',        emoji: '🦵' },
  { word: 'Nebo',     syllables: 'ne-bo',        emoji: '☁️' },
  { word: 'Nuda',     syllables: 'nu-da',        emoji: '😴' },
  { word: 'Ryba',     syllables: 'ry-ba',        emoji: '🐟' },
  { word: 'Ruka',     syllables: 'ru-ka',        emoji: '🤚' },
  { word: 'Ruža',     syllables: 'ru-ža',        emoji: '🌹' },
  { word: 'Koza',     syllables: 'ko-za',        emoji: '🐐' },
  { word: 'Kino',     syllables: 'ki-no',        emoji: '🎬' },
  { word: 'Koleso',   syllables: 'ko-le-so',     emoji: '🎡' },
  { word: 'Kukurica', syllables: 'ku-ku-ri-ca',  emoji: '🌽' },
  { word: 'Meno',     syllables: 'me-no',        emoji: '📛' },
  { word: 'Muha',     syllables: 'mu-ha',        emoji: '🪰' },
  { word: 'Misa',     syllables: 'mi-sa',        emoji: '🥣' },
  { word: 'Roboti',   syllables: 'ro-bo-ti',     emoji: '🤖' },
  { word: 'Kačica',   syllables: 'ka-či-ca',     emoji: '🦆' },
  // Diacritical consonants: ž, š, ň, ľ
  { word: 'Žirafa',   syllables: 'ži-ra-fa',     emoji: '🦒' },
  { word: 'Žena',     syllables: 'že-na',        emoji: '👩' },
  { word: 'Šaty',     syllables: 'ša-ty',        emoji: '👗' },
  { word: 'Šoféri',   syllables: 'šo-fé-ri',     emoji: '🚗' },
  { word: 'Baňa',     syllables: 'ba-ňa',        emoji: '⛏️' },
  { word: 'Poľana',   syllables: 'po-ľa-na',     emoji: '🌿' },
];

// Derive SYLLABLE_ITEMS from WORD_ITEMS.
// Each unique uppercase syllable becomes one ContentItem; all source words
// that contain it are collected into sourceWords for the success echo line.
const _syllableWordMap = new Map<string, WordItem[]>();
for (const wordItem of WORD_ITEMS) {
  for (const syl of wordItem.syllables.split('-')) {
    const key = syl.toUpperCase();
    if (!_syllableWordMap.has(key)) _syllableWordMap.set(key, []);
    const existing = _syllableWordMap.get(key)!;
    if (!existing.includes(wordItem)) existing.push(wordItem);
  }
}

export const SYLLABLE_ITEMS: ContentItem[] = Array.from(_syllableWordMap.entries()).map(
  ([symbol, words]) => ({
    symbol,
    audioKey: symbol.toLowerCase(),
    category: 'syllable' as const,
    sourceWords: words,
  })
);

// ---------------------------------------------------------------------------
// Numbers 1–20
// ---------------------------------------------------------------------------
export const NUMBER_ITEMS: ContentItem[] = Array.from({ length: 20 }, (_, i) => ({
  symbol: String(i + 1),
  audioKey: String(i + 1),
  category: 'number' as const,
}));

// ---------------------------------------------------------------------------
// Praise entries — one per audio file in public/audio/praise/
// ---------------------------------------------------------------------------
export const PRAISE_ENTRIES: PraiseEntry[] = [
  { emoji: '🌟', text: 'Výborne!',     audioKey: 'vyborne' },
  { emoji: '🎉', text: 'Skvelá práca!', audioKey: 'skvela-praca' },
  { emoji: '⭐', text: 'Si šikovný!',  audioKey: 'si-sikovny' },
  { emoji: '🏆', text: 'To je ono!',   audioKey: 'to-je-ono' },
  { emoji: '🌈', text: 'Úžasné!',      audioKey: 'uzasne' },
  { emoji: '🎊', text: 'Paráda!',      audioKey: 'parada' },
];
