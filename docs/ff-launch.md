# Friends & family launch kit

Working notes for the Mudrolíno friends-and-family (F&F) launch. Task status
lives in `ROADMAP.md` (Phase 1, section 1.0); this file holds what the user
does by hand, the messages to send and the open decisions.

## Before sharing the link (user actions)

### 1. Git and Vercel: deploy production from `release`

Production deploys from the `release` branch; pushes to `main` and other
branches only create preview deployments (decision 2026-10-14).

1. Vercel → project **mudrolino** → **Settings → Environments → Production →
   Branch Tracking**: change `main` to `release` and **Save**. Do this first, so
   the next push of `main` does not deploy production.
2. Push the rewritten `main` (a project hook blocks agent pushes):
   `git push --force-with-lease=main:b9bc0523163455c76504bdcae673b2cf9c02c864 origin main`
3. Review `feat/ff-launch-prep` (pushing it gives a preview deployment:
   `git push -u origin feat/ff-launch-prep`), then merge it into `main`.
4. Ship: `git push origin main:release`. Every later release is the same
   fast-forward of `release` to a reviewed `main` commit.
5. Domains are done: `mudrolino.vercel.app` serves production and
   `teo-learn.vercel.app` redirects to it.
6. Environment variables (**Settings → Environment Variables**), all for the
   **Production** environment only, set before step 4 because variables apply
   to the next deployment:
   - `VITE_WEB3FORMS_KEY` (already set)
   - `VITE_SENTRY_DSN`, `SENTRY_AUTH_TOKEN` (mark **Sensitive**), `SENTRY_ORG`,
     `SENTRY_PROJECT`, `SENTRY_URL` = `https://de.sentry.io/` (see Sentry below)
   - Confirm `VITE_AVATAR_POC_ENABLED` is not set.
7. **Analytics** tab → enable **Web Analytics**.

### 2. Sentry (error reports)

The app reads the DSN at build time and reports only from production builds.
Uploading source maps is optional but makes stack traces readable.

1. **DSN** (done): project → **Settings → Client Keys (DSN)**. Put it into
   Vercel as `VITE_SENTRY_DSN`. It is public by design; it only allows sending
   events.
2. **Organization slug** → `SENTRY_ORG`: **Settings → Organization → General
   Settings → Organization Slug**. It is also the first part of your Sentry
   address, `https://<org-slug>.sentry.io/`.
3. **Project slug** → `SENTRY_PROJECT`: **Settings → Projects →** your project →
   **General Settings → Name** (the short lowercase name, e.g. `mudrolino`). It
   also appears in project URLs, `…/projects/<project-slug>/`.
4. **Auth token** → `SENTRY_AUTH_TOKEN`: **Settings → Developer Settings →
   Organization Tokens → Create New Token**, name it `vercel-sourcemaps`, copy
   it immediately (it is shown only once) and store it in Vercel as
   **Sensitive**. Organization tokens are limited to CI work such as uploading
   source maps, which is all the build needs. (A personal token from **User
   Settings → Personal Tokens** with *Project: Read & Write* and *Release: Admin*
   also works, but is tied to your account.)
5. **Region URL** → `SENTRY_URL` = `https://de.sentry.io/`: the organization
   stores data in the EU, and the upload tool otherwise talks to the US server.
6. **Turn off IP storage**: **Settings → Projects →** your project → **Security &
   Privacy → Prevent Storing of IP Addresses** (on). The same toggle exists
   organization-wide under **Settings → Organization → Security & Privacy** if
   you prefer one switch for all projects. The app already sends no IP or
   personal data; this makes Sentry discard the address it sees on the
   connection too.
7. Also under **Security & Privacy** (recommended): leave **Data Scrubber** and
   **Use Default Scrubbers** on, and set **Allowed Domains** to
   `mudrolino.vercel.app` so the public DSN only accepts events from the app.
8. Check after the first production deploy: open `https://mudrolino.vercel.app`
   and run `setTimeout(() => { throw new Error('Sentry test') })` in the browser
   console. The issue appears in Sentry within a minute, with the release set to
   the build's short commit (the version shown in Rodičovská zóna → Aplikácia a
   vzhľad). A source-map upload problem shows up as a `[sentry] Source map upload
   failed` warning in the Vercel build log; it never blocks the deploy.

### 3. Content and devices

1. Review the Czech drafts (all marked DRAFT):
   - `src/shared/locales/cs.ts` — alphabet example words, word list and
     syllable splits, phrases, praise.
   - `src/shared/uiCopy.ts` (`CS_COPY`) and `src/shared/locales/cs.ui.ts` —
     every Czech UI text.
2. Record the clips listed in `public/audio/_review/pending-recordings.json`
   (41 Slovak, 199 Czech); `npm run test:audio:strict` must pass before
   deploying.
3. Smoke-test on a real iPhone (Safari and installed), an Android phone and a
   tablet, in both languages.

### 4. Your family's data on the old address

`teo-learn.vercel.app` now redirects, so its stored words and recordings can no
longer be opened there, and the old build had no backup feature anyway. An
installed copy may still open from the home screen (from its offline cache),
but it keeps running the old version and cannot update. If those recordings
matter: after the first `release` deploy, temporarily remove the redirect, open
`teo-learn.vercel.app` on that device, save a backup (Rodičovská zóna →
Aplikácia a vzhľad → Uložiť zálohu), restore it on `mudrolino.vercel.app`, then
re-enable the redirect. Either way, delete the old home-screen icon.

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

## Decisions (user, 2026-10-14)

1. Install and link-preview description: neutral and readable in both
   languages — "Písmenká, slabiky a čísla hrou."
2. Contact email in the app: `mudrolino@pm.me`.
3. The install card stays on the child's home screen.
4. `mudrolino.vercel.app` is the production domain; `teo-learn.vercel.app`
   redirects to it.
5. Production deploys from the `release` branch.

## Notes for the reviewer

- Parent-zone instructions now consistently address parents formally
  (e.g. "Nahrajte vlastný hlas" instead of "Nahraj"); children's game text
  stays informal.
- The settings toggle "Písmená s dĺžňami a mäkčeňmi" reads "Písmena s čárkami
  a háčky" in Czech, and the Czech alphabet includes Ě, Ř, Ů and W.
- Fallback praise objects in the games ("Výborne!") remain Slovak; they only
  apply if a locale had no praise at all, which the content repair prevents.
