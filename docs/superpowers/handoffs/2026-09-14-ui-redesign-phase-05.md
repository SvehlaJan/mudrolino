# UI Redesign Phase 5 Handoff Manifest: Shared Game Framework

## Metadata
- **Phase:** 5 (Shared Game Shell — Abeceda/Slabiky/Čísla/Slová migration)
- **Branch:** `feature/full-app-ui-redesign`
- **Base SHA:** `8840128b53fefdd0e96c7f1b34f2b4cc246e64dc` (Codex acceptance-record commit for Phase 4)
- **Candidate SHA:** `9f452f494c95f6467bc50265f506093a85780514` ("test: harden shared game framework") — the final product-code/test commit; this handoff commit and the `ROADMAP.md` update sit on top of it as reporting-only metadata.
- **Implementation Status:** Complete, pending Codex acceptance
- **Working Tree Clean:** Yes (`git status --short` clean before handoff commit)
- **Local Screenshot Artifact Directory:** `artifacts/ui/9f452f494c95f6467bc50265f506093a85780514/2026-09-18T11-09-00-687Z-39624` (63 screenshots: 9 scenes × 7 canonical viewports)

Tasks 1–7 (lifecycle reducer, session/audio coordinator, shell/prompt/answer group,
Living Toybox materials, the FindIt controller migration, and the four games'
materials) landed across commits `6beaa15`..`9f452f4`. This handoff completes
Task 8's verification sweep, screenshot review, and boundary check.

---

## Verification Evidence

| Command | Result | Notes |
|---|---|---|
| `npx tsx src/shared/game/gameState.verify.ts` | **PASS** | Pure reducer contract: lifecycle, attempts, progress, pause/resume, error, and reset transitions |
| `npx tsx src/shared/uiCopy.verify.ts` | **PASS** | Slovak/Czech-fallback coverage for every game-shell and material copy key |
| `npx tsx src/shared/gameCatalog.verify.ts` | **PASS** | Game catalog invariants unaffected by the `GameDescriptor` shape change |
| `npx tsx src/shared/components/successOverlayAudio.verify.ts` | **PASS** | Praise-plus-echo audio spec construction |
| `npx tsx src/shared/components/sessionCompleteAudio.verify.ts` | **PASS** | Session-complete praise audio spec construction |
| `npx tsx src/shared/services/audioManager.verify.ts` | **PASS** | Playback-token cancellation contract added this phase to stop a stale clip from clobbering a newer one |
| `npx tsx tools/screenshots/capture.verify.ts` | **PASS** | Scene registration/help/arg-parsing contract, unaffected by the settle-timing fix below |
| `npm run test:audio` | **FAIL (pre-existing, out of scope)** | 3 categories fail on 13 words (and their derived syllables) plus 2 phrases added in `54394e6` — an ancestor of the Phase 1 baseline (`4733806`), so it predates this entire redesign branch. Phase 5 does not touch audio assets or content per its boundary rules; see **Residual Risks** below. |
| `npm run lint` (`tsc --noEmit` + ESLint) | **PASS** | 0 errors, 1 pre-existing documented `react-refresh/only-export-components` warning in `ContentContext.tsx` |
| `npx playwright test e2e/game-shell.spec.ts e2e/find-it-games.spec.ts e2e/catalog-home-lobbies.spec.ts` | **PASS** | 120/120 across desktop + mobile projects. One transient failure was observed once under full-suite parallel load (an axe color-contrast check catching the success panel's primary button mid-fade-in under CPU contention); isolated reruns (5/5) and a repeat full-suite run (120/120) were clean — matches the project's existing documented pattern for contention-sensitive timing assertions. |
| `npm run test:e2e` | **PASS** | 302/302 across desktop + mobile, after fixing one genuinely stale test (see **Fixes Made During Task 8** below) |
| `npm run build` | **PASS** | Production build in ~915ms; `AvatarScene-C5jF1NPA.js` (973.04 kB) stays an isolated lazy chunk; `FindItGame` shrank from 5.89 kB to 3.40 kB gzipped as its four callers now delegate presentation to the shared framework |
| `git diff --check` | **PASS** | No whitespace errors, no trailing spaces, no conflict markers |

### Avatar / three.js lazy-chunk confirmation
`dist/assets/AvatarScene-C5jF1NPA.js` (973.04 kB) remains a separate dynamic-import
chunk; `rg "game-framework" src` and `rg "AvatarScene|AvatarModel|AvatarSkeletonOverlay|skinnedGarment"
src/shared/game` both return no matches, confirming no static coupling was introduced.

---

## Fixes Made During Task 8

Two real defects surfaced while running Task 8's own verification and review steps
(neither was previously exercised against real production audio/content, since
Task 5's own test additions were the first to run `resolveAnswer` against a live
game rather than the `/ui-kit` demo harness):

1. **Stale test, not a regression** — `e2e/ui-ux-enhancements.spec.ts`'s
   `auditory prompt badge: renders in alphabet game and is clickable` test still
   asserted the removed `AuditoryPromptBadge` (`Prehrať zadanie znova`). Task 5
   Step 6 explicitly authorized removing that badge from `FindItGame` in favor of
   `GamePrompt`'s always-visible instruction and `Zopakovať zadanie` replay
   button. Renamed/updated the test to assert the new control; the shared
   component file itself was never deleted, matching the plan's instruction.
2. **Screenshot-tool timing gap, not a product bug** — `game-shell-success`,
   `game-shell-failure`, and `game-shell-completion` in `tools/screenshots/capture.mjs`
   called `.waitFor({ state: 'visible' })` and screenshotted immediately.
   Playwright's `visible` resolves the instant an element's opacity leaves 0, not
   once its `motionPreset.transition` (180ms) enter fade finishes, so every
   capture of those three scenes was a washed-out mid-fade frame (confirmed via
   direct screenshot inspection — e.g. the primary button rendering at ~45%
   effective opacity). Added a 250ms settle wait after the visibility check in
   those three scene functions only (`game-shell-paused` uses a plain `<div>`
   with no fade and was already sharp). Re-captured; all three now render at
   full contrast. This is the same washed-out frame the transient axe flake
   above was catching under contention — not a coincidence, the same root cause
   in two different tools.

Neither fix touches the shared framework's runtime behavior — both are pre-existing
test/tooling debt this phase's work happened to first exercise.

---

## Public API: `src/shared/game/index.ts`

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

## Final-Wrong Audio Order Evidence

`e2e/game-shell.spec.ts`'s `audio: alphabet serializes wrong, correct, and
terminal-failure answer clips` (previously `test.skip` pending this phase, now
passing 5/5 on repeat) asserts the exact contract end to end against the real
`/alphabet` route:

- Non-exhausted wrong: `start/finish` selected-item clip → `start/finish` shared retry phrase, phase settles at `awaiting-answer`.
- Correct: `start/finish` selected-item clip → `start/finish` praise clip, phase `answered-correctly`.
- Exhausted (3rd wrong): its own `start/finish` selected-item clip and retry phrase play in full → **only then** does the correct-answer explanation (`nevadi` → `je-to` → correct item's own clip) play, phase `answered-incorrectly` with `feedback: 'failure'`.

## Legacy Overlay Consumers (unchanged, verified)

`rg -l "SuccessOverlay|FailureOverlay|SessionCompleteOverlay" src/games` still
returns exactly the seven bespoke games this phase must not touch: `addition`,
`first-letter`, `compare`, `complete-syllable`, `assembly`, `complete-letter`,
`counting`. The four migrated games (`alphabet`, `syllables`, `numbers`, `words`)
no longer reference any of the three legacy overlay components or
`AuditoryPromptBadge`; none of those shared files were deleted.

## File Change Scope (`d431e07..9f452f4`)

Exactly the files the eight-task plan's cumulative file map authorizes:
`src/shared/game/**` (new framework + materials), the four `*Descriptor.tsx` +
`*Game.tsx` pairs, `src/shared/types.ts`, `src/shared/services/{e2eState,audioManager}.ts`
(+ new `audioManager.verify.ts`), `src/shared/ui/{RoundCounter,UiKitScreen}.tsx`,
`src/shared/uiCopy.ts` (+ verify), `e2e/{game-shell,find-it-games}.spec.ts`,
`e2e/support/gameHarness.ts`, and `tools/screenshots/capture.mjs`. No parent,
storage, avatar, or bespoke-game file changed.

## Screenshot Capture Evidence

Captured against `vite build` (production mode) served by `vite preview` on
`127.0.0.1:4173`. Scenes: `alphabet`, `syllables`, `numbers`, `words` (lobby),
`game-shell-success`, `game-shell-failure`, `game-shell-completion`,
`game-shell-paused`, `game-words-visual`. Viewports: `narrowPhone`,
`phonePortrait`, `shortLandscape`, `phoneLandscape`, `tabletPortrait`, `desktop`,
`desktopWide`. Directory: `artifacts/ui/9f452f494c95f6467bc50265f506093a85780514/2026-09-18T11-09-00-687Z-39624`.

Manually reviewed a representative sample across the matrix: containment is
clean at every viewport (no overflow or clipping, including the six-tile Slová
grid at `narrowPhone`); `wood`/`magnet`/`picture` materials render consistently;
prompt/replay controls and visible instructions are present on every round;
paused/retry/failure/completion state text is legible and matches the shared
palette; short-landscape density holds without scrolling. Two emoji that read
as odd out of context (💩 for "Kako", ⚠️ for "Katastrofa") are pre-existing,
intentional vocabulary entries in `src/shared/locales/sk.ts`, not a rendering
defect.

## Residual Risks

1. **Pre-existing audio content gap (out of scope).** 13 words (`raketa`,
   `lietadlo`, `autobus`, `hasici`, `cibula`, `kladivo`, `papagaj`, `husenica`,
   `cokolada`, `limonada`, `televizor`, `kukurica`, `katastrofa`), their derived
   syllables, and 2 phrases (`kde-je-viac`, `kolko-je-dokopy`) have no recorded
   `.mp3` and fall back to TTS. This predates the redesign branch entirely
   (`54394e6`, an ancestor of the Phase 1 baseline) and is unrelated to any of
   the four FindIt games this phase touches (Slová's vocabulary pool is a
   superset that includes some, but the missing words play back correctly via
   the existing TTS fallback — this is a content-recording backlog item, not a
   Phase 5 defect).
2. **Contention-sensitive axe timing assertion.** The new
   `audio: alphabet serializes...` and the pre-existing pattern this phase
   inherited both depend on real audio-clip completion; under heavy parallel
   Playwright load one axe scan caught a mid-fade frame once. Isolated and
   repeat full-suite runs were clean. If this resurfaces in CI, the fix is the
   same class as the screenshot-tool one above (poll/settle past the transition
   before scanning), not a change to `GameShell`'s actual motion contract.
3. **WebKit smoke coverage** remains deferred to the Phase 8 release gate per
   every prior phase's handoff — installation/extraction is unavailable in
   this sandbox.

## Phase 6 Preconditions

- Base this phase's implementation on the Codex acceptance-record commit for
  this candidate SHA (`9f452f494c95f6467bc50265f506093a85780514`), once accepted.
- `src/shared/game/index.ts`'s public API (above) is stable for Phase 6 to
  build `Prvé písmenko`/`Skladaj`/`Doplň slabiku`/`Doplň písmeno` on top of,
  per the Phase 6 plan.
- The Living Toybox material vocabulary (`wood`, `magnet`, `felt`, `picture`,
  `counter`, `paper`) has three materials still unused by any shipped game
  (`felt`, `counter`, `paper`) — available for Phase 6/7's bespoke games without
  further framework changes.
