# Release and friends-and-family checklist

Production is [mudrolino.vercel.app](https://mudrolino.vercel.app). Production deploys from `release`; `main` and feature branches create previews. Current work is tracked in the [roadmap](../ROADMAP.md). The [original launch notes](history/2026-10-14-friends-family-launch.md) retain the completed October domain and Git migration.

## Release a reviewed change

1. Identify the reviewed `main` commit and its verification evidence. Run the repository's required checks for the changed scope; release verification includes strict recording inventory. Inspect the actual report and preserve any known failure explicitly.
2. Confirm the Vercel production branch is `release`, production environment values are correct, and the deployment targets the reviewed commit. Keep `VITE_AVATAR_POC_ENABLED` unset in production. Environment changes apply to the next build.
3. When the user asks to ship, fast-forward `release` to that reviewed `main` commit and push `release`. A diverged branch needs investigation before proceeding. The one-time rewritten-main migration is historical.
4. Check the deployed version in the parent area, then smoke-test the production URL and installed app. Retain the deployed revision and results with the release evidence.

Pending recordings still fail strict release verification. Previous exceptions were approved for specific releases only; they do not cover later releases.

## Pending manual checks

These items remain open until a person records their result; the presence of implementation code does not establish that service settings or physical-device behavior have been checked.

- Review Czech draft content and UI before recording: [content](../src/shared/locales/cs.ts), [game/home copy](../src/shared/uiCopy.ts), and [Czech UI translations](../src/shared/locales/cs.ui.ts). Validate custom content and recordings across language switches.
- On a real iPhone, test Safari and the installed app: one Game card tap must start the first prompt using the recording when available. Also test Android Chrome and a tablet, including Czech speech fallback, microphone permissions, backup/restore, sharing, feedback and offline play.
- Confirm production feedback and error reporting configuration against [.env.example](../.env.example). Check the intended EU Sentry project/DSN, source-map upload settings and actual received error metadata; keep replay/tracing and personal-data collection off. Source-map upload is optional and failure only warns.
- Confirm Vercel Web Analytics is enabled if still desired; implementation is production-only page views. Any future gameplay-event analytics needs a separate scope/privacy decision.
- Collect and triage feedback from the existing small friend group before broader sharing/public-launch planning. Templates below can support additional invitations; sending them is a separate user action.

## Record remaining audio

The source of truth is [pending-recordings.json](../tools/audio/pending-recordings.json), not a copied count. On 2026-11-11, 41 Slovak and 199 Czech clips remained.

1. Run `npm run audio:sessions` after reviewing content to generate short takes and scripts under `tools/audio/sessions/`.
2. Record each block in order with roughly one-second pauses. Repeat a block after mistakes.
3. Process a take with `python3 tools/audio/process_recording.py <take> --session <session.tsv>`. Review the split clips before approving writes to `public/audio/`; adjust silence options or rerecord if the piece count differs.
4. Sync the pending inventory and run `npm run test:audio`; complete `npm run test:audio:strict` before the next normal release.

## Device smoke check

1. Open the production URL, install it, and confirm its version.
2. Start Čítaj písmenká and Sčítaj directly from their Game cards. Check first-prompt audio, item-then-retry/item-then-praise feedback, completion and play again.
3. Enter the arithmetic Parent gate, switch language, save/play a custom recording, export a backup and merge it on another device.
4. Verify the parent sharing and feedback controls, then reopen offline. The optional bear may use its still; games must remain playable.

Family content belongs to its browser and origin. Before changing devices or domains, export and restore a backup. Recovery of old-origin data, if still needed, requires a deliberate plan; the dated launch notes describe the original migration context.

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
5. **Používate Mudrolíno na viacerých zariadeniach (napr. nahrávate na telefóne, dieťa hrá na tablete)?** / **Používáte Mudrolíno na více zařízeních?** — this decides whether cross-device sync ([roadmap](../ROADMAP.md#phase-3--cloud-and-accounts)) is built.
6. Čo by ste pridali alebo zmenili? / Co byste přidali nebo změnili?
7. Odporučili by ste Mudrolíno iným rodičom (0–10)? / Doporučili byste Mudrolíno jiným rodičům (0–10)?
