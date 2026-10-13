/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Keyed UI copy for the home screen, game catalog, lobbies, game shell and the
// newer parent cards. Every locale translates every key (uiCopy.verify.ts checks
// it). Other UI text uses Slovak-keyed `t()` from src/shared/i18n.ts.

const SK_COPY = {
  'home.title': 'Mudrolíno',
  'home.subtitle': 'Vyber si hru a poďme na to!',

  'lobby.play': 'Hrať',

  'game.replayPrompt': 'Zopakovať zadanie',
  'game.promptSection': 'Zadanie',
  'game.replayingInstruction': 'Prehrávam zadanie…',
  'game.answerGroup': 'Možnosti odpovede',
  'game.playArea': 'Hracia plocha',
  'game.continue': 'Pokračovať',
  'game.playAgain': 'Hrať znova',
  'game.home': 'Domov',
  'game.retryError': 'Skúsiť znova',
  'game.progress': 'Postup v hre',
  'game.retryPrompt': 'Skús ešte raz',
  'game.piece.settledLabel': 'Uložené',
  'game.successTitle': 'Výborne!',
  'game.failureTitle': 'Nevadí, poďme ďalej',
  'game.completionTitle': 'Koniec hry',
  'game.taps': 'klepnutí',
  'game.paused': 'Hra je pozastavená.',
  'game.parentPause': 'Rodičovská prestávka',
  'game.unlock': 'Odomknúť',

  'game.retry.detail': 'Nevadí, počúvaj ešte raz.',
  'game.failure.detail': 'Správnu odpoveď si ukážeme spolu.',
  'game.error.title': 'Niečo sa nepodarilo.',
  'game.error.detail': 'Skúsime to ešte raz?',
  'game.error.emptyPool': 'Žiadne položky na hranie.',

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
  'game.compare.instruction': 'Kde je viac?',

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

  'parent.share.title': 'Odporučiť priateľom',
  'parent.share.description': 'Pošlite odkaz na Mudrolíno ďalším rodičom.',
  'parent.share.message': 'Mudrolíno – hravé učenie písmen, slabík a čísel pre predškolákov.',
  'parent.share.copied': 'Odkaz je skopírovaný. Vložte ho do správy.',
  'parent.share.manual': 'Skopírujte tento odkaz:',

  'parent.backup.title': 'Záloha',
  'parent.backup.description': 'Vlastné slová, pochvaly, nahrávky a nastavenia sú uložené iba v tomto zariadení. Uložte si zálohu a obnovte ju v novom telefóne či tablete.',
  'parent.backup.persisted': 'Prehliadač tieto údaje chráni pred automatickým vymazaním.',
  'parent.backup.notPersisted': 'Prehliadač môže údaje pri nedostatku miesta vymazať. Pridajte si aplikáciu na plochu a ukladajte si zálohu.',
  'parent.backup.export': 'Uložiť zálohu',
  'parent.backup.preparing': 'Pripravujem zálohu…',
  'parent.backup.saveFile': 'Odoslať alebo uložiť súbor zálohy',
  'parent.backup.exported': 'Záloha je uložená.',
  'parent.backup.exportFailed': 'Zálohu sa nepodarilo vytvoriť. Skúste to znova.',
  'parent.backup.import': 'Obnoviť zo zálohy',
  'parent.backup.fileLabel': 'Súbor zálohy',
  'parent.backup.summary': 'Záloha z {date}: nahrávky {recordings}, vlastné slová {words}, vlastné pochvaly {praises}.',
  'parent.backup.mergeHint': 'Údaje zo zálohy sa spoja s týmto zariadením. Ak je rovnaká položka na oboch miestach, zostane novšia.',
  'parent.backup.confirm': 'Obnoviť',
  'parent.backup.cancel': 'Zrušiť',
  'parent.backup.restoring': 'Obnovujem zálohu…',
  'parent.backup.restored': 'Záloha je obnovená.',
  'parent.backup.invalid': 'Tento súbor nie je záloha Mudrolína.',
  'parent.backup.restoreFailed': 'Zálohu sa nepodarilo obnoviť. Skúste to znova.',

  'parent.about.title': 'O aplikácii',
  'parent.about.version': 'Verzia',
  'parent.privacy.title': 'Súkromie',
  'parent.privacy.local': 'Nastavenia, vlastné slová a nahrávky zostávajú iba v tomto zariadení. Mikrofón sa používa len na nahrávanie vášho hlasu.',
  'parent.privacy.feedback': 'Spätná väzba sa posiela cez službu Web3Forms spolu s verziou aplikácie, typom prehliadača a veľkosťou obrazovky.',
  'parent.privacy.errors': 'Keď aplikácia narazí na chybu, odošle technické hlásenie bez osobných údajov (Sentry, servery v EÚ).',
  'parent.privacy.analytics': 'Návštevnosť meriame anonymne a bez cookies (Vercel Web Analytics).',
} as const;

export type UiCopyKey = keyof typeof SK_COPY;

// Czech DRAFT (2026-10-14): written without native review; the user reviews it.
const CS_COPY: Record<UiCopyKey, string> = {
  'home.title': 'Mudrolíno',
  'home.subtitle': 'Vyber si hru a jdeme na to!',

  'lobby.play': 'Hrát',

  'game.replayPrompt': 'Zopakovat zadání',
  'game.promptSection': 'Zadání',
  'game.replayingInstruction': 'Přehrávám zadání…',
  'game.answerGroup': 'Možnosti odpovědi',
  'game.playArea': 'Hrací plocha',
  'game.continue': 'Pokračovat',
  'game.playAgain': 'Hrát znovu',
  'game.home': 'Domů',
  'game.retryError': 'Zkusit znovu',
  'game.progress': 'Postup ve hře',
  'game.retryPrompt': 'Zkus to ještě jednou',
  'game.piece.settledLabel': 'Uloženo',
  'game.successTitle': 'Výborně!',
  'game.failureTitle': 'Nevadí, jdeme dál',
  'game.completionTitle': 'Konec hry',
  'game.taps': 'klepnutí',
  'game.paused': 'Hra je pozastavená.',
  'game.parentPause': 'Rodičovská přestávka',
  'game.unlock': 'Odemknout',

  'game.retry.detail': 'Nevadí, poslouchej ještě jednou.',
  'game.failure.detail': 'Správnou odpověď si ukážeme spolu.',
  'game.error.title': 'Něco se nepovedlo.',
  'game.error.detail': 'Zkusíme to ještě jednou?',
  'game.error.emptyPool': 'Žádné položky na hraní.',

  'category.literacy': 'Písmena a slova',
  'category.numeracy': 'Čísla a počítání',

  'game.alphabet.title': 'Abeceda',
  'game.alphabet.description': 'Poznávej písmenka hravou formou',
  'game.alphabet.instruction': 'Najdi správné písmenko.',

  'game.syllables.title': 'Slabiky',
  'game.syllables.description': 'Spojuj písmenka do slabik',
  'game.syllables.instruction': 'Najdi správnou slabiku.',

  'game.numbers.title': 'Čísla',
  'game.numbers.description': 'Počítej s kamarády',
  'game.numbers.instruction': 'Najdi správné číslo.',

  'game.counting.title': 'Spočítej',
  'game.counting.description': 'Kolik jablíček vidíš?',
  'game.counting.instruction': 'Spočítej obrázky a vyber správné číslo.',

  'game.compare.title': 'Víc nebo míň',
  'game.compare.description': 'Kde je víc předmětů?',
  'game.compare.instruction': 'Kde je více?',

  'game.addition.title': 'Sčítej',
  'game.addition.description': 'Kolik je to dohromady?',
  'game.addition.instruction': 'Spočítej, kolik je to dohromady.',

  'game.words.title': 'Slova',
  'game.words.description': 'Přečti slovo a najdi obrázek',
  'game.words.instruction': 'Přečti slovo a najdi obrázek.',

  'game.first-letter.title': 'První písmenko',
  'game.first-letter.description': 'Poslouchej slovo a najdi první písmenko',
  'game.first-letter.instruction': 'Poslouchej slovo a najdi jeho první písmenko.',

  'game.assembly.title': 'Skládej',
  'game.assembly.description': 'Poskládej slovo ze slabik',
  'game.assembly.instruction': 'Poskládej slabiky do správného slova.',

  'game.complete-syllable.title': 'Doplň slabiku',
  'game.complete-syllable.description': 'Vyber slabiku, která chybí',
  'game.complete-syllable.instruction': 'Vyber slabiku, která ve slově chybí.',

  'game.complete-letter.title': 'Doplň písmeno',
  'game.complete-letter.description': 'Doplň písmenko ve slově',
  'game.complete-letter.instruction': 'Doplň písmenko, které ve slově chybí.',

  'parent.share.title': 'Doporučit přátelům',
  'parent.share.description': 'Pošlete odkaz na Mudrolíno dalším rodičům.',
  'parent.share.message': 'Mudrolíno – hravé učení písmen, slabik a čísel pro předškoláky.',
  'parent.share.copied': 'Odkaz je zkopírovaný. Vložte ho do zprávy.',
  'parent.share.manual': 'Zkopírujte tento odkaz:',

  'parent.backup.title': 'Záloha',
  'parent.backup.description': 'Vlastní slova, pochvaly, nahrávky a nastavení jsou uložené jen v tomto zařízení. Uložte si zálohu a obnovte ji v novém telefonu nebo tabletu.',
  'parent.backup.persisted': 'Prohlížeč tato data chrání před automatickým smazáním.',
  'parent.backup.notPersisted': 'Prohlížeč může data při nedostatku místa smazat. Přidejte si aplikaci na plochu a ukládejte si zálohu.',
  'parent.backup.export': 'Uložit zálohu',
  'parent.backup.preparing': 'Připravuji zálohu…',
  'parent.backup.saveFile': 'Odeslat nebo uložit soubor zálohy',
  'parent.backup.exported': 'Záloha je uložená.',
  'parent.backup.exportFailed': 'Zálohu se nepodařilo vytvořit. Zkuste to znovu.',
  'parent.backup.import': 'Obnovit ze zálohy',
  'parent.backup.fileLabel': 'Soubor zálohy',
  'parent.backup.summary': 'Záloha z {date}: nahrávky {recordings}, vlastní slova {words}, vlastní pochvaly {praises}.',
  'parent.backup.mergeHint': 'Data ze zálohy se spojí s tímto zařízením. Pokud je stejná položka na obou místech, zůstane novější.',
  'parent.backup.confirm': 'Obnovit',
  'parent.backup.cancel': 'Zrušit',
  'parent.backup.restoring': 'Obnovuji zálohu…',
  'parent.backup.restored': 'Záloha je obnovená.',
  'parent.backup.invalid': 'Tento soubor není záloha Mudrolína.',
  'parent.backup.restoreFailed': 'Zálohu se nepodařilo obnovit. Zkuste to znovu.',

  'parent.about.title': 'O aplikaci',
  'parent.about.version': 'Verze',
  'parent.privacy.title': 'Soukromí',
  'parent.privacy.local': 'Nastavení, vlastní slova a nahrávky zůstávají jen v tomto zařízení. Mikrofon se používá jen k nahrávání vašeho hlasu.',
  'parent.privacy.feedback': 'Zpětná vazba se posílá přes službu Web3Forms spolu s verzí aplikace, typem prohlížeče a velikostí obrazovky.',
  'parent.privacy.errors': 'Když aplikace narazí na chybu, odešle technické hlášení bez osobních údajů (Sentry, servery v EU).',
  'parent.privacy.analytics': 'Návštěvnost měříme anonymně a bez cookies (Vercel Web Analytics).',
};

const COPY_BY_LOCALE: Record<string, Partial<Record<UiCopyKey, string>>> = {
  sk: SK_COPY,
  cs: CS_COPY,
};

/** Returns the copy for `key` in `locale`, falling back to Slovak when the locale has no override. */
export function getUiCopy(locale: string, key: UiCopyKey): string {
  const localeCopy = COPY_BY_LOCALE[locale];
  return localeCopy?.[key] ?? SK_COPY[key];
}

/** Like `getUiCopy`, replacing `{name}` placeholders with the given values. */
export function formatUiCopy(locale: string, key: UiCopyKey, values: Record<string, string | number>): string {
  return getUiCopy(locale, key).replace(/\{(\w+)\}/g, (match, name: string) => (name in values ? String(values[name]) : match));
}
