/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Locale-aware UI copy keys for the catalog/home/lobby redesign (Phase 3).
// Slovak is the only populated locale today; `cs` is a stub that falls back
// to Slovak for every key, matching src/shared/locales/cs.ts. Do not translate
// the app in this phase — only add fallback plumbing.

const SK_COPY = {
  'home.title': 'Hravé Učenie',
  'home.subtitle': 'Vyber si hru a poďme na to!',

  'lobby.play': 'Hrať',

  'category.literacy': 'Písmená a slová',
  'category.numeracy': 'Čísla a počítanie',

  'game.alphabet.title': 'Abeceda',
  'game.alphabet.description': 'Spoznávaj písmenká hravou formou',
  'game.alphabet.instruction': 'Nájdi správne písmenko.',

  'game.syllables.title': 'Slabiky',
  'game.syllables.description': 'Spájaj písmenká do slabík',
  'game.syllables.instruction': 'Nájdi správnu slabiku.',

  'game.numbers.title': 'Čísla',
  'game.numbers.description': 'Počítaj s kamarátmi',
  'game.numbers.instruction': 'Nájdi správne číslo.',

  'game.counting.title': 'Spočítaj',
  'game.counting.description': 'Koľko jabĺčok vidíš?',
  'game.counting.instruction': 'Spočítaj obrázky a vyber správne číslo.',

  'game.compare.title': 'Viac alebo Menej',
  'game.compare.description': 'Kde je viac predmetov?',
  'game.compare.instruction': 'Zisti, kde je viac a kde menej predmetov.',

  'game.addition.title': 'Sčítaj',
  'game.addition.description': 'Koľko je to dokopy?',
  'game.addition.instruction': 'Spočítaj, koľko je to dokopy.',

  'game.words.title': 'Slová',
  'game.words.description': 'Prečítaj slovo a nájdi obrázok',
  'game.words.instruction': 'Prečítaj slovo a nájdi obrázok.',

  'game.first-letter.title': 'Prvé písmenko',
  'game.first-letter.description': 'Počúvaj slovo a nájdi prvé písmenko',
  'game.first-letter.instruction': 'Počúvaj slovo a nájdi jeho prvé písmenko.',

  'game.assembly.title': 'Skladaj',
  'game.assembly.description': 'Poskladaj slovo zo slabík',
  'game.assembly.instruction': 'Poskladaj slabiky do správneho slova.',

  'game.complete-syllable.title': 'Doplň slabiku',
  'game.complete-syllable.description': 'Vyber slabiku, ktorá chýba',
  'game.complete-syllable.instruction': 'Vyber slabiku, ktorá v slove chýba.',

  'game.complete-letter.title': 'Doplň písmeno',
  'game.complete-letter.description': 'Doplň písmenko v slove',
  'game.complete-letter.instruction': 'Doplň písmenko, ktoré v slove chýba.',
} as const;

export type UiCopyKey = keyof typeof SK_COPY;

// Czech is a stub — empty until Task-driven translation work populates it.
// Every key falls back to Slovak (see AGENTS.md: "Czech is a stub that falls
// back to Slovak").
const CS_COPY: Partial<Record<UiCopyKey, string>> = {};

const COPY_BY_LOCALE: Record<string, Partial<Record<UiCopyKey, string>>> = {
  sk: SK_COPY,
  cs: CS_COPY,
};

/** Returns the copy for `key` in `locale`, falling back to Slovak when the locale has no override. */
export function getUiCopy(locale: string, key: UiCopyKey): string {
  const localeCopy = COPY_BY_LOCALE[locale];
  return localeCopy?.[key] ?? SK_COPY[key];
}
