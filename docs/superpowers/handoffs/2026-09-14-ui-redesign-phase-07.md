# UI Redesign Phase 7 Handoff: Bespoke Numeracy Games

## Status and exact starting point

- **Status:** Implementation and verification complete; **pending independent Codex acceptance**. Phase 8 has not started.
- **Branch:** `feature/full-app-ui-redesign`.
- **Accepted Phase 6 base:** `878171973398020a0c40c005ab6a6c38e325ed40`.
- **Phase 7 code candidate:** `7f921731ee6cbd835b9cb8ebfa312f175ab2f3b9` (`fix: keep phase seven regression checks deterministic`). This is the tested code SHA; the documentation handoff commit follows it.
- **Working tree before writing this manifest:** clean at the code candidate. Confirm cleanliness again after committing this document.
- **Local screenshot directory:** `artifacts/ui/7f921731ee6cbd835b9cb8ebfa312f175ab2f3b9/2026-09-23T19-36-49-382Z-40150/` (12 PNG files; ignored, not committed). Per the user's explicit request, no full-resolution screenshots were opened or analyzed. Measured DOM geometry and interaction tests provide the visual-layout evidence.

## What changed

The three remaining bespoke numeracy games now use the shared `GameShell`, `GamePrompt`, `AnswerGroup`, session hook, tactile quantity materials, and parent pause flow. `QuantityTray` and `BalancePlayfield` expose object and numeral modes; a pure measured layout keeps quantities 1–20 within the available tray. The UI Kit shows the materials.

- **Spočítaj:** bounded interactive counters, correct-count reveal, three-attempt failure, five-round completion, and visible retry feedback.
- **Viac alebo menej:** two quantity trays, uncapped self-correction, localized relationship feedback, and five-round completion.
- **Sčítaj:** two operand trays, forced numeral mode for settings ranges 20/100, three-attempt failure, complete equation feedback, and five-round completion.

Existing settings values and persistence, answer-item-before-verdict audio, replay, keyboard controls, Back-to-lobby, and the existing test oracle keys were preserved. Each game merges `gameId` and session `phase` into the E2E oracle. No audio asset/key, dependency, avatar module, or content storage format changed. The three old overlay React components are no longer rendered by these games; remaining `getSuccessOverlayAudioSpec` references are the shared audio helper, not overlay imports.

The final fix commit also kept production-only guards out of the test-mode Playwright project, scoped a UI Kit apple assertion to its intended button, and made the parent-gate E2E recovery counter publish even when a regenerated question has the same answer. These were exposed by the full regression run.

## Verification

| Command/check | Result |
|---|---|
| Six `npx tsx` verifiers: `quantityLayout`, `countingGridLogic`, `compareLogic`, `additionLogic`, `settingsRegistry`, `settingsService` | **PASS** (all six) |
| `npm run lint` | **PASS**, zero errors and the existing `ContentContext.tsx` Fast Refresh warning only |
| `npm run test:e2e` | **PASS, 643/643** across desktop, mobile, and five numeracy viewport projects (final complete rerun, ~5.2 minutes) |
| Focused older literacy short-landscape retry test | **PASS, 25/25** repeated runs after one intermittent full-suite failure; see risk below |
| `npm run build` | **PASS**; main `index` chunk 238.42 kB, numeracy game chunks 4.97–6.27 kB, and `AvatarScene` remains separate at 973.04 kB |
| `npm run test:e2e:production-guards` | **PASS, 1/1** against a fresh production build; the parent-gate adapter is absent |
| `git diff --check 878171973398020a0c40c005ab6a6c38e325ed40..HEAD` | **PASS** at the code candidate |
| Screenshot capture: 3 round scenes × 4 viewports (`narrowPhone`, `shortLandscape`, `tabletPortrait`, `desktop`) | **PASS, 12/12 files** in the directory above; inventory checked without image analysis |

`npm run test:audio` was not needed because no audio file or audio key changed. The full E2E run verifies settings modes and persistence, five-round sessions, the respective attempt policies, answer audio sequencing, parent pause/resume, Back, accessibility, reduced motion, keyboard activation, and measured containment on narrow and short screens. Independent focused subagent reviews of counting, comparison, addition, and the viewport matrix found issues that were fixed before the final code candidate; no blocking review finding remains open.

## Known risks and Phase 8 preconditions for Claude

1. The first full run after the final fixes passed 642/643; a **pre-existing first-letter literacy retry test** measured 13 px of `PlayTray` overflow at 667×375 during a transient retry. It passed 25/25 focused repetitions and the subsequent 643/643 full rerun. No layout code was changed without a reproducible cause. Phase 8 should watch this case under parallel load and gather geometry/ResizeObserver timing evidence if it recurs.
2. The earlier Phase 5 `words` answer-content overflow, broader short-landscape playfield reflow, and shared non-FindIt glue duplication remain recorded in the Phase 6 manifest. Treat them as release-review or separately scoped maintenance items according to the Phase 8 plan; do not assume this handoff resolves them.
3. WebKit installation/extraction was unavailable in this sandbox during earlier phases. Phase 8 calls for a WebKit smoke suite; use an environment where the browser can be installed or record the exact constraint.
4. The 12 screenshot files are capture evidence only. The user asked that full-resolution screenshots not be analyzed by this agent. Claude should preserve that preference unless the user changes it.

Claude's next authorized work is to read `docs/superpowers/plans/2026-09-14-ui-redesign-phase-8-release-hardening.md` and the accepted handoff chain, **after Codex records Phase 7 acceptance**. The acceptance-record commit, not this code candidate or this manifest commit, is the valid Phase 8 base. Phase 8 adds the exhaustive release matrix, integrated browser journeys, offline and production checks, and final user visual sign-off; it should not change the numeracy games' learning rules.
