# UI Redesign Phase 5 Handoff Manifest: Shared Game Framework

## Metadata
- **Phase:** 5 (Shared Game Shell — Abeceda/Slabiky/Čísla/Slová migration)
- **Branch:** `feature/full-app-ui-redesign`
- **Base SHA:** `d431e07f4b90810a634176a3507dec8306294348` ("docs: accept UI redesign phase four" — the Codex acceptance-record commit for Phase 4). The prior version of this handoff misattributed this field to `8840128b53fefdd0e96c7f1b34f2b4cc246e64dc`, which is an earlier Phase 4 fix commit on the same lineage (an ancestor of `d431e07`, not the acceptance-record commit itself); `git merge-base --is-ancestor 8840128... d431e07...` confirms the ancestry.
- **Rejected candidate:** `9f452f494c95f6467bc50265f506093a85780514` ("test: harden shared game framework") — the original Task 1–7 product/test tip this handoff previously proposed. Codex review rejected it; see **Remediation** below for the exact findings.
- **Round 1 product-remediation SHA:** `4d9afd1261daa0823c793c05049a2b50063b93bc` ("fix: remove trailing blank line at EOF in find-it-games.spec.ts") — the final product/test commit of the round 1 remediation pass, previously reported as the replacement candidate submitted for review. A follow-up review pass found 3 further findings plus an optional cleanup on top of it (see **Round 2 Remediation** below); `4d9afd1` is superseded by the round 2 SHA and is no longer the candidate to check out.
- **Round 1 reporting commit:** `e3b73defb401032f2359b25ac64cf87b478e7bf6` ("docs: report Phase 5 remediation and correct the Phase 4 base attribution") — this document's and `ROADMAP.md`'s prior versions, as reporting-only metadata on top of `4d9afd1`. **Correction (round 2 finding 4):** this handoff's File Change Scope section previously, and incorrectly, listed this document and `ROADMAP.md` as part of the `9f452f4..4d9afd1` product/test range; they were always in this separate reporting commit instead. See the corrected **File Change Scope** below.
- **Round 2 product-remediation SHA:** `c6e8b557f872e39dca9f5fc39429cfd42225eb40` ("refactor: consolidate the duplicated retry-timer scheduling in useGameSession") — the final product/test commit of the round 2 remediation pass, landed as commits `cdc2f44`..`c6e8b55` on top of the round 1 reporting commit `e3b73de`. This is the commit that should be checked out to review or build the phase; `4d9afd1` should not be used.
- **This reporting commit:** this document's and `ROADMAP.md`'s current update sit in a separate commit on top of the round 2 product-remediation SHA (`c6e8b55`), as reporting-only metadata — not itself part of the reviewed product/test surface.
- **Future Codex acceptance-record commit:** does not exist yet. Per the phase's acceptance contract, Codex (or the next reviewer) reviews the round 2 product-remediation SHA above, then commits its own "Accepted"/rejection record on top of this reporting commit; only that future acceptance-record commit is a valid Phase 6 base. Do not confuse any of these SHAs with each other.
- **Implementation Status:** Remediated (round 2), pending review/acceptance
- **Working Tree Clean:** Yes (`git status --short` clean before this handoff commit)
- **Local Screenshot Artifact Directory:** unchanged from round 1 — `artifacts/ui/4d9afd1261daa0823c793c05049a2b50063b93bc/2026-09-18T13-36-56-049Z-62615` (63 screenshots: 9 scenes × 7 canonical viewports). Round 2 changed no visible styling or markup (a conditional-render guard, two focus-target refs, a duplicated-timer extraction, and test assertions only), so no recapture was needed; verified by inspection of every round 2 diff hunk.

Tasks 1–7 (lifecycle reducer, session/audio coordinator, shell/prompt/answer group,
Living Toybox materials, the FindIt controller migration, and the four games'
materials) originally landed across commits `6beaa15`..`9f452f4`, reported in the
now-superseded first version of this handoff. This document instead reports the
**round 1 remediation pass** that Codex's rejection of that candidate
required, plus the **round 2 remediation pass** a follow-up review required
on top of round 1's candidate (see **Round 2 Remediation** below).

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

## Round 2 Remediation

A follow-up review pass on `4d9afd1` found 3 further findings (1 blocking, 2
important) plus a minor documentation correction and an optional cleanup. All
are fixed/applied, landing across commits `cdc2f44`..`c6e8b55` on top of the
round 1 reporting commit `e3b73de` (history preserved, nothing rewritten).

1. **Terminal verdict could be paused into a permanent stuck state, blocking
   (`cdc2f44`).** A final round reaches its terminal phase
   (`answered-correctly`, or `answered-incorrectly` with `feedback: 'failure'`)
   the instant the reducer resolves the answer, but `useGameSession` only
   dispatches `SHOW_SESSION_COMPLETE` once the praise/failure verdict audio
   actually finishes playing. `GameShell`'s `canPause` guard excluded only
   `'session-complete'`/`'recoverable-error'`, so the parent-pause lock button
   stayed available for that entire window. Tapping it there called `pause()`,
   which `invalidate()`s the session — bumping the in-flight
   `resolveAnswer()`'s operation id and stopping audio — before the awaited
   verdict clip could resolve and dispatch `SHOW_SESSION_COMPLETE`; the round
   was left paused with `roundsPlayed` already at `maxRounds` and no path
   left to reach `session-complete`, input-locked forever with no completion
   overlay and no working Play again/Home. `canPause` now also requires
   `!isFinalRound`, hiding the control for the whole terminal-verdict window,
   not only once completion is already showing. Two new e2e tests (final
   correct verdict, final exhausted-failure verdict) poll the lock button's
   element count directly rather than through
   `expect(locator).toHaveCount(0)` — that assertion retries for up to its
   own timeout, so it would still pass if the button disappeared later for
   the unrelated, legitimate reason of reaching `session-complete`, masking
   exactly the bug it exists to catch — then confirm completion is still
   reached with working Play again/Home.

2. **Parent-gate close could strand focus off any live control, important
   (`d9d12dd`).** Opening the in-shell gate pauses the round and unmounts the
   lock button in the same commit (`canPause` requires `!state.paused`).
   Both `GameShell`'s own `restoreFocusRef` (used to refocus on resume) and
   `ParentsGate`'s internal copy (fed to `DialogShell`'s
   `onCloseAutoFocus`) captured "the element focused before pause" as a
   plain `document.activeElement` snapshot — which was always the lock
   button, captured an instant before it unmounted. `.focus()` on a detached
   node is a no-op, so both cancelling the gate and successfully unlocking it
   left focus stranded instead of landing on the "Odomknúť" retry control or
   the reappearing lock button. `GameShell` now holds refs directly on the
   lock and unlock buttons (React nulls a ref on unmount, so `.current`
   always reflects whichever instance is currently mounted) and focuses
   through those refs whenever a real pause contract (`onPause` + `onResume`)
   is wired. A consumer with no pause contract — the `/ui-kit` demo, which
   drives `paused` directly through `state` and never renders either button —
   keeps the original capture-and-restore behavior, since whatever it had
   focused stays mounted (just `inert`) throughout the pause, so restoring
   the same captured reference still works there; this was verified by a
   real regression against `e2e/game-shell.spec.ts`'s existing
   `shared shell restores answer focus when a paused shell resumes` test,
   which the first, lock-button-only version of this fix broke. Added
   `toBeFocused()` assertions after cancel and after a successful unlock to
   the existing real parent-dialog pause/resume e2e tests. No change to
   `ParentsGate`/`DialogShell` or to the route-based `ProtectedParentRoute`
   gate, which uses its own, unrelated `returnFocus` navigation-state
   mechanism (`e2e/parent-access.spec.ts`'s "closing the gate over a game
   route restores focus to the settings trigger" still passes unmodified).

3. **Ineffective no-scroll acceptance test, important (`bb18705`).**
   `find-it-games.spec.ts`'s "Active rounds never require scrolling to
   reveal an answer" test checked
   `document.documentElement.scrollHeight/clientHeight`, but `GameShell`'s
   `AppScreen` renders the round inside a `main` element with
   `overflow-y-auto` (`scroll="vertical"`) that scrolls internally within a
   fixed `100svh` box — the document itself never overflows regardless of
   `main`'s own content, so the test would have passed even if every answer
   required scrolling inside `main` to reach. Rewritten to read `main`'s own
   `scrollHeight`/`clientHeight` and to assert every answer's bounding rect
   stays within `main`'s visible top/bottom. Verified against an
   artificially short (320×200) viewport that the new check does fail on
   real overflow, before confirming it passes at the required
   narrow-phone/short-landscape canonical sizes.

4. **Minor reporting correction (this document).** See the corrected
   **Metadata** and **File Change Scope** sections: the round 1 handoff's
   File Change Scope section listed this document and `ROADMAP.md` as part
   of the `9f452f4..4d9afd1` product/test range, while its Metadata section
   correctly said they sat in a separate reporting commit — an internal
   contradiction. They were always in the separate round 1 reporting commit
   `e3b73de`, never in the product range itself; corrected below rather than
   left standing.

5. **Optional cleanup: consolidated the duplicated retry-timer scheduling
   (`c6e8b55`).** `resolveAnswer()`'s non-exhausted-wrong branch and
   `resume()`'s pending-retry recovery each scheduled the same
   `setTimeout(RETRY_READY)` tracked through `timersRef`, differing only in
   which already-captured `operationId` they closed over. Extracted
   `scheduleRetryReady(operationId)` and called it from both sites; no
   behavior change, re-verified against the existing retry and real
   parent-dialog pause/resume e2e coverage (both exercise a call site).

No dependency changed. No parent, storage, avatar, or bespoke-game file
changed in round 2 either — see the corrected **File Change Scope** below.

---

## Round 2 Verification Evidence (fresh, against `c6e8b55`)

| Command | Result | Notes |
|---|---|---|
| `npx tsx src/shared/game/gameState.verify.ts` | **PASS** | Unchanged reducer contract — round 2 touched `useGameSession.ts`/`GameShell.tsx`, not the reducer |
| `npx tsx src/shared/services/audioManager.verify.ts` | **PASS** | Unaffected by round 2 |
| `npx tsx src/shared/uiCopy.verify.ts` | **PASS** | Unaffected by round 2 |
| `npx tsx tools/screenshots/capture.verify.ts` | **PASS** | Unaffected by round 2 |
| `npm run lint` (`tsc --noEmit` + ESLint) | **PASS** | 0 errors, the same 1 pre-existing documented `react-refresh/only-export-components` warning in `ContentContext.tsx` |
| `npm run build:e2e` | **PASS** | |
| `npx playwright test e2e/game-shell.spec.ts e2e/find-it-games.spec.ts e2e/catalog-home-lobbies.spec.ts` | **PASS** | 164/164 across both projects, re-run after every round 2 commit (including the ui-kit focus-restoration regression caught and fixed mid-round; see finding 2) |
| `npm run test:e2e` | **PASS** | 346/346, confirmed clean across 2 full runs (once before, once after the optional cleanup) |
| `npm run build` | **PASS** | Production build in ~0.9–1.1s; `AvatarScene-C5jF1NPA.js` (973.04 kB) remains an isolated lazy chunk |
| `git diff --check d431e07...HEAD` | **PASS** | Clean against the Phase 4 base across the full branch history, including all round 2 commits |
| `npm run test:audio` | **FAIL (pre-existing, out of scope)** | Identical 3 categories / same 13 words (and derived syllables) plus 2 phrases as every prior handoff on this branch reported. Round 2 touched no audio asset or key. |

---

## Verification Evidence (round 1, fresh against `4d9afd1` — historical, superseded by round 2 above)

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

Unchanged from the rejected candidate — both remediation rounds touched
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

Round 2 extends this same describe block with `toBeFocused()` assertions:
focus lands on the live "Odomknúť" button immediately after cancelling, and
on the live, reappeared lock button immediately after a successful unlock —
see round 2 finding 2 above for why the previous captured-element approach
could strand focus on neither.

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

**`9f452f4..4d9afd1`** (round 1 remediation) touches exactly the same
authorized areas — `src/shared/components/FindItGame.tsx`,
`src/shared/game/{GameShell.tsx,useGameSession.ts,materials/TactilePiece.tsx}`,
`src/shared/services/audioManager.ts` (+ verify), `src/shared/uiCopy.ts` (+
verify), `src/shared/ui/UiKitScreen.tsx`, `e2e/{game-shell,find-it-games}.spec.ts`.
No parent, storage, avatar, or unrelated/bespoke-game file changed in this or
any range below.

**`4d9afd1..e3b73de`** (the round 1 reporting commit) touches only this
document and `ROADMAP.md`, as reporting-only metadata — never part of the
`9f452f4..4d9afd1` product/test range above.
**Correction (round 2 finding 4):** this section previously listed those two
files as part of that range, contradicting this handoff's own Metadata
section, which correctly described them as sitting in a separate reporting
commit. Fixed here rather than carried forward.

**`e3b73de..c6e8b55`** (round 2 remediation, this pass) touches
`src/shared/game/GameShell.tsx`, `src/shared/game/useGameSession.ts`, and
`e2e/find-it-games.spec.ts`. No parent, storage, avatar, or
unrelated/bespoke-game file changed.

**`c6e8b55..HEAD`** (this reporting commit) touches only this document and
`ROADMAP.md` — reporting-only metadata, not part of the round 2 product/test
range above.

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
see finding 7 above. Round 2's three findings (terminal-verdict pause, gate
focus restoration, ineffective no-scroll test) are likewise resolved, not
carried forward as residual risk — see **Round 2 Remediation** above.

## Phase 6 Preconditions

- Base Phase 6's implementation on the Codex acceptance-record commit for the
  round 2 remediated candidate (`c6e8b557f872e39dca9f5fc39429cfd42225eb40`),
  once accepted — not on the round 1 candidate `4d9afd1` (superseded), not on
  the rejected `9f452f4`, and not on either reporting commit itself (see
  Metadata above for why all of these SHAs are distinct).
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
