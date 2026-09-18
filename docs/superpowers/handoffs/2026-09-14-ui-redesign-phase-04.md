# UI Redesign Phase 4 Handoff Manifest: Parent Experience

## Metadata
- **Phase:** 4 (Parent Experience)
- **Branch:** `feature/full-app-ui-redesign`
- **Base SHA:** `72797238e98a990e455737fc54311037951d5a6a` (Codex acceptance-record commit for Phase 3)
- **Candidate SHA:** `8840128b53fefdd0e96c7f1b34f2b4cc246e64dc` ("fix: keep content rows readable on phones") — the review-remediated product-code commit; this handoff commit and the `ROADMAP.md` update sit on top of it as reporting-only metadata and are not part of the reviewable code candidate.
- **Implementation Status:** Accepted by Codex
- **Working Tree Clean:** Yes (`git status --short` clean before handoff commit)
- **Local Screenshot Artifact Directory:** `artifacts/ui/8840128b53fefdd0e96c7f1b34f2b4cc246e64dc/2026-09-18T02-38-40-236Z-87821` (210 screenshots: 21 scenes across 10 canonical viewports)

---

## Verification Evidence

| Command | Result | Notes |
|---|---|---|
| `npx tsx src/shared/settings/settingsRegistry.verify.ts` | **PASS** | Pure-logic verifier: covers SettingId completeness, registry mapping for all catalogued games, addition dependency notice |
| `npx tsx src/shared/services/settingsService.verify.ts` | **PASS** | Pure-logic verifier: covers settings persistence, fallback on corrupt values, save error detection |
| `npx tsx src/shared/services/appSettingsStore.verify.ts` | **PASS** | Pure-logic verifier: covers font preference round-trip and quota error handling |
| `npx tsx src/content/customContentValidation.verify.ts` | **PASS** | Pure-logic verifier: covers word, syllable, and praise validation, duplicate prevention, and normalization |
| `npx tsx src/content/contentState.verify.ts` | **PASS** | Pure-logic verifier: covers unseeded empty/corrupt migration fallback, v2 content migration, default ID determinism, enabled-state invariants, and last-playable item protection |
| `npx tsx src/shared/services/localContentRepository.verify.ts` | **PASS** | Pure-logic verifier: covers repository CRUD, enable/disable toggling, restorable defaults, and domain guards |
| `npx tsx src/recordings/recordingState.verify.ts` | **PASS** | Pure-logic verifier: covers state transitions (`idle`, `requesting`, `recording`, `processing`, `saved`, `cancelled`, `error`) |
| `npx tsx src/shared/contentRegistry.verify.ts` | **PASS** | Pure-logic verifier: covers answer-audio sequencing contract and locale content integrity |
| `npx tsx src/content/CustomContentScreen.verify.ts` | **PASS** | Pure-logic verifier: covers custom content enabled-state seams |
| `npx tsx src/shared/services/parentAccessLogic.verify.ts` | **PASS** | Pure-logic verifier: covers protected route classification and return path sanitization |
| `npx tsx tools/screenshots/capture.verify.ts` | **PASS** | Tooling verifier: covers screenshot scene registration, args parsing, and help output |
| `npm run lint` (`tsc --noEmit` + ESLint) | **PASS** | 0 errors, 1 pre-existing documented `react-refresh/only-export-components` warning in `ContentContext.tsx` |
| `npm run test:e2e` | **PASS** | 218/218 tests passed across desktop and mobile Chromium projects (~41s), covering all parent routes, safe in-parent not-found state, content management, recordings, feedback, baseline accessibility, and phone row layout legibility |
| `npx playwright test e2e/persistence-compat.spec.ts` | **PASS** | 2/2 tests passed: validates backward compatibility of v1 localStorage and IndexedDB audio overrides |
| `npm run build` | **PASS** | Production build in 875ms; `AvatarScene-CDLptoUB.js` (973.04 kB) remains isolated from main chunk `index-lePDC4MN.js` (248.21 kB) |
| `git diff --check` | **PASS** | No whitespace errors, no trailing spaces, no conflict markers |
| `npm run test:audio` | **Not rerun** | Audio keys and bundled audio assets were not modified |

### Avatar / three.js lazy-chunk confirmation
Inspection of `dist/assets/index-*.js` confirms that `AvatarScene` is never bundled into the main chunk; it is loaded strictly through dynamic `import()` behind `VITE_AVATAR_POC_ENABLED`. The heavy Three.js / R3F dependencies remain isolated in `dist/assets/AvatarScene-CDLptoUB.js` (973.04 kB).

---

## Data Migrations & Storage Compatibility

1. **localStorage**:
   - `hrave-ucenie-settings`: unchanged keys and storage format; validates through typed registry.
   - `hrave-ucenie-app-settings`: unchanged schema (font family preference preserved).
   - `hrave-ucenie-user-words-sk`: migrated transparently to v2 envelope with `enabled: boolean`, deterministic default IDs `default:word:<locale>:<key>`, preserving custom word IDs, metadata, and audio overrides. When input is empty/corrupt and unseeded (e.g. private mode or localStorage disabled), pure migration in memory enables the first ready default without writing during load.
   - `hrave-ucenie-user-praises-sk`: migrated transparently to v2 envelope with `enabled: boolean`, deterministic default IDs `default:praise:<locale>:<key>`. Unseeded empty/corrupt input recovers the first ready default in memory without load writes.
   - **Invariant:** Pure domain guard `canDisableOrDelete` guarantees at least one playable word and praise at all times with message `Aspoň jedna položka musí zostať zapnutá.`.

2. **IndexedDB**:
   - Database: `hrave-ucenie-audio-overrides`, store `overrides`. Audio keys (e.g. `sk/words/custom-custom-1`) remain untouched.
   - Disabling or restoring default content does not touch audio overrides.
   - Deleting a custom item cleans up associated audio overrides only after the domain guard permits deletion.

---

## Screenshot Capture Evidence

Captured against local preview server built with `vite build --mode test`.

Artifact directory:
`artifacts/ui/8840128b53fefdd0e96c7f1b34f2b4cc246e64dc/2026-09-18T02-38-40-236Z-87821`

### Captured Scenes & Viewports (10 canonical viewports each, 210 total):
- **`parent-dashboard`** (`/settings`): `narrowPhone.png`, `smallPhone.png`, `phonePortrait.png`, `shortLandscape.png`, `phoneLandscape.png`, `tabletPortrait.png`, `tabletLandscape.png`, `desktop.png`, `desktopLarge.png`, `desktopWide.png`
- **`parent-games`** (`/settings/games`): same 10 viewports
- **`parent-game-alphabet`** (`/settings/games/ALPHABET`): same 10 viewports
- **`parent-game-addition`** (`/settings/games/ADDITION`): same 10 viewports
- **`parent-game-not-found`** (`/settings/games/not-a-real-game`): same 10 viewports
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
- **`content-disabled-collapsed`** (`/content` words with collapsed disabled disclosure): same 10 viewports
- **`content-disabled-expanded`** (`/content` words with expanded restore controls): same 10 viewports
- **`parent-addition-dependency-notice`** (`/settings/games/ADDITION` with dependency notice visible): same 10 viewports
- **`content-recording-active-scrolled`** (`/content` active recording controls scrolled into view): same 10 viewports
- **`parent-feedback-actions-scrolled`** (`/settings/help` feedback submit action scrolled into view): same 10 viewports
- **`content-editor-actions-scrolled`** (`/content` editor submit action scrolled into view): same 10 viewports

### Visual Inspection Report (320×568, 667×375, and desktop):
- **`/settings` (Parent Dashboard)**: Calm, organized dashboard presenting four primary destinations (`Nastavenia hier`, `Vlastný obsah`, `Aplikácia a vzhľad`, `Pomoc a spätná väzba`). At 320×568, cards stack cleanly; on desktop, cards lay out in responsive multi-column grid with clear touch/click targets.
- **`/settings/games`**: Games overview derives directly from the semantic catalog and shows setting summaries per game. Empty-setting games are cleanly omitted.
- **Game details (`ALPHABET`, `ADDITION`)**: Cleanly render catalogued controls (`SwitchControl`, `RadioGroupControl`). On `ADDITION`, selecting range 20/100 displays the dependency notice `Pri rozsahu 20 alebo 100 sa zobrazenie prepne na čísla.` in an accessible callout. On desktop, renders side-by-side list and detail panel; on mobile, stacks cleanly.
- **Unknown game settings (`/settings/games/not-a-real-game`)**: Renders an accessible in-parent not-found state with description `Nastavenia hry sa nenašli` and actionable, accessible links back to `Prehľad nastavení hier` and `Rodičovská zóna`.
- **`/settings/app`**: Font choice radio group and application appearance controls render with AA contrast.
- **`/settings/help` & Feedback Dialog**: Feedback trigger button opens `DialogShell`. Dialog renders accessible `RadioGroupControl` for categories, `TextAreaControl` with remaining character counter, honest no-reply wording, selectable `mailto:` link, and clear retry button on submission failure. Primary actions are scrollable and reachable even at 320×568 and 667×375.
- **`/content` (Custom Content Manager)**: One responsive capability model across all viewports. Vertical category rail + list + editor on desktop; tab strip + list + modal dialog on compact/mobile. Disabled default items render in a collapsed disclosure (`Vypnuté (N)`) with individual restore and "Obnoviť všetko".
- **Recording Rows**: On compact mobile viewports (320, 360, 390 widths), indicator and full label sit on row 1 with unconstrained width, completely eliminating character-per-line column wrapping for words like "Mama", "Tata", "Kukurica", and "Katastrofa". Status badges and action clusters sit on a deliberate second row with `mr-auto` alignment and hidden phantom slots on compact viewports. On wider/short-landscape/tablet/desktop viewports (667+ width), rows preserve their compact single inline layout. Every interactive button meets 44×44px minimum tap target. Active recording row shows distinct "Zastaviť" and "Zrušiť nahrávanie" buttons with live polite status announcements (`Nahrávam — hovorte do mikrofónu`). While one row records, other record buttons are visibly disabled. On short landscape (667×375), recording controls are cleanly scrolled into view.

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

## Codex Review Remediation Ledger (Candidates `98a662c` & `8840128`)

- **Finding 1 — Unknown `/settings/games/:gameId` safe not-found state:**
  - Replaced silent redirect to `/settings` with an accessible, responsive in-parent not-found state inside `GameSettingsScreen.tsx`.
  - The not-found state renders within `AppScreen`, providing TopBar back navigation and prominent buttons to `Prehľad nastavení hier` (`/settings/games`) and `Rodičovská zóna` (`/settings`).
  - Catalogued games with no settings remain safely handled via redirect to `/settings`.
  - Updated `e2e/parent-settings.spec.ts` and `e2e/parent-access.spec.ts` to assert that unknown game paths keep the URL, render the safe not-found state, and provide functioning return links.
- **Finding 2 — Unseeded `migrateWords`/`migratePraises` zero-playable recovery:**
  - Added pure failing verifier coverage in `src/content/contentState.verify.ts` for empty, null, and corrupt input under `seeded: false` for both words and praises.
  - Updated `migrate` in `src/content/contentState.ts` so that when input yields zero playable items and no ready default exists in `items`, the first locale ready default from `defaults` is added in memory with its deterministic ID (`default:word:<locale>:<key>` or `default:praise:<locale>:<key>`).
  - Sets `repaired: true` while strictly preserving `persistedDuringLoad: false`, custom IDs, and legacy/v2 migration idempotence.
- **Finding 3 — Complete parent screenshot evidence:**
  - Captured a fresh 210-image artifact directory under `artifacts/ui/98a662c505fe64d80d0e5467a0b7f14db03e5cd1/2026-09-18T02-21-58-046Z-84679/`.
  - Preserved all 10 canonical viewports across 21 scenes.
  - In addition to the full parent matrix, visibly captured focused scenes for disabled disclosures, addition dependency notice, active recording scrolled, feedback actions scrolled, and editor actions scrolled.
- **Finding 4 — Custom content recording/list row layout on phones (Candidate `8840128b53fefdd0e96c7f1b34f2b4cc246e64dc`):**
  - Resolved Codex review visual blocker where `RecordingListItem` rows on narrow phones squeezed word labels into single-character-per-line columns.
  - Placed indicator and readable label on the first row with unconstrained width, and moved the status badge/action cluster to a deliberate second row with `mr-auto sm:mr-0` alignment and hidden phantom slots on compact viewports (`< sm`).
  - Preserved the compact inline row layout on wider screens (`sm:` and above), including short landscape (`667x375`), tablet, and desktop viewports.
  - Maintained all 44x44 minimum touch targets, live polite region announcements (`statusText`), Stop and Cancel controls, disabled-row behaviors, and dropdown menu semantics with zero horizontal overflow.
  - Added focused Playwright regression assertion in `e2e/custom-content.spec.ts` covering `narrowPhone`, `smallPhone`, and `phonePortrait`, confirming red failure before fix and green pass after fix.
  - Regenerated the full 210-image parent screenshot matrix under `artifacts/ui/8840128b53fefdd0e96c7f1b34f2b4cc246e64dc/2026-09-18T02-38-40-236Z-87821/` and visually verified normal word-level wrapping across 320, 360, and 390 widths.

---

## Internal Review Ledger

- **Tasks 1–5:** Committed in history (`44ea6cf`..`3b8e7e3`) — settings registry, autosave status, parent dashboard routes, content migration, and universal content editor.
- **Task 6 (recording state machine):** `ad51a47` — Reducer verifier passed; hook returns explicit outcomes; 11/11 browser recording tests passed.
- **Task 7 (feedback dialog):** `8a07088` — Shared form semantics, retry support, focus restoration, honest copy; 4/4 feedback e2e tests passed.
- **Remediation 1 (Codex review findings):** `98a662c` — Safe not-found route state, unseeded zero-playable migration recovery, pure verifiers for words & praises, 217/217 E2E tests clean, 210-image screenshot matrix captured and verified.
- **Remediation 2 (Codex row layout blocker):** `8840128` — Deliberate two-row phone layout in `RecordingListItem.tsx` eliminating character-per-line squishing, 218/218 E2E tests clean, 210-image screenshot matrix captured and verified under `artifacts/ui/8840128b53fefdd0e96c7f1b34f2b4cc246e64dc/2026-09-18T02-38-40-236Z-87821/`.

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
  1. Candidate SHA `8840128b53fefdd0e96c7f1b34f2b4cc246e64dc` is accepted by Codex.
  2. Phase 5 (`docs/superpowers/plans/2026-09-14-ui-redesign-phase-5-shared-game-framework.md`) begins strictly from the Phase 4 Codex acceptance-record commit that updates this manifest.

---

## Codex Review Record
- **Reviewed Candidate SHA:** `8840128b53fefdd0e96c7f1b34f2b4cc246e64dc`
- **Result:** Accepted
- **Accepted:** 2026-09-18
- **Independent evidence:** 218/218 Chromium E2E tests passed; lint completed with 0 errors and the one documented Fast Refresh warning; the production build passed with `AvatarScene` isolated in its lazy chunk; all affected pure verifiers and `git diff --check` passed; the 210-image manual-review matrix was inspected across phone, short-landscape, tablet, and desktop states.
