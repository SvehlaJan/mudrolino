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

  // Install and update prompts
  'Nová verzia je pripravená.': 'Nová verze je připravená.',
  'Aktualizovať': 'Aktualizovat',
  'Neskôr': 'Později',
  '{app} je pripravený aj offline.': '{app} je připravený i offline.',
  'Pridať {app}': 'Přidat {app}',
  'Zobraziť postup pridania na plochu.': 'Zobrazit postup přidání na plochu.',
  'Uložiť aplikáciu na plochu a používať ju pohodlne.': 'Uložit aplikaci na plochu a pohodlně ji používat.',
  'Na iPhone otvorte Zdieľať a zvoľte Pridať na plochu.': 'Na iPhonu otevřete Sdílet a zvolte Přidat na plochu.',
  'Rozumiem': 'Rozumím',
  'Offline režim sa nepodarilo pripraviť.': 'Offline režim se nepodařilo připravit.',

  // Game settings
  'Nastavenia hier': 'Nastavení her',
  'Nastavenia hry sa nenašli': 'Nastavení hry se nenašlo',
  'Požadovaná hra neexistuje alebo nemá žiadne nastaviteľné parametre.': 'Požadovaná hra neexistuje nebo nemá žádné nastavitelné parametry.',
  'Prehľad nastavení hier': 'Přehled nastavení her',
  'Nastavenia hry': 'Nastavení hry',
  'Chýbajúce písmená': 'Chybějící písmena',
  'Hra s dopĺňaním písmen': 'Hra s doplňováním písmen',
  'Hra s dopĺňaním slabík': 'Hra s doplňováním slabik',
  'Hra s porovnávaním': 'Hra s porovnáváním',
  'Hra s počítaním': 'Hra s počítáním',
  'Hra s prvým písmenkom': 'Hra s prvním písmenkem',
  'Hra s písmenami': 'Hra s písmeny',
  'Hra s číslami': 'Hra s čísly',
  'Hra so skladaním': 'Hra se skládáním',
  'Hra so slabikami': 'Hra se slabikami',
  'Hra so slovami': 'Hra se slovy',
  'Hra so sčítaním': 'Hra se sčítáním',
  'Najväčší možný súčet.': 'Největší možný součet.',
  'Nastavenia': 'Nastavení',
  'Podľa dĺžky': 'Podle délky',
  'Počet kariet': 'Počet karet',
  'Predmety na počítanie, alebo napísané čísla.': 'Předměty k počítání, nebo napsaná čísla.',
  'Predmety': 'Předměty',
  'Pri rozsahu 20 alebo 100 sa zobrazenie prepne na čísla.': 'Při rozsahu 20 nebo 100 se zobrazení přepne na čísla.',
  'Písmená s dĺžňami a mäkčeňmi': 'Písmena s čárkami a háčky',
  'Rozsah počítania': 'Rozsah počítání',
  'Rozsah súčtu': 'Rozsah součtu',
  'Rozsah čísel': 'Rozsah čísel',
  'Rozšíriť hru o slovenské znaky.': 'Rozšířit hru o písmena s čárkami a háčky.',
  'Vyberte počet kariet v hre.': 'Vyberte počet karet ve hře.',
  'Vyberte rozsah počítania predmetov.': 'Vyberte rozsah počítání předmětů.',
  'Vyberte rozsah čísel pre hru.': 'Vyberte rozsah čísel pro hru.',
  'Vyberte rozsah čísel pre porovnávanie.': 'Vyberte rozsah čísel pro porovnávání.',
  'Vyberte, koľko písmen má v slove chýbať.': 'Vyberte, kolik písmen má ve slově chybět.',
  'Vypnuté': 'Vypnuto',
  'Zapnuté': 'Zapnuto',
  'Zobrazenie': 'Zobrazení',
  'Čísla': 'Čísla',

  // Parent dashboard, help and feedback
  'Snímky obrazovky pošlite e-mailom na': 'Snímky obrazovky pošlete e-mailem na',
  'Chyba v hre': 'Chyba ve hře',
  'Nápad / návrh': 'Nápad / návrh',
  'Pochvala': 'Pochvala',
  'Iné': 'Jiné',
  'Ďakujeme!': 'Děkujeme!',
  'Ďakujeme za spätnú väzbu. Tento formulár neposiela e-mailovú adresu a nemôžeme odpovedať priamo.': 'Děkujeme za zpětnou vazbu. Tento formulář neposílá e-mailovou adresu, a proto nemůžeme odpovědět přímo.',
  'Spätná väzba': 'Zpětná vazba',
  'Formulár neposiela e-mailovú adresu, preto nemôžeme odpovedať priamo.': 'Formulář neposílá e-mailovou adresu, proto nemůžeme odpovědět přímo.',
  'Typ správy': 'Typ zprávy',
  'Vyberte, čo chcete nahlásiť.': 'Vyberte, co chcete nahlásit.',
  'Vaša správa': 'Vaše zpráva',
  'Povinné pri chybe alebo návrhu.': 'Povinné u chyby nebo návrhu.',
  'Voliteľné.': 'Nepovinné.',
  'Opíšte čo sa stalo, čo vám chýba, alebo čo by ste chceli vylepšiť…': 'Popište, co se stalo, co vám chybí, nebo co byste chtěli vylepšit…',
  'Napíšte správu pred odoslaním.': 'Napište zprávu před odesláním.',
  'Odosielam…': 'Odesílám…',
  'Odoslať': 'Odeslat',
  'Odosielanie zlyhalo. Skúste znova.': 'Odeslání se nezdařilo. Zkuste to znovu.',
  'Pomoc a spätná väzba': 'Nápověda a zpětná vazba',
  'Rozsahy, obtiažnosť a zobrazenie pre jednotlivé hry.': 'Rozsahy, obtížnost a zobrazení pro jednotlivé hry.',
  'Vlastný obsah': 'Vlastní obsah',
  'Nahrajte vlastný hlas pre písmená, slová a frázy.': 'Nahrajte vlastní hlas pro písmena, slova a fráze.',
  'Jazyk, písmo, záloha, súkromie a verzia aplikácie.': 'Jazyk, písmo, záloha, soukromí a verze aplikace.',
  'Pomôžte nám zlepšiť aplikáciu.': 'Pomozte nám vylepšit aplikaci.',
  'Nastavenia, obsah a pomoc pre rodičov.': 'Nastavení, obsah a nápověda pro rodiče.',
};
