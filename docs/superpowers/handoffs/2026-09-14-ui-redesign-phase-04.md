# UI Redesign Phase 4 Handoff Manifest: Parent Experience

## Metadata
- **Phase:** 4 (Parent Experience)
- **Branch:** `feature/full-app-ui-redesign`
- **Base SHA:** `3b8e7e3e4cb4901fec6655c65be8702b8d41cf07` (The accepted starting point commit on `feature/full-app-ui-redesign`: "fix: recover failed custom content undo")
- **Candidate SHA:** `8a070889e33869062b6ccbfdc04b608a464816e1` ("fix: make feedback status accessible") — the review-remediated product-code commit; this handoff commit and the `ROADMAP.md` update sit on top of it as reporting-only metadata and are not part of the reviewable code candidate.
- **Implementation Status:** Complete, pending Codex acceptance
- **Working Tree Clean:** Yes (`git status --short` clean before handoff commit)
- **Local Screenshot Artifact Directory:** `artifacts/ui/8a070889e33869062b6ccbfdc04b608a464816e1/2026-09-18T01-58-36-661Z-78681` (140 screenshots: 14 scenes across 10 canonical viewports)

---

## Verification Evidence

| Command | Result | Notes |
|---|---|---|
| `npx tsx src/shared/settings/settingsRegistry.verify.ts` | **PASS** | Pure-logic verifier: covers SettingId completeness, registry mapping for all catalogued games, addition dependency notice |
| `npx tsx src/shared/services/settingsService.verify.ts` | **PASS** | Pure-logic verifier: covers settings persistence, fallback on corrupt values, save error detection |
| `npx tsx src/shared/services/appSettingsStore.verify.ts` | **PASS** | Pure-logic verifier: covers font preference round-trip and quota error handling |
| `npx tsx src/content/customContentValidation.verify.ts` | **PASS** | Pure-logic verifier: covers word, syllable, and praise validation, duplicate prevention, and normalization |
| `npx tsx src/content/contentState.verify.ts` | **PASS** | Pure-logic verifier: covers v2 content migration, default ID determinism, enabled-state invariants, and last-playable item protection |
| `npx tsx src/shared/services/localContentRepository.verify.ts` | **PASS** | Pure-logic verifier: covers repository CRUD, enable/disable toggling, restorable defaults, and domain guards |
| `npx tsx src/recordings/recordingState.verify.ts` | **PASS** | Pure-logic verifier: covers state transitions (`idle`, `requesting`, `recording`, `processing`, `saved`, `cancelled`, `error`) |
| `npx tsx src/shared/contentRegistry.verify.ts` | **PASS** | Pure-logic verifier: covers answer-audio sequencing contract and locale content integrity |
| `npx tsx src/content/CustomContentScreen.verify.ts` | **PASS** | Pure-logic verifier: covers custom content enabled-state seams |
| `npx tsx src/shared/services/parentAccessLogic.verify.ts` | **PASS** | Pure-logic verifier: covers protected route classification and return path sanitization |
| `npx tsx tools/screenshots/capture.verify.ts` | **PASS** | Tooling verifier: covers screenshot scene registration, args parsing, and help output |
| `npm run lint` (`tsc --noEmit` + ESLint) | **PASS** | 0 errors, 1 pre-existing documented `react-refresh/only-export-components` warning in `ContentContext.tsx` |
| `npm run test:e2e` | **PASS** | 216/216 tests passed across desktop and mobile Chromium projects (~41s), covering all parent routes, content management, recordings, feedback, and baseline accessibility |
| `npx playwright test e2e/persistence-compat.spec.ts` | **PASS** | 2/2 tests passed: validates backward compatibility of v1 localStorage and IndexedDB audio overrides |
| `npm run build` | **PASS** | Production build in 888ms; `AvatarScene-CDLptoUB.js` (973.04 kB) remains isolated from main chunk `index-CDM3XdUf.js` (246.89 kB) |
| `git diff --check` | **PASS** | No whitespace errors, no trailing spaces, no conflict markers |
| `npm run test:audio` | **Not rerun** | Audio keys and bundled audio assets were not modified |

### Avatar / three.js lazy-chunk confirmation
Inspection of `dist/assets/index-*.js` confirms that `AvatarScene` is never bundled into the main chunk; it is loaded strictly through dynamic `import()` behind `VITE_AVATAR_POC_ENABLED`. The heavy Three.js / R3F dependencies remain isolated in `dist/assets/AvatarScene-CDLptoUB.js` (973.04 kB).

---

## Data Migrations & Storage Compatibility

1. **localStorage**:
   - `hrave-ucenie-settings`: unchanged keys and storage format; validates through typed registry.
   - `hrave-ucenie-app-settings`: unchanged schema (font family preference preserved).
   - `hrave-ucenie-user-words-sk`: migrated transparently to v2 envelope with `enabled: boolean`, deterministic default IDs `default:word:<locale>:<key>`, preserving custom word IDs, metadata, and audio overrides.
   - `hrave-ucenie-user-praises-sk`: migrated transparently to v2 envelope with `enabled: boolean`, deterministic default IDs `default:praise:<locale>:<key>`.
   - **Invariant:** Pure domain guard `canDisableOrDelete` guarantees at least one playable word and praise at all times with message `Aspoň jedna položka musí zostať zapnutá.`.

2. **IndexedDB**:
   - Database: `hrave-ucenie-audio-overrides`, store `overrides`. Audio keys (e.g. `sk/words/custom-custom-1`) remain untouched.
   - Disabling or restoring default content does not touch audio overrides.
   - Deleting a custom item cleans up associated audio overrides only after the domain guard permits deletion.

---

## Screenshot Capture Evidence

Captured against local preview server built with `vite build --mode test`.

Artifact directory:
`artifacts/ui/8a070889e33869062b6ccbfdc04b608a464816e1/2026-09-18T01-58-36-661Z-78681`

### Captured Scenes & Viewports (10 canonical viewports each, 140 total):
- **`parent-dashboard`** (`/settings`): `narrowPhone.png`, `smallPhone.png`, `phonePortrait.png`, `shortLandscape.png`, `phoneLandscape.png`, `tabletPortrait.png`, `tabletLandscape.png`, `desktop.png`, `desktopLarge.png`, `desktopWide.png`
- **`parent-games`** (`/settings/games`): same 10 viewports
- **`parent-game-alphabet`** (`/settings/games/ALPHABET`): same 10 viewports
- **`parent-game-addition`** (`/settings/games/ADDITION`): same 10 viewports
- **`parent-app`** (`/settings/app`): same 10 viewports
- **`parent-help`** (`/settings/help`): same 10 viewports
- **`parent-feedback-dialog`** (`/settings/help` with feedback modal open): same 10 viewports
- **`content-letters`** (`/content` - Letters category): same 10 viewports
- **`content-numbers`** (`/content` - Numbers category): same 10 viewports
- **`content-phrases`** (`/content` - Phrases category): same 10 viewports
- **`content-words`** (`/content` - Words category): same 10 viewports
- **`content-praises`** (`/content` - Praise category): same 10 viewports
- **`content-word-editor`** (`/content` with Word editor open): same 10 viewports
- **`content-recording-active`** (`/content` with active recording controls): same 10 viewports

### Visual Inspection Report (320×568, 667×375, and desktop):
- **`/settings` (Parent Dashboard)**: Calm, organized dashboard presenting four primary destinations (`Nastavenia hier`, `Vlastný obsah`, `Aplikácia a vzhľad`, `Pomoc a spätná väzba`). At 320×568, cards stack cleanly; on desktop, cards lay out in responsive multi-column grid with clear touch/click targets.
- **`/settings/games`**: Games overview derives directly from the semantic catalog and shows setting summaries per game. Empty-setting games are cleanly omitted.
- **Game details (`ALPHABET`, `ADDITION`)**: Cleanly render catalogued controls (`SwitchControl`, `RadioGroupControl`). On `ADDITION`, selecting range 20/100 displays the dependency notice `Pri rozsahu 20 alebo 100 sa zobrazenie prepne na čísla.` in an accessible callout. On desktop, renders side-by-side list and detail panel; on mobile, stacks cleanly.
- **`/settings/app`**: Font choice radio group and application appearance controls render with AA contrast.
- **`/settings/help` & Feedback Dialog**: Feedback trigger button opens `DialogShell`. Dialog renders accessible `RadioGroupControl` for categories, `TextAreaControl` with remaining character counter, honest no-reply wording, selectable `mailto:` link, and clear retry button on submission failure. Focus traps inside dialog and restores to trigger button upon close or Escape.
- **`/content` (Custom Content Manager)**: One responsive capability model across all viewports. Vertical category rail + list + editor on desktop; tab strip + list + modal dialog on compact/mobile. Disabled default items render in a collapsed disclosure (`Vypnuté (N)`) with individual restore and "Obnoviť všetko".
- **Recording Rows**: Every interactive button meets 44×44px minimum tap target. Active recording row shows distinct "Zastaviť" and "Zrušiť nahrávanie" buttons with live polite status announcements (`Nahrávam — hovorte do mikrofónu`). While one row records, other record buttons are visibly disabled.

---

## Summary of Changes (Tasks 1–7)

1. **Task 1 — Settings Registry:**
   - Created `src/shared/settings/settingsRegistry.ts` centralizing all 10 setting definitions and dependency logic.
   - Verified by `src/shared/settings/settingsRegistry.verify.ts` and updated `settingsService.ts`.

2. **Task 2 — Autosave Feedback:**
   - Implemented `useAutosaveStatus.ts` providing polite live-region feedback (`saving`, `saved`, `error`) without changing persistence keys.
   - Verified by `src/shared/services/appSettingsStore.verify.ts`.

3. **Task 3 — Protected Parent Dashboard & Routes:**
   - Built host-agnostic parent screens: `ParentLayout.tsx`, `ParentDashboardScreen.tsx`, `GameSettingsOverviewScreen.tsx`, `GameSettingsScreen.tsx`, `AppSettingsScreen.tsx`, `HelpFeedbackScreen.tsx`, `SettingsRenderer.tsx`, and `SettingField.tsx`.
   - Replaced legacy overlays and redirects with protected route hierarchy in `App.tsx`.

4. **Task 4 — Custom Content State & Enabled-State Storage:**
   - Versioned content storage (v2 envelope) preserving disabled default items.
   - Created `contentState.ts` and `contentState.verify.ts` ensuring at least one playable word/praise is retained at all times.
   - Updated `localContentRepository.ts` and `ContentContext.tsx`.

5. **Task 5 — Universal Custom Content UI:**
   - Modularized content screens: `ContentCategoryNav.tsx`, `ContentItemList.tsx`, `WordEditor.tsx`, `PraiseEditor.tsx`, `CustomContentScreen.tsx`.
   - Unified responsive layout with accessible tabs, search, editing, deletion confirmation dialogs, and Undo.

6. **Task 6 — Recoverable Recording State Machine (`ad51a47`):**
   - Created `recordingState.ts` and `recordingState.verify.ts` covering full lifecycle transitions.
   - Updated `useRecorder.ts` to return explicit state, level, speaking, error, and separate `stop()` and `cancel()` functions.
   - Rebuilt `RecordingListItem.tsx` with 44px tap targets, polite live status regions, and distinct Stop/Cancel actions.
   - Created `e2e/support/fakeRecorder.ts` and comprehensive deterministic tests in `e2e/recordings.spec.ts`.

7. **Task 7 — Accessible Feedback Dialog (`8a07088`):**
   - Rebuilt `FeedbackModal.tsx` on Phase 2 primitives (`DialogShell`, `RadioGroupControl`, `Field`, `Button`).
   - Wired focus restoration from `HelpFeedbackScreen.tsx` trigger button.
   - Updated copy to eliminate misleading "48 hodín" response promises and added selectable `mailto:` link.
   - Added `e2e/feedback.spec.ts` covering keyboard navigation, retry, focus restoration, and dismissal without auto-close.

---

## Internal Review Ledger

- **Tasks 1–5:** Committed in history (`44ea6cf`..`3b8e7e3`) — settings registry, autosave status, parent dashboard routes, content migration, and universal content editor.
- **Task 6 (recording state machine):** `ad51a47` — Reducer verifier passed; hook returns explicit outcomes; 11/11 browser recording tests passed.
- **Task 7 (feedback dialog):** `8a07088` — Shared form semantics, retry support, focus restoration, honest copy; 4/4 feedback e2e tests passed.
- **Task 8 (verification & handoff):** All 11 pure verifiers passed, `npm run lint` clean, 216/216 E2E tests passed, production build clean, 140-image screenshot matrix captured and visually verified.

---

## Remaining Compatibility Adapters

No new temporary adapters were introduced in Phase 4. Existing Phase 2 compatibility adapters remain in place for subsequent phases:

| Adapter | Location | Removal condition |
|---|---|---|
| `cx` (deprecated alias of `cn`) | `src/shared/ui/utils.ts` | Remove once no callers remain |
| `LegacyButtonVariant`/`LegacyButtonSize` | `src/shared/ui/Button.tsx` | Remove once all call sites pass `tone`/typed `size` |
| `fixedHeight`/`scrollable` booleans | `src/shared/ui/AppScreen.tsx` | Remove once all call sites pass typed `height`/`scroll` |
| `onToggle`-shaped legacy call signature | `src/shared/ui/FormControls.tsx` | Remove once callers use `SwitchControl` with `onCheckedChange` |

---

## Risks & Preconditions for Phase 5

- **WebKit smoke coverage environment limitation:** WebKit installation hangs in this sandboxed environment; WebKit smoke testing remains a release gate for Phase 8.
- **Phase 5 Preconditions:**
  1. Codex reviews candidate SHA `8a070889e33869062b6ccbfdc04b608a464816e1` and records acceptance.
  2. Phase 5 (`docs/superpowers/plans/2026-09-14-ui-redesign-phase-5-game-shell-and-word-games.md`) begins strictly from the Codex acceptance-record commit.

---

## Codex Review Record
- **Reviewed Candidate SHA:** `8a070889e33869062b6ccbfdc04b608a464816e1`
- **Result:** Pending Codex acceptance
