# Remove the game lobby

**Date:** 2026-11-04
**Status:** Approved for implementation, to start after `feature/bear-companion-design` merges into `main`
**Scope:** All 11 games, the Home screen, the Parent area's game settings, tests, screenshot tooling and agent docs.

Capitalised terms (Home screen, Game card, Session, Round, Prompt, Completion screen, Parent area, Parent gate, Game settings, Unplayable) are defined in `CONTEXT.md`.

## Intent

Today a tap on a Game card opens a per-game lobby (`src/shared/components/GameLobby.tsx`): the game title, a written instruction, a large Play button, Back, and a settings gear behind the Parent gate. A child then taps Play to start the Session.

The user decided to remove the lobby so that a Game card tap starts the first Round directly. The user did not state a reason; the reasoning recorded here is ours and was not contradicted during the review: the children cannot read the title or instruction, 9 of the 11 games already speak the task in every Prompt, and so the lobby only adds a tap between the child and the first Prompt.

## Goals

- One tap on a Game card starts a Session, and its first Prompt plays the real recording on that tap.
- A child never lands on a screen whose only content is text.
- Adults keep full access to Game settings and learn why a game cannot be played.

## Non-goals

- Spoken instructions for missing syllable and missing letter, whose Prompts say only the word (`CompleteSyllableGame.tsx:55`, `CompleteLetterGame.tsx:57`). That needs new recordings and is a separate task.
- Any change to round loops, answer audio, the bear companion, or the Parent area beyond game settings.
- A Home screen redesign. Card changes are limited to the Unplayable state below.

## Anti-goals

The change fails, even if it works mechanically, if:

- the first Prompt of a Session plays as the robot voice, or not at all, because the tap no longer counts as permission for sound;
- a game can start a Session with nothing to ask, or with content that has not finished loading;
- the in-game parent shortcut removed on 2026-09-29 comes back in any form.

## Decisions (made by the user)

1. **A Game card tap starts the first Round immediately.** No intermediate screen, countdown or intro.
2. **Game settings are reachable only through the Parent area**: Home screen gear → Parent gate → Nastavenia hier → the game. No per-game shortcut on the Home screen or in a game. This supersedes the 2026-09-29 Decisions Log row that kept the lobby as the adults' entry to settings.
3. **An Unplayable game's Game card is dimmed, says why, and starts nothing when tapped.** It is neither hidden nor opened onto a dead-end screen.
4. **The written instruction is dropped.** The Prompt is the only instruction a child gets.
5. **In-game Back and the Completion screen's Domov both go to the Home screen**, with no confirmation. Hrať znova still starts a new Session in place.
6. **Opening a game route without a fresh tap redirects to the Home screen.** A Session only starts from a tap on a Game card or on Hrať znova.
7. **The work starts after the bear companion branch merges**, on a new branch from `main`. That branch touches six of the same files (`GameShell.tsx`, the ui-kit screen and inventory, `release-responsive.spec.ts`, `release-webkit-smoke.spec.ts`, and its new `avatar-companion.spec.ts`, which taps Hrať).

## Behavior

### Home screen and Game cards

A tap on a playable Game card navigates to the game's route, and that game's first Round begins at once. The Home screen's existing scroll memory (`homeScrollRef` in `App.tsx`) is kept, so a child returning home lands next to the card they played.

A game is **Unplayable** when its current content and Game settings leave nothing to ask. Today these rules live inside five game components and decide the lobby's `availabilityMessage`:

| Game | Unplayable when | Where the rule lives today |
|------|-----------------|----------------------------|
| Words | no enabled, ready words | `WordsGame.tsx` |
| First letter | fewer than 4 active letters, or no eligible words | `FirstLetterGame.tsx` (`getActiveFirstLetterLetters`, `buildFirstLetterItems`) |
| Syllable assembly | no words with 2–3 syllables | `AssemblyGame.tsx:734` (inline filter) |
| Missing syllable | no eligible words | `CompleteSyllableGame.tsx` (`buildEligibleCompleteSyllableWords`) |
| Missing letter | fewer than `CHOICE_COUNT` active letters, or no eligible words | `CompleteLetterGame.tsx` (`getActiveCompleteLetterLetters`, `buildEligibleCompleteLetterWords`) |

With the bundled words every game is playable; a game becomes Unplayable only after a parent disables words in Vlastný obsah or changes letter settings. The Home screen must compute the same rules, from the same functions, as the games use, so the card and the game can never disagree.

An Unplayable card:

- looks inactive and exposes that state to assistive technology (not just a colour change);
- shows the game's existing parent-facing message (the `t('…')` strings already in the five games, with their Czech translations in `cs.ui.ts`);
- does nothing when tapped.

The message must fit a two-column card at 320 px viewport width. If an existing message does not fit legibly, shorten its wording in both locales.

While content is still loading (`ContentContext` exposes `isLoading`), cards are not shown as Unplayable, and no Session may start with incomplete content.

### During a Session

The game's Back control (`GameShell` top bar) and the Completion screen's Domov both navigate to the Home screen. Hrať znova keeps restarting the Session in place. This matches the phone's back gesture, which already skips the lobby today because the lobby is state inside the game's route, not a route of its own.

Leaving a Session must not leave the game route in history ahead of the Home screen. After Back or Domov, pressing the phone's back gesture on the Home screen must not re-enter the game, which would only redirect, or appear to do nothing. Going back through history or replacing the entry are both acceptable.

### Opening a game route without a tap

A game route renders a Session only when it was entered through a Game card tap (or Hrať znova within it) during the current page load. Every other entry — a reload, a typed or saved URL, a browser restoring the last page after memory eviction, and history Forward — replaces the location with `/`.

The reason is sound: browsers play nothing, recorded or synthetic, before a user tap. A reload also already discards the Session in progress, since Sessions are not persisted, so redirecting loses nothing.

Note for the builder: React Router `location.state` lives in `history.state` and survives a reload, so a state flag set by the card cannot tell a fresh tap from a reload on its own. The installed PWA opens on `/` (`start_url` and `scope` in `src/pwa/pwaConfig.ts`) and defines no game shortcuts.

### Parent area

- Remove `onOpenSettings` from `GameRuntimeProps` (`src/shared/gameRuntime.ts`) and the settings navigation in `GameRoute.tsx`.
- `GameSettingsScreen.tsx` drops its `cameFromLobby` branch: Back always returns to `/settings/games`. Remove the `returnFocus: 'settings'` handling that targeted the lobby gear.
- `ParentLayout`/`sanitizeChildReturnPath` (`parentAccessLogic.ts`) currently accept game paths as a return target. After this change, closing the Parent area should return to the Home screen. Narrow it to `/` unless another caller still needs game paths.

## Audio start requirement

The first Prompt of every Session must play its recorded clip, not the speech fallback, on the Game card tap. This applies to clips that are recorded. A clip still listed in `tools/audio/pending-recordings.json` falls back to TTS by design, so tests should pick a Prompt whose clips exist. This must be verified in Chromium and WebKit, and by the user on a real iPhone, both in Safari and installed.

Today Play mounts the game synchronously inside the tap. After this change the tap triggers a route change and a lazy module load (`gameModuleRegistry.ts`) before the first Prompt plays, so the tap's permission for sound may expire first. If a clip is blocked, `audioManager.ts:127` falls back to TTS with a `console.warn`. That fallback is the failure to detect. The e2e hook records `start:`/`finish:` audio events (`e2eState.ts`, `e2e/support/gameHarness.ts`).

How to meet the requirement is the builder's call, for example preloading game modules from the Home screen or starting the module load on pointer-down.

## Removals

- `src/shared/components/GameLobby.tsx`, and the `'HOME' | 'PLAYING'` state, `GameLobby` render and `onOpenSettings` prop in all 11 game components.
- The `lobby.play` key, and the 11 `game.*.instruction` keys, in `uiCopy.ts` for both locales. Also `instructionKey` on `GameDefinition` in `gameCatalog.tsx` and its check in `uiCopy.verify.ts`.
- The `GameLobby` entries in the ui-kit (`UiKitScreen.tsx`, `ComponentGallery.tsx`). Regenerate `componentInventory.generated.ts` with `node --import tsx tools/ui-gallery/generate.ts`; do not hand-edit it.
- Lobby mentions in `ParentsGate.tsx`, `SettingsRenderer.tsx` and `ParentZoneContext.ts`, where they are comments or naming only.

## Tests and tools

- About 35 e2e files tap Hrať after opening a game URL. Replace this with one shared helper in `e2e/support/` that opens `/` and taps the game's card. Direct navigation to a game route now redirects.
- Rewrite `catalog-home-lobbies.spec.ts` around Game cards: titles, locale, and the Unplayable state.
- Update the lobby-gear flows in `parent-settings.spec.ts` and `parent-access.spec.ts` to enter through the Home screen gear. Drop the focus-restore-to-lobby assertions.
- Update the lobby references in `game-shell`, `smoke`, `ui-foundation`, `release-responsive`, `release-accessibility` and `release-webkit-smoke` specs.
- Add coverage for:
  - an Unplayable card: dimmed, shows the message, a tap starts nothing. No test covers the availability state today.
  - redirect on a direct load and on a reload of a game route.
  - the first-Prompt audio requirement in Chromium and WebKit.
- `tools/screenshots/capture.mjs`:
  - Remove the 11 `lobby-*` scenes and the `LOBBY_SLUGS` aliasing.
  - Move every game scene that taps Hrať, such as the round, retry, success and completion scenes, to the card tap.
  - Update `capture.verify.ts` and keep the release matrix consistent.
  - Adding a Home screen scene with an Unplayable card is the builder's call.
- Run `npm run verify:integration`, because this changes routing and the app shell, and `npm run verify:release` before any deploy. Also run lint, unit tests and `verify:pure`, as `AGENTS.md` requires.

## Docs

- `AGENTS.md`: `GAME_DEFINITIONS` no longer carries "lobby metadata".
- `.claude/rules/games.md`: drop `GameLobby` from the frontmatter paths and the "lobby's settings trigger" wording in Settings.
- `ROADMAP.md`: tick the task and keep the 2026-11-04 Decisions Log row.
- Commit `CONTEXT.md` with this work.
- Leave historical plans, handoffs and `docs/ui-audit/` unchanged.

## Calls made during design (not the user's)

These are ours; the user may overturn any of them.

- The reasoning in Intent is inferred; the user did not state a reason.
- Unplayable cards reuse the existing messages, shortened only where they do not fit at 320 px.
- History Forward counts as "without a tap" and redirects, so the rule in decision 6 has no exceptions.
- Leaving a Session must not leave a game route in history ahead of the Home screen.
- The audio requirement applies only to recorded clips.
- All 11 games switch at once; there is no flag or staged rollout.
- One shared e2e helper replaces the per-spec Hrať taps.
- The ROADMAP task sits in the F&F P1 tier ("in the F&F build if possible").

## Left to the builder

- How a game route tells a fresh card tap from any other entry.
- Where the shared playability rules live. Keep them importable by the Home screen without pulling game components into the main bundle; the logic modules are fine, the `*Game.tsx` files are not.
- How to keep the first Prompt's sound permission (see Audio start requirement).
- The Unplayable card's visual treatment, within the shared `src/shared/ui/` primitives. Update `/ui-kit` in the same change.
- Whether a tap during content loading is ignored or waits.
