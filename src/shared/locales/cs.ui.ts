/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Czech UI text keyed by the Slovak source string passed to `t()`, `translate()`
 * or `msg()` (see `src/shared/i18n.ts`). DRAFT (2026-10-14): written without
 * native review; the user reviews it. `src/shared/i18n.test.ts` fails on any
 * marked Slovak string without an entry here and on entries nothing uses.
 */
export const CS_TRANSLATIONS: Record<string, string> = {
  // Parent zone: app settings
  'Rodičovská zóna': 'Rodičovská zóna',
  'Aplikácia a vzhľad': 'Aplikace a vzhled',
  'Jazyk': 'Jazyk',
  'Jazyk hier, zvukov a celej aplikácie. Vlastné slová a nahrávky sa ukladajú pre každý jazyk zvlášť.':
    'Jazyk her, zvuků a celé aplikace. Vlastní slova a nahrávky se ukládají pro každý jazyk zvlášť.',
  'Písmo': 'Písmo',
  'Štýl písma v celej aplikácii.': 'Styl písma v celé aplikaci.',
  'Zaoblené (Nunito)': 'Zaoblené (Nunito)',
  'Hravé (Shantell)': 'Hravé (Shantell)',

  // Parent gate
  'Pre rodičov': 'Pro rodiče',
  'Vyriešte príklad pre vstup.': 'Vyřešte příklad pro vstup.',
  'Späť': 'Zpět',
  '{a} plus {b} sa rovná': '{a} plus {b} se rovná',
  '{a} mínus {b} sa rovná': '{a} minus {b} se rovná',
  'Vaša odpoveď': 'Vaše odpověď',
  'Skús to ešte raz': 'Zkus to ještě jednou',
  'Zmazať': 'Smazat',
  'Potvrdiť': 'Potvrdit',

  // Shared controls and overlays
  'Zavrieť': 'Zavřít',
  'Pauza': 'Pauza',
  'Nevadí': 'Nevadí',
  'Nevadí!': 'Nevadí!',
  'Je to:': 'Je to:',
  'Počúvaj': 'Poslouchej',
  'Prehrať zadanie znova': 'Přehrát zadání znovu',
  '{current} z {total} {label}': '{current} z {total} {label}',
  'kolá': 'kol',
  'Vymazať': 'Vymazat',
  'Zavrieť dialóg': 'Zavřít dialog',

  // Settings autosave and error screen
  'Ukladám nastavenia…': 'Ukládám nastavení…',
  'Nastavenia sú uložené.': 'Nastavení je uložené.',
  'Nastavenia sa nepodarilo uložiť. Skontrolujte úložisko prehliadača.': 'Nastavení se nepodařilo uložit. Zkontrolujte úložiště prohlížeče.',
  'Niečo sa pokazilo': 'Něco se pokazilo',
  'Skús to znova.': 'Zkus to znovu.',
  'Skúsiť znova': 'Zkusit znovu',
};
