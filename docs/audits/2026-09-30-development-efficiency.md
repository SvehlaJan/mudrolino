# Development efficiency audit

Date: 2026-09-30. Snapshot: `01a1b28` on `feature/full-app-ui-redesign`.

## Assessment

Keep coverage of important behaviors, but reduce repeated executions and use different verification profiles for editing, integration, and release. The main cost is browser game flows, rather than Vite builds or the existing pure-logic checks. A wholesale rewrite or new test framework is unnecessary for the first improvements.

This audit inspected the test configurations, scripts, shared session/audio implementation, game test harnesses, representative game and release specs, screenshot capture, pure verifiers, and active agent instructions. It collected regular and release suites without launching browsers, analyzed the final run log from this session, and reran the audio inventory. It does not establish that every test is redundant or that proposed runtime targets have been achieved.

## Measured baseline

| Measure | Evidence |
|---|---|
| Regular browser suite | 667 executions across 436 distinct file/title/line definitions |
| Project distribution | 403 desktop, 99 mobile, 165 numeracy across five viewport projects |
| Release browser suite | 322 executions; 270 are the ten-viewport responsive matrix |
| Last full regular run | 8.8 minutes with three workers; 1,552.8 summed test seconds |
| Largest costs | FindIt 459.9 worker-seconds; bespoke literacy 342.1; addition 168.9; comparison 146.7; counting 128.6 |
| Focused integrated run | 50 tests in 52.2 seconds, plus six feedback tests in 11.4 seconds |
| Vite bundling | Approximately 0.7–1.2 seconds in the recent logs; these numbers exclude all command overhead |
| Pure verifier discovery | 34 files under `src` and `e2e`; screenshot capture verifier is outside that discovery |
| Audio inventory | Still fails: 25 syllable, 13 word, and two phrase MP3s missing |

Different viewport executions can be valuable. The difference between 667 executions and 436 definitions is not itself a count of redundant tests.

## Highest-return changes

### 1. Separate functional and responsive selection

`e2e/playwright.config.ts:6` applies all counting, comparison, addition, numeracy accessibility, and numeracy responsive specs to all five numeracy projects. Many functional checks, settings combinations, and five-round completions do not need that entire viewport matrix.

Choose one owner for viewport selection: either a responsive project or explicit viewport iteration inside a test. Tests that override the project viewport should run in one project. Confirmed repeated viewport paths are:

- Counting: two fixed-size definitions execute ten times (`e2e/counting.spec.ts:25`, `:44`), producing eight extra copies.
- Comparison: two fixed-size definitions execute ten times (`e2e/compare-quantities.spec.ts:131`), producing eight extra copies.
- Addition: two fixed-size definitions execute ten times (`e2e/addition.spec.ts:157`), producing eight extra copies.
- FindIt: twenty definitions explicitly set their viewports and execute in both desktop and mobile, producing twenty extra copies.
- Parent access and UI enhancements: four further extra copies after explicit viewport changes.
- Release rotation: two fixed portrait-to-landscape paths run in all ten responsive projects (`e2e/release-responsive.spec.ts:114`, `:127`), producing eighteen extra copies.

These are 48 repeated regular executions and eighteen repeated release rotation executions. Repeated random content is not a substitute for intentional coverage; use deterministic fixtures and distinct edge cases instead.

Keep layout tests at narrow phone, short landscape, and desktop during development. Add tablet, the remaining canonical widths, and WebKit to the release profile. Keep browser wiring checks for each game, including its distinct failure policy; exercise shared session completion, timing, and cancellation more deeply in a representative shared-session test.

Playwright supports this separation with projects and filters: [project documentation](https://playwright.dev/docs/test-projects#splitting-tests-into-projects).

### 2. Make ordinary game tests use deterministic audio

Muting the test build solves disturbance, but it still waits for clip durations. Most functional tests use only `stubSpeechSynthesis`, leaving recorded media to run in real time. A fast fixture should use `stubAudioPlayback` and deterministic speech completion for layout, keyboard, settings, and generic session tests. Keep a small dedicated real-media suite for browser playback integration, fallback, completion, and cancellation.

Keep held audio promises for sequencing assertions: they verify that the game waits for audio without requiring real clips to take seconds. Do not globally make production audio faster or remove actual playback coverage.

### 3. Test timing precisely without sleeping

`e2e/find-it-games.spec.ts:247` uses real delays around the new one-second success timer. Use a controlled clock to assert that 999 ms does not advance, the next millisecond advances once, and cancellation prevents advancement. Keep the audio promise separately controlled.

Playwright's [clock API](https://playwright.dev/docs/clock) can control timers and animation frames. Install it before page execution, and handle animation settling deliberately. Longer term, put shared session orchestration behind a small clock/audio seam so cancellation and pause/resume have fast behavioral tests. The existing `.verify.ts` approach can remain; adding Vitest is optional, rather than a prerequisite.

### 4. Make fixtures and visual review reproducible

Use seeded content and explicit stress fixtures: longest syllable, maximum quantity, duplicate syllable labels, and constrained viewport. This session's assembly captures used different words between before/after scenes, making comparison harder.

Add a screenshot capture option that automatically produces 320 px review copies and a manifest containing commit, build mode, fixture/seed, console failures, and request failures. Keep source screenshots for export but inspect only reduced copies, as requested.

Run focused checks and screenshot review before the full integration gate. The full suite caught long-label overflow, but 667 passing tests did not catch the placed rail offset. Visual review found it, and a focused containment assertion now covers it. More executions of incomplete assertions would not have caught that gap.

### 5. Isolate verification artifacts and record results

All build modes write `dist`, and preview projects use that same directory. `reuseExistingServer` also makes it possible to reuse a preview from another checkout or build mode. Separate test and production output directories and validate a preview's build identity before reuse. [Vite supports `build.outDir`](https://vite.dev/config/build-options.html#build-outdir).

The release script in `package.json:17` builds test mode twice and production mode three times when all steps are reached. Build each artifact once and reuse it. This is primarily a correctness and coordination improvement, since current bundling is fast.

Add JSON timing/results reporting so expensive tests and flaky retries are visible without parsing console logs. Record results against commit, build mode, command, and fixtures. Reuse a successful result for the same code; rerun when relevant implementation changes. A fast-forward of verified commits warrants a small integrated smoke check rather than another identical full suite.

### 6. Improve active guidance and test quality

- Update `AGENTS.md` and `.claude/rules/e2e.md`: they still refer to 28 tests. Adopt the verification profiles explicitly so agents are not instructed to run the entire matrix for every game-loop edit.
- Fix the harness comment claiming speech has no timeout: `audioManager.ts:177` now provides a 15-second watchdog.
- Clarify which profile owns `release-parent-data.spec.ts`; it currently runs in the regular suite despite its name.
- Replace `src/content/CustomContentScreen.verify.ts` source-string checks with behavioral checks of the filtering/restore seam. Source text can change harmlessly or remain present while behavior breaks. Avoid asserting incidental Tailwind strings when geometry or accessible behavior expresses the requirement better. See [Playwright's behavior-testing guidance](https://playwright.dev/docs/best-practices#test-user-visible-behavior).
- Retire the sixteen-frame transform sampler for the now visually hidden retry status in `e2e/numeracy-accessibility.spec.ts:84`. Preserve the polite announcement and reduced-motion checks of actual visible tiles and overlays; sampling the hidden node no longer protects the former banner animation.
- Split the 1,515-line bespoke literacy spec by mechanic or contract, retaining shared fixtures. Prefer bounded implementation assignments and review the changed scope rather than repeatedly reviewing the whole history.
- Expose repeatable verification through named package scripts. This reduces ad-hoc shell orchestration and allows narrowly scoped approvals for required macOS browser/tsx capabilities.
- Resolve the audio inventory's 40 missing clips, or explicitly approve a policy for intentionally TTS-only entries that still rejects new unexpected omissions. The current `&&` release chain stops at this known inventory failure and never runs its later checks; an aggregate report should retain failure status while collecting independent results.

## Proposed verification policy

| Stage | Checks | Target |
|---|---|---|
| Editing | Lint/typecheck, affected pure verifiers, selected functional tests, relevant small-screen geometry | Roughly one minute |
| Integrating a feature | All functional contracts once, representative responsive checks, production build/bundle check | Two to three minutes |
| Releasing | Full responsive matrix, all-game journeys/audio, parent persistence, WebKit, offline and production guards, inventory | Full shipping coverage |

Runtime targets are proposals, not measured guarantees. Shared routing, session, or audio changes select a broader contract set than a single game layout edit. A source-to-suite map should include those shared dependencies; selecting only modified spec files is insufficient.

Keep pure logic, audio cancellation/order, terminal actions, parent-gate/data persistence, assembly place/return/focus, extreme geometry, production isolation, and offline coverage. Reduce repeated viewport-independent flows, fixed rotations multiplied by projects, incidental implementation assertions, and superseded checks once an equivalent owner is identified.

Implement selection/profile changes first, deterministic fixtures and clocks second, and deeper session testability only where the remaining timings justify it. Measure after each step instead of choosing a desired test count.
