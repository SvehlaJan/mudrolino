# UI Redesign Phase 4: Parent Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace fragmented parent settings and content management with one protected, catalog-driven, universally responsive dashboard that preserves all existing data and capabilities.

**Architecture:** Protected routes from Phase 1 render host-agnostic parent screens built on Phase 2 primitives and Phase 3 catalog setting IDs. A typed settings registry replaces the Boolean visibility matrix. Custom content migrates legacy arrays to versioned enabled-state envelopes, while pure domain logic guarantees at least one playable word and praise. Recording and feedback expose explicit recoverable state machines.

**Tech Stack:** React 19, React Router 7, TypeScript, Tailwind v4, Radix-backed Phase 2 UI, localStorage, IndexedDB, MediaRecorder/Web Audio, Playwright.

---

## Required context and phase boundary

Start from the Codex-accepted Phase 3 SHA on `feature/full-app-ui-redesign`. Read
`AGENTS.md`, `docs/superpowers/specs/2026-09-14-full-app-ui-redesign-design.md`,
and Phase 1–3 handoff manifests. Reuse the protected route guard,
automation adapter, catalog, setting IDs, UI wrappers, and layout assertions.
Do not change game round logic or audio ordering.

## Phase acceptance contract

This phase produces a candidate SHA, not a self-approved result. After the
handoff commit, stop and submit the exact SHA, verification evidence, and local
screenshot directory to Codex. Phase 5 may begin only after Codex accepts that
SHA. If rejected, remediate inside Phase 4 with the same agent when available,
rerun affected checks and screenshots, and submit a new candidate; Phase 5 must
not absorb the findings. Screenshots remain ignored local manual-review evidence
under `artifacts/ui/<full-git-sha>/<unique-run-id>/` and are never committed or
pixel-diffed.
On approval, Codex records the reviewed candidate SHA and `Accepted` in the
handoff manifest, commits that review, and returns the acceptance commit SHA;
that commit is the only valid Phase 5 base. Any direct dependency addition,
removal, major upgrade, or substitution requires a short fit proposal and Codex
approval before `package.json` or the lockfile changes.

### Task 1: Replace the settings visibility matrix with a typed registry

**Files:**
- Create: `src/shared/settings/settingsRegistry.ts`
- Create: `src/shared/settings/settingsRegistry.verify.ts`
- Modify: `src/shared/services/settingsService.ts`
- Modify: `src/shared/services/settingsService.verify.ts`
- Delete after migration: `src/shared/components/settingsContentData.ts`

- [ ] **Step 1: Write the failing registry verifier**

```ts
import { GAME_DEFINITIONS } from '../gameCatalog';
import { SETTING_IDS } from './settingIds';
import { SETTINGS_REGISTRY, applySettingValue } from './settingsRegistry';
import { DEFAULT_SETTINGS } from '../services/settingsService';

if (Object.keys(SETTINGS_REGISTRY).sort().join() !== SETTING_IDS.slice().sort().join()) {
  throw new Error('Registry must cover every SettingId exactly once');
}
for (const game of GAME_DEFINITIONS) {
  for (const id of game.settings) if (!SETTINGS_REGISTRY[id]) throw new Error(`${game.id}: ${id}`);
}
const changed = applySettingValue(DEFAULT_SETTINGS, 'additionSumRange', 20);
if (changed.settings.additionRepresentation !== 'numerals') throw new Error('Range 20 must force numerals');
if (!changed.notice) throw new Error('Forced dependency needs an explanation');
console.log('✓ settings registry contracts passed');
```

- [ ] **Step 2: Run and confirm failure**

Run: `npx tsx src/shared/settings/settingsRegistry.verify.ts`

Expected: FAIL because the registry does not exist.

- [ ] **Step 3: Implement the registry contract**

```ts
export type SettingValue = boolean | number | string | { start: number; end: number };

export interface SettingOption {
  value: SettingValue;
  label: string;
}

export interface SettingDefinition {
  id: SettingId;
  label: string;
  description: string;
  kind: 'switch' | 'radio';
  options?: readonly SettingOption[];
  read(settings: GameSettings): SettingValue;
  apply(settings: GameSettings, value: SettingValue): SettingApplyResult;
  summarize(settings: GameSettings): string;
}

export interface SettingApplyResult {
  settings: GameSettings;
  notice?: string;
}

```

Write all ten definitions explicitly according to this exhaustive inventory:

| ID | Label | Kind | Allowed values |
|---|---|---|---|
| `alphabetAccents` | Písmená s dĺžňami a mäkčeňmi | switch | `false`, `true` |
| `alphabetGridSize` | Počet kariet | radio | `4`, `6`, `8` |
| `syllablesGridSize` | Počet kariet | radio | `4`, `6` |
| `numbersRange` | Rozsah čísel | radio | `{start:1,end:5}`, `{start:1,end:10}`, `{start:1,end:20}` |
| `countingRange` | Rozsah počítania | radio | `{start:1,end:5}`, `{start:1,end:10}` |
| `completeLetterMissingCount` | Chýbajúce písmená | radio | `1`, `2`, `adaptive` |
| `compareRange` | Rozsah čísel | radio | `{start:1,end:5}`, `{start:1,end:10}` |
| `compareMode` | Zobrazenie | radio | `objects`, `numerals` |
| `additionSumRange` | Rozsah súčtu | radio | `5`, `10`, `20`, `100` |
| `additionRepresentation` | Zobrazenie | radio | `objects`, `numerals` |

Keep the current `GameSettings` storage shape and property names. Each
definition supplies its current Slovak description and option labels from
`SettingsContent.tsx`. Range validators accept only the pairs above, not
arbitrary numeric objects. `additionSumRange` uses the existing dependency logic
and returns `Pri rozsahu 20 alebo 100 sa zobrazenie prepne na čísla.` when it
forces numerals.

- [ ] **Step 4: Make loading validate through registry-owned validators**

Preserve `hrave-ucenie-settings`. Invalid individual values fall back without
discarding valid siblings. Change `saveSettings` to return:

```ts
export type SaveResult = { ok: true } | { ok: false; reason: 'storage-unavailable' };
```

Return failure on quota/private-mode exceptions instead of silently pretending
to save.

- [ ] **Step 5: Run all settings verifiers**

```bash
npx tsx src/shared/settings/settingsRegistry.verify.ts
npx tsx src/shared/services/settingsService.verify.ts
```

Expected: PASS, including all legacy values and the addition dependency.

- [ ] **Step 6: Commit the registry**

```bash
git add src/shared/settings src/shared/services/settingsService.ts src/shared/services/settingsService.verify.ts
git commit -m "refactor: centralize game setting definitions" -m "One typed registry makes settings discoverable from the catalog and removes the sparse per-game visibility matrix."
```

### Task 2: Add automatic-save state without changing persistence keys

**Files:**
- Create: `src/shared/hooks/useAutosaveStatus.ts`
- Modify: `src/shared/services/appSettingsStore.ts`
- Modify: `src/shared/services/appSettingsStore.verify.ts`
- Modify: `src/App.tsx`
- Modify: `src/shared/ui/UiKitScreen.tsx`

- [ ] **Step 1: Extend store verifiers for explicit results**

Test successful round trips and a mocked `localStorage.setItem` exception:

```ts
const failure = saveAppSettings(DEFAULT_APP_SETTINGS, {
  setItem() { throw new DOMException('quota'); },
} as Storage);
if (failure.ok) throw new Error('Storage failure must be observable');
```

Accept an optional storage dependency in pure store functions so verifiers do
not mutate global state.

- [ ] **Step 2: Implement the autosave hook**

```ts
export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function useAutosaveStatus<T>(value: T, save: (value: T) => SaveResult) {
  const [status, setStatus] = useState<AutosaveStatus>('idle');
  useEffect(() => {
    setStatus('saving');
    const result = save(value);
    setStatus(result.ok ? 'saved' : 'error');
    if (!result.ok) return;
    const timer = window.setTimeout(() => setStatus('idle'), 1200);
    return () => window.clearTimeout(timer);
  }, [value, save]);
  return status;
}
```

Use stable `useCallback` save functions in `App.tsx` so the effect does not loop.
Expose saving/saved/error through visible text and a polite live region.

- [ ] **Step 3: Run verifiers and commit**

```bash
npx tsx src/shared/services/settingsService.verify.ts
npx tsx src/shared/services/appSettingsStore.verify.ts
npm run lint
```

Expected: PASS.

```bash
git add src/shared/hooks/useAutosaveStatus.ts src/shared/services/appSettingsStore.ts src/shared/services/appSettingsStore.verify.ts src/App.tsx src/shared/ui/UiKitScreen.tsx
git commit -m "feat: expose automatic save status" -m "Parents need trustworthy persistence feedback without a separate save transaction."
```

### Task 3: Build the protected dashboard and route-backed settings screens

**Files:**
- Create: `src/parent/ParentLayout.tsx`
- Create: `src/parent/ParentDashboardScreen.tsx`
- Create: `src/parent/GameSettingsOverviewScreen.tsx`
- Create: `src/parent/GameSettingsScreen.tsx`
- Create: `src/parent/AppSettingsScreen.tsx`
- Create: `src/parent/HelpFeedbackScreen.tsx`
- Create: `src/parent/SettingsRenderer.tsx`
- Create: `src/parent/SettingField.tsx`
- Modify: `src/App.tsx`
- Modify: `src/shared/components/SettingsContent.tsx`
- Delete after migration: `src/shared/components/SettingsScreen.tsx`
- Delete after migration: `src/shared/components/SettingsOverlay.tsx`
- Delete after migration: `src/shared/components/SettingToggle.tsx`
- Create: `e2e/parent-settings.spec.ts`

- [ ] **Step 1: Write failing route/dashboard tests**

```ts
test('dashboard exposes the four parent destinations', async ({ page }) => {
  await page.goto('/settings');
  await unlockParentGate(page);
  await expect(page.getByRole('heading', { name: 'Rodičovská zóna' })).toBeVisible();
  for (const name of ['Nastavenia hier', 'Vlastný obsah', 'Aplikácia a vzhľad', 'Pomoc a spätná väzba']) {
    await expect(page.getByRole('link', { name: new RegExp(name) })).toBeVisible();
  }
});

test('game detail renders only catalogued settings', async ({ page }) => {
  await page.goto('/settings/games/ALPHABET');
  await unlockParentGate(page);
  await expect(page.getByRole('switch', { name: /Diakritika/ })).toBeVisible();
  await expect(page.getByRole('radiogroup', { name: /Počet možností/ })).toBeVisible();
  await expect(page.getByText(/Rozsah súčtu/)).toHaveCount(0);
});
```

Add unknown ID, return-to-lobby, immediate update, dependency notice, save error,
reload persistence, 320px stacked layout, 667×375 short layout, and wide
list/detail layout cases.

- [ ] **Step 2: Implement host-agnostic setting rendering**

```tsx
interface SettingsRendererProps {
  gameId: GameId;
  settings: GameSettings;
  onUpdate(next: GameSettings, notice?: string): void;
}

export function SettingsRenderer({ gameId, settings, onUpdate }: SettingsRendererProps) {
  const definition = getGameDefinition(gameId);
  return definition.settings.map(id => (
    <SettingField
      key={id}
      definition={SETTINGS_REGISTRY[id]}
      value={SETTINGS_REGISTRY[id].read(settings)}
      onValueChange={value => {
        const result = applySettingValue(settings, id, value);
        onUpdate(result.settings, result.notice);
      }}
    />
  ));
}
```

Split repeated setting headers/rows from the old `SettingsContent`; no new
monolith may own every branch. `SettingField.tsx` switches only on
`definition.kind`: render the Phase 2 `SwitchControl` for `switch`, and a
labelled `RadioGroupControl` from `definition.options` for `radio`. It owns the
label, description, dependency notice slot, and disabled-option semantics; it
does not know game IDs or storage.

- [ ] **Step 3: Replace Phase 1 redirects with final protected routes**

```tsx
<Route element={<ProtectedParentRoute />}>
  <Route element={<ParentLayout />}>
    <Route path="/settings" element={<ParentDashboardScreen />} />
    <Route path="/settings/games" element={<GameSettingsOverviewScreen />} />
    <Route path="/settings/games/:gameId" element={<GameSettingsScreen />} />
    <Route path="/settings/app" element={<AppSettingsScreen />} />
    <Route path="/settings/help" element={<HelpFeedbackScreen />} />
    <Route path="/content" element={<CustomContentScreen />} />
    <Route path="/recordings" element={<Navigate to="/content" replace />} />
  </Route>
</Route>
```

`ParentLayout` reads a validated catalogued `returnTo` from router state. Its
close/back action locks parent access and uses replacement navigation to the
lobby or `/`.

- [ ] **Step 4: Build the calm responsive dashboard**

Use Phase 2 surfaces, rows, radios, switches, and page headers. Show concise
current-value summaries. The games overview derives from the Phase 3 catalog and
omits the three games with empty setting arrays.

- [ ] **Step 5: Run focused parent tests**

Run: `npm run build:e2e && npx playwright test --config=e2e/playwright.config.ts e2e/parent-settings.spec.ts e2e/parent-access.spec.ts`

Expected: PASS across configured desktop/mobile projects.

- [ ] **Step 6: Remove replaced components and commit**

Run `rg "SettingsOverlay|settingsContentData|SettingToggle" src` and remove only
files with no remaining legitimate imports.

```bash
git add src/App.tsx src/parent src/shared/components src/shared/ui/UiKitScreen.tsx e2e/parent-settings.spec.ts
git commit -m "feat: unify parent settings routes" -m "A protected dashboard and catalog-driven details replace fragmented overlays and empty settings paths."
```

### Task 4: Migrate custom content to stable enabled-state storage

**Files:**
- Modify: `src/shared/types.ts`
- Create: `src/content/contentState.ts`
- Create: `src/content/contentState.verify.ts`
- Modify: `src/shared/services/contentRepository.ts`
- Modify: `src/shared/services/localContentRepository.ts`
- Create: `src/shared/services/localContentRepository.verify.ts`
- Modify: `src/shared/contexts/ContentContext.tsx`

- [ ] **Step 1: Write the failing migration/invariant verifier**

```ts
const defaults: UserWord[] = [
  { id: 'legacy-auto', word: 'Auto', syllables: 'au-to', emoji: '🚗', audioKey: 'auto', status: 'ready', isDefault: true, locale: 'sk', order: 0 },
  { id: 'legacy-dom', word: 'Dom', syllables: 'dom', emoji: '🏠', audioKey: 'dom', status: 'ready', isDefault: true, locale: 'sk', order: 1 },
];
const legacyWords = [defaults[0]];
const migrated = migrateWords({ raw: legacyWords, defaults, locale: 'sk', seeded: true });
const missingDefault = migrated.items.find(item => item.audioKey === 'dom');
if (!missingDefault || missingDefault.enabled) throw new Error('Missing legacy default must migrate disabled');
if (migrated.persistedDuringLoad) throw new Error('Load migration must not write');

const onlyOne = migrated.items.filter(item => item.enabled && item.status === 'ready').slice(0, 1);
if (canDisableOrDelete(onlyOne, onlyOne[0].id)) throw new Error('Last playable item must be protected');
console.log('✓ content migration and availability passed');
```

Cover present defaults, missing/hidden defaults, custom entries, duplicate
default audio keys, corrupt JSON, zero playable items, restore one/all, and audio
key preservation.

- [ ] **Step 2: Define versioned storage and deterministic IDs**

```ts
export interface ContentEnvelopeV2<T> {
  version: 2;
  items: T[];
}

export function defaultWordId(locale: string, audioKey: string) {
  return `default:word:${locale}:${audioKey}`;
}

export function defaultPraiseId(locale: string, audioKey: string) {
  return `default:praise:${locale}:${audioKey}`;
}
```

Add required `enabled: boolean` to `UserWord` and `UserPraise`. Playable content
is `enabled && status === 'ready'`.

- [ ] **Step 3: Implement pure migration before repository writes**

Read both legacy arrays and v2 envelopes. For seeded legacy data, match defaults
by `audioKey`: present defaults become enabled with deterministic IDs; missing
defaults are reintroduced disabled; custom IDs/fields/order remain unchanged.
Do not touch IndexedDB audio keys. If input yields no playable item, enable the
first locale default in the returned in-memory value and set a `repaired` flag,
but do not write during load.

- [ ] **Step 4: Replace hide/remove with enable-state mutations**

```ts
setDefaultWordEnabled(id: string, enabled: boolean): Promise<void>;
setDefaultPraiseEnabled(id: string, enabled: boolean): Promise<void>;
restoreAllDefaultWords(): Promise<void>;
restoreAllDefaultPraises(): Promise<void>;
```

Repository mutations must reject disabling or deleting the last playable item,
even when called outside React. Use one exported domain guard with the Slovak
message `Aspoň jedna položka musí zostať zapnutá.`

- [ ] **Step 5: Update `ContentContext`**

Expose full enabled/disabled management lists and filter child `wordItems`,
`syllableItems`, and `praiseEntries` to enabled ready rows. Disable/restore must
not delete custom audio overrides. Deleting a custom item keeps existing audio
cleanup only after the domain guard permits deletion.

- [ ] **Step 6: Run pure verifiers and commit**

```bash
npx tsx src/content/contentState.verify.ts
npx tsx src/shared/services/localContentRepository.verify.ts
npx tsx src/shared/contentRegistry.verify.ts
npm run lint
```

Expected: PASS.

```bash
git add src/shared/types.ts src/content/contentState.ts src/content/contentState.verify.ts src/shared/services/contentRepository.ts src/shared/services/localContentRepository.ts src/shared/services/localContentRepository.verify.ts src/shared/contexts/ContentContext.tsx
git commit -m "feat: preserve disabled default content" -m "Versioned enabled-state storage makes defaults restorable and guarantees games always retain a playable word and praise."
```

### Task 5: Rebuild custom-content UI with universal capabilities

**Files:**
- Create: `src/content/ContentCategoryNav.tsx`
- Create: `src/content/ContentItemList.tsx`
- Create: `src/content/WordEditor.tsx`
- Create: `src/content/PraiseEditor.tsx`
- Modify: `src/content/CustomContentScreen.tsx`
- Modify: `src/content/customContentValidation.ts`
- Modify: `src/content/customContentValidation.verify.ts`
- Create: `e2e/custom-content.spec.ts`

- [ ] **Step 1: Write failing content-management tests**

Test all five categories, accessible selected state, counts, visible narrow
overflow cue, search, add, edit, validation, individual disable/restore,
restore-all, collapsed disabled section, last-item explanation, custom deletion
guard, confirmation, and Undo.

```ts
test('disabled defaults remain collapsed and restorable', async ({ page }) => {
  await page.goto('/content');
  await unlockParentGate(page);
  await page.getByRole('tab', { name: /Slová/ }).click();
  await page.getByRole('button', { name: /Ďalšie možnosti/ }).first().click();
  await page.getByRole('menuitem', { name: 'Vypnúť' }).click();
  const disabled = page.getByRole('button', { name: /Vypnuté \(1\)/ });
  await expect(disabled).toBeVisible();
  await disabled.click();
  await expect(page.getByRole('button', { name: 'Obnoviť' })).toBeVisible();
});
```

- [ ] **Step 2: Split the current monolith by responsibility**

`CustomContentScreen` owns route-level state and layout. Category navigation,
list/disabled section, word editor, and praise editor are focused components.
Use Phase 2 Tabs, Field, Dialog, Menu, AlertDialog, Button, and status patterns.

- [ ] **Step 3: Implement one universal responsive composition**

Use CSS grid/container queries:

- spacious: category rail + list + editor;
- medium: category rail/list + focused editor dialog;
- compact/short: stacked categories/list and full-screen editor dialog.

All actions and information are present in every mode. Editing opens adjacent to
the selected item or in the focused dialog; never append a form after a long list.

- [ ] **Step 4: Implement the disabled section exactly**

Enabled rows render first. Disabled defaults render at the bottom inside a
collapsed disclosure labelled `Vypnuté (N)`, using readable muted styling. Each
row has **Obnoviť** and the section has **Obnoviť všetko** when `N > 1`.

- [ ] **Step 5: Fix form semantics**

Use persistent labels, linked help/errors, `aria-invalid`, native `<form>`, Enter
submission, and an error summary focused only after failed submit. Preserve
existing normalization and duplicate rules.

- [ ] **Step 6: Run focused tests and commit**

Run: `npm run build:e2e && npx playwright test --config=e2e/playwright.config.ts e2e/custom-content.spec.ts`

Expected: PASS at 320×568, 667×375, tablet, and desktop projects.

```bash
git add src/content e2e/custom-content.spec.ts src/shared/ui/UiKitScreen.tsx
git commit -m "feat: rebuild universal custom content editor" -m "One responsive capability model makes editing, disabling, and restoration safe on phones and desktops alike."
```

### Task 6: Make recording an explicit recoverable state machine

**Files:**
- Create: `src/recordings/recordingState.ts`
- Create: `src/recordings/recordingState.verify.ts`
- Modify: `src/shared/hooks/useRecorder.ts`
- Modify: `src/recordings/RecordingListItem.tsx`
- Create: `e2e/support/fakeRecorder.ts`
- Create: `e2e/recordings.spec.ts`

- [ ] **Step 1: Write the failing reducer verifier**

Cover:

```text
idle → requesting → recording → processing → saved → idle
idle → requesting → error → idle
recording → cancelled → idle
processing → error → idle
```

Assert Stop resolves a non-empty WAV Blob, Cancel resolves no Blob, inactive row
actions are disabled, and stale recorder events cannot update a new row.

- [ ] **Step 2: Implement the hook API**

```ts
export type RecorderState =
  | 'idle'
  | 'requesting'
  | 'recording'
  | 'processing'
  | 'saved'
  | 'cancelled'
  | 'error';

export interface UseRecorderResult {
  state: RecorderState;
  level: number;
  speaking: boolean;
  error: 'permission-denied' | 'unavailable' | 'processing-failed' | null;
  start(): Promise<void>;
  stop(): Promise<Blob>;
  cancel(): void;
  reset(): void;
}
```

Do not return an externally polled `blobPromise`. Stop and cancel are distinct;
both stop tracks, animation frames, AudioContext, timers, and MediaRecorder.

- [ ] **Step 3: Rebuild recording rows**

Every button is at least 44×44. Status text uses a polite live region. While one
row records, other record actions are visibly disabled. Show distinct **Zastaviť**
and **Zrušiť nahrávanie** actions. Permission errors provide recovery copy.

- [ ] **Step 4: Add deterministic browser coverage**

The fake recorder supports permission success, denial, non-empty recording, and
processing failure. Test start, Stop-save, Cancel-discard, replace, play, delete,
confirmation, and recovery.

- [ ] **Step 5: Run and commit**

```bash
npx tsx src/recordings/recordingState.verify.ts
npm run build:e2e
npx playwright test --config=e2e/playwright.config.ts e2e/recordings.spec.ts
```

Expected: PASS.

```bash
git add src/recordings src/shared/hooks/useRecorder.ts e2e/support/fakeRecorder.ts e2e/recordings.spec.ts
git commit -m "fix: make recording outcomes explicit" -m "Separate save, cancel, permission, and processing states prevent destructive or silent microphone behavior."
```

### Task 7: Rebuild feedback on shared form/dialog behavior

**Files:**
- Modify: `src/shared/components/FeedbackModal.tsx`
- Modify: `src/shared/services/feedbackService.ts`
- Modify: `src/parent/HelpFeedbackScreen.tsx`
- Create: `e2e/feedback.spec.ts`

- [ ] **Step 1: Write failing feedback tests**

Cover keyboard category selection, optional message, loading, mocked success,
mocked server failure, retry, Escape/focus restore, no automatic close, accurate
no-reply wording, and a selectable `mailto:` support link.

- [ ] **Step 2: Migrate to Phase 2 wrappers**

Use Dialog, RadioGroup, Field, Button, and live status. Remove manual Escape and
focus code. Success remains visible until the parent closes or continues.

- [ ] **Step 3: Correct reply expectations**

The current payload has no reply address. Copy must not promise a response within
48 hours. Keep metadata collection and Web3Forms integration unchanged.

- [ ] **Step 4: Run and commit**

Run: `npm run build:e2e && npx playwright test --config=e2e/playwright.config.ts e2e/feedback.spec.ts`

Expected: PASS.

```bash
git add src/shared/components/FeedbackModal.tsx src/shared/services/feedbackService.ts src/parent/HelpFeedbackScreen.tsx e2e/feedback.spec.ts
git commit -m "fix: make feedback status accessible" -m "Shared form semantics and honest completion copy make submission outcomes understandable and recoverable."
```

### Task 8: Complete Phase 4 verification and handoff

**Files:**
- Create: `docs/superpowers/handoffs/2026-09-14-ui-redesign-phase-04.md`
- Modify: `ROADMAP.md`

- [ ] **Step 1: Run pure and browser checks**

```bash
npx tsx src/shared/settings/settingsRegistry.verify.ts
npx tsx src/shared/services/settingsService.verify.ts
npx tsx src/shared/services/appSettingsStore.verify.ts
npx tsx src/content/customContentValidation.verify.ts
npx tsx src/content/contentState.verify.ts
npx tsx src/shared/services/localContentRepository.verify.ts
npx tsx src/recordings/recordingState.verify.ts
npm run lint
npm run test:e2e
npm run build
git diff --check
```

Expected: PASS. Run `npm run test:audio` only if an audio key or asset changed.

- [ ] **Step 2: Run parent screenshot review**

Capture `/settings`, `/settings/games`, representative one- and two-setting game
details, `/settings/app`, `/settings/help`, and every `/content` category across
the canonical parent matrix. Inspect desktop panes, mobile full-screen editors,
short landscape, disabled rows, recording states, and dialogs. Preserve the
printed local `artifacts/ui/<full-git-sha>/<unique-run-id>/` path and record it in the
handoff.

- [ ] **Step 3: Verify storage compatibility explicitly**

Run the Phase 1 persistence fixture suite and confirm localStorage keys plus the
IndexedDB database/store/audio keys are unchanged except for the documented v2
word/praise envelopes.

- [ ] **Step 4: Update roadmap, write manifest, commit, and stop**

Mark Phase 4 implementation complete but pending Codex acceptance. Record exact
SHAs, clean status, migrations, commands/outcomes, local screenshots, internal
reviewer result, risks, and Phase 5 preconditions.

```bash
git add ROADMAP.md docs/superpowers/handoffs/2026-09-14-ui-redesign-phase-04.md
git commit -m "docs: hand off UI redesign phase four" -m "Verified parent routes and data migrations give game-shell work a stable settings and pause contract."
```

Do not begin Phase 5. Submit the exact candidate SHA and evidence to Codex and
follow the acceptance contract above.
