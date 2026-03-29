/**
 * Central content registry — single source of truth for all game content.
 * Replaces constants.ts.
 */
import { ContentItem, PraiseEntry } from './types';

// UI colour helpers (moved from constants.ts)
export const COLORS = ['text-primary', 'text-success', 'text-accent-blue'];
export const BG_COLORS = ['bg-primary', 'bg-success', 'bg-accent-blue'];

// Shared timing constants (ms)
export const TIMING = {
  AUDIO_DELAY_MS: 100,
  FEEDBACK_RESET_MS: 500,
  SUCCESS_SHOW_DELAY_MS: 500,
  SUCCESS_OVERLAY_DURATION_MS: 3000,
};

// ---------------------------------------------------------------------------
// Letters — full Slovak alphabet (46 entries).
// Items with emoji: undefined are TBD and filtered out of game grids at runtime.
// ---------------------------------------------------------------------------
export const LETTER_ITEMS: ContentItem[] = [
  { symbol: 'A',  label: 'Ananás',   emoji: '🍎', audioKey: 'a',            category: 'letter' },
  { symbol: 'Á',  label: 'Áuto',     emoji: '🚗', audioKey: 'a-acute',      category: 'letter' },
  { symbol: 'Ä',  label: undefined,  emoji: undefined, audioKey: 'a-umlaut', category: 'letter' },
  { symbol: 'B',  label: 'Baran',    emoji: '🐏', audioKey: 'b',            category: 'letter' },
  { symbol: 'C',  label: 'Citrón',   emoji: '🍋', audioKey: 'c',            category: 'letter' },
  { symbol: 'Č',  label: 'Čerešňa',  emoji: '🍒', audioKey: 'c-caron',      category: 'letter' },
  { symbol: 'D',  label: 'Dúha',     emoji: '🌈', audioKey: 'd',            category: 'letter' },
  { symbol: 'Ď',  label: 'Ďakujem',  emoji: '🫶', audioKey: 'd-caron',      category: 'letter' },
  { symbol: 'DZ', label: undefined,  emoji: undefined, audioKey: 'dz',       category: 'letter' },
  { symbol: 'DŽ', label: 'Džungľa',  emoji: '🌴', audioKey: 'dzh',          category: 'letter' },
  { symbol: 'E',  label: 'Ežko',     emoji: '🦔', audioKey: 'e',            category: 'letter' },
  { symbol: 'É',  label: undefined,  emoji: undefined, audioKey: 'e-acute',  category: 'letter' },
  { symbol: 'F',  label: 'Farba',    emoji: '🎨', audioKey: 'f',            category: 'letter' },
  { symbol: 'G',  label: 'Gitara',   emoji: '🎸', audioKey: 'g',            category: 'letter' },
  { symbol: 'H',  label: 'Hrad',     emoji: '🏰', audioKey: 'h',            category: 'letter' },
  { symbol: 'CH', label: 'Chlieb',   emoji: '🍞', audioKey: 'ch',           category: 'letter' },
  { symbol: 'I',  label: 'Iskra',    emoji: '⚡', audioKey: 'i',            category: 'letter' },
  { symbol: 'Í',  label: 'Íbis',     emoji: '🦢', audioKey: 'i-acute',      category: 'letter' },
  { symbol: 'J',  label: 'Jahoda',   emoji: '🍓', audioKey: 'j',            category: 'letter' },
  { symbol: 'K',  label: 'Kľúč',     emoji: '🗝️', audioKey: 'k',            category: 'letter' },
  { symbol: 'L',  label: 'Líška',    emoji: '🦊', audioKey: 'l',            category: 'letter' },
  { symbol: 'Ľ',  label: 'Ľad',      emoji: '🧊', audioKey: 'l-caron',      category: 'letter' },
  { symbol: 'Ĺ',  label: undefined,  emoji: undefined, audioKey: 'l-acute',  category: 'letter' },
  { symbol: 'M',  label: 'Mesiac',   emoji: '🌙', audioKey: 'm',            category: 'letter' },
  { symbol: 'N',  label: 'Nebe',     emoji: '☁️', audioKey: 'n',            category: 'letter' },
  { symbol: 'Ň',  label: undefined,  emoji: undefined, audioKey: 'n-caron',  category: 'letter' },
  { symbol: 'O',  label: 'Ovca',     emoji: '🐑', audioKey: 'o',            category: 'letter' },
  { symbol: 'Ó',  label: undefined,  emoji: undefined, audioKey: 'o-acute',  category: 'letter' },
  { symbol: 'Ô',  label: undefined,  emoji: undefined, audioKey: 'o-circumflex', category: 'letter' },
  { symbol: 'P',  label: 'Pes',      emoji: '🐕', audioKey: 'p',            category: 'letter' },
  { symbol: 'Q',  label: undefined,  emoji: undefined, audioKey: 'q',        category: 'letter' },
  { symbol: 'R',  label: 'Ryba',     emoji: '🐟', audioKey: 'r',            category: 'letter' },
  { symbol: 'Ŕ',  label: undefined,  emoji: undefined, audioKey: 'r-acute',  category: 'letter' },
  { symbol: 'S',  label: 'Slnko',    emoji: '☀️', audioKey: 's',            category: 'letter' },
  { symbol: 'Š',  label: 'Šnek',     emoji: '🐌', audioKey: 's-caron',      category: 'letter' },
  { symbol: 'T',  label: 'Tiger',    emoji: '🐯', audioKey: 't',            category: 'letter' },
  { symbol: 'Ť',  label: 'Ťava',     emoji: '🐪', audioKey: 't-caron',      category: 'letter' },
  { symbol: 'U',  label: 'Ucho',     emoji: '👂', audioKey: 'u',            category: 'letter' },
  { symbol: 'Ú',  label: 'Úsvit',    emoji: '🌅', audioKey: 'u-acute',      category: 'letter' },
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
// Syllables — 60 simple consonant+vowel pairs (no diacritical syllables)
// ---------------------------------------------------------------------------
const SYLLABLE_CONSONANTS = ['M','T','L','S','P','B','V','D','N','R','K','J'];
const SYLLABLE_VOWELS = ['A','E','I','O','U'];

export const SYLLABLE_ITEMS: ContentItem[] = SYLLABLE_CONSONANTS.flatMap(c =>
  SYLLABLE_VOWELS.map(v => ({
    symbol: `${c}${v}`,
    audioKey: `${c}${v}`.toLowerCase(),
    category: 'syllable' as const,
  }))
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
