# Parent Flow UX Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve five parent UI annotations by focusing settings pages, simplifying the arithmetic gate, showing feedback directly, and spacing recording controls.

**Architecture:** Keep the protected routes and existing settings, audio, and feedback services. Change presentation within their route components. The only component move is the single-consumer feedback form from a dialog into the help route. Update screenshot scene selectors with the route changes.

**Tech Stack:** React 19, TypeScript, Tailwind v4, Radix UI, Vite, Playwright.

**Approved design:** `docs/superpowers/specs/2026-09-29-parent-flow-ux-cleanup-design.md`.

**Repository rules:** Work on `feature/full-app-ui-redesign`, never `main`. `AGENTS.md` requires lint; pure verifiers only for touched pure-logic modules; full E2E for routing or app-shell changes. Browser launch may require an unsandboxed rerun per `.agents/skills/playwright-browser-verification/SKILL.md`. Do not inspect full-resolution screenshots; generate reduced-size copies. Commit each completed task with `type: imperative summary` and a why-focused body. Do not open a PR.

## File map

| Unit | Files | Responsibility |
| --- | --- | --- |
| Settings navigation | `src/parent/GameSettingsOverviewScreen.tsx`, `src/parent/GameSettingsScreen.tsx`, `e2e/parent-settings.spec.ts` | List games on the overview; show one game's settings and preserve Back behavior on the detail route. |
| Parent gate | `src/shared/components/ParentsGate.tsx`, `e2e/parent-access.spec.ts` | Render one arithmetic expression with a live answer slot; retain input and security behavior. |
| Feedback | `src/parent/HelpFeedbackScreen.tsx`, new `src/parent/FeedbackForm.tsx`, delete `src/shared/components/FeedbackModal.tsx`, `e2e/feedback.spec.ts`, `e2e/release-accessibility.spec.ts`, `e2e/ui-foundation.spec.ts` | Render the existing feedback service flow inline with one main landmark. |
| Recording rows | `src/recordings/RecordingListItem.tsx`, `e2e/custom-content.spec.ts` | Size and space the action cluster without changing recording behavior. |
| Capture and release notes | `tools/screenshots/capture.mjs`, `ROADMAP.md` | Keep scene setup current and record completion. |

## Task 1: Focus the game settings overview and detail

**Files:** Modify `e2e/parent-settings.spec.ts`, `src/parent/GameSettingsOverviewScreen.tsx`, `src/parent/GameSettingsScreen.tsx`, `tools/screenshots/capture.mjs`.

- [ ] **Step 1: Write the failing route assertions.** Add to the existing overview and detail tests in `e2e/parent-settings.spec.ts`:

```ts
// In "games overview lists only games with catalogued settings", after unlock:
await expect(page.getByRole('heading', { level: 1, name: 'Nastavenia hier' })).toBeVisible();
await expect(page.getByText('Vyberte hru zo zoznamu a upravte jej nastavenia.')).toHaveCount(0);

test('selected game is the detail heading without a second game list', async ({ page }) => {
  await page.goto('/settings/games/COMPLETE_LETTER');
  await unlockParentGate(page);
  await expect(page.getByRole('heading', { level: 1, name: 'Doplň písmeno' })).toBeVisible();
  await expect(page.getByText('Nastavenia hry', { exact: true })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Nastavenia hier' })).toHaveCount(0);
});
```

- [ ] **Step 2: Confirm the new assertions fail.** Run `npm run test:e2e -- e2e/parent-settings.spec.ts`; expect failures on the new H1 and absent-content assertions. Browser launch failures are environment failures; rerun outside the sandbox before changing app code.

- [ ] **Step 3: Update the overview.** Keep `GameSettingsList` as the overview list, remove its `selectedId` prop and selection styles, and render the list directly below the new heading:

```tsx
<AppScreen mode="parent" height="content" scroll="vertical" maxWidth="wide">
  <TopBar left={<BackButton onClick={() => navigate('/settings')} />} />
  <PageHeader title="Nastavenia hier" />
  <div className="mt-5 sm:mt-6">
    <GameSettingsList settings={settings} />
  </div>
</AppScreen>
```

`GameSettingsListProps` becomes `{ settings: GameSettings }`; remove `GameId`, `selected`, `aria-current`, and the selected ring from that file. Keep the catalog ordering, summaries, links, and focus styling.

- [ ] **Step 4: Update the detail.** Add `getUiCopy` and `useContentLocale` imports, call `const locale = useContentLocale()` before conditional returns, keep `handleBack` and the unknown-ID branch, and replace only the known-game return with:

```tsx
<AppScreen mode="parent" height="content" scroll="vertical" maxWidth="narrow">
  <TopBar left={<BackButton onClick={handleBack} />} />
  <div data-testid="game-settings-detail">
    <p className="text-sm font-bold text-text-muted">Nastavenia hry</p>
    <PageHeader
      title={getUiCopy(locale, definition.titleKey)}
      description={getSettingsSubtitle(definition.id)}
      className="mt-1"
    />
    {notice && (
      <p role="status" aria-live="polite" data-testid="setting-dependency-notice"
        className="mt-3 rounded-2xl bg-accent-blue/15 px-4 py-3 text-sm font-bold text-text-main">
        {notice}
      </p>
    )}
    <div className="mt-5 sm:mt-6">
      <SettingsRenderer gameId={definition.id} settings={settings}
        onUpdate={(next, noticeText) => {
          onUpdate(next);
          setNotice(noticeText ?? null);
        }} />
    </div>
  </div>
</AppScreen>
```

- [ ] **Step 5: Update capture setup and verify.** In the `game-settings` scene of `tools/screenshots/capture.mjs`, wait for H1 `Nastavenia hier` instead of `Rodičovská zóna`. The existing `game-settings-alphabet` and `game-settings-counting` scenes continue to use `game-settings-detail`. Run `npm run test:e2e -- e2e/parent-settings.spec.ts` and `npm run lint`; expect pass apart from the documented react-refresh warning.

- [ ] **Step 6: Commit.** `git add src/parent/GameSettingsOverviewScreen.tsx src/parent/GameSettingsScreen.tsx e2e/parent-settings.spec.ts tools/screenshots/capture.mjs && git commit -m 'fix: focus game settings pages' -m 'A second game list and an empty desktop panel repeated the selection step and hid the selected game name.'`

## Task 2: Simplify the parent gate expression

**Files:** Modify `e2e/parent-access.spec.ts`, `src/shared/components/ParentsGate.tsx`.

- [ ] **Step 1: Add a structural assertion to the existing viewport test.** After finding `gate`:

```ts
const expression = gate.getByTestId('parent-gate-equation');
await expect(expression.getByRole('status', { name: 'Vaša odpoveď' })).toHaveCount(1);
await expect(expression).toBeInViewport({ ratio: 1 });
await expect(expression.getByRole('status', { name: 'Vaša odpoveď' })).toBeInViewport({ ratio: 1 });
```

Also add a normal interaction check: click the digit `7`, then assert `expression.getByRole('status', { name: 'Vaša odpoveď' })` contains `7`. Reset or isolate this test so it does not change the existing unlock assertions.

- [ ] **Step 2: Confirm red.** Run `npm run test:e2e -- e2e/parent-access.spec.ts --grep 'challenge, answer, keypad, and exit fit'`; expect the nested status assertion to fail.

- [ ] **Step 3: Replace the gate's left column.** Keep its outer responsive grid, keypad, header action, handlers, and error timer. Replace the left `<div>` children with one expression card containing an answer slot:

```tsx
<div className="flex w-full flex-col gap-2">
  <Card variant="panel" data-testid="parent-gate-equation"
    className={`flex min-h-28 w-full flex-wrap items-center justify-center gap-2 px-4 py-4 text-3xl font-black tabular-nums text-text-main landscape:min-h-24 landscape:py-3 sm:portrait:text-4xl ${error && !prefersReducedMotion ? 'animate-shake' : ''}`}>
    <span aria-hidden="true">{question.a} {question.op} {question.b} =</span>
    <span role="status" aria-label="Vaša odpoveď" aria-live="polite"
      className="flex min-h-14 min-w-16 items-center justify-center rounded-2xl border-2 border-border-subtle bg-surface-muted/50 px-3 text-2xl text-text-main sm:portrait:text-3xl">
      {input || <span className="text-text-muted/50">—</span>}
    </span>
  </Card>
  {error && <p role="alert" className="text-xs font-bold text-action-danger sm:portrait:text-sm">Skús to ešte raz</p>}
</div>
```

The arithmetic expression must remain accessible: because the first span is `aria-hidden`, insert `<span className="sr-only">{question.a} {question.op} {question.b} rovná sa</span>` before the live answer slot. If line wrapping makes the short landscape test fail, tighten card padding while preserving the 44 px keypad buttons.

- [ ] **Step 4: Verify and commit.** Run the focused viewport test, then all `e2e/parent-access.spec.ts` (desktop and mobile projects), and lint. Commit with `fix: simplify parent gate expression` and a body explaining that two separate cards made the question and entered answer look disconnected.

## Task 3: Render feedback directly on its route

**Files:** Create `src/parent/FeedbackForm.tsx`; modify `src/parent/HelpFeedbackScreen.tsx`, `e2e/feedback.spec.ts`, `e2e/release-accessibility.spec.ts`, `e2e/ui-foundation.spec.ts`, `tools/screenshots/capture.mjs`; delete `src/shared/components/FeedbackModal.tsx`.

- [ ] **Step 1: Rewrite browser expectations for the inline route.** Change `openFeedback(page)` in `e2e/feedback.spec.ts` to navigate, unlock, and assert `page.getByRole('form', { name: 'Spätná väzba' })` is visible; remove the opener click and dialog assertion. Replace the modal-close test with a test that `/settings/help` has exactly one `<main>`, no dialog or support email, and that Back returns to `/settings`. Keep category validation, loading, success, error/retry, and keyboard radio selection assertions, but treat the success state as an inline confirmation. For short viewports assert the submit button is fully in view before and after scrolling the fields. In `e2e/release-accessibility.spec.ts`, run axe and keyboard radio checks against the form directly; remove modal Escape/focus assertions. In `e2e/ui-foundation.spec.ts`, replace the feedback modal landmark test with the inline one-main/no-dialog assertion.

```ts
async function openFeedback(page: Page) {
  await page.goto('/settings/help');
  await unlockParentGate(page);
  await expect(page.getByRole('heading', { level: 1, name: 'Pomoc a spätná väzba' })).toBeVisible();
  await expect(page.getByRole('form', { name: 'Spätná väzba' })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}

test('inline feedback is the only help content and Back returns to settings', async ({ page }) => {
  await openFeedback(page);
  await expect(page.getByRole('main')).toHaveCount(1);
  await expect(page.getByRole('link', { name: /jan\.svehla@pm\.me/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Späť' }).click();
  await expect(page).toHaveURL(/\/settings$/);
});

```

- [ ] **Step 2: Confirm red.** Run `npm run test:e2e -- e2e/feedback.spec.ts e2e/release-accessibility.spec.ts e2e/ui-foundation.spec.ts`; expect the new inline-form assertions to fail.

- [ ] **Step 3: Move the form, preserving behavior.** Delete the old modal and create `src/parent/FeedbackForm.tsx` with this complete route-owned component. It keeps the same service payload, category rules, character limit, loading, success, and retry behavior while removing the email link and modal close action.

```tsx
import React, { useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { type FeedbackCategory, type FeedbackPayload, submitFeedback } from '../shared/services/feedbackService';
import { Button, Field, RadioGroupControl, TextAreaControl } from '../shared/ui';

type FormState = 'idle' | 'submitting' | 'success' | 'error';
const MAX_LENGTH = 1000;
const COUNTER_THRESHOLD = 100;
const CATEGORIES: { value: FeedbackCategory; label: string; emoji: string }[] = [
  { value: 'bug', label: 'Chyba v hre', emoji: '🐛' },
  { value: 'suggestion', label: 'Nápad / návrh', emoji: '💡' },
  { value: 'praise', label: 'Pochvala', emoji: '⭐' },
  { value: 'other', label: 'Iné', emoji: '💬' },
];

export function FeedbackForm({ screen }: { screen: string }) {
  const [category, setCategory] = useState<FeedbackCategory | null>(null);
  const [message, setMessage] = useState('');
  const [formState, setFormState] = useState<FormState>('idle');
  const remaining = MAX_LENGTH - message.length;
  const messageRequired = category === 'bug' || category === 'suggestion';
  const hasUsefulMessage = message.trim().length > 0;
  const canSubmit = category !== null && (!messageRequired || hasUsefulMessage)
    && (formState === 'idle' || formState === 'error');

  async function handleSubmit() {
    if (!canSubmit || !category) return;
    setFormState('submitting');
    try {
      const payload: FeedbackPayload = { category, message, screen };
      await submitFeedback(payload);
      setFormState('success');
    } catch {
      setFormState('error');
    }
  }

  return formState === 'success' ? (
    <section role="status" className="mt-5 rounded-3xl bg-surface p-6 text-center">
      <h2 className="text-2xl font-bold text-text-main">Ďakujeme!</h2>
      <p className="mt-2 text-base text-text-muted">Ďakujeme za spätnú väzbu. Tento formulár neposiela e-mailovú adresu a nemôžeme odpovedať priamo.</p>
    </section>
  ) : (
    <form aria-label="Spätná väzba" className="mt-5 flex min-h-0 flex-1 flex-col rounded-3xl bg-surface p-5"
      onSubmit={event => { event.preventDefault(); void handleSubmit(); }}>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-3">
        <p className="text-sm text-text-muted">Formulár neposiela e-mailovú adresu, preto nemôžeme odpovedať priamo.</p>
        <Field label="Typ správy" helpText="Vyberte, čo chcete nahlásiť.">
          {() => (
            <RadioGroupControl<FeedbackCategory>
              ariaLabel="Typ správy"
              options={CATEGORIES.map(({ value, label, emoji }) => ({ value, label: `${emoji} ${label}` }))}
              value={category ?? ('' as FeedbackCategory)}
              onValueChange={setCategory}
              disabled={formState === 'submitting'}
              columns={2}
            />
          )}
        </Field>
        <Field label="Vaša správa"
          helpText={messageRequired ? 'Povinné pri chybe alebo návrhu.' : 'Voliteľné.'}
          required={messageRequired}>
          {controlProps => (
            <TextAreaControl {...controlProps} aria-label="Vaša správa"
              aria-required={messageRequired} value={message}
              onChange={event => setMessage(event.target.value.slice(0, MAX_LENGTH))}
              disabled={formState === 'submitting'}
              placeholder="Opíšte čo sa stalo, čo vám chýba, alebo čo by ste chceli vylepšiť…"
              rows={3} />
          )}
        </Field>
        <div className="flex items-center justify-between text-sm font-medium text-text-muted">
          <span aria-live="polite">{messageRequired && !hasUsefulMessage ? 'Napíšte správu pred odoslaním.' : ''}</span>
          {remaining < COUNTER_THRESHOLD && (
            <span className={remaining <= 20 ? 'text-action-danger' : ''}>{remaining}</span>
          )}
        </div>
      </div>
      <div className="sticky bottom-0 z-10 shrink-0 border-t border-border-subtle bg-surface pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button type="submit" tone="primary" size="parent" fullWidth disabled={!canSubmit}
          icon={formState === 'submitting' ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}>
          {formState === 'submitting' ? 'Odosielam…' : 'Odoslať'}
        </Button>
        {formState === 'error' && <p role="alert" className="text-center text-sm font-bold text-action-danger">Odosielanie zlyhalo. Skúste znova.</p>}
      </div>
    </form>
  );
}
```

- [ ] **Step 4: Make the route own the form.** Replace `HelpFeedbackScreen` contents with the route heading and `FeedbackForm`. Keep Back to `/settings`:

```tsx
export function HelpFeedbackScreen() {
  const navigate = useNavigate();
  return (
    <AppScreen mode="parent" height="viewport" scroll="vertical" maxWidth="narrow">
      <TopBar left={<BackButton onClick={() => navigate('/settings')} />} />
      <PageHeader title="Pomoc a spätná väzba" />
      <FeedbackForm screen="help" />
    </AppScreen>
  );
}
```

- [ ] **Step 5: Update all capture scenes.** In `tools/screenshots/capture.mjs`, the `parent-feedback` scene and `openFeedback` helper must wait for the form rather than click the removed opener or wait for a dialog. In the helper, select `Chyba v hre`, fill `Vaša správa` with `Testovací opis chyby.`, then submit so both success and failure scenes still reach their intended state. `parent-help` should wait for the new H1. Run `npx tsx tools/screenshots/capture.verify.ts`, the three targeted E2E files from Step 2, and lint; expect pass.

- [ ] **Step 6: Commit.** Stage the new form, deleted modal, route, tests, and capture script; commit `fix: show feedback form on help page` with a why-focused body.

## Task 4: Space custom-content recording actions

**Files:** Modify `e2e/custom-content.spec.ts`, `src/recordings/RecordingListItem.tsx`.

- [ ] **Step 1: Add a geometry assertion.** In the existing narrow-phone row test, after finding `playBtn`, `recordBtn`, and `menuBtn`, compare adjacent bounding boxes. Add the same check for the letters tab at desktop width (the annotated route). Require a 12 px gap between visible button boxes and no horizontal overflow:

```ts
for (const [left, right] of [[playBtn, recordBtn], [recordBtn, menuBtn]] as const) {
  const a = await left.boundingBox();
  const b = await right.boundingBox();
  expect(a).not.toBeNull();
  expect(b).not.toBeNull();
  expect(b!.x - (a!.x + a!.width)).toBeGreaterThanOrEqual(12);
}
await expectNoHorizontalOverflow(page);

test('desktop letter-row actions have separate 44px targets', async ({ page }) => {
  await page.setViewportSize(CANONICAL_VIEWPORTS.desktop);
  await openContent(page);
  const row = page.getByText(/^A — Auto/).locator('xpath=ancestor::div[contains(@class, "rounded-2xl")]').first();
  const play = row.getByRole('button', { name: 'Prehrať' });
  const record = row.getByRole('button', { name: 'Nahrať' });
  const a = await play.boundingBox();
  const b = await record.boundingBox();
  expect(a).not.toBeNull();
  expect(b).not.toBeNull();
  expect(a!.width).toBeGreaterThanOrEqual(44);
  expect(b!.width).toBeGreaterThanOrEqual(44);
  expect(b!.x - (a!.x + a!.width)).toBeGreaterThanOrEqual(12);
  await expectNoHorizontalOverflow(page);
});
```

- [ ] **Step 2: Confirm red.** Run `npm run test:e2e -- e2e/custom-content.spec.ts --grep 'custom content rows|recording actions'`; expect the new spacing assertion to fail on the existing 48 px default buttons in 44 px slots.

- [ ] **Step 3: Match controls to their slots.** In `RecordingListItem`, set `size="parent" density="compact"` on Delete, Play, and Record `IconButton`s. `IconMenuButton` has no size prop, so retain its `className` override and change `compactActionClass` to `'!h-11 !w-11 min-h-11 min-w-11 shrink-0 !shadow-sm'`. Remove both empty spacer branches with `className="hidden sm:flex w-11 items-center justify-center shrink-0"`. Use `gap-3` for the action cluster; keep `w-full sm:w-auto` so narrow rows place the cluster below the label. Keep the current order of Delete (when present), Play, Record, Menu. The active-recording Stop button remains at least 44 px.

```tsx
const compactActionClass = '!h-11 !w-11 min-h-11 min-w-11 shrink-0 !shadow-sm';
<div className="flex w-full flex-wrap items-center justify-end gap-3 sm:w-auto">
  {statusLabel && !isEngaged && (
    <span className={`mr-auto shrink-0 rounded-full px-2 py-1 text-[0.68rem] font-bold sm:mr-0 ${customStatusClass}`}>
      {statusLabel}
    </span>
  )}
  {isEngaged ? (
    <>
      <div className="flex w-11 shrink-0 items-center justify-center">
        {isRecording && (
          <button onClick={onStop} aria-label="Zastaviť"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-full bg-action-danger focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-focus">
            <Square size={12} className="fill-white text-white" />
          </button>
        )}
      </div>
      {(isRequesting || isRecording || isProcessing) && (
        <Button tone="neutral" size="parent" onClick={onCancel}>Zrušiť nahrávanie</Button>
      )}
    </>
  ) : (
    <>
      {hasCustom && allowDeleteRecording && (
        <div className="flex w-11 shrink-0 items-center justify-center">
          <IconButton size="parent" density="compact" onClick={onDelete}
            className={`${compactActionClass} !bg-shadow/20 text-text-main/70`} label="Zmazať nahrávku">
            <Trash2 size={16} />
          </IconButton>
        </div>
      )}
      {allowPlay && (
        <div className="flex w-11 shrink-0 items-center justify-center">
          <IconButton size="parent" density="compact" onClick={onPlay}
            className={`${compactActionClass} !bg-accent-blue/45 text-text-main`} label="Prehrať">
            <Play size={16} />
          </IconButton>
        </div>
      )}
      <div className="flex w-11 shrink-0 items-center justify-center">
        <IconButton size="parent" density="compact" onClick={onRecord}
          className={`${compactActionClass} ${recordClass}`} label="Nahrať"
          disabled={disabled || (!isActive && ['requesting', 'recording', 'processing'].includes(recorderState))}>
          <Mic size={16} />
        </IconButton>
      </div>
      {menuActions && menuActions.length > 0 && (
        <div className="flex w-11 shrink-0 items-center justify-center">
          <IconMenuButton label="Ďalšie možnosti" actions={menuActions}
            className={`${compactActionClass} !bg-transparent !shadow-none text-text-main/70`} />
        </div>
      )}
    </>
  )}
</div>
```

- [ ] **Step 4: Verify and commit.** Run the focused geometry tests, all `e2e/custom-content.spec.ts`, and lint. Commit `fix: space content recording controls` with a body explaining the 48 px button inside a 44 px wrapper and visible shadow crowding.

## Task 5: Integrated verification and roadmap

**Files:** Modify `ROADMAP.md` only after all four UI tasks pass; no other product changes in this task.

- [ ] **Step 1: Run repository checks in order.** Run `npm run lint`, `npm run test:e2e`, and `npm run build` sequentially, not concurrently: TypeScript's default include can race a build replacing `dist`. No audio files or keys change, so `npm run test:audio` is not needed. No pure-logic module changes are planned; if one is touched, run its `.verify.ts` first.

- [ ] **Step 2: Capture targeted scenes.** Run `npm run build:e2e` after the production build, then start `npx vite preview --host 127.0.0.1 --port 4173`. Run `npm run shots -- --base=http://127.0.0.1:4173 --scene=parents-gate --scene=game-settings --scene=game-settings-alphabet --scene=parent-feedback --scene=content-letters --viewport=narrowPhone --viewport=shortLandscape --viewport=desktop --output=/private/tmp/2026-09-29-parent-flow-review`. Downsize copies before inspection with the command below. Check each of the five annotated surfaces and report concrete remaining defects, if any. Never open or analyze the source-size PNGs.

```bash
node --input-type=module -e 'import fs from "node:fs"; import path from "node:path"; import sharp from "sharp"; const root="/private/tmp/2026-09-29-parent-flow-review"; const out=root+"-reduced"; for (const scene of fs.readdirSync(root)) { const dir=path.join(root,scene); if (!fs.statSync(dir).isDirectory()) continue; fs.mkdirSync(path.join(out,scene),{recursive:true}); for (const file of fs.readdirSync(dir)) if (file.endsWith(".png")) await sharp(path.join(dir,file)).resize({width:320,withoutEnlargement:true}).toFile(path.join(out,scene,file)); }'
```

- [ ] **Step 3: Update the roadmap.** Change the parent-flow UX cleanup item in `ROADMAP.md` from `[ ]` to `[x]` only after checks and reduced-size review pass. Record any significant deviation from the approved spec in the Decisions Log; otherwise keep the existing decision row.

- [ ] **Step 4: Final checks and commit.** Run `git diff --check`, confirm `git status --short` contains only intended changes, and commit the roadmap update as `docs: record parent flow cleanup verification` with a body listing the evidence. Report the test counts, build result, commit IDs, and any remaining Phase 8 release gates. Keep the dev server available for user review if it is already running.
