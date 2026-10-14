# Friends & family launch kit

Working notes for the Mudrolíno friends-and-family (F&F) launch. Task status
lives in `ROADMAP.md` (Phase 1, section 1.0); this file holds what the user
does by hand, the messages to send and the open decisions.

## Before sharing the link (user actions)

1. Push the rewritten `main` (a project hook blocks agent pushes), then merge
   `feat/ff-launch-prep` when it is reviewed:
   `git push --force-with-lease=main:b9bc0523163455c76504bdcae673b2cf9c02c864 origin main`
2. Vercel dashboard:
   - Rename the project to `mudrolino` and attach `mudrolino.vercel.app`.
   - Environment variables (Production): `VITE_WEB3FORMS_KEY` (already set),
     `VITE_SENTRY_DSN`; optionally `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`,
     `SENTRY_PROJECT` for readable stack traces. Confirm
     `VITE_AVATAR_POC_ENABLED` is not set.
   - Analytics → enable Web Analytics.
   - Optional: make a separate branch the production branch so avatar commits
     on `main` stop deploying.
3. Sentry: create an organization in the **EU (Frankfurt)** data region (it
   cannot be changed later), a React project, and turn on *Prevent Storing of
   IP Addresses* in the project's Security & Privacy settings.
4. Review the Czech drafts (all marked DRAFT):
   - `src/shared/locales/cs.ts` — alphabet example words, word list and
     syllable splits, phrases, praise.
   - `src/shared/uiCopy.ts` (`CS_COPY`) and `src/shared/locales/cs.ui.ts` —
     every Czech UI text.
5. Record the clips listed in `public/audio/_review/pending-recordings.json`
   (41 Slovak, 199 Czech); `npm run test:audio:strict` must pass before
   deploying.
6. Your own family's data on `teo-learn.vercel.app`: open the old address,
   Rodičovská zóna → Aplikácia a vzhľad → **Uložiť zálohu**, then restore it on
   `mudrolino.vercel.app`.
7. Smoke-test on a real iPhone (Safari and installed), an Android phone and a
   tablet, in both languages.

## Message to send with the link

### Slovensky

> Ahoj! Pripravil som **Mudrolíno** — hry na učenie písmen, slabík a čísel pre
> deti od 3 do 6 rokov. Je to skúšobná verzia len pre priateľov a rodinu, takže
> budem rád za každú spätnú väzbu.
>
> 👉 https://mudrolino.vercel.app
>
> **Ako začať**
> 1. Otvorte odkaz v telefóne alebo tablete.
> 2. Pridajte si ho na plochu: na iPhone/iPade v Safari ťuknite na *Zdieľať →
>    Pridať na plochu*, na Androide v Chrome na *⋮ → Pridať na plochu*. Funguje
>    potom aj bez internetu.
> 3. Rodičovská zóna je pod ozubeným kolieskom vpravo hore (treba vyriešiť
>    jednoduchý príklad). Nájdete tam nastavenia hier, jazyk (slovenčina alebo
>    čeština), nahrávanie vlastného hlasu, zálohu a formulár na spätnú väzbu.
>
> **Čo ma zaujíma:** ktoré hry dieťa bavia a ktoré nie, kde sa zaseklo alebo
> nerozumelo, či funguje zvuk a čo vám chýba. Najjednoduchšie cez *Pomoc a
> spätná väzba* v Rodičovskej zóne.
>
> Všetko, čo nahráte, zostáva len vo vašom zariadení. Pri výmene telefónu
> použite *Zálohu* v Rodičovskej zóne → Aplikácia a vzhľad.

### Česky

> Ahoj! Připravil jsem **Mudrolíno** — hry na učení písmen, slabik a čísel pro
> děti od 3 do 6 let. Je to zkušební verze jen pro přátele a rodinu, takže
> budu rád za každou zpětnou vazbu.
>
> 👉 https://mudrolino.vercel.app
>
> **Jak začít**
> 1. Otevřete odkaz v telefonu nebo tabletu.
> 2. Přidejte si ho na plochu: na iPhonu/iPadu v Safari klepněte na *Sdílet →
>    Přidat na plochu*, na Androidu v Chromu na *⋮ → Přidat na plochu*. Pak
>    funguje i bez internetu.
> 3. Pokud se aplikace neotevře česky, přepněte jazyk v Rodičovské zóně →
>    Aplikace a vzhled.
> 4. Rodičovská zóna je pod ozubeným kolečkem vpravo nahoře (je potřeba vyřešit
>    jednoduchý příklad). Najdete tam nastavení her, jazyk, nahrávání vlastního
>    hlasu, zálohu a formulář pro zpětnou vazbu.
>
> **Co mě zajímá:** které hry dítě baví a které ne, kde se zaseklo nebo
> nerozumělo, jestli funguje zvuk a co vám chybí. Nejjednodušší je *Nápověda a
> zpětná vazba* v Rodičovské zóně.
>
> Všechno, co nahrajete, zůstává jen ve vašem zařízení. Při výměně telefonu
> použijte *Zálohu* v Rodičovské zóně → Aplikace a vzhled.

## One-week survey (send as a short form or message)

1. Koľko rokov má dieťa a ako často hralo? / Kolik let má dítě a jak často hrálo?
2. Ktoré hry ho bavili najviac a ktoré najmenej? / Které hry ho bavily nejvíc a které nejméně?
3. Nefungovalo niečo (zvuk, zaseknutie, chyba)? Na akom zariadení? / Nefungovalo něco (zvuk, zaseknutí, chyba)? Na jakém zařízení?
4. Nahrávali ste vlastný hlas? Ako sa to robilo? / Nahrávali jste vlastní hlas? Jak se to dělalo?
5. **Používate Mudrolíno na viacerých zariadeniach (napr. nahrávate na telefóne, dieťa hrá na tablete)?** / **Používáte Mudrolíno na více zařízeních?** — this decides whether cross-device sync (ROADMAP 1.2) is built.
6. Čo by ste pridali alebo zmenili? / Co byste přidali nebo změnili?
7. Odporučili by ste Mudrolíno iným rodičom (0–10)? / Doporučili byste Mudrolíno jiným rodičům (0–10)?

## Open decisions for the user

1. **Install and link-preview description.** The manifest and link preview say
   "Slovenská predškolská aplikácia s hrami a rodičmi nahratým obsahom." for
   everyone, Czech families included. Options: a bilingual line, a neutral
   line, or keep it.
2. **Contact email in the app.** The feedback form shows your personal address
   for screenshots. Keep it, or use an alias?
3. **Install card on the child's home screen.** "Pridať Mudrolíno" still sits
   on the home screen, where children can tap it. Leave it, or move it into
   the parent zone next to "Odporučiť priateľom"?
4. **Old address.** Keep `teo-learn.vercel.app` attached until your family has
   moved its data, then remove it or redirect it to the new address?
5. **Production branch.** Deploy production from a separate branch so avatar
   work on `main` never reaches friends?

## Notes for the reviewer

- Parent-zone instructions now consistently address parents formally
  (e.g. "Nahrajte vlastný hlas" instead of "Nahraj"); children's game text
  stays informal.
- The settings toggle "Písmená s dĺžňami a mäkčeňmi" reads "Písmena s čárkami
  a háčky" in Czech, and the Czech alphabet includes Ě, Ř, Ů and W.
- Fallback praise objects in the games ("Výborne!") remain Slovak; they only
  apply if a locale had no praise at all, which the content repair prevents.
