import { Letter, NumberItem, AudioPhrase, AudioPhraseKey, PraiseEntry, Word } from '../types';

// Czech locale — content to be populated in a future task.
// Structure mirrors sk.ts. All arrays are empty; getLocaleContent falls back to 'sk'.
//
// NOTE: AUDIO_PHRASES are pre-filled with Czech text so they're ready when content
// is populated. They are NOT used until LETTER_ITEMS becomes non-empty (see
// getLocaleContent fallback contract in contentRegistry.ts).
// TODO: populate LETTER_ITEMS, WORD_ITEMS, NUMBER_ITEMS to activate Czech locale.

export const LETTER_ITEMS: Letter[] = [];
export const WORD_ITEMS: Word[] = [];
export const NUMBER_ITEMS: NumberItem[] = [];

export const AUDIO_PHRASES: Record<AudioPhraseKey, AudioPhrase> = {
  find:              { text: 'Najdi',              audioKey: 'najdi' },
  thisIs:            { text: 'Toto je',            audioKey: 'toto-je' },
  number:            { text: 'Číslo',              audioKey: 'cislo' },
  letter:            { text: 'Písmeno',            audioKey: 'pismeno' },
  syllable:          { text: 'Slabika',            audioKey: 'slabika' },
  word:              { text: 'Slovo',              audioKey: 'slovo' },
  findLetter:        { text: 'Najdi písmeno',      audioKey: 'najdi-pismeno' },
  thisIsLetter:      { text: 'Toto je písmeno',    audioKey: 'toto-je-pismeno' },
  thisIsSyllable:    { text: 'Toto je slabika',    audioKey: 'toto-je-slabika' },
  thisIsWord:        { text: 'Toto je slovo',      audioKey: 'toto-je-slovo' },
  countItems:        { text: 'Spočítej předměty',  audioKey: 'spocitej-predmety' },
  whatIsWrittenHere: { text: 'Co tu je napsáno?',  audioKey: 'co-tu-je-napsano' },
  orderSyllables:    { text: 'Seřaď slabiky',      audioKey: 'serad-slabiky' },
  retry:             { text: 'Zkus to znovu.',     audioKey: 'zkus-to-znovu' },
  neverMind:         { text: 'Nevadí!',            audioKey: 'nevadi' },
  itIs:              { text: 'Je to',              audioKey: 'je-to' },
  yesThereAre:       { text: 'Ano, je jich',       audioKey: 'ano-je-jich' },
  noThereAre:        { text: 'Ne, je jich',        audioKey: 'ne-je-jich' },
  correctAnswerIs:   { text: 'Správná odpověď je', audioKey: 'spravna-odpoved' },
};

export const PRAISE_ENTRIES: PraiseEntry[] = [
  { emoji: '🌟', text: 'Výborně!',      audioKey: 'vyborne' },
  { emoji: '🎉', text: 'Skvělá práce!', audioKey: 'skvela-prace' },
  { emoji: '⭐', text: 'Jsi šikovný!',  audioKey: 'jsi-sikovny' },
  { emoji: '🏆', text: 'To je ono!',    audioKey: 'to-je-ono' },
  { emoji: '🌈', text: 'Úžasné!',       audioKey: 'uzasne' },
  { emoji: '🎊', text: 'Paráda!',       audioKey: 'parada' },
];
