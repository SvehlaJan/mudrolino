# UI Redesign Phase 5 Handoff Manifest: Shared Game Framework

## Metadata
- **Phase:** 5 (Shared Game Shell — Abeceda/Slabiky/Čísla/Slová migration)
- **Branch:** `feature/full-app-ui-redesign`
- **Base SHA:** `d431e07f4b90810a634176a3507dec8306294348` ("docs: accept UI redesign phase four" — the Codex acceptance-record commit for Phase 4). The prior version of this handoff misattributed this field to `8840128b53fefdd0e96c7f1b34f2b4cc246e64dc`, which is an earlier Phase 4 fix commit on the same lineage (an ancestor of `d431e07`, not the acceptance-record commit itself); `git merge-base --is-ancestor 8840128... d431e07...` confirms the ancestry.
- **Rejected candidate:** `9f452f494c95f6467bc50265f506093a85780514` ("test: harden shared game framework") — the original Task 1–7 product/test tip this handoff previously proposed. Codex review rejected it; see **Remediation** below for the exact findings.
- **Product-remediation SHA:** `4d9afd1261daa0823c793c05049a2b50063b93bc` ("fix: remove trailing blank line at EOF in find-it-games.spec.ts") — the final product/test commit of the remediation pass and the replacement candidate submitted for Codex acceptance. This is the commit that should be checked out to review or build the phase.
- **Reporting handoff commit:** this document and the `ROADMAP.md` update sit in a commit on top of the product-remediation SHA, as reporting-only metadata — not itself part of the reviewed product/test surface.
- **Future Codex acceptance-record commit:** does not exist yet. Per the phase's acceptance contract, Codex reviews the product-remediation SHA above, then commits its own "Accepted"/rejection record on top of the reporting handoff commit; only that future acceptance-record commit is a valid Phase 6 base. Do not confuse any of these three SHAs with each other.
- **Implementation Status:** Remediated, pending Codex acceptance
- **Working Tree Clean:** Yes (`git status --short` clean before this handoff commit)
- **Local Screenshot Artifact Directory:** `artifacts/ui/4d9afd1261daa0823c793c05049a2b50063b93bc/2026-09-18T13-36-56-049Z-62615` (63 screenshots: 9 scenes × 7 canonical viewports), recaptured against the remediated candidate

Tasks 1–7 (lifecycle reducer, session/audio coordinator, shell/prompt/answer group,
Living Toybox materials, the FindIt controller migration, and the four games'
materials) originally landed across commits `6beaa15`..`9f452f4`, reported in the
now-superseded first version of this handoff. This document instead reports the
**remediation pass** that Codex's rejection of that candidate required.

---

## Remediation

Codex rejected candidate `9f452f4` on 8 findings. All 8 are fixed, verified with
red/green E2E or verifier coverage, and land across commits `f844ed3`..`4d9afd1`
on top of the rejected candidate (the branch's history is preserved; nothing was
rewritten).

1. **Empty-pool recovery (`f844ed3`).** `FindItGame`'s `useState` initializer called
   `buildGrid(descriptor, first)` with `first` possibly `undefined` whenever the
   descriptor's pool was empty, and `buildGrid` immediately called
   `descriptor.getItemId(target)` — crashing to the app `ErrorBoundary`
   ("Niečo sa pokazilo") before `GameShell`'s recoverable-error state could ever
   render. `buildGrid` now short-circuits on an `undefined` target. Fix is a single
   guard clause; the existing `isEmpty` effect (`fail()`), `retryAfterError`
   (re-reads the pool, calls `playAgain()`), and `GameShell`'s recoverable-error
   block (Home via `onBack`) already implemented the rest of the contract
   correctly once the crash was gone. New `/ui-kit?example=game-empty-pool`
   harness mounts the real `FindItGame` (not a fabricated state) with a reactive
   empty/non-empty descriptor; E2E proves no crash and both retry-recovers and
   Home-returns-to-lobby.

2. **Completion must wait for terminal audio (`256c9fb`).** `GameShell` treated
   `roundsPlayed >= maxRounds` as "final" and rendered the completion overlay
   (with Play again/Home) immediately, even while phase was still
   `answered-correctly`/`answered-incorrectly` and `useGameSession` hadn't yet
   dispatched `SHOW_SESSION_COMPLETE` (which only fires once the terminal
   praise/failure verdict audio finishes). `isFinalRound` now only gates input
   locking; the completion overlay renders solely on `phase === 'session-complete'`.
   E2E proves completion actions are absent immediately after the final round
   resolves and present only once `session-complete` lands, for both the success
   and exhausted-failure paths.

3. **Real parent-dialog pause contract (`dc002b5`).** `FindItGame` dropped
   `useGameSession`'s `pause`/`resume` entirely; only the `/ui-kit` demo (a
   manually toggled boolean) could ever enter `GameShell`'s paused state. A
   route-based settings navigation (`/settings/games/:gameId`) would fully
   unmount the active round via React Router, so `GameShell` now reuses the
   existing `ParentsGate` component directly as an in-shell overlay instead of
   navigating or inventing a second dialog/settings system: a header lock button
   pauses the round and opens the same parent-gate arithmetic check already used
   by the protected route group; solving it resumes, cancelling leaves it paused
   with an "Odomknúť" affordance to retry. Wiring a *real* pause exposed a real
   bug: pausing during a non-exhausted wrong answer's retry countdown lost its
   `setTimeout(RETRY_READY)` to `invalidate()`, and `resume()` had no way to know
   it needed rescheduling — the round would strand on the retry banner forever.
   `useGameSession` now tracks that case the same way it already tracked an
   interrupted `resolving-answer`, and reschedules the timer on resume. E2E
   against the real `/alphabet` route proves pause holds audio/timers/input and
   preserves target/grid/attempts/progress across the full `FEEDBACK_RESET_MS`
   window, and that resume (via the documented `window.__E2E__.parentGate`
   test-mode adapter) reaches a working round again; a second test covers cancel
   -and-retry-unlock.

4. **One praise entry per success transition (`0ad4024`).** `getSuccessOverlayAudioSpec()`
   picked a random `PraiseEntry` for the verdict audio, but the visible success
   panel always showed the generic `game.successTitle` copy — spoken and
   displayed praise agreed only by the 1-in-6 chance the random pick was the
   default entry. `chooseAnswer` now picks the entry once per success transition
   and feeds the same entry to both the audio spec and `GameShellFeedback`'s
   `title`/`emoji` (completion praise was already a separate, correct, single
   per-session pick and is unaffected). Two pre-existing tests that hardcoded
   the generic "Výborne" title as a byproduct of the old bug were fixed to match
   any of the six entries; a new deterministic E2E test correlates the played
   praise `audioKey` with the visible status text.

5. **Live tactile answer states (`43da59d`).** `FindItGame` never passed a
   `state` prop to `TactilePiece`, so every real answer rendered idle/disabled
   and never exposed the pressed/retry/settled semantics Task 4 built. Wiring
   `getAnswerPieceState` (derived from `selectedAnswerId` + `phase`) surfaced a
   second bug: `TactilePiece` collapsed any explicit non-idle state back to
   generic `'disabled'` whenever its own `disabled` prop was true — which
   `AnswerGroup` sets on every tile, including the tapped one, while input is
   locked during feedback. `resolvedState` now only falls back to the generic
   disabled look when the caller left the tile at the `'idle'` default. E2E
   proves retry and settled render with matching state text on real answer
   tiles (not just the ui-kit materials demo).

6. **Audio cancellation settlement (`5d58a74`).** `AudioManager.stop()` bumped
   its cancellation token and paused the current element, but never made a
   pending `playSingleClip()`/`speakAsync()` promise settle — `pause()` doesn't
   reliably fire `ended`/`error`, so an in-flight `await audioManager.play(...)`
   (e.g. inside `resolveAnswer`) could hang indefinitely past a `pause()` call.
   `AudioManager` now tracks the single pending clip/utterance's own settle
   callback and `stop()` invokes it directly, scoped per-closure so a
   superseded clip's cleanup can never clear a newer one's pending callback.
   Extended `audioManager.verify.ts` with a clip that never fires `onended` on
   its own, proving `stop()` settles it without manually invoking `onended`,
   while retaining the existing pending-override and delayed-TTS coverage.

7. **Task 7 acceptance coverage (`9a33a11`, plus follow-up fixes below).**
   `find-it-games.spec.ts` was missing: keyboard-only Continue/Play
   again/Home; the real parent-dialog pause path (item 3); reduced motion on
   retry/exhausted-failure/completion with matching visible/live text; axe on
   all four real FindIt rounds plus completion; 200% zoom reachability of
   completion actions (not just the round); rotation preserving focus, not
   only state; and active rounds never requiring vertical scrolling to reveal
   an answer. All added. Writing this coverage surfaced two timing-fragility
   classes needing a real fix rather than a weaker assertion:
   - `expect.poll`'s growing interval can skip clean over a narrow, fixed-duration
     transient phase (`answered-incorrectly` with `feedback: null`, and the final
     round's phase before `session-complete`) — several assertions (including two
     in the completion-timing tests added for finding 2, which started flaking
     under a full-suite run) now use a tight, fixed-interval
     `page.waitForFunction` instead.
   - `OverlayFrame`'s enter transition fades opacity over 180ms even under
     reduced motion; an axe scan immediately after visibility can catch a
     genuinely mid-fade frame and report a transient contrast "violation" —
     the same root cause the original Phase 5 handoff found and fixed in the
     screenshot tool, but left as a documented residual risk for E2E axe scans.
     A new `waitForOverlaySettled` helper (observable computed opacity, not a
     blind sleep) now gates every overlay-based axe scan in this file,
     including the pre-existing success-state check — closing that risk
     instead of carrying it forward.

8. **Acceptance evidence and repository hygiene (`4d9afd1`, plus this document).**
   Removed the trailing blank line at EOF in `find-it-games.spec.ts` (confirmed
   via `git diff --check` against the Phase 4 base, now clean). Corrected this
   handoff's Base SHA attribution (see Metadata above). `npm run test:audio`'s
   pre-existing failure is recorded below as explicitly unresolved/out-of-scope,
   not claimed as passing — no recordings or audio keys were touched in this
   remediation. `ROADMAP.md` carries a remediation Decisions Log row and the
   replacement candidate SHA; Phase 5 remains marked pending Codex acceptance.

No dependency changed. No parent, storage, avatar, or bespoke-game file changed —
see **File Change Scope** below.

---

## Verification Evidence (fresh, against `4d9afd1`)

| Command | Result | Notes |
|---|---|---|
| `npx tsx src/shared/game/gameState.verify.ts` | **PASS** | Unchanged reducer contract |
| `npx tsx src/shared/uiCopy.verify.ts` | **PASS** | Includes the two new `game.parentPause`/`game.unlock` keys |
| `npx tsx src/shared/gameCatalog.verify.ts` | **PASS** | Unaffected |
| `npx tsx src/shared/components/successOverlayAudio.verify.ts` | **PASS** | Unaffected |
| `npx tsx src/shared/components/sessionCompleteAudio.verify.ts` | **PASS** | Unaffected |
| `npx tsx src/shared/services/audioManager.verify.ts` | **PASS** | Extended this remediation with the mid-play cancellation-settlement case (finding 6) |
| `npx tsx tools/screenshots/capture.verify.ts` | **PASS** | Unaffected |
| `npm run test:audio` | **FAIL (pre-existing, out of scope)** | Same 3 categories on the same 13 words (and derived syllables) plus 2 phrases as the rejected candidate's handoff reported — predates the redesign branch (`54394e6`, an ancestor of the Phase 1 baseline). This remediation touches no audio asset or key; recorded here as an explicitly unresolved, out-of-scope gate rather than claimed as passing. |
| `npm run lint` (`tsc --noEmit` + ESLint) | **PASS** | 0 errors, 1 pre-existing documented `react-refresh/only-export-components` warning in `ContentContext.tsx` |
| `npm run build:e2e` | **PASS** | |
| `npx playwright test e2e/game-shell.spec.ts e2e/find-it-games.spec.ts e2e/catalog-home-lobbies.spec.ts` | **PASS** | 160/160, confirmed clean across 3 consecutive full runs (checking for the contention-sensitive axe timing class fixed in finding 7) |
| `npm run test:e2e` | **PASS** | 342/342, confirmed clean across 2 consecutive full runs |
| `npm run build` | **PASS** | Production build in ~1.0s; `AvatarScene-C5jF1NPA.js` (973.04 kB) remains an isolated lazy chunk, byte-for-byte unchanged from the rejected candidate's build. The shared `ui/` barrel's chunk is now named `ParentsGate-*.js` (415.55 kB) instead of `ui-*.js` (410.24 kB) — a Rollup chunk-naming artifact of `GameShell` now importing `ParentsGate` as a second shared entry point into that same bundle, not new bundle weight beyond this remediation's own code; it is still a separate, lazily-loaded chunk, not part of the eagerly-loaded main bundle. |
| `git diff --check d431e07...HEAD` | **PASS** | Clean against the correctly identified Phase 4 base (see finding 8) |

### Avatar / three.js lazy-chunk confirmation

`dist/assets/AvatarScene-C5jF1NPA.js` (973.04 kB) remains a separate dynamic-import
chunk. `rg "game-framework" src`, `rg "AvatarScene|AvatarModel|AvatarSkeletonOverlay|skinnedGarment" src/shared/game`, `rg "from '../game'" src/shared/components/FindItGame.tsx`, `rg "FindItGame" src/games/{alphabet,syllables,numbers,words}`, and `rg -l "SuccessOverlay|FailureOverlay|SessionCompleteOverlay" src/games` all confirm the same boundary invariants as the rejected candidate: no static avatar coupling, the shared FindIt controller consumes the new framework, exactly four game directories consume that controller, and exactly the same seven bespoke games (`addition`, `first-letter`, `compare`, `complete-syllable`, `assembly`, `complete-letter`, `counting`) retain legacy overlays.

---

## Public API: `src/shared/game/index.ts`

Unchanged from the rejected candidate except `GameShellProps` gained two new
optional members (backward compatible — omit both to leave a `GameShell`
consumer, e.g. the `/ui-kit` demo, exactly as before):

```ts
export interface GameShellProps {
  // ...unchanged members...
  onPause?(): void;
  onResume?(): void;
}
```

```ts
export * from './AnswerGroup';
export * from './GamePrompt';
export * from './GameShell';
export * from './gameState';
export * from './materials';       // TactilePiece, PlayTray
export * from './useElementSize';
export * from './useGameSession';
```

## State Transition Table (`src/shared/game/gameState.ts`)

Unchanged from the rejected candidate — this remediation touched
`useGameSession.ts` (session-level pause/resume coordination) and `GameShell.tsx`
(presentation gating), not the pure reducer. See the rejected candidate's
original table, reproduced here for reference:

| From phase | Event | Guard | To phase |
|---|---|---|---|
| `ready` / `recoverable-error` | `LOAD` | not paused | `loading` |
| `loading` / `transitioning` | `ROUND_READY` | not paused | `awaiting-answer` |
| `ready` / `awaiting-answer` | `PROMPT_STARTED` | not paused | `listening` |
| `listening` | `PROMPT_FINISHED` | not paused | `awaiting-answer` |
| `ready` / `listening` / `awaiting-answer` | `ANSWER_STARTED` | `canAcceptAnswer` | `resolving-answer` |
| `resolving-answer` | `ANSWER_PROGRESS` | not paused | `awaiting-answer` (round unchanged) |
| `resolving-answer` | `ANSWER_WRONG` (below limit) | not paused | `answered-incorrectly`, `feedback: null` |
| `resolving-answer` | `ANSWER_WRONG` (at limit) | not paused | `answered-incorrectly`, `feedback: 'failure'`, `roundsPlayed + 1` |
| `resolving-answer` | `ANSWER_CORRECT` | not paused | `answered-correctly`, `feedback: 'success'`, `roundsPlayed + 1`, `correctRounds + 1` |
| `answered-incorrectly` (`feedback: null`) | `RETRY_READY` | — | `awaiting-answer` |
| `answered-correctly` / `answered-incorrectly` (`feedback: 'failure'`) | `NEXT_ROUND` | not paused | `ready` |
| same, once `roundsPlayed >= maxRounds` | `SHOW_SESSION_COMPLETE` | not paused | `session-complete` |
| any | `PAUSE` / `RESUME` | — | toggles `paused`, restores `resumePhase` |
| any except `session-complete`/`recoverable-error` | `ERROR` | not paused | `recoverable-error` |
| any | `PLAY_AGAIN` | — | fresh `ready` state, same `maxRounds`/`maxAttempts` |

`canAcceptAnswer` = not paused and phase in `{ready, listening, awaiting-answer}`.

**Session-level pause/resume (`useGameSession.ts`, not the reducer):** on
`pause()`, if the phase was `resolving-answer`, resume replays it as
`ANSWER_PROGRESS` (as before); this remediation adds: if the phase was
`answered-incorrectly` with `feedback: null` (a non-exhausted wrong answer
mid-retry-countdown), `invalidate()` still clears the pending
`setTimeout(RETRY_READY)`, but `resume()` now reschedules it for the same
`TIMING.FEEDBACK_RESET_MS`, so the round never strands on the retry banner.

## Real Parent-Dialog Pause Evidence

`e2e/find-it-games.spec.ts`'s `Task 7: Real parent-dialog pause and resume`
describe block asserts, against the real `/alphabet` route:

- Pausing mid-retry-countdown (the riskiest window) keeps `paused: true`,
  makes `game-interactive-content` `inert`, and holds `gamePhase`,
  `wrongAttempts`, `roundsPlayed`, `correctItemId`, and `gridItemIds` exactly
  fixed across a wait well past `TIMING.FEEDBACK_RESET_MS`.
- Resolving the gate via the documented `window.__E2E__.parentGate.unlock()`
  test-mode adapter resumes into a working `awaiting-answer` round with the
  same target/grid, proving the round never stranded.
- Cancelling the gate leaves the round paused with an "Odomknúť" affordance to
  retry, rather than silently resuming or losing the paused state.

## Final-Wrong Audio Order Evidence

Unchanged from the rejected candidate — `e2e/game-shell.spec.ts`'s `audio:
alphabet serializes wrong, correct, and terminal-failure answer clips` still
passes 5/5 on repeat, asserting the same contract end to end:

- Non-exhausted wrong: `start/finish` selected-item clip → `start/finish` shared retry phrase, phase settles at `awaiting-answer`.
- Correct: `start/finish` selected-item clip → `start/finish` praise clip, phase `answered-correctly`. This remediation additionally proves (finding 4) that the visible status text names the same praise entry whose `audioKey` was played.
- Exhausted (3rd wrong): its own `start/finish` selected-item clip and retry phrase play in full → **only then** does the correct-answer explanation (`nevadi` → `je-to` → correct item's own clip) play, phase `answered-incorrectly` with `feedback: 'failure'`.

## Legacy Overlay Consumers (unchanged, re-verified)

`rg -l "SuccessOverlay|FailureOverlay|SessionCompleteOverlay" src/games` still
returns exactly the seven bespoke games this phase must not touch: `addition`,
`first-letter`, `compare`, `complete-syllable`, `assembly`, `complete-letter`,
`counting`. The four migrated games (`alphabet`, `syllables`, `numbers`, `words`)
still reference none of the three legacy overlay components or
`AuditoryPromptBadge`; none of those shared files were deleted.

## File Change Scope

**`d431e07..9f452f4`** (rejected candidate, unchanged from its own handoff):
`src/shared/game/**` (new framework + materials), the four `*Descriptor.tsx` +
`*Game.tsx` pairs, `src/shared/types.ts`, `src/shared/services/{e2eState,audioManager}.ts`
(+ `audioManager.verify.ts`), `src/shared/ui/{RoundCounter,UiKitScreen}.tsx`,
`src/shared/uiCopy.ts` (+ verify), `e2e/{game-shell,find-it-games}.spec.ts`,
`e2e/support/gameHarness.ts`, and `tools/screenshots/capture.mjs`.

**`9f452f4..4d9afd1`** (this remediation) touches exactly the same authorized
areas — `src/shared/components/FindItGame.tsx`, `src/shared/game/{GameShell.tsx,useGameSession.ts,materials/TactilePiece.tsx}`,
`src/shared/services/audioManager.ts` (+ verify), `src/shared/uiCopy.ts` (+
verify), `src/shared/ui/UiKitScreen.tsx`, `e2e/{game-shell,find-it-games}.spec.ts`
— plus this document and `ROADMAP.md`. No parent, storage, avatar, or
unrelated/bespoke-game file changed in either range.

## Screenshot Capture Evidence

Captured against the test-mode build (`vite build --mode test`, matching the
adapter the capture tool's quick-pass relies on) served by `vite preview` on
`localhost:4173`. Same 9 scenes and 7 viewports as the rejected candidate's
evidence, recaptured because this remediation changes on-screen presentation
(a new header lock/pause icon on every real round; live retry/settled tactile
states; a per-transition praise emoji): `alphabet`, `syllables`, `numbers`,
`words` (lobby scenes — these alias `lobby-<game>` in `capture.mjs` and do not
themselves show an active round), `game-shell-success`, `game-shell-failure`,
`game-shell-completion`, `game-shell-paused` (all four via the `/ui-kit` demo
harness, which does not wire `onPause`/`onResume` and so does not show the new
lock icon), `game-words-visual`. Directory:
`artifacts/ui/4d9afd1261daa0823c793c05049a2b50063b93bc/2026-09-18T13-36-56-049Z-62615`.

Manually reviewed: the lobby scenes are visually unchanged (the new pause icon
only renders during an active `PLAYING` round, which no registered scene
captures — its correctness is instead covered by the extensive E2E assertions
above: visible, clickable, opens/closes the gate, manages focus, keeps content
`inert`). The `game-shell-*` demo overlays render at full contrast with no
mid-fade artifacts (the completion panel's auto-focused "Hrať znova" button
shows its expected focus ring). No new visual regressions found.

## Residual Risks

1. **Pre-existing audio content gap (out of scope, unchanged).** 13 words
   (`raketa`, `lietadlo`, `autobus`, `hasici`, `cibula`, `kladivo`, `papagaj`,
   `husenica`, `cokolada`, `limonada`, `televizor`, `kukurica`, `katastrofa`),
   their derived syllables, and 2 phrases (`kde-je-viac`, `kolko-je-dokopy`)
   have no recorded `.mp3` and fall back to TTS. Predates the redesign branch
   entirely; this remediation does not touch audio assets or content per its
   boundary rules.
2. **WebKit smoke coverage** remains deferred to the Phase 8 release gate per
   every prior phase's handoff — installation/extraction is unavailable in
   this sandbox.
3. **Rollup chunk naming.** The shared `ui/` barrel's production chunk is now
   named `ParentsGate-*.js` instead of `ui-*.js` (see Verification Evidence
   table) — a cosmetic artifact of adding a second shared import root into an
   already-shared chunk, not a change in what ships or when it loads. Flagging
   only so a future phase isn't surprised by the renamed file if it greps build
   output by the old chunk name.

The previously-carried "contention-sensitive axe timing assertion" residual
risk from the rejected candidate's handoff is resolved, not carried forward —
see finding 7 above.

## Phase 6 Preconditions

- Base Phase 6's implementation on the Codex acceptance-record commit for this
  remediated candidate (`4d9afd1261daa0823c793c05049a2b50063b93bc`), once
  accepted — not on the rejected `9f452f4`, and not on this reporting handoff
  commit itself (see Metadata above for why those three SHAs are distinct).
- `src/shared/game/index.ts`'s public API (above) is stable for Phase 6 to
  build `Prvé písmenko`/`Skladaj`/`Doplň slabiku`/`Doplň písmeno` on top of,
  per the Phase 6 plan. The two new optional `GameShellProps` members
  (`onPause`/`onResume`) are additive and backward compatible.
- The Living Toybox material vocabulary (`wood`, `magnet`, `felt`, `picture`,
  `counter`, `paper`) has three materials still unused by any shipped game
  (`felt`, `counter`, `paper`) — available for Phase 6/7's bespoke games without
  further framework changes.
- If Phase 6 games need an in-round parent pause, `GameShell`'s `onPause`/
  `onResume` props and the `ParentsGate`-as-overlay pattern established here
  are directly reusable — no new dialog/settings system should be invented.
