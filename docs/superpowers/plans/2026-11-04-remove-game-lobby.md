# Remove the Game Lobby Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A tap on a Home screen Game card starts the first Round directly. Game settings live only in the Parent area, Unplayable games dim their card with the reason, and any other entry to a game route redirects to the Home screen.

**Architecture:** One pure module decides playability for both the Home screen and the game route. A one-shot in-memory "session entry" token, armed by the card tap, separates a real tap from a reload, a typed URL or a history step. The lobby is removed last, after tests and screenshots already enter games through the card, so every task leaves the suites green.

**Tech Stack:** React 19, TypeScript, React Router, Vite, Tailwind v4, Vitest (Node), Playwright.

**Spec:** `docs/superpowers/specs/2026-11-04-remove-game-lobby-design.md`. The glossary is in `CONTEXT.md`. Read both before Task 1.

## Global Constraints

- Branch `feature/remove-game-lobby`. Do not push or open a pull request; the user does both.
- Commit messages are `type: imperative summary` with one of `fix:`, `feat:`, `perf:`, `docs:`, `test:` or `chore:`. The body explains why, and the message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Before every commit, run:
  - `npm run lint`: zero errors, allowing only the known ContentContext react-refresh warning;
  - `npm run test:unit`;
  - `npm run verify:pure`.
- Run `npm run verify:edit` during work. Run `npm run verify:integration` before committing any task that touches routing, sessions, audio or the app shell (Tasks 3–6).
- Do not run a second unit-test or verification process while a gate is running. Parallel runs caused timeout-only failures on this machine on 2026-11-04.
- Screenshots need the test-mode preview:
  - run `npm run build:e2e`;
  - start `npm run preview:e2e -- --port 4173 --host 127.0.0.1 --strictPort` in the background;
  - then run `npm run shots …`.

  Inspect only the 320 px review copies. `narrowPhone` is the 320×568 viewport.
- UI text:
  - Slovak goes in `t('…')`, or `msg('…')` outside components.
  - Czech goes in `src/shared/locales/cs.ui.ts`, keyed by the Slovak text.
  - Never build text with template literals inside `t()`.
  - Game and home text uses keys in `src/shared/uiCopy.ts`.
- Never statically import a `src/games/**/*Game.tsx` file, or `AvatarScene`, `AvatarModel`, `AvatarSkeletonOverlay` or `skinnedGarment`, into a module the Home screen or `App.tsx` loads. `*Logic.ts` modules are fine.
- Use the `src/shared/ui/` primitives, and update the hidden `/ui-kit` route in the same change as any shared UI change.
- e2e specs read answers from `window.__E2E__` via `getE2EState()`, and every spec asserts no console errors and no failed requests.
- The answer audio contract is unchanged: the item's own audio plays first, then the verdict.
- The Unplayable messages are exactly the five existing Slovak strings below, with the Czech translations already in `cs.ui.ts`. Shorten one only if it does not fit a two-column card at 320 px; change both locales if you do.
  - WORDS: `Pridajte slová v sekcii Vlastný obsah.`
  - FIRST_LETTER: `Pridajte alebo nahrajte slová, ktoré začínajú dostupnými písmenkami.`
  - ASSEMBLY: `Pridajte slová so slabikami v sekcii Vlastný obsah.`
  - COMPLETE_SYLLABLE: `Pridajte slová s dvomi až štyrmi slabikami.`
  - COMPLETE_LETTER: `Pridajte slová z aktívnych písmen alebo upravte nastavenia písmen.`

## Review Focus

1. **Reload or Forward into a game route.** Either one must land on the Home screen and must not start a silent Session. React StrictMode's dev double-mount must not redirect a real tap. Tested in Task 4 (unit and e2e).
2. **The phone back gesture during a Session.** It reaches the Home screen, and a later Forward redirects instead of reopening the game. Tested in Task 4.
3. **A parent disables words in the Parent area, then returns home.** The affected cards dim without a reload. Tested in Task 5.
4. **Czech.** Unplayable reasons show in Czech when the app language is Czech. Tested in Task 5.
5. **No words at all.** The Syllables game is not on the spec's Unplayable list, but it reads syllables derived from words. Task 5 tests that it still starts a Round with zero words. If it does not, stop and report to the user; new copy needs their review.

---

### Task 1: Shared playability rules

**Files:**
- Create: `src/shared/gamePlayability.ts`
- Test: `src/shared/gamePlayability.test.ts`
- Modify: `src/games/words/WordsGame.tsx`, `src/games/first-letter/FirstLetterGame.tsx:304-336`, `src/games/assembly/AssemblyGame.tsx:734-753`, `src/games/complete-syllable/CompleteSyllableGame.tsx:415-441`, `src/games/complete-letter/CompleteLetterGame.tsx:460-498`

**Interfaces:**
- Produces:
  ```ts
  export interface PlayabilityInput {
    wordItems: Word[];
    letterItems: Letter[];
    syllableItems: Syllable[];
    settings: GameSettings;
  }
  /** Slovak msg()-marked reason, or null when the game has something to ask. Callers translate it. */
  export function getUnplayableReason(gameId: GameId, input: PlayabilityInput): string | null;
  ```
- Consumes: `getActiveFirstLetterLetters`, `buildFirstLetterItems`, `multiCharacterLetters` (`firstLetterLogic.ts`), `buildEligibleCompleteSyllableWords` (`completeSyllableLogic.ts`), `getActiveCompleteLetterLetters` and `buildEligibleCompleteLetterWords` (`completeLetterLogic.ts`). Use the same arguments each game passes today, with a choice count of 4.

- [ ] **Step 1: Write the failing tests in `src/shared/gamePlayability.test.ts`**

  Build the input from `getLocaleContent('sk')` (`letterItems`, `wordItems`, `syllableItems`) and `DEFAULT_GAME_SETTINGS` (`src/shared/settings/settingsRegistry.ts`).
  - `every game is playable with the bundled words`: for every `GAME_DEFINITIONS` id, `getUnplayableReason(id, input)` is `null`.
  - `word games explain themselves when no words are enabled`: with `wordItems: []` and `syllableItems: []`, each of the five ids returns its exact string from Global Constraints. `ALPHABET`, `NUMBERS`, `COUNTING_ITEMS`, `COMPARE_QUANTITIES` and `ADDITION` return `null`.
  - `assembly needs a two- or three-syllable word`: with only `{ word: 'Kukurica', syllables: 'ku-ku-ri-ca', … }`, `ASSEMBLY` returns its reason. With only `{ word: 'Mama', syllables: 'ma-ma', … }`, it returns `null`.

- [ ] **Step 2: Run the tests to verify they fail**

  Run `npx vitest run src/shared/gamePlayability.test.ts`. Expected: FAIL, because the module does not exist.

- [ ] **Step 3: Implement `getUnplayableReason` in `src/shared/gamePlayability.ts`**

  Move each rule out of its game unchanged. The table in the spec's Behavior section names every rule. Move Assembly's inline 2–3 syllable filter into this module as `getAssemblyEligibleWords(words: Word[]): Word[]`, and have `AssemblyGame.tsx` import it.

- [ ] **Step 4: Point the five games at it**

  Each game sets `availabilityMessage` from `getUnplayableReason(…)`, translated with `t()`, or `translate()` in WordsGame, and drops its own `isPlayable` arithmetic. Games keep computing their eligible words for rounds. The lobby behaves exactly as before.

- [ ] **Step 5: Run the tests to verify they pass**

  Run `npx vitest run src/shared/gamePlayability.test.ts`, then `npm run test:unit`. Expected: PASS. `src/shared/i18n.test.ts` still passes: every `msg()` string has a Czech translation.

- [ ] **Step 6: Commit**

  `chore: share game playability rules`. The body says the Home screen will need the same rules the lobby used.

---

### Task 2: Tests and screenshots enter games from the Game card

**Files:**
- Create: `e2e/support/gameEntry.ts`
- Modify: every file that taps Hrať after opening a game URL. These are:
  - `e2e/addition`, `assembly-layout`, `audio-output`, `avatar-companion`, `browser-feedback`, `catalog-home-lobbies`, `compare-quantities`, `counting`, `find-it-games`, `game-play-review`, `game-shell`
  - `literacy-assembly`, `literacy-complete-letter`, `literacy-complete-syllable`, `literacy-first-letter`, `literacy-interactions`, `literacy-layout`
  - `numeracy-accessibility`, `numeracy-responsive`, `offline`, `parent-access`, `production-guards`, `real-media`
  - `release-accessibility`, `release-audio-order`, `release-journeys`, `release-parent-data`, `release-responsive`, `release-rotations`, `release-webkit-smoke`
  - `smoke`, `tile-drag`, `tile-placement-motion`, `ui-ux-enhancements`

  All of these are `.spec.ts` files under `e2e/`. Also modify `e2e/support/literacyHarness.ts` and `tools/screenshots/capture.mjs`.

**Interfaces:**
- Produces, in `e2e/support/gameEntry.ts`:
  ```ts
  /** Opens '/' and taps the Game card whose href is `path`; resolves once the URL is `path`. */
  export async function openGameFromHome(page: Page, path: string): Promise<void>;
  /** openGameFromHome, then taps the lobby's play button (/^(Hrať|Hrát)$/). Task 6 removes that tap. */
  export async function startGame(page: Page, path: string): Promise<void>;
  ```
  Locate the card with `[data-testid="game-card"][href="${path}"]`.
- Produces, in `capture.mjs`: `async function openGameFromHome(page, baseUrl, path)`, with the same behavior, local to the tool.

- [ ] **Step 1: Write `gameEntry.ts`**
- [ ] **Step 2: Migrate the specs**

  Replace each `page.goto('<game path>')` followed by a Hrať tap with `startGame(page, path)`. Use `openGameFromHome` where a spec inspects the lobby without playing. Per-spec start helpers, such as `startAddition`, `startCounting` and `start` in `avatar-companion`, call `startGame` instead of duplicating it. Initial-script seeding before navigation stays as it is.

  The game paths are `/alphabet`, `/syllables`, `/numbers`, `/counting`, `/compare`, `/addition`, `/words`, `/first-letter`, `/assembly`, `/complete-syllable` and `/complete-letter`.

- [ ] **Step 3: Migrate `capture.mjs`**

  The `lobby-*` scenes call `openGameFromHome`, then wait for Hrať. `enterPlay`, `enterNumeracyRound`, `enterFindItRound` and `game-words-visual` call it, then tap Hrať.

- [ ] **Step 4: Prove nothing opens a game URL directly**

  Run `grep -rnE "goto\([^)]*/(alphabet|syllables|numbers|counting|compare|addition|words|first-letter|assembly|complete-syllable|complete-letter)['\"\`]" e2e tools/screenshots`. Expected: no output.

- [ ] **Step 5: Run the suites**

  Run `npm run verify:integration`, then `npm run shots -- --seed=42 --scene=lobby-alphabet --scene=alphabet-round --viewport=narrowPhone` (see Global Constraints for the preview server). Expected: integration passes, and the manifest records no errors or failed requests.

- [ ] **Step 6: Commit**

  `test: start games from the home card`. The body says direct game URLs will soon redirect.

---

### Task 3: Game settings only through the Parent area

**Files:**
- Modify:
  - `src/shared/components/GameLobby.tsx`: remove the `onOpenSettings` prop, the gear and the `returnFocus` effect.
  - the 11 `src/games/*/*Game.tsx` components: stop passing `onOpenSettings`.
  - `src/shared/gameRuntime.ts`: remove `onOpenSettings`.
  - `src/shared/components/GameRoute.tsx`: remove the settings navigation.
- Modify:
  - `src/shared/components/ProtectedParentRoute.tsx`: on cancel, `navigate('/', { replace: true })`.
  - `src/parent/ParentLayout.tsx` and `src/parent/ParentZoneContext.ts`: drop `returnTo`. `closeToChild(options?: { replace?: boolean })` always goes to `/`.
  - `src/parent/GameSettingsScreen.tsx`: Back always calls `navigate('/settings/games', { replace: true })`.
  - `src/shared/services/parentAccessLogic.ts` and `parentAccessLogic.verify.ts`: delete `sanitizeChildReturnPath` and its two checks.
- Modify: the lobby wording in `src/shared/components/ParentsGate.tsx:43` and `src/parent/SettingsRenderer.tsx:18`.
- Modify: `.claude/rules/games.md`, in the Settings section: settings render in the Parent area's drill-down only.
- Test: `e2e/parent-settings.spec.ts`, `e2e/parent-access.spec.ts`, `e2e/catalog-home-lobbies.spec.ts`

**Interfaces:**
- Produces: `GameRuntimeProps = { settings: GameSettings; onExit(): void }`; `ParentZoneValue = { closeToChild(options?: { replace?: boolean }): void }`.

- [ ] **Step 1: Write the failing e2e tests**
  - `catalog-home-lobbies.spec.ts`, `lobbies offer no settings shortcut`: after `openGameFromHome(page, '/alphabet')`, `page.getByRole('button', { name: 'Nastavenia' })` has count 0.
  - `parent-access.spec.ts`: replace the test at line 260 with `a return path in history state is ignored and cancel goes home`. Push `/settings/games/ALPHABET` with state `{ returnTo: '/alphabet' }`, cancel the gate, and expect the URL to be `/`.
  - `parent-settings.spec.ts`: delete the test at line 159, which closes settings back into a lobby.
- [ ] **Step 2: Run the tests to verify they fail**

  Run `npx playwright test -c e2e/playwright.config.ts e2e/catalog-home-lobbies.spec.ts e2e/parent-access.spec.ts`. Expected: the two new tests FAIL.
- [ ] **Step 3: Make the changes listed under Files**
- [ ] **Step 4: Run the gates**

  Run `npm run verify:integration`. Expected: PASS.
- [ ] **Step 5: Commit**

  `feat: keep game settings in the parent zone`. The body notes this supersedes the 2026-09-29 decision.

---

### Task 4: Sessions start only from a tap

**Files:**
- Create: `src/shared/sessionEntry.ts`
- Test: `src/shared/sessionEntry.test.ts`
- Create: `e2e/session-entry.spec.ts`
- Modify: `src/home/GameCard.tsx`, `src/shared/components/GameRoute.tsx`

**Interfaces:**
- Produces:
  ```ts
  export function armSessionEntry(gameId: GameId): void;
  /** Pure read; safe to call twice (React StrictMode runs state initialisers twice in dev). */
  export function isSessionEntryArmed(gameId: GameId): boolean;
  export function disarmSessionEntry(): void;
  ```
- The card's `<Link>` passes `state={{ fromHome: true }}` and calls `armSessionEntry(game.id)` before `onClick`.
- `GameRoute`:
  - reads `const [entered] = useState(() => isSessionEntryArmed(gameId))`, and calls `disarmSessionEntry()` in a mount effect;
  - renders `<Navigate to="/" replace />` when `!entered`, and `null` while `useContent().isLoading`;
  - its `onExit` calls `navigate(-1)` when `location.state?.fromHome`, else `navigate('/', { replace: true })`.

- [ ] **Step 1: Write the failing unit tests in `sessionEntry.test.ts`**
  - `a fresh page load has no armed entry`: use `vi.resetModules()` and re-import, then `isSessionEntryArmed('ALPHABET')` is false.
  - `arming is per game and survives repeated reads`: after `armSessionEntry('ALPHABET')`, two reads both return true, and `isSessionEntryArmed('NUMBERS')` is false.
  - `disarming clears it`: after `disarmSessionEntry()`, `isSessionEntryArmed('ALPHABET')` is false.
- [ ] **Step 2: Write the failing e2e tests in `session-entry.spec.ts`**

  Use `support/fixtures`.
  - `a game URL opened directly lands on the Home screen`: `page.goto('/alphabet')`. Expect the URL path to be `/` and the heading `Písmená a slová` to be visible.
  - `reloading a game sends the child home`: `openGameFromHome(page, '/alphabet')`, then `page.reload()`. Expect the path `/`.
  - `Forward into a left game redirects home`: `openGameFromHome`, `page.goBack()`, `page.goForward()`. Expect the path `/`.
  - `leaving a game does not leave it ahead of the Home screen`: `openGameFromHome`, then tap `getByRole('button', { name: 'Späť' })`. Expect the path `/`. Then `page.goBack()`, and expect `page.url()` to be `about:blank`.
- [ ] **Step 3: Run the tests to verify they fail**

  Run `npx vitest run src/shared/sessionEntry.test.ts` and `npx playwright test -c e2e/playwright.config.ts e2e/session-entry.spec.ts`. Expected: FAIL.
- [ ] **Step 4: Implement `sessionEntry.ts`, the card arming and the `GameRoute` guard**

  Follow the Interfaces block.
- [ ] **Step 5: Run the gates**

  Run `npm run test:unit` and `npm run verify:integration`. Expected: PASS.
- [ ] **Step 6: Commit**

  `feat: start sessions only from a tap`. The body says browsers allow no sound before a tap, and a reload already discards the Session.

---

### Task 5: Unplayable Game cards and early game loading

**Files:**
- Modify:
  - `src/home/GameCard.tsx`
  - `src/home/GroupedHomeScreen.tsx`
  - `src/App.tsx`: pass `settings`.
  - `src/shared/gameModuleRegistry.ts`
  - `src/shared/ui/UiKitScreen.tsx`: add an Unplayable card example beside the existing GameCard examples near line 1134.
- Test: `e2e/unplayable-games.spec.ts` (new)

**Interfaces:**
- Consumes: `getUnplayableReason` (Task 1), `armSessionEntry` (Task 4).
- Produces:
  - `GameCardProps.unplayableReason?: string`, already translated.
  - The card always carries `data-game-id={game.id}`. When unplayable it also has `data-unplayable="true"` and `aria-disabled="true"`, shows the reason, has no `href`, and neither navigates nor arms on tap.
  - `GroupedHomeScreenProps.settings: GameSettings`. Reasons come from `useContent()` (`wordItems`, `letterItems`, `syllableItems`) and `settings`, translated with `translate(locale, reason)`. While `isLoading` is true, no card is Unplayable.
  - `export function preloadGameModule(gameId: GameId): Promise<unknown>` in `gameModuleRegistry.ts`. It is memoised per id and shares its loader with `GAME_MODULES`. The card calls it on `pointerdown` and on `click`.

- [ ] **Step 1: Write the failing e2e tests in `unplayable-games.spec.ts`**

  Seed no words with `seedLocalStorage` (`e2e/support/persistenceFixtures.ts`): `{ 'hrave-ucenie-seeded-sk': 'true', 'hrave-ucenie-user-words-sk': { version: 2, items: [] } }`.
  - `with no words, the five word games are dimmed with their reason`:
    - For `WORDS`, `FIRST_LETTER`, `ASSEMBLY`, `COMPLETE_SYLLABLE` and `COMPLETE_LETTER`, the card `[data-game-id=…]` has `data-unplayable="true"`, `aria-disabled="true"` and no `href`, and contains its exact Global Constraints string.
    - Clicking it leaves the URL at `/`.
    - The `ALPHABET`, `NUMBERS`, `COUNTING_ITEMS`, `COMPARE_QUANTITIES` and `ADDITION` cards have an `href`.
  - `the Syllables game still starts with no words`: with the same seed, `startGame(page, '/syllables')`, then `waitForGamePhase(page, 'awaiting-answer')`, with no console errors. If this fails, stop and report to the user (Review Focus 5).
  - `reasons follow the app language`: with the Czech seed (`hrave-ucenie-seeded-cs` and `hrave-ucenie-user-words-cs`) and the app in Czech (`browser.newContext({ locale: 'cs-CZ' })`, as `parent-settings.spec.ts:65` does), the `WORDS` card contains `Přidejte slova v sekci Vlastní obsah.`
  - `a word disabled in the Parent area dims its card on return`:
    - Seed one ready 2-syllable word, `ASSEMBLY_MAMA` from `literacyHarness.ts`, and expect the `ASSEMBLY` card to have an `href`.
    - Open `/content` through the parent gate and disable that word, using the same controls `custom-content.spec.ts` uses.
    - Close the Parent area, and expect the `ASSEMBLY` card to have `data-unplayable="true"`, without a reload.
- [ ] **Step 2: Run the tests to verify they fail**

  Run `npx playwright test -c e2e/playwright.config.ts e2e/unplayable-games.spec.ts`. Expected: the dimming tests FAIL.
- [ ] **Step 3: Implement the card state, the Home screen reasons and `preloadGameModule`**

  Follow the Interfaces block.
- [ ] **Step 4: Check the card at 320 px**

  Add a `home-unplayable` scene to `capture.mjs`. It seeds the no-words localStorage values above with `page.addInitScript`, opens `/`, and waits for a `[data-unplayable="true"]` card. Run `npm run shots -- --seed=42 --scene=home-unplayable --viewport=narrowPhone`.

  Look at the 320 px review copy and confirm all five reasons are legible without overflowing. Shorten any message that fails, in both locales.
- [ ] **Step 5: Run the gates**

  Run `npm run verify:integration`. Expected: PASS.
- [ ] **Step 6: Commit**

  `feat: dim unplayable game cards with their reason`.

---

### Task 6: Games start straight from the Home screen

**Files:**
- Modify: the 11 `src/games/*/*Game.tsx` components. Remove the `'HOME' | 'PLAYING'` or `playing` state and the `GameLobby` render, and render the playfield directly with `onExit` from props. In FindItGame and the bespoke playfields, the Completion screen's Domov already calls `onExit`. Delete the per-game `availabilityMessage` code.
- Modify: `src/shared/components/GameRoute.tsx`. After loading, also render `<Navigate to="/" replace />` when `getUnplayableReason(gameId, …) !== null`.
- Delete: `src/shared/components/GameLobby.tsx`. Also remove its `/ui-kit` section (`UiKitScreen.tsx:31`, `:1177`) and the `'Game Lobby Shell'` group (`ComponentGallery.tsx:28`). Regenerate the inventory with `node --import tsx tools/ui-gallery/generate.ts`.
- Modify: `e2e/support/gameEntry.ts`. `startGame` no longer taps Hrať; delete `openGameFromHome` and move its callers to `startGame`.
- Modify: the specs that assert on the lobby:
  - Rename `catalog-home-lobbies.spec.ts` to `catalog-home.spec.ts`. Keep the card and locale checks, and drop `lobby-body` and `lobby-instruction`.
  - `addition.spec.ts:115,154` and `browser-feedback.spec.ts:174`: Back and Domov now show the Home screen.
  - `game-shell`, `smoke`, `ui-foundation`, `release-responsive`, `release-accessibility` and `release-webkit-smoke`: remove the lobby references.
- Modify: `tools/screenshots/capture.mjs` and `capture.verify.ts`:
  - Delete the 11 `lobby-*` scenes.
  - Rename `LOBBY_SLUGS` to `GAME_SLUGS`, and alias each bare slug to `${slug}-round`.
  - Drop the lobby entries from the release scene list, and stop tapping Hrať.
  - Remove the `REQUIRED_LOBBIES` checks.
- Test: `e2e/real-media.spec.ts`, `e2e/release-webkit-smoke.spec.ts`

**Interfaces:**
- Consumes: `startGame` (Task 2, now a single tap), `getUnplayableReason` (Task 1), and the `GameRoute` guard (Task 4).

- [ ] **Step 1: Write the failing audio tests**
  - `real-media.spec.ts`, `a card tap plays the first prompt from its recording`:
    - Collect console messages, then `startGame(page, '/numbers')`.
    - Poll `getAudioEvents(page)` until it contains `finish:sk/phrases/najdi` and an event starting with `finish:sk/numbers/`.
    - Expect no console message containing `falling back to TTS`.
  - `release-webkit-smoke.spec.ts`: the same test in the WebKit release projects. This spec uses the deterministic media stubs, so it proves only the wiring in WebKit: the card tap reaches the recorded clip, not the fallback. Test builds mute audio, so neither test proves that the tap unlocks audible sound. That proof is the device check in Task 8.
- [ ] **Step 2: Run the tests to verify they fail**

  Run `npx playwright test -c e2e/playwright.config.ts e2e/real-media.spec.ts`. Expected: FAIL, because `startGame` still lands on the lobby until Step 3.
- [ ] **Step 3: Make the changes listed under Files**
- [ ] **Step 4: Prove the lobby is gone**

  Run `grep -rn "GameLobby\|lobby-body\|lobby-instruction\|name: 'Hrať' })" src e2e tools/screenshots`. Expected: no output, except the `Hrať znova` button.
- [ ] **Step 5: Run the gates**

  Run `npm run verify:integration`, then `npx playwright test -c e2e/playwright.release.config.ts --project=release-webkit-phonePortrait`. Expected: PASS.
- [ ] **Step 6: Commit**

  `feat: start games straight from the home screen`.

---

### Task 7: Delete lobby-only copy and update agent docs

**Files:**
- Modify: `src/shared/uiCopy.ts`. Delete `lobby.play` and the 11 `game.*.instruction` keys in both the `sk` and `cs` blocks.
- Modify: `src/shared/gameCatalog.tsx`. Remove `instructionKey` from `GameDefinition` and from all 11 entries.
- Modify: `src/shared/uiCopy.verify.ts`. Check only `titleKey` in the loop, and keep the `game.home` Czech sample while dropping `lobby.play` and the instruction samples.
- Modify: `AGENTS.md`. `GAME_DEFINITIONS` is "the single source for a game's id, route, home card, and settings".
- Modify: `.claude/rules/games.md`. Remove `GameLobby` from the frontmatter `paths`.

- [ ] **Step 1: Make the deletions**
- [ ] **Step 2: Prove nothing still reads them**

  Run `grep -rn "instructionKey\|lobby\.play\|\.instruction'" src`. Expected: no output.
- [ ] **Step 3: Run the gates**

  Run `npm run lint`, `npm run test:unit` and `npm run verify:pure`. Expected: PASS, including `i18n.test.ts` and `uiCopy.verify.ts`.
- [ ] **Step 4: Commit**

  `chore: delete lobby-only copy`.

---

### Task 8: Final verification and roadmap

**Files:**
- Modify: `ROADMAP.md`. Tick the "Remove the per-game lobby" task in F&F P1 with the date and the final commit. The 2026-11-04 Decisions Log row stays.

- [ ] **Step 1: Run the integration gate fresh**

  Run `npm run verify:integration -- --force`. Expected: PASS.
- [ ] **Step 2: Run the release gate**

  Run `npm run verify:release`. Expected: every gate passes except the strict audio inventory, which fails only on the known pending recordings (41 Slovak and 199 Czech, `tools/audio/pending-recordings.json`). Report that as a known, unrelated failure, not as a pass.
- [ ] **Step 3: Review screenshots**

  Run `npm run shots -- --seed=42` and inspect only the 320 px review copies of the Home screen and two round scenes.
- [ ] **Step 4: Commit the roadmap**

  `docs: record the lobby removal`.
- [ ] **Step 5: Hand over the device check**

  Tell the user the real-iPhone check is still theirs, in Safari and installed: one card tap must play the first Prompt as the recording, not the robot voice.
