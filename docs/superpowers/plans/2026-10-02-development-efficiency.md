# Development efficiency implementation plan

> Execute the user-approved design in this branch using bounded tasks and independent review. See the companion design and development audit.

## Task 1 — session and audio seams

- [x] Install/configure Vitest with standalone Node config; include new src/tools test files, keep legacy verifiers.
- [x] Add `src/shared/game/gameSessionController.ts` and behavioral tests. Inject audio and clock, subscribe to snapshots, preserve existing commands and reducer semantics. Test audio order, double taps, retries/attempts, terminal completion, replay, pause in selection/verdict, timer/manual progression, stale promises, disposal and exact timing.
- [x] Replace hook orchestration with a React adapter; centralize opening/completion effects in a shared hook and migrate callers without removing game-specific locks/animations.
- [x] Improve audio-manager dependency injection if required to replace real-wait verifier paths with fast browser-independent tests; retain real browser playback coverage.
- [x] Run new tests, legacy state/audio checks and lint; review spec, then quality.

## Task 2 — browser coverage and fixtures

- [x] Change `e2e/playwright.config.ts` into integration coverage: one functional project; three geometry projects. Keep legacy `CI_VIEWPORT_SUBSET` exported through support rather than importing config in specs.
- [x] Mark viewport-dependent checks explicitly; remove repeated fixed viewport owners. Keep release full widths, single rotation owner, and explicit parent-data ownership.
- [x] Default ordinary game tests to fast audio/speech, preserve held/order tests and dedicated real-media checks. Use controlled clocks for success boundaries. Remove hidden retry transform sampling while preserving accessibility assertions.
- [x] Split bespoke literacy spec by mechanic using shared support if straightforward; no assertion loss.
- [x] Configure JSON reporting and isolated server outputs/strict ports via root-owned scripts. Run collection, focused contracts and integration once; review spec then quality.

## Task 3 — recording inventory

- [x] Add explicit pending manifest for 40 currently absent MP3s.
- [x] Extract pure inventory policy, test unexpected omissions, duplicates, stale entries, orphans and strict shipping behavior. Update checker to development default and `--strict` release gate. No assets are generated.
- [x] Verify dev passes, strict fails specifically for known pending recordings. Review spec then quality.

## Task 4 — development orchestration and evidence

- [x] Add source-to-suite selector with tests and `verify:edit`/`verify:integration`/`verify:release` entrypoints; include staged, unstaged and untracked files, manual overrides, conservative unknown fallback. Run local binaries without per-file npx overhead.
- [x] Isolate `dist` production and `dist-e2e` test, emit build identity, disable server reuse/strict ports. Build each mode once in aggregate release runner. Report every independent gate, duration, command, identity, exit status to ignored JSON artifacts.
- [x] Safely reuse successful proof only for identical input/build/test/environment fingerprint; expose force override. Do not call a copied result a fresh run.
- [x] Add screenshot seed, reduced review copies and manifest; include screenshot verifier in pure discovery.
- [x] Replace brittle source-string content verifier with behavioral seam tests; update active AGENTS/rules and ROADMAP.
- [x] Run lint, all pure/unit, inventory, production bundle, focused edit, integration, release browser/production gates; strict recording failure remains expected and release is blocked until recordings arrive. Capture representative seeded scenes and inspect 320px copies.
- [x] Review the full change, resolve findings, commit with why, report measured runtime and retained deployment gate.

## Verification findings incorporated

- Fast audio exposed tests relying on transient terminal phases. Terminal contracts now hold verdicts explicitly or wait for session completion; intermediate round assertions remain.
- Multiple Playwright init scripts have unspecified order. Registration priorities plus forward/reverse unit tests preserve explicit held-audio fixtures.
- Separate per-profile result directories preserve earlier failed traces when the aggregate runner proceeds.
- Actual WebKit installation on Node 26 stalled in Playwright 1.59.1 archive extraction. Aligned Playwright packages at exact 1.60.0 include the upstream fix; matching Chromium and WebKit installed successfully. See https://github.com/microsoft/playwright/issues/40724 and https://github.com/microsoft/playwright/pull/40747.
- Production offline tests mute original native media and speech methods without synthetic completion; test builds remain silent too.

Final verification, measured timings, recording gate and daily workflow are captured in `../handoffs/2026-10-02-development-efficiency.md`.
