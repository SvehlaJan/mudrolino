# UI redesign Phase 8 handoff: release hardening

## Exact state

- Branch: `feature/full-app-ui-redesign`.
- Accepted Phase 7 base: `3197af2f6b117eb2cc1d605f09e514cf1746df51`.
- Phase 8 code candidate and screenshot evidence SHA: `1e0a2d43bd8065a55641248c90f330f5dbee82c5` (`fix: isolate recording capture drafts`), following core implementation commit `35ab5f5` and review fixes at `0ac1097`. The code worktree was clean immediately after this commit; this reporting document follows it.
- Code/spec review: **No remaining production correctness blocker found** in independent lower-cost Codex review. It found missing unsaved parent editor rotation coverage and capture scenes that showed UI Kit recorder examples instead of shipping `/content` states; both were fixed before this SHA.
- User visual sign-off: **Pending**. Codex did not inspect full-resolution screenshots, per the user's request.
- Local screenshot directory: `artifacts/ui/2026-09-28T18-40-27-113Z-95209-1e0a2d4/` (ignored). Complete: 55 scenes × ten viewports = 550 PNGs; all scene directories contain ten files, and the capture command exited zero. Older local runs were removed for the UI review; paths to them in historical handoffs are archival references.
- No PR or deployment was requested or created.

## Delivered

The release matrix derives all eleven game routes and protected settings paths from the catalog and fixes ten canonical viewport sizes in one place. New Playwright coverage completes five-round child journeys, representative retry and replay flows, and correct/wrong answer audio ordering for every game, including Assembly's bespoke wrong-answer sequence. Parent coverage edits legacy settings, a word, praise, and an IndexedDB audio override, then checks persistence across protected reloads and authorization expiry on child exit. Responsive, axe, reduced-motion, keyboard, and WebKit checks cover shipping surfaces.

The production service worker now uses its actual precached `/index.html` navigation fallback. A production offline test proved that the old `/` fallback failed for unseen game deep links, then proved the fix for all eleven routes, representative rounds, the protected gate, and install metadata. Production guards confirm the E2E bypass is absent and the avatar experiment is hidden; a bundle check keeps the avatar renderer in its lazy chunk. Dead `QuantityCluster`, `scatterGridLogic`, and `TopBar` files and a stale UI Kit compatibility example were removed after reference checks. Shared action and recovery controls use semantic variants, and release axe checks exposed and led to contrast fixes for action red and default status labels.

The screenshot CLI now has 55 deterministic named release scenes, including detailed parent/content/recording/feedback states and a keyboard focus state. An initial desktop dry run captured all 54 prior scenes in one pass; the new live recorder scenes passed a focused nine-file capture at phone portrait, phone landscape, and desktop. The full 55-scene narrow-phone sweep passed after each recording scene was given distinct draft content. The final ten-viewport capture completed at the path above without console or same-origin request failures.

## Verification ledger

| Command | Result |
|---|---|
| `npm run verify:pure` | Pass, all existing and new pure verifiers |
| `npm run lint` | Pass, zero errors; inherited `ContentContext.tsx` Fast Refresh warning |
| `npm run test:e2e` | Pass, 644/644 |
| `npm run test:e2e:release` | Pass, 322/322 with four workers: 270 responsive cases including parent-editor rotation at ten viewports, 20 accessibility cases, 11 all-game audio cases, 18 journeys/retry/replay cases, and three WebKit smoke cases. |
| Focused feedback keyboard repeat | Pass, 16/16 after holding ArrowRight through Radix's focus transition |
| `npm run test:e2e:production-guards` | Pass, 2/2 against fresh production build |
| `npm run test:e2e:offline` | Pass, 3/3 against fresh production build |
| `npm run verify:bundle` | Pass after production build; main entry 238.46 kB, `AvatarScene` separate at 973.04 kB |
| `npx tsx tools/screenshots/capture.verify.ts`, `node --check tools/screenshots/capture.mjs`, `git diff --check` | Pass |
| Final `npm run shots -- --matrix=release` | Pass, 550/550 PNGs in 55 complete scene directories at ten viewports; screenshots not opened or analyzed |
| `npm run verify:release` / `npm run test:audio` | **Fail at inherited audio inventory**: 25 syllable, 13 word, two phrase MP3s missing. All later aggregate steps above passed when run independently. |

WebKit's normal installer stalled during extraction on this host. The intact downloaded archive was extracted to `/private/tmp/teo-phase8-playwright-browsers`; Playwright launched WebKit 26.4. When the host later removed part of that temporary installation, a fresh 75.4 MiB archive was downloaded and extracted directly before the final 322/322 run. The full release command used `PLAYWRIGHT_BROWSERS_PATH=/private/tmp/teo-phase8-playwright-browsers` and `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/Users/svehla/Library/Caches/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-mac-arm64/chrome-headless-shell`. These absolute browser paths are host-local test setup, not product dependencies.

## Boundaries and follow-up

- The aggregate gate is not green because the 40 missing bundled recordings predate this candidate. Runtime falls back per clip to Slovak Web Speech, and this phase did not alter locale keys or audio files. See `docs/ui-audit/redesign-final-review.md` for the release decision.
- `ParentsGate` retains its existing landscape sizing rules. They fit the short-landscape matrix and were left intact instead of changing a shipping dialog without a demonstrated layout defect. Avatar implementation files were not changed.
- The screenshots are local review artifacts only. The independent code/spec review and user visual decision are recorded separately; neither is implied by passing browser assertions.
- Final report: `docs/ui-audit/redesign-final-review.md`.
