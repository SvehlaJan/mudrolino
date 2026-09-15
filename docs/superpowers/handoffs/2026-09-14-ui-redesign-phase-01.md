# UI Redesign Phase 1 Handoff Manifest: Baseline and Safety

## Metadata
- **Phase:** 1 (Baseline and Safety)
- **Branch:** `feature/full-app-ui-redesign`
- **Base SHA:** `4733806e23e306ebfe4889fc411090351328c809`
- **Candidate SHA:** `a8945329e2e28be307782e99a852a9ae25bb892b`
- **Implementation Status:** Accepted by Codex
- **Working Tree Clean:** Yes (`git status --short` clean before handoff commit)
- **Local Screenshot Artifact Directory:** `artifacts/ui/a8945329e2e28be307782e99a852a9ae25bb892b/2026-09-15T22-00-53-909Z-69498`

---

## Verification Evidence

| Command | Result | Notes |
|---|---|---|
| `npx tsx src/shared/services/parentAccessLogic.verify.ts` | **PASS** | Pure logic route classification & return path verification |
| `npx tsx src/shared/services/e2eState.verify.ts` | **PASS** | Pure logic E2E state composable shallow merge |
| `npx tsx e2e/browserResolver.verify.ts` | **PASS** | Shared Chromium resolution contract used by E2E and screenshot capture |
| `npm run lint` | **PASS** | 0 errors, 1 documented pre-existing fast-refresh warning in `ContentContext.tsx` |
| `npm run test:e2e` | **PASS** | 102/102 tests passed across desktop & mobile projects in 28.5s |
| `npm run test:e2e:production-guards` | **PASS** | 1/1 test passed (proves `parentGate` absent in production) |
| `npm run build` | **PASS** | Production build passed as part of the production-guard command in 909ms |
| `git diff --check 4733806...HEAD` | **PASS** | Entire Phase 1 branch diff has clean whitespace and no unresolved conflicts |

---

## Screenshot Capture Evidence

Captured using `npm run shots -- --base=http://127.0.0.1:4173 --scene=parents-gate --scene=settings --scene=content` against local test preview server.

Artifact path:
`artifacts/ui/a8945329e2e28be307782e99a852a9ae25bb892b/2026-09-15T22-00-53-909Z-69498`

### Captured Scenes & Viewports:
- **`parents-gate`** (10 viewports):
  `narrowPhone.png`, `smallPhone.png`, `phonePortrait.png`, `shortLandscape.png`, `phoneLandscape.png`, `tabletPortrait.png`, `tabletLandscape.png`, `desktop.png`, `desktopLarge.png`, `desktopWide.png`
- **`settings`** (10 viewports):
  `narrowPhone.png`, `smallPhone.png`, `phonePortrait.png`, `shortLandscape.png`, `phoneLandscape.png`, `tabletPortrait.png`, `tabletLandscape.png`, `desktop.png`, `desktopLarge.png`, `desktopWide.png`
- **`content`** (10 viewports):
  `narrowPhone.png`, `smallPhone.png`, `phonePortrait.png`, `shortLandscape.png`, `phoneLandscape.png`, `tabletPortrait.png`, `tabletLandscape.png`, `desktop.png`, `desktopLarge.png`, `desktopWide.png`

---

## Summary of Changes

1. **Task 1 — Pure Parent Route Policy:**
   - Added `parentAccessLogic.ts` and `parentAccessLogic.verify.ts` defining `ParentRouteKind`, `isProtectedParentPath`, and `sanitizeChildReturnPath`. Normalized paths against trailing slashes.
2. **Task 2 — Composable & Test-Only E2E Oracle:**
   - Refactored `e2eState.ts` to support shallow `mergeE2EState`.
   - Exported `exposeParentGateE2E(state)` strictly gated on `import.meta.env.MODE === 'test'` with idempotent cleanup.
   - Connected `ParentsGate.tsx` to expose the answer and unlock trigger only in test mode.
3. **Task 3 — In-Memory Route Guard:**
   - Created `ParentAccessProvider` managing in-memory `unlocked` state and auto-locking when leaving protected paths for public child routes.
   - Created `ProtectedParentRoute` rendering `<Outlet />` when unlocked or `<ParentsGate />` when locked, safely navigating to sanitized return path on cancel.
   - Mounted `ParentAccessProvider` inside `BrowserRouter` in `main.tsx`.
   - Grouped protected parent routes (`/settings`, `/settings/games`, `/settings/games/:gameId`, `/settings/app`, `/settings/help`, `/content`, `/recordings`) under `ProtectedParentRoute` in `App.tsx`.
   - Removed legacy `awaitingHomeSettingsReveal` state.
4. **Task 4 — Parent Access E2E Coverage:**
   - Created `e2e/support/parentGate.ts` (`unlockParentGate`, `solveParentGate`).
   - Created `e2e/parent-access.spec.ts` covering every protected route, browser back/forward history re-locking, a fresh browser context, keypad solver, wrong-answer handling, cancel-to-home, validated lobby `returnTo`, unknown game IDs, protected-to-protected transitions, reload re-locking, and the legacy `/recordings` redirect.
   - Integrated `parent-access` into mobile project in `e2e/playwright.config.ts`.
5. **Task 5 — Persistence & Responsive Baseline Fixtures:**
   - Defined `CANONICAL_VIEWPORTS` (10 viewports) in `e2e/support/viewports.ts`.
   - Created `expectNoHorizontalOverflow`, `expectMinimumTarget` (44px), `expectWithinViewport` (subpixel-tolerant), and `expectNoPairwiseOverlap` in `e2e/support/layoutAssertions.ts`.
   - Created authoritative `e2e/fixtures/local-data-v1.json` and `e2e/support/persistenceFixtures.ts` fixtures for default/custom Slovak content and an IndexedDB audio Blob without test-only migration behavior.
   - Created `e2e/persistence-compat.spec.ts` with payload and application-consumption evidence, plus `e2e/responsive-baseline.spec.ts` covering settings and content across all ten canonical viewports.
6. **Task 6 — Production Guards & Screenshot CLI:**
   - Created `e2e/production-guards.spec.ts` and `e2e/playwright.production.config.ts` (port 4174).
   - Added `"test:e2e:production-guards"` script in `package.json`.
   - Created `tools/screenshots/capture.mjs` supporting `--base`, `--scene`, `--viewport`, `--output`, reusing the shared browser resolver and viewport registry and generating structured screenshots under `artifacts/ui/<sha>/<runId>/`.
   - Removed legacy screenshot test with hardcoded path from `e2e/ui-ux-enhancements.spec.ts`.
   - Updated `.agents/skills/playwright-browser-verification/SKILL.md` and added `artifacts/ui/` to `.gitignore`.
7. **Task 7 — Phase 1 Handoff & Roadmap Update:**
   - Ran complete test matrix, captured full screenshot set, updated `ROADMAP.md`, and prepared this handoff manifest.

---

## Internal Review Ledger (Subagent-Driven Development)

- **Task 1:** Spec review ✅ Approved | Code review ✅ Approved (`216a9b9`)
- **Task 2:** Spec review ✅ Approved | Code review ✅ Approved (`858b8ea`)
- **Task 3:** Spec review ✅ Approved | Code review ✅ Approved after fixes (`c935123`, `34302aa`)
- **Task 4:** Spec review ✅ Approved | Code review ✅ Approved (`f71f138`)
- **Task 5:** Spec review ✅ Approved | Code review ✅ Approved after fixes (`98965a2`, `62dc543`)
- **Task 6:** Spec review ✅ Approved | Code review ✅ Approved after fixes (`b3f6a74`, `2d14ee0`)
- **Codex remediation — parent access:** Spec review ✅ Approved | Code review ✅ Approved (`6798366`, `a894532`)
- **Codex remediation — persistence:** Spec review ✅ Approved after fixes | Code review ✅ Approved after fixes (`1c6e315`, `07c47e4`, `d7d85bf`)
- **Codex remediation — responsive/screenshots:** Spec review ✅ Approved after fixes | Code review ✅ Approved (`4c6eea9`, `5f1113e`)
- **Final integrated review:** ✅ Approved candidate `a8945329e2e28be307782e99a852a9ae25bb892b`

---

## Risks & Preconditions for Phase 2

- **No redesign introduced:** Phase 1 remained architectural and safety-oriented. The only presentation adjustment was enforcing the existing 44px minimum target contract on content tabs and add actions.
- **Phase 2 Preconditions:**
  1. Codex accepted candidate SHA `a8945329e2e28be307782e99a852a9ae25bb892b` after full verification and manual screenshot review.
  2. The commit containing this acceptance record is the base for Phase 2 (`docs/superpowers/plans/2026-09-14-ui-redesign-phase-2-design-system.md`).

---

## Codex Review Record
- **Reviewed Candidate SHA:** `a8945329e2e28be307782e99a852a9ae25bb892b`
- **Result:** Accepted
- **Reviewer Notes:** Initial review rejected incomplete route-matrix, persistence, responsive, lint, whitespace, and screenshot-tool evidence. Remediation was implemented through lower-cost subagents with separate specification and quality reviews. The final integrated review found no remaining implementation blockers; the full verification gate passed, and all 30 refreshed manual-review screenshots were present at the recorded candidate-SHA path with no gross clipping or overlap in the reviewed narrow-phone, short-landscape, and desktop samples.
