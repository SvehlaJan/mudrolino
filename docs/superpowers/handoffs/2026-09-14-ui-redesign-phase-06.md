# UI Redesign Phase 6 Handoff Manifest: Bespoke Literacy Games

## Metadata

- **Phase:** 6 (Bespoke Literacy — Prvé písmenko/Skladaj/Doplň slabiku/Doplň písmeno)
- **Branch:** `feature/full-app-ui-redesign`
- **Base SHA:** `443fa48384b75f9a5ceafc8293d4de03c3d5a115` ("docs: accept UI redesign phase five" — the Codex acceptance-record commit for Phase 5's round 2 remediated candidate `c6e8b557f872e39dca9f5fc39429cfd42225eb40`), per the Phase 5 handoff's own "Phase 6 Preconditions" section.
- **Candidate SHA (Task 8's starting point and the pre-fix-wave HEAD):** `99b144863b298aa980e74f576b1363a36f690ab6` ("fix: stop hiding WordRail behind an undersized prompt cap")
- **Candidate SHA (current, after the final whole-phase review fix wave):** `d6f32d9bf758e0e498c4cadf17a1df09170a46d1` ("test: keep the new literacy geometry specs off the real synthesizer") — the last code commit; this document and `ROADMAP.md` are updated in the docs commit that follows it. See **Final Whole-Phase Review Fix Wave** below.
- **Implementation Status:** Complete, **pending Codex acceptance**. Task 8 was verification/documentation only; the fix wave recorded below is a separate, single remediation round on the findings of the final whole-phase review and likewise does not accept the phase.
- **Working Tree Clean (before this handoff commit):** Yes.
- **Local Screenshot Artifact Directory:** `artifacts/ui/d6f32d9bf758e0e498c4cadf17a1df09170a46d1/2026-09-21T00-20-35-805Z-59854/` — **complete: 240 images, 24 scenes × all 10 canonical viewports**, recaptured in one clean pass after the capture tool's settle-wait bug was fixed. This supersedes Task 8's partial 94-image run at `artifacts/ui/99b144863b298aa980e74f576b1363a36f690ab6/2026-09-20T12-56-38-065Z-39772/`. See **Screenshot Capture Evidence** below.

## Commit History (base → head, in order)

| Task | Commit | Subject |
|---|---|---|
| Base | `443fa48384b75f9a5ceafc8293d4de03c3d5a115` | docs: accept UI redesign phase five |
| Task 1 | `8ebacd42443bbac3237a2ae5ba9439df71cb1091` | feat: add tactile literacy materials |
| Task 2 | `d6a2d571e7d05b8f681a8ee849d333536f9c1109` | refactor: isolate assembly board transitions |
| Task 2 (fix round 1) | `f1e9530d431e66f80c1e90dcc3bbfa99c1696817` | fix: localize the assembly board reset's fake tray to validateBoard |
| Task 3 | `dee05d470491c116605c8dcd39c39b43d8a2524f` | feat: rebuild first-letter playfield |
| Task 4 | `9caeb1ef33ac3fdf2bdd0b3a2ba899d97427d22e` | feat: rebuild missing-letter playfield |
| Task 4 (fix round 1) | `96c7879b1047c847c16fc7971f4e91067ea3294e` | fix: close the missing-letter double-tap race and cover the three-strike reveal |
| Task 5 | `bbe3ae859d25861c4d24637233f98eab826be2f5` | feat: rebuild missing-syllable playfield |
| Task 6 | `3d85e57dd76bf8523b44d2034699907e9bedb884` | feat: rebuild assembly playfield |
| Task 6 (fix round 1) | `70a9dc06ee4bb1c4951cd33e0a71f007665c7461` | fix: reset a wrong assembly rail even if pause interrupts its verdict audio |
| Task 7 | `561459d16d819ad9c74182a76526f597c7bdf4c1` | test: harden bespoke literacy playfields |
| Task 7 (fix round 1) | `99b144863b298aa980e74f576b1363a36f690ab6` | fix: stop hiding WordRail behind an undersized prompt cap |
| Final review fix wave | `011b87b6985cd0dd2dbcbd4faa188e89c3dfbb01` | fix: keep the retry status banner off the answer tray |
| Final review fix wave | `9d5fd30e4570402e17737f0d2887d26e712136dd` | fix: close the double-tap praise race in first-letter and missing-syllable |
| Final review fix wave | `67f947cde9f5c46b97165c28a834d765622b4079` | fix: settle tile geometry before the capture tool clicks |
| Final review fix wave | `d6f32d9bf758e0e498c4cadf17a1df09170a46d1` | test: keep the new literacy geometry specs off the real synthesizer |

Each fix round is one Codex review-and-fix cycle on the immediately preceding task's own candidate — normal for this process, not a red flag. Task 8 (this document) is verification/documentation only, per the plan's process: it does not add new game logic or fix bugs found during its own review (see **Residual Risks item 15** for a genuine finding surfaced during this task that was deliberately left unfixed).

## Step 1: Pure Verifiers and Lint

| Command | Result |
|---|---|
| `npx tsx src/shared/game/gameState.verify.ts` | **PASS** — `✓ shared game state contract passed` |
| `npx tsx src/games/first-letter/firstLetterLogic.verify.ts` | **PASS** — `firstLetterLogic checks passed` |
| `npx tsx src/games/complete-letter/completeLetterLogic.verify.ts` | **PASS** — `completeLetterLogic checks passed` |
| `npx tsx src/games/complete-syllable/completeSyllableLogic.verify.ts` | **PASS** — `completeSyllableLogic checks passed` |
| `npx tsx src/games/assembly/assemblyLogic.verify.ts` | **PASS** — `✓ all assembly board logic checks passed` (7 sub-checks) |
| `npx tsx src/games/assembly/assemblyAudioLogic.verify.ts` | **PASS** — `assemblyAudioLogic checks passed` |
| `npm run lint` (`tsc --noEmit` + ESLint) | **PASS** — 0 errors, 1 pre-existing documented `react-refresh/only-export-components` warning in `ContentContext.tsx`, unchanged from every prior phase |

## Step 2: Application Regression Checks

| Command | Result |
|---|---|
| `npm run test:e2e` (`build:e2e` + full Playwright suite) | **PASS** — 439/439 across the `desktop` and `mobile` projects, ~2.7 minutes |
| `npm run build` | **PASS** — production build in ~1.06s. Four separate lazy game chunks confirmed: `FirstLetterGame-DWxn6RFV.js` (5.61 kB), `CompleteSyllableGame-UDjlLp8X.js` (6.66 kB), `CompleteLetterGame-9mQbZC1L.js` (8.16 kB), `AssemblyGame-Dy5yz2bY.js` (80.39 kB, largest — the tap-to-place board logic). `AvatarScene-C5jF1NPA.js` (973.04 kB) remains a separate, isolated lazy chunk — the avatar/three.js boundary is intact. |
| `git diff --check 443fa48...HEAD` | **PASS** — clean, no whitespace errors, across the full Phase 6 commit range |
| `rg "SuccessOverlay\|FailureOverlay\|SessionCompleteOverlay" src/games -l` | Returns exactly 7 files: `addition`, `first-letter`, `compare`, `complete-syllable`, `assembly`, `complete-letter`, `counting`. **This looks like it includes the four Phase 6 games, but it does not** — see next line. |
| Investigation of the above | The four Phase 6 games' matches are all `import { getSuccessOverlayAudioSpec } from '../../shared/components/successOverlayAudio'` — a shared **audio-spec helper function** (used identically by Phase 5's migrated games) whose name contains the substring `SuccessOverlay`, not the legacy `SuccessOverlay`/`FailureOverlay`/`SessionCompleteOverlay` **React components**. Confirmed by grepping the actual component imports/JSX usage: only `addition`, `compare`, and `counting` (the three Phase 7 numeracy games) import and render `<SuccessOverlay>`/`<FailureOverlay>`/`<SessionCompleteOverlay>`. The brief's expected outcome ("lists only the three Phase 7 numeracy games") is correct once this substring false-positive is accounted for. |
| `rg "shared/game" src/games/first-letter src/games/complete-letter src/games/complete-syllable src/games/assembly -l` | **PASS** — all four literacy directories (`CompleteLetterGame.tsx`, `AssemblyGame.tsx`, `FirstLetterGame.tsx`, `CompleteSyllableGame.tsx`) import the canonical shared game framework. |
| `npm run test:audio` | **Not run** — the brief explicitly says not to run it unless an audio key or asset changed; this phase changed neither (confirmed via file-change-scope diff below). |

## Step 3: Screenshot Matrix — Screenshot Capture Evidence

> **Superseded by the fix wave's recapture.** Everything in this section describes Task 8's own
> partial run at `99b1448`. The capture tool's missing settle wait — correctly suspected here —
> was confirmed and fixed in `67f947c`, and the matrix was then recaptured in full. Jump to
> **Recapture after the fix wave** at the end of this section for the current artifact.

Command run (matching the brief's four `--scene` flags, expanded with the games' own round/retry/success/failure-or-reset/completion state scenes already registered in `tools/screenshots/capture.mjs` by Task 7):

```bash
npm run shots -- --base=http://127.0.0.1:4173 \
  --scene=first-letter --scene=first-letter-round --scene=first-letter-retry --scene=first-letter-success --scene=first-letter-failure --scene=first-letter-completion \
  --scene=complete-letter --scene=complete-letter-round --scene=complete-letter-retry --scene=complete-letter-success --scene=complete-letter-failure --scene=complete-letter-completion \
  --scene=complete-syllable --scene=complete-syllable-round --scene=complete-syllable-retry --scene=complete-syllable-success --scene=complete-syllable-failure --scene=complete-syllable-completion \
  --scene=assembly --scene=assembly-round --scene=assembly-retry --scene=assembly-success --scene=assembly-reset --scene=assembly-completion
```

24 scenes × 10 canonical viewports = 240 images expected. **Actual: 94 images, covering 4 of the 10 viewports** (`narrowPhone` 320×568, `smallPhone` 360×640, `phonePortrait` 390×844, `shortLandscape` 667×375 — the four smallest/most constrained sizes, arguably the most layout-stressing subset) for 22 of 24 scenes, and 3 of those 4 viewports (missing `shortLandscape`) for `assembly-reset`/`assembly-completion`.

**Why the run stopped short, investigated rather than blindly retried:**

The capture tool's scripted interaction for the four bespoke games' retry/success/reset/completion scenes clicks answer tiles in immediate succession (only waiting on `window.__E2E__.gamePhase`, not on real settle time), and this raced two distinct, non-deterministic failure modes partway through the sixth (of ten) viewport pass:

1. A `page.waitForFunction` timeout (30s) waiting for `gamePhase === 'answered-incorrectly'` inside Assembly's `placeWrongFullRail` helper, on one run.
2. A Playwright click-actionability timeout — one syllable answer tile (`data-answer-id="STRO"`, tabindex="-1") intercepting the pointer event meant for a sibling tile (`data-answer-id="VA"`) — on a retry of the same command.

Both were investigated directly (not assumed) before deciding how to proceed:

- Manually reproduced Assembly's wrong-full-rail flow in a live browser session with a 50ms state poller. The full real-audio verdict sequence (three sequential clips: wrong syllable → shared retry phrase → target word) took ~2.15s, then `answered-incorrectly` held for ~465ms before auto-resetting — well within a 30s timeout when real audio genuinely plays. This means failure mode 1 is a **transient hang**, not a deterministic dead end; `audioManager.speakAsync()` (`src/shared/services/audioManager.ts:128-161`, unmodified by Phase 6) has no timeout guard on its `SpeechSynthesisUtterance.onend`/`onerror` callbacks, so if Web Speech TTS silently never fires either event in the sandboxed headless Chromium environment — a documented pre-existing risk, since 13 words/their derived syllables have no recorded `.mp3` and fall back to TTS (Residual Risk item 1, unchanged) — `audioManager.play()` hangs forever and the phase never advances. This is plausible but not conclusively proven as the exact mechanism; it is the best-supported explanation given the evidence gathered, called out here as exactly that rather than an established fact.
- Directly measured the DOM for failure mode 2 (see **Residual Risks item 15** below) — this led to discovering a *different*, confirmed, reproducible layout defect (a retry-banner/answer-tray overlap), at which point verification effort was redirected from chasing the capture tool's flakiness toward fully characterizing that defect, since it is definitely real and worth Codex's attention, while the capture tool's own flakiness is very likely an artifact of unrealistically fast scripted clicking with no settle waits (not present in any of the four games' real e2e coverage, which passed 439/439) rather than a product bug.

Two further retry attempts (one full 6-viewport run, one per-viewport retry loop) were interrupted mid-run by the session coordinator for running long without checking in synchronously; per that correction, no further capture attempts were made. **The 6 larger viewports (`phoneLandscape`, `tabletPortrait`, `tabletLandscape`, `desktop`, `desktopLarge`, `desktopWide`) were never captured.** This is a real, acknowledged gap in this task's evidence — flagged explicitly rather than implied as complete. The four captured viewports were manually reviewed in full (see next section); nothing in that review suggests the larger viewports are at particular risk (more screen real estate, not less), but that is an inference, not verified evidence.

### Manual Review of the Captured 94 Images

Reviewed for hierarchy, prompt/answer balance, short-landscape fit, long `CH`/`DŽ` and syllable content, active/pending/filled insets, two- and three-piece rails, visible feedback, safe areas, and absence of mixed legacy surfaces:

- **First-letter**: clean 2×2 letter-circle grid at `narrowPhone`; single-row grid at `shortLandscape` correctly rendering the `CH` digraph as one tile (not split). No clipping or overflow observed.
- **Complete-letter**: word rail correctly shows fixed letters plus one active (blue-ringed) blank at both viewports reviewed; accented letters (`Ô`, `Č`, `Ľ`) render correctly in both the rail and the answer choices.
- **Complete-syllable**: word rail with one blank plus fixed syllables renders correctly; answer choice tiles are properly spaced in the DOM (confirmed via `getBoundingClientRect()`, ~12px real gaps) even though the low-contrast dashed border can make adjacent tiles look visually merged at a glance in a screenshot — not a real defect, just a border-contrast readability nit worth a mention, not a fix.
- **Assembly**: two- and three-piece rails both captured (`VODA` 2-tile, `AUTOBUS` 3-tile in the reset scene) with correctly numbered empty "?" slots matching tile count.
- **Completion overlay** (`first-letter-completion/shortLandscape`): clean, correctly centered "Koniec hry" / praise / score / Hrať znova / Domov modal, no clipping, even at the shortest captured height.
- **Legacy surfaces**: none of the captured images show `SuccessOverlay`/`FailureOverlay`/`SessionCompleteOverlay`-style markup; all feedback uses the shared `GameShellFeedback` presentation, consistent with Step 2's `rg` findings.
- **A genuine defect found during this review, not one of the pre-known items**: see **Residual Risks item 15** immediately below — the retry-status banner overlaps the answer tray at `shortLandscape` in all four games. This was found by directly reading `complete-syllable-retry/shortLandscape.png`, which visibly shows garbled/overlapping text, then confirmed live (not just from the screenshot) via DOM measurement.

### Recapture after the fix wave

After fixes 1-3 landed, the identical 24-scene command was re-run against a test-mode preview
server (`npm run build:e2e`, then `npm run preview -- --port 4173 --host 127.0.0.1`, then
`npm run shots -- --base=http://127.0.0.1:4173 --scene=…` with all 24 scenes and no `--viewport`
flag, so all 10 canonical viewports are captured).

**Complete: 240/240 images — 24 scenes × all 10 canonical viewports**, in
`artifacts/ui/d6f32d9bf758e0e498c4cadf17a1df09170a46d1/2026-09-21T00-20-35-805Z-59854/`. Every
one of the 24 scene directories holds exactly 10 PNGs (verified by counting each directory, not
by trusting the exit code), the run exited 0 in a single pass with no retries, and the six
viewports Task 8 never reached — `phoneLandscape`, `tabletPortrait`, `tabletLandscape`,
`desktop`, `desktopLarge`, `desktopWide` — are now covered, as are the two
`assembly-reset`/`assembly-completion` gaps at `shortLandscape`. `artifacts/` is gitignored, so
this is a local artifact, consistent with every prior phase.

Manual review (read directly as images, not inferred from the run's exit status):

- **All four `*-retry/shortLandscape.png`** — the scenes that carried the original defect. In
  every one the answer tray now sits fully above the compact single-line "Skús ešte raz" banner
  with clear separation, and the garbled overlapping text that
  `complete-syllable-retry/shortLandscape.png` showed at `99b1448` is gone. This is the visual
  confirmation of fix 1, independent of the automated assertion.
- **`complete-syllable-retry/desktop.png`** — the banner keeps its full two-line form (title plus
  "Nevadí, počúvaj ešte raz.") at unconstrained sizes, so Phase 5's accepted presentation is
  unchanged where there is room for it; only the constrained sizes compact.
- **`assembly-completion/tabletLandscape.png`** — one of the previously-uncaptured larger
  viewports; completion overlay centered and unclipped.
- **Noted, not fixed:** `complete-syllable-retry/shortLandscape.png` and
  `assembly-retry/shortLandscape.png` show answer-tile *text* spilling past its own tile border
  for three-character syllables. That is Residual Risk item 16 above, a separate pre-existing
  sizing issue that only became observable once the tray stopped collapsing.

## Step 4: Persistence and Audio Compatibility

**File-change-scope confirmation (the strongest evidence storage/audio/settings/PWA contracts are unchanged):** `git diff --stat` across the full Phase 6 range touches exactly 20 files, none of which are `src/shared/services/*` (including `audioManager.ts`, `audioOverrideStore.ts`), `src/shared/settings/*`, `src/shared/contexts/*`, `src/pwa/*`, `src/shared/localContentRepository.ts`, `e2e/persistence-compat.spec.ts`, or `e2e/fixtures/*`. The 20 touched files are confined to the four games' own directories, `src/shared/game/materials/{InsetSlot,PictureCard,WordRail,index}.tsx` (Task 1's new materials), `src/shared/ui/UiKitScreen.tsx`, `e2e/bespoke-literacy.spec.ts` (new), `e2e/playwright.config.ts` (additive `CI_VIEWPORT_SUBSET` export only), `e2e/support/gameHarness.ts` (28 purely additive lines), `e2e/ui-ux-enhancements.spec.ts` (one pre-existing test's assertion updated from the removed bespoke `PromptBadge`/`AnswerSlot` markup to the new shared `PictureCard`/`WordRail` materials — a legitimate test update tracking Task 6's migration, not a persistence/audio change), and `tools/screenshots/capture.mjs` (new scene registrations).

**Persistence compatibility suite:** ran standalone —

```
npx playwright test --config=e2e/playwright.config.ts e2e/persistence-compat.spec.ts
```

**PASS, 2/2**:
- `seeded v1 settings apply font to root and load into settings screen` — loads `e2e/fixtures/local-data-v1.json` (which contains both `alphabetAccents: false` and `completeLetterMissingCount: "adaptive"`), confirms `data-font="shantell"` on `<html>`, confirms the settings screen reads them, and confirms `localStorage.getItem('hrave-ucenie-settings')` round-trips the full settings object including both fields unchanged.
- `seeded content and audio override are consumed on /content after unlocking` — confirms the IndexedDB `indexedDBAudio` seed key (`sk/words/custom-custom-1`) round-trips, confirms `hrave-ucenie-user-words-sk`/`hrave-ucenie-user-praises-sk` localStorage keys are read and rendered correctly on `/content`.

**IndexedDB:** `src/shared/services/audioOverrideStore.ts` (database `hrave-ucenie-audio-overrides`, object store `overrides`) is untouched by Phase 6 (confirmed above); its `DB_VERSION`, key scheme, and `openDB`/`get`/`put`/`delete`/`getAllKeys` API are identical to before this phase.

**Recorded-audio keys:** `src/shared/contentRegistry.ts` (the module defining `getItemAudioClip`/`getWrongAnswerAudio`/`getItemAnnouncementAudio`/`getPhraseClip` and the `${locale}/${category}/${audioKey}` path scheme every game's audio spec is built from) is untouched by Phase 6. The four bespoke games consume these existing helpers rather than reimplementing audio-path logic.

**PWA metadata:** `src/pwa/pwaConfig.ts` and all of `src/pwa/` are untouched by Phase 6.

**Audio sequence traces** (confirmed two ways: static reading of each game's `resolveAnswer(...)` call sites, and live confirmation via `window.__E2E__.audioEvents` during manual browser reproduction of each path):

| Sequence | Brief's expected order | Confirmed |
|---|---|---|
| FIRST_LETTER correct | selected letter → praise | **Yes.** `chooseAnswer`'s correct branch: `selectionAudio: getItemAnnouncementAudio(...)` (the letter's own clip) then `verdictAudio: getSuccessOverlayAudioSpec(...)` (praise clip, then the success spec's word-clip explanation). `useGameSession.resolveAnswer` awaits `selectionAudio` first, only then dispatches the correct event and awaits `verdictAudio`. |
| FIRST_LETTER wrong (non-exhausted) | selected letter → retry | **Yes.** `selectionAudio: getWrongAnswerAudio(...)` bundles `[item clip, shared retry phrase clip]` as one sequential `AudioSpec`; `verdictAudio` is `undefined` for the non-exhausted case, so nothing else plays. |
| COMPLETE_LETTER correct | each selected letter → final praise | **Yes.** Each intermediate correct letter dispatches `outcome: 'progress'` with only `selectionAudio` (its own clip) — no verdict. The final letter that completes the word dispatches `outcome: 'correct'` with `verdictAudio: getSuccessOverlayAudioSpec(...)`. Live-confirmed: `audioEvents` showed each intermediate letter's clip playing alone, then the final letter's clip followed immediately by the praise clip. |
| COMPLETE_LETTER wrong | selected letter → retry | **Yes.** Identical wiring to FIRST_LETTER's wrong path. |
| COMPLETE_SYLLABLE correct | selected syllable → praise | **Yes.** Identical wiring pattern to FIRST_LETTER's correct path, confirmed live: word "vajko", correct syllable "KO" (not reached in the traced session, but the code path is structurally identical and was exercised for "GER"/"tiger" up to the wrong-answer point). |
| COMPLETE_SYLLABLE wrong | selected syllable → retry | **Yes.** Live-confirmed with word "tiger" (correct "GER"), wrong tap "NO": `audioEvents` = `start/finish:sk/words/tiger`, `start/finish:sk/syllables/no`, `start/finish:sk/phrases/skus-to-znova` — selected syllable clip immediately followed by the shared retry phrase, exactly as expected, within one sequential `selectionAudio` spec. |
| ASSEMBLY wrong full rail | wrong final syllable → retry → target word | **Yes.** `getWrongSequenceAudio(locale, word, selectedSyllable)` (`src/games/assembly/AssemblyGame.tsx:91-99`) returns `clips: [selected syllable clip, shared retry phrase clip, target word clip]` as the final wrong tile's own `selectionAudio`. Live-confirmed twice, with words "koza" (wrong final tile "KU", i.e. word "kura" in one run) and "noha": `audioEvents` showed the exact three-clip order — e.g. for "noha"/wrong-final-tile "no": `start/finish:sk/syllables/ha` (first, non-final tile, `outcome:'progress'`, its own clip only) then, after the second (final, wrong) tile placement, the full wrong-sequence clips. |

## Step 5: File Change Scope

Full `git diff --stat` for `443fa48...HEAD` (20 files, 3501 insertions, 1381 deletions):

- `src/games/{first-letter/FirstLetterGame.tsx, complete-letter/CompleteLetterGame.tsx, complete-syllable/CompleteSyllableGame.tsx, assembly/AssemblyGame.tsx}` — the four rebuilt playfields.
- `src/games/{first-letter/firstLetterLogic.verify.ts, complete-letter/completeLetterLogic.verify.ts, assembly/assemblyLogic.ts, assembly/assemblyLogic.verify.ts, assembly/assemblyAudioLogic.ts, assembly/assemblyAudioLogic.verify.ts}` — pure-logic modules and their verifiers.
- `src/shared/game/materials/{InsetSlot.tsx, PictureCard.tsx, WordRail.tsx, index.ts}` — three new shared tactile materials (Task 1), exported through the existing `src/shared/game/materials/index.ts` barrel.
- `src/shared/ui/UiKitScreen.tsx` — new `/ui-kit` demo sections for the three new materials.
- `e2e/bespoke-literacy.spec.ts` — new, 1288 lines, the four games' full test coverage (round/retry/success/failure paths, viewport matrix, pause/rotation/focus, assistive contract, reduced motion).
- `e2e/playwright.config.ts` — additive-only: exports `CI_VIEWPORT_SUBSET` for use by the new spec's viewport-matrix test.
- `e2e/support/gameHarness.ts` — 28 purely additive lines (no existing harness function modified).
- `e2e/ui-ux-enhancements.spec.ts` — one pre-existing Assembly test updated to assert the new shared `picture-card`/`word-rail` testids in place of the removed bespoke `prompt-badge`/answer-slot markup it used to assert, tracking Task 6's migration.
- `tools/screenshots/capture.mjs` — 180 new lines registering the round/retry/success/failure-or-reset/completion scene helpers for all four games (Task 7).

No parent, storage, audio-service, settings, content-registry, or PWA file changed anywhere in this range (see Step 4).

## Residual Risks

Items 1-14 are faithfully carried forward from the individual task reviews across Phase 6, as given in this task's brief, with one deliberate consolidation: item 6 below merges Task 4's and Task 5's separate ledger bullets about the same `getAnswerPieceState`/`pickPraise`/`FALLBACK_PRAISE` duplication finding into one sentence, since both describe the identical duplication across the same files. No item was otherwise summarized, and none were fixed in this verification-only task; triage recommendation follows each.

1. **Task 1 — `UiKitScreen.tsx:927-928`.** Second demo Card (DŽUNGĽA rail) placed as a DOM sibling outside the tested named region, no explaining comment; future edit risks reintroducing a Playwright strict-mode duplicate-testid failure if renested. Confirmed present at these exact lines. *Non-blocking; UI-kit-only, no user-facing surface.*
2. **Task 1 — `UiKitScreen.tsx:931-934`.** DŽUNGĽA demo letters beyond `DŽ` are inline literals, not sourced from `sk.ts` locale — harmless, UI-kit-only. Confirmed present. *Non-blocking.*
3. **Task 2 — `assemblyLogic.verify.ts`.** `returnTileToTray`'s sort order isn't exercised in a case where sorted/append order diverge. *Non-blocking; test-coverage gap, not a behavior gap.*
4. **Task 2 — `AssemblyGame.tsx` `handleTrayTileTap`.** Harmless redundant tile lookup already done inside `moveTileToFirstOpenSlot`. *Non-blocking; efficiency-only.*
5. **Task 3 — visible failure-feedback text** is now generic shared `GameShellFeedback` copy instead of the original bespoke per-item echoLine ("Slovo X začína na Y"). Matches the already-shipped Phase 5 grid-game pattern, not a Task-3-specific regression, but a genuine visible-content difference from the pre-migration screen worth a one-line confirmation this was intentional. *Recommend a one-line confirmation from the product owner that this content simplification is intended; non-blocking for Phase 6 acceptance itself.*
6. **Task 4/5 — `getAnswerPieceState`/`pickPraise`/`FALLBACK_PRAISE`** now duplicated verbatim across `FirstLetterGame.tsx`, `CompleteLetterGame.tsx`, and `CompleteSyllableGame.tsx` — standing candidate for extraction into `src/shared/game` if a future task touches any of these three files again. *Non-blocking; tech-debt note.*
7. **Task 4 — `CompleteLetterGame.tsx`'s local `exhausted` formula** duplicates `useGameSession.ts`'s internal terminal-failure computation and additionally gates a visible side effect (revealing all blanks) on it — a future hook change could desync reveal timing from the actual verdict; low risk given the formula's simplicity. *Non-blocking.*
8. **Task 4 — `answerLockRef` declaration comment** says the lock is set "very top of `chooseAnswer`", but it's actually set after the pre-existing read-only early-return guard — a wording nit only; the lock mechanism itself is correct. *Non-blocking; trivial comment-wording fix if anyone is ever in that function for another reason.*
9. **Task 6 — no e2e test chains** a wrong-rail reset into a subsequent correct completion in the same round. *Non-blocking; coverage gap.*
10. **Task 6 — `returnTile` lacks `placeTile`'s `answerLockRef` reentrancy guard** — appears adequate given `flushSync`-forced synchronous commits, but undocumented asymmetry. *Non-blocking.*
11. **Task 6 — the "focus moves to next tray piece after placing" half of the focus contract** is only indirectly exercised (the return-focus half has an explicit assertion, the placement-focus half doesn't). *Non-blocking; coverage gap.*
12. **Task 6, most notable — pre-existing, NOT introduced by this phase:** pausing during a CORRECT final tile's verdict audio (`useGameSession.resolveAnswer` returns `'cancelled'` instead of `'success'`) leaves the Assembly board fully placed and correct, but `useGameSession`'s own `resume()`/`resumeCancelledAnswerRef`/`ANSWER_PROGRESS` recovery reverts session phase to `awaiting-answer` even though there are no empty slots left to place a tile into — a possible dead-end. Verified identical before/after this phase's changes; inherited from Phase 5's `useGameSession`, not Assembly-specific. **Flagging prominently since it's a shared-framework gap, not a Phase-6-local one** — a future phase (or Phase 8) may need to address it in `useGameSession.ts` itself. *Recommend Phase 8 (or a dedicated framework task) fix; does not block Phase 6 acceptance since it's unchanged behavior.*
13. **Task 7 — `PictureCard.tsx`'s two independent reduced-viewport breakpoints** (`max-height:480px` vs `max-width:380px`, current values as of `99b1448`) diverge in value; when both conditions are simultaneously true (~375×420, an unusual squarish window) the milder width-query wins and the answer tray can overflow its container. None of the 10 `CANONICAL_VIEWPORTS` reach this combination; essentially unreachable on real phone aspect ratios (only floating/split-screen desktop or foldable states could trigger it). *Non-blocking; already-narrow edge case.*
14. **Task 7 — the brief's "no delayed input lock beyond duplicate-event prevention" clause under reduced motion** has no test that directly targets input-lock timing; covered only indirectly. *Non-blocking; coverage gap.*

### 15. ~~New finding from this task's screenshot review~~ — **FIXED in the final-review fix wave (`011b87b`)**; the inline retry-status banner overlaps the answer tray at `shortLandscape`, in all four Phase 6 games

> **Status update:** this was confirmed and fixed in the fix wave recorded below. Re-measuring it
> across the full viewport matrix also showed it reaches further than described here — it also
> occurs at `narrowPhone` and `phoneLandscape`, and Phase 5's already-accepted `words` game
> reproduces it too, so the "not a framework-wide break" reading below did not generalise beyond
> the `syllables` control it was drawn from. The original analysis is kept verbatim for the
> record; see **Final Whole-Phase Review Fix Wave → What was fixed → 1** for the corrected scope,
> the measured root cause, and the fix.

**Confirmed real, not a screenshot artifact.** While reviewing the captured `shortLandscape` (667×375) images, `complete-syllable-retry/shortLandscape.png` showed visibly garbled/overlapping text (syllable tile text bleeding through the retry banner's own wrapped text). This was verified live in-browser, not just from the screenshot: a `MutationObserver`-free 20ms poller was armed to capture `getBoundingClientRect()` for the `role="status"` retry banner and every answer tile the instant `window.__E2E__.gamePhase === 'answered-incorrectly'` — i.e. reading the real DOM at the real moment the banner is showing, independent of any capture-tool timing issue.

Measured overlaps at 667×375 (banner is fixed at `y: 295 → 367`, height 72px, in all four games — it is the same `GameShell.tsx` component):

| Game | Answer tile band | Overlap with banner |
|---|---|---|
| Complete-syllable (word "tiger", 4 single-row syllable tiles) | `y: 268.5 → 321.5` | **26.5px** |
| Complete-letter (word "autobus") | `y: 268.5 → 321.5` | **26.5px** |
| First-letter (word "cokolada") | `y: 224 → 309` | **14px** |
| Assembly (word "noha", 2-tile tray) | `y: 271 → 319` | **~24px** |
| *Control: Phase 5's "Slabiky" (syllables) FindIt game, identical banner, identical viewport* | `y: 194.5 → 286.5` | **None — 8.5px of clearance** |

The control confirms this is **not a framework-wide break** — the already-Codex-accepted Phase 5 game has no overlap with the identical `GameShell.tsx` retry banner at the identical viewport. `GameShell.tsx` itself is unmodified by Phase 6 (confirmed in the file-change-scope above). The mechanism, best understood from this evidence: Phase 6's games render a taller prompt area (`PictureCard` + `WordRail` together, showing both an illustration and the word-in-progress) than Phase 5's FindIt games (a single prompt image), which pushes each game's answer tray lower in the available vertical space — low enough, at `shortLandscape`'s 375px height, to sit where `GameShell`'s retry banner (rendered as a normal-flow sibling, not reserved-space-aware of the tray's actual rendered height) will appear once a wrong answer triggers it.

**Severity assessment:** this affects every one of the four Phase 6 games' core wrong-answer feedback at one of the 10 required canonical viewports. It is a readability defect, not a functional break — no test failed, the correct audio still plays, the round still recovers correctly after the retry window, and the games remain fully playable (confirmed live). But a child using the app in landscape on a short-height device (a real, if less common, phone orientation) would see genuinely overlapping, harder-to-read retry text during a moment specifically designed to reassure them after a wrong answer.

**This finding was deliberately not fixed in this task.** Task 8's brief is explicit that verification surfacing a genuine issue should be reported, not silently patched, and that this task carries no fix budget. `GameShell.tsx` is shared framework code outside all four literacy games' own file scope, so any fix belongs to a dedicated task, not folded into this handoff.

**Triage recommendation:** the reviewer (Codex) should decide whether this blocks Phase 6 acceptance. Arguments for treating it as non-blocking: it is inherited framework positioning logic Phase 6 did not touch, `shortLandscape` is a real but less common orientation, and the other three "worse" residual risks (item 12 especially) were similarly assessed as framework-level and not blocking in Phase 5's own acceptance. Arguments for treating it as blocking: it is newly, concretely surfaced by Phase 6's own content shape (not hypothetical), reproduces in all four of this phase's games, and directly touches the "visible feedback" and "short-landscape fit" criteria this very verification step was asked to check. This author's own read: **non-blocking for accepting Phase 6's game logic and content work, but worth a fast, narrowly-scoped follow-up fix in `GameShell.tsx` before Phase 8's release hardening**, since it is trivial to reproduce and characterize precisely (the table above) and does not require touching any of the four games themselves.

### 16. New, recorded not fixed — tile *content* can overflow its own tile at the landscape strips

Surfaced by the fix wave's own measurement and visual review, and deliberately left open because
it is a different defect from the banner collision and predates it.

- **Assembly at `shortLandscape`/`phoneLandscape`:** a three-character syllable (e.g. `DLO`,
  `UHÉ`) rendered at the game's own `text-[clamp(2.25rem,7vw,5rem)]` is wider than the ~61px
  square tile `AnswerGroup`'s geometry allocates at those heights, so the glyphs spill past the
  tile's dashed border. Visible in `assembly-retry/shortLandscape.png` in the recaptured matrix.
- **Phase 5's `words` at the same two viewports:** 11-20px of content overflows *inside* the
  answer region's own 93-100px tiles (measured as `answerRegion.scrollHeight - clientHeight`,
  with the tiles themselves fully inside the tray and clear of the banner).

Neither is the banner collision, and neither is new to this phase: before fix 1 the tray at those
viewports was collapsed to ~22px with its tiles spilling over the banner, so this was simply not
observable. The font sizing lives in each game's own answer-tile `className` (game files, which
fix 1 deliberately did not touch) rather than in `TactilePiece`, so a proper fix is either a
shared answer-tile type scale or the deferred short-landscape playfield reflow. *Non-blocking;
cosmetic at two viewports; recommend folding into whichever of those two follow-ups happens
first.*

## Final Whole-Phase Review Fix Wave

Task 8 above is verification/documentation of the phase as it stood at `99b1448`. A **final
cross-cutting review of the whole Phase 6 diff** (`443fa48` → `499fae2`) then ran, and found
issues no single task's narrow review could see. This section records the one remediation round
on those findings — there was no second round.

### What was fixed

**1. `GameShell.tsx`'s retry-status banner overlapped the answer tray** (`011b87b`, with its
regression test in the same commit).

The defect Task 8 recorded as Residual Risk item 15 is real, and measuring the retry state across
the full 10-viewport matrix (rather than only `shortLandscape`) showed it is **materially wider
than item 15 described**, in two ways worth Codex's attention:

- It is not confined to `shortLandscape`. In the retry state, tiles collided with the banner or
  were clipped away at **`narrowPhone` (320×568), `shortLandscape` (667×375) and `phoneLandscape`
  (844×390)**. `narrowPhone` is not a short-height layout at all, so any fix keyed purely on the
  `max-height:480px` threshold would have missed it.
- **It is not a Phase 6 defect.** Phase 5's already-accepted `words` FindIt game reproduces it at
  `shortLandscape` and `phoneLandscape` with 200-209px of tray content spilling out. Item 15's
  control ("Slabiky has 8.5px of clearance") was true for `syllables` but did not generalise:
  `words` has a taller prompt, and it breaks exactly like the Phase 6 games do. So the mechanism
  is a shared-framework one that Phase 6's content shape made obvious, not one Phase 6 introduced.

Measured root cause (all figures from live `getBoundingClientRect()` readings at the real
viewports, before and after): the banner is a normal-flow sibling below the interactive content,
so its whole ~72px band plus gap comes out of the answer tray's flex space. The prompt above it
is not shrinkable, so the entire loss lands on the tray. Once the tray's content box fell under
AnswerGroup's 48px minimum tile size, `calculateGridGeometry` returned its "nothing fits"
fallback — one column of *every* tile — which is unbounded vertically (228px of grid inside a 7px
box at `shortLandscape`). Separately, `PlayTray` only applied `overflow-hidden` once
`useElementSize` had measured a non-zero box; a tray squeezed to a zero-height content box
reported "unmeasured" and **dropped its clip exactly when it was needed**, which is why the
spilled tiles painted over the banner rather than being clipped.

The fix is entirely in shared framework code; none of the four game files were touched:

- `GameShell.tsx` — the banner moved into a `RetryStatusBanner` component rendered inside
  `AppScreen`, so it can read the existing measured `useAppScreenLayout().layout === 'short'`
  signal (the one `TopBar`/`RoundCounter`/`GameLobby`/`CustomContentScreen` already consume)
  instead of adding a third mechanism for the same threshold. At short heights it collapses to a
  single compact line; the narrow-width half reuses the existing `[@media(max-width:380px)]`
  query that `PictureCard` and the literacy prompt stacks already share. **The detail line stays
  in the live region as `sr-only`**, so the polite announcement is unchanged — only its box is
  given up. The interactive column's prompt/tray gap, the one spacing token in that column with
  no constrained-size override, was reclaimed at the same two breakpoints.
- `PlayTray.tsx` — clips unconditionally now (Assembly's flight clones are `position: fixed`
  nodes on `document.body`, so they are unaffected), and its padding gives ground at the same two
  breakpoints.
- `GamePrompt.tsx` — the 20px reserved "replaying" line becomes `sr-only` at short heights. Using
  `sr-only` rather than collapsing its `min-height` keeps the announcement *and* means the tray
  does not resize when `replaying` flips mid-prompt.
- `AnswerGroup.tsx` — the degenerate fallback now derives its column count from the measured
  width, so the unavoidable overflow is the smallest it can be instead of one column of every
  tile. This makes the whole shell degrade gracefully rather than catastrophically.

This follows the design spec's own ordering at `:557-562` — "short screens first reduce
decoration and whitespace, then reflow the playfield; they never hide an answer or critical
action". Only the first half is done here; the reflow half stays deferred (see below).

**Result, measured the same way the defect was:** across 8 games (4 Phase 6 + 4 Phase 5) × 5
constrained viewports × 5 repetitions in the retry state — zero banner/tile overlap, zero tray
content overflow, and every answer control at or above the 48px child target. The one remaining
row is Phase 5's `words` at `shortLandscape`/`phoneLandscape`, where 11-20px of overflow is left
*inside each tile's own 93-100px box* (the word card's content, not the grid overflowing the
tray) and the tiles do not reach the banner — a pre-existing `words` card-content nit, down from
200-209px of genuine spill before the fix.

**2. The viewport matrix never measured a feedback state** (`011b87b`, same commit).

This is why the defect shipped invisibly: `e2e/bespoke-literacy.spec.ts`'s Task 7 matrix only
ever asserted the fresh `awaiting-answer` state. A sibling block now drives all four games into
the retry state at all 10 canonical viewports (same `BESPOKE_GAMES` table, same
`genericAnswerWrong`/`asmAnswerWrong` helpers, same `CI_VIEWPORT_SUBSET` skip) and asserts the
banner clears the answer region — reusing `expectNoPairwiseOverlap` from
`e2e/support/layoutAssertions.ts` as the review asked — plus, because an overlap-free banner over
a fully-collapsed tray would also report zero overlap, that the tray clips none of its own
content and every control is still an unclipped, on-screen 48px target. All 40 pass after the fix,
and **the block genuinely detects the defect**: stashing the four shared framework files,
rebuilding and re-running made all four `shortLandscape` cases fail. To be precise about the
claim — the constrained viewports are where the defect lives, so it is those cases that flip;
the tablet and desktop sizes passed before the fix as well and are there to hold the guarantee
across the whole matrix. (The commit message on `011b87b` states this less precisely as "those 40
tests fail on the pre-fix build"; this is the accurate version.)

Because the retry phase auto-clears after `TIMING.FEEDBACK_RESET_MS` (500ms), the test reads all
of its geometry in one `page.evaluate` round trip and fails loudly if the banner has already
gone, rather than silently passing on a null box. `asmAnswerWrong`'s final wait was switched from
`waitForGamePhase`'s growing-interval `expect.poll` to the tight fixed-interval idiom the three
choice games already use, so it does not spend a large share of that 500ms window before
observing the phase.

**3. The screenshot capture tool's settle-wait bug** (`67f947c`).

Only the `round` scenes waited for anything before clicking; every `retry`/`success`/`failure`/
`reset`/`completion` scene builder clicked as soon as `window.__E2E__.gamePhase` allowed it.
`AnswerGroup` computes tile positions in a `ResizeObserver` callback, so boxes can still move a
frame after paint and again after every round change — which is exactly what the Task 8 capture
run's click-actionability failure (a sibling tile intercepting the pointer) looks like.
`capture.mjs` now waits for two consecutive readings of every play-surface control's box to agree
before each tap, mirroring the `expect.poll` settle wait in `e2e/bespoke-literacy.spec.ts`;
Assembly re-settles before every placement, since each one re-lays out both tray and rail.

**4. Full screenshot matrix recapture** — **complete, 240/240 images across all 10 canonical
viewports in a single clean pass**, including the six viewports Task 8 never reached. The four
`shortLandscape` retry scenes were read directly as images to confirm the overlap is visually
gone rather than merely test-green. See **Screenshot Capture Evidence → Recapture after the fix
wave**.

**5. The missing re-entrancy guard in `FirstLetterGame.tsx` and `CompleteSyllableGame.tsx`**
(`9d5fd30`).

Both games picked this round's praise entry and committed it to local React state *before*
awaiting `resolveAnswer`, so `useGameSession`'s own synchronous `answeringRef` (set at the top of
`resolveAnswer`) was too late to protect that local write, and the React-state-derived `canAnswer`
cannot observe a same-tick second invocation either. A fast double-tap could therefore commit
verdict audio built from one praise entry while showing another — the same defect class Phase 5's
review round already fixed once in `FindItGame.tsx` (Phase 5 handoff finding 4) and Task 4's fix
round fixed again in `CompleteLetterGame.tsx`. Both files now carry the identical, already-reviewed
`answerLockRef` pattern: a plain `useRef(false)`, checked and set before any local state mutation
or `await`, cleared in a `finally` wrapping every return path, alongside the `canAnswer` check the
other two games have. **No shared glue was extracted** — see the ruling below.

The regression test covering this is deterministic rather than a coin flip: it seeds exactly two
distinguishable praise entries (seeding only the praises, not `hrave-ucenie-seeded-sk`, leaves the
default word pool enabled) and stubs `Math.random` to alternate, so two consecutive `pickPraise`
calls *always* disagree. It asserts the praise clip actually played is the praise actually shown,
and that the doubled tap still counts as exactly one round. **It fails on a build without the
guard** (verified by stashing `FirstLetterGame.tsx`, rebuilding, and watching it fail on exactly
the shown-praise assertion) and passes for all three choice games with it.

### One further fix the wave's own verification forced

The first full-suite run after the fix wave lost one of the 40 new retry-layout tests to a 30s
wait for `answered-incorrectly` that never arrived: the wrong answer's clip had no recorded mp3,
fell back to Web Speech TTS, and the headless synthesizer fired neither `onend` nor `onerror` —
which `audioManager.speakAsync` has no timeout guard for. That is the pre-existing gap already on
this ledger as Residual Risk item 1, not a new defect and not what a geometry or re-entrancy spec
is measuring. `d6f32d9` adds a shared `stubSpeechSynthesis` harness helper that settles TTS
immediately and uses it **only** in the two new blocks; clip `start:`/`finish:` events are
recorded around the clip either way, so every audio-ordering spec still exercises the real path.
The new tests then passed 43/43 across three consecutive runs. **The underlying `speakAsync`
timeout gap is not fixed and remains open.**

### Verification of the fix wave

| Command | Result |
|---|---|
| `npm run lint` | **PASS** — 0 errors, the same single pre-existing `react-refresh` warning in `ContentContext.tsx` |
| `npx tsx src/shared/game/gameState.verify.ts` | **PASS** |
| `npx tsx src/games/first-letter/firstLetterLogic.verify.ts` | **PASS** |
| `npx tsx src/games/complete-letter/completeLetterLogic.verify.ts` | **PASS** |
| `npx tsx src/games/complete-syllable/completeSyllableLogic.verify.ts` | **PASS** |
| `npx tsx src/games/assembly/assemblyLogic.verify.ts` | **PASS** |
| `npx tsx src/games/assembly/assemblyAudioLogic.verify.ts` | **PASS** |
| `npx tsx tools/screenshots/capture.verify.ts` | **PASS** |
| `npm run test:e2e` (full suite, not just the bespoke subset) | **PASS — 482/482**, ~3.1 minutes. This is the check that Phase 5's already-accepted games did not regress from the shared `GameShell`/`PlayTray`/`GamePrompt`/`AnswerGroup` changes: `find-it-games.spec.ts`, `game-shell.spec.ts`, `ui-ux-enhancements.spec.ts`, `responsive-baseline.spec.ts` and the rest all pass unchanged. (An earlier run of the same suite was 481 passed / 1 failed on the headless-TTS stall described above, fixed in `d6f32d9`.) |
| New retry-layout matrix, isolated | **40/40**, three consecutive runs; 4/4 of its `shortLandscape` cases **fail** on the pre-fix build |
| New double-tap re-entrancy tests, isolated | **3/3**, and the `first-letter` case **fails** on a build with the guard removed |

`npm run test:audio` was not run: the fix wave changed no audio file and no audio key.

### Deliberately NOT fixed in this wave

Following the final whole-phase review, the controller ruled that two categories of finding stay
open rather than entering this fix wave:

- **The 5-way `pickPraise`/`FALLBACK_PRAISE`/`getAnswerPieceState` (and related
  `GameShellFeedback`/`GameShellCompletion`/`retryAfterError` glue) duplication across all five
  non-FindIt-descriptor games, including already-Codex-accepted Phase 5's `FindItGame.tsx`.** The
  final reviewer recommended extracting this into shared `src/shared/game/` code now. The
  controller's ruling: this is real and valuable, but it requires touching already-accepted Phase
  5 code, which is architectural-refactor scope crossing a phase-acceptance boundary — not a
  defect fix appropriate for a tail-end final-review fix wave with no second round. Recommended
  as a dedicated, separately-scoped-and-reviewed follow-up task before or alongside Phase 7,
  flagged here for the human/Codex to decide on explicitly rather than being unilaterally
  expanded into this fix wave.
- **The short-landscape layout strategy only compacts decoration/whitespace and never reflows the
  playfield to use landscape width, per the design spec's own `:557-562` guidance.** The final
  reviewer explicitly recommended NOT fixing this now, and recording it as an explicit Phase 7/8
  item instead — which this ruling does.
- **All 7 Minor findings from the final review** (dead `echoLine` computation in all four games;
  `shouldPlaySelectedSyllableAudio` has no production caller; the
  `SHORT_LAYOUT_MAX_HEIGHT`/`max-height:480px` breakpoint duplicated as a raw media query in 8
  files instead of reusing the existing `useAppScreenLayout()` signal; the prompt-stack wrapper
  `className` triplicated across three games; `InsetSlot` rendering `fixed` and `filled` states
  identically; `capture.verify.ts` not extended to Task 7's 20 new scenes; Assembly's
  `buildRound()` impurely mutating refs inside a `useState` initializer) remain recorded as
  residual risks/tech-debt, not fixed in this wave.

Two notes on that list, for the reviewer's benefit rather than as amendments to the ruling:

- The Minor finding about the duplicated `max-height:480px` breakpoint is *partly* reduced as a
  side effect of fix 1 — the retry banner's own short-height handling now goes through
  `useAppScreenLayout()` rather than a raw query, which is why that signal was chosen. The other
  raw-query sites are untouched and the finding stands.
- Fix 1 necessarily touched shared framework files (`PlayTray`, `GamePrompt`, `AnswerGroup`) that
  Phase 5's accepted games also render. Those edits are confined to the two constrained-size
  breakpoints and to a degenerate fallback that previously guaranteed an unbounded spill, and the
  full 482-test suite passes; but a reviewer should know the blast radius includes Phase 5's four
  games at narrow and short sizes, where they gain room rather than lose it.

## Phase 7 Preconditions

- Base Phase 7's implementation on the Codex acceptance-record commit for this phase's candidate (`99b144863b298aa980e74f576b1363a36f690ab6`), once accepted — not on this candidate directly, consistent with every prior phase's precondition.
- The three remaining bespoke numeracy games (`addition`, `compare`, `counting`) still import the legacy `SuccessOverlay`/`FailureOverlay`/`SessionCompleteOverlay` components (confirmed in Step 2) — Phase 7's job, per the roadmap, is migrating `Spočítaj`/`Viac alebo menej`/`Sčítaj` onto the same shared game framework these four literacy games now use.
- `src/shared/game/materials/{PictureCard, WordRail, InsetSlot}` (Task 1's new materials) are available and stable for Phase 7 if any numeracy game's content shape benefits from them, though numeracy content (object clusters, numeral tiles) may not map onto "word with blanks" materials as directly as literacy content did.
- ~~**Strongly recommend Phase 7 resolve Residual Risk item 15**~~ — **done**: fixed in the final-review fix wave (`011b87b`), in shared framework code, so all seven non-FindIt games and the four FindIt games inherit it. Phase 7's numeracy games will render their own tall-prompt content (object clusters, numeral groups) into the same column; the new retry-state viewport matrix in `e2e/bespoke-literacy.spec.ts` is the pattern to copy for them.
- ~~**Recommend completing the screenshot matrix's missing 6 viewports**~~ — **done**: the capture tool's settle-wait gap was fixed (`67f947c`) and the matrix recaptured; see **Screenshot Capture Evidence**.
- Item 12 (paused-during-correct-verdict `useGameSession` dead-end) remains open and inherited; still worth a dedicated framework-level fix independent of Phase 7's own scope.
- **The `audioManager.speakAsync` TTS timeout gap (item 1) is now a known suite-flake source, not just a content gap.** It stalled one test in a full-suite run during the fix wave. The fix wave worked around it in the two new blocks only; a real timeout guard in `speakAsync` would remove a whole class of non-deterministic failure from both the e2e suite and the screenshot capture tool, and is worth a dedicated framework task.
- **Short-landscape playfield reflow remains an explicit Phase 7/8 item** per the controller's ruling recorded below — the shell now compacts decoration and whitespace at short heights (the first half of the design spec's `:557-562` guidance) but still never reflows the playfield to use landscape width.
- **The 5-way glue duplication across the non-FindIt games remains open** and is recommended as a dedicated, separately-reviewed task before or alongside Phase 7, since it would also touch accepted Phase 5 code.
