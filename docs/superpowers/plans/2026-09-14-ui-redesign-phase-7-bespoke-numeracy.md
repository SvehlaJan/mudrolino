# UI Redesign Phase 7: Bespoke Numeracy Games Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate Spočítaj, Viac alebo menej, and Sčítaj onto the shared game framework with tactile quantity playfields that remain collision-free, fully visible, and operable on short and narrow screens.

**Architecture:** A verified width-and-height-aware layout module feeds repository-owned quantity-tray and balance primitives. Each game retains its existing round generator, attempt policy, audio order, settings, and E2E oracle, but delegates page structure, prompt/replay, progress, feedback, completion, keyboard behavior, and pause handling to the inherited Phase 5 game shell. The three migrations proceed from one tray, to two compared trays, to two operand trays plus an answer region.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, Motion, Phase 2 UI wrappers, Phase 5 `GameShell`/`GamePrompt`/`AnswerGroup`/material APIs, ResizeObserver, Playwright.

---

## Required context and phase boundary

Start from the accepted Phase 6 SHA on `feature/full-app-ui-redesign`. Read
`AGENTS.md`, `docs/superpowers/specs/2026-09-14-full-app-ui-redesign-design.md`,
and all Phase 1–6 handoff
manifests. Confirm these inherited Phase 5 APIs exist before editing:

- `src/shared/game/GameShell.tsx`
- `src/shared/game/GamePrompt.tsx`
- `src/shared/game/AnswerGroup.tsx`
- `src/shared/game/useElementSize.ts`
- `src/shared/game/gameState.ts`
- `src/shared/game/materials/TactilePiece.tsx`
- `e2e/support/gameHarness.ts`

Use those APIs; do not create a second shell, prompt, result overlay, completion
surface, or keyboard manager. Phase 7 changes presentation and coordination, not
learning rules. Preserve all settings values, five-round sessions, three-attempt
caps where currently present, comparison's uncapped self-correction, the current
answer-audio contract, and existing E2E oracle keys. Do not touch
avatar code, parent routes, local-content storage, or audio assets.
Every migrated game also merges `gameId` and `phase: session.state.phase` into
the existing E2E oracle without replacing sibling parent/audio state.

### Task 1: Define a deterministic collision-free quantity layout

**Files:**
- Create: `src/shared/game/materials/quantityLayout.ts`
- Create: `src/shared/game/materials/quantityLayout.verify.ts`

- [ ] **Step 1: Write the failing layout verifier**

```ts
import { buildQuantityLayout, rectanglesOverlap } from './quantityLayout';

const sizes = [
  { width: 128, height: 112 },
  { width: 220, height: 120 },
  { width: 320, height: 180 },
];

for (const bounds of sizes) {
  for (let count = 1; count <= 20; count += 1) {
    const layout = buildQuantityLayout({ count, ...bounds, gap: 6 });
    if (layout.slots.length !== count) throw new Error(`${bounds.width}x${bounds.height}: wrong slot count`);
    for (const slot of layout.slots) {
      if (slot.x < 0 || slot.y < 0) throw new Error('slot starts outside the tray');
      if (slot.x + slot.size > bounds.width + 0.01) throw new Error('slot exceeds tray width');
      if (slot.y + slot.size > bounds.height + 0.01) throw new Error('slot exceeds tray height');
    }
    for (let left = 0; left < layout.slots.length; left += 1) {
      for (let right = left + 1; right < layout.slots.length; right += 1) {
        if (rectanglesOverlap(layout.slots[left], layout.slots[right])) {
          throw new Error(`slots ${left}/${right} overlap at count ${count}`);
        }
      }
    }
  }
}

const repeated = buildQuantityLayout({ count: 10, width: 220, height: 120, gap: 6 });
const repeatedAgain = buildQuantityLayout({ count: 10, width: 220, height: 120, gap: 6 });
if (JSON.stringify(repeated) !== JSON.stringify(repeatedAgain)) throw new Error('layout must be deterministic');
console.log('✓ quantity layout contracts passed');
```

- [ ] **Step 2: Run it and verify the intended failure**

Run: `npx tsx src/shared/game/materials/quantityLayout.verify.ts`

Expected: FAIL because `quantityLayout.ts` does not exist.

- [ ] **Step 3: Implement the pure layout API**

```ts
export interface QuantityLayoutInput {
  count: number;
  width: number;
  height: number;
  gap: number;
}

export interface QuantitySlot {
  index: number;
  x: number;
  y: number;
  size: number;
}

export interface QuantityLayout {
  columns: number;
  rows: number;
  slotSize: number;
  slots: QuantitySlot[];
}

export function rectanglesOverlap(left: QuantitySlot, right: QuantitySlot): boolean {
  return !(
    left.x + left.size <= right.x ||
    right.x + right.size <= left.x ||
    left.y + left.size <= right.y ||
    right.y + right.size <= left.y
  );
}

export function buildQuantityLayout(input: QuantityLayoutInput): QuantityLayout {
  const count = Math.max(0, Math.floor(input.count));
  const width = Math.max(0, input.width);
  const height = Math.max(0, input.height);
  const gap = Math.max(0, input.gap);
  if (count === 0 || width === 0 || height === 0) {
    return { columns: 0, rows: 0, slotSize: 0, slots: [] };
  }

  const candidates = Array.from({ length: Math.min(count, 6) }, (_, index) => index + 1)
    .map(columns => {
      const rows = Math.ceil(count / columns);
      const availableWidth = width - gap * (columns - 1);
      const availableHeight = height - gap * (rows - 1);
      const slotSize = Math.max(0, Math.floor(Math.min(availableWidth / columns, availableHeight / rows)));
      return { columns, rows, slotSize };
    })
    .sort((left, right) => right.slotSize - left.slotSize || left.rows - right.rows)[0];

  const gridWidth = candidates.columns * candidates.slotSize + gap * (candidates.columns - 1);
  const gridHeight = candidates.rows * candidates.slotSize + gap * (candidates.rows - 1);
  const originX = Math.max(0, (width - gridWidth) / 2);
  const originY = Math.max(0, (height - gridHeight) / 2);
  const slots = Array.from({ length: count }, (_, index) => ({
    index,
    x: originX + (index % candidates.columns) * (candidates.slotSize + gap),
    y: originY + Math.floor(index / candidates.columns) * (candidates.slotSize + gap),
    size: candidates.slotSize,
  }));

  return { ...candidates, slots };
}
```

Use CSS pixels and keep this module DOM-free. Visual jitter belongs in a child
transform inside each non-overlapping slot; it must never alter hit-box bounds.

- [ ] **Step 4: Run the verifier**

Run: `npx tsx src/shared/game/materials/quantityLayout.verify.ts`

Expected: `✓ quantity layout contracts passed`.

- [ ] **Step 5: Commit the layout contract**

```bash
git add src/shared/game/materials/quantityLayout.ts src/shared/game/materials/quantityLayout.verify.ts
git commit -m "feat: define collision-free quantity layouts" -m "Measured width-and-height layouts keep counting objects inside their trays without orientation-specific guesses."
```

### Task 2: Build the shared quantity tray and balance primitives

**Files:**
- Create: `src/shared/game/materials/QuantityTray.tsx`
- Create: `src/shared/game/materials/BalancePlayfield.tsx`
- Modify: `src/shared/game/index.ts`
- Modify: `src/shared/ui/UiKitScreen.tsx`
- Modify: `e2e/ui-foundation.spec.ts`

- [ ] **Step 1: Add failing UI-kit behavior and bounds tests**

```ts
test('quantity materials fit their measured surfaces and expose names', async ({ page }) => {
  await page.goto('/ui-kit');
  const tray = page.getByTestId('ui-quantity-tray');
  await expect(tray).toHaveAttribute('role', 'img');
  await expect(tray).toHaveAttribute('aria-label', 'Sedem predmetov');
  const trayBox = await tray.boundingBox();
  for (const token of await tray.locator('[data-quantity-token]').all()) {
    const box = await token.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(trayBox!.x);
    expect(box!.y).toBeGreaterThanOrEqual(trayBox!.y);
    expect(box!.x + box!.width).toBeLessThanOrEqual(trayBox!.x + trayBox!.width + 1);
    expect(box!.y + box!.height).toBeLessThanOrEqual(trayBox!.y + trayBox!.height + 1);
  }
  await expect(page.getByRole('group', { name: 'Porovnanie množstiev' })).toBeVisible();
});
```

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `npm run build:e2e && npx playwright test --config=e2e/playwright.config.ts e2e/ui-foundation.spec.ts --grep "quantity materials"`

Expected: FAIL because the UI-kit quantity examples do not exist.

- [ ] **Step 3: Implement `QuantityTray`**

```tsx
export interface QuantityTrayProps {
  count: number;
  emoji: string;
  mode: 'objects' | 'numerals';
  label: string;
  interactiveTokens?: boolean;
  onTokenPress?: (index: number) => void;
  className?: string;
}

export function QuantityTray({
  count,
  emoji,
  mode,
  label,
  interactiveTokens = false,
  onTokenPress,
  className,
}: QuantityTrayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const size = useElementSize(containerRef);
  const layout = buildQuantityLayout({ count, width: size.width, height: size.height, gap: 6 });

  return (
    <div
      ref={containerRef}
      role={interactiveTokens ? 'group' : 'img'}
      aria-label={label}
      data-quantity-mode={mode}
      className={cn('relative min-h-24 overflow-hidden', className)}
    >
      {mode === 'numerals' ? (
        <span aria-hidden="true" className="absolute inset-0 grid place-items-center font-spline text-[clamp(3rem,12cqi,6rem)] font-black">
          {count}
        </span>
      ) : layout.slots.map(slot => {
        const content = <TactilePiece material="counter" aria-hidden="true">{emoji}</TactilePiece>;
        const style = { left: slot.x, top: slot.y, width: slot.size, height: slot.size };
        return interactiveTokens ? (
          <button
            key={slot.index}
            type="button"
            data-quantity-token
            aria-label={`Predmet ${slot.index + 1} z ${count}`}
            onClick={() => onTokenPress?.(slot.index)}
            style={style}
            className="absolute grid min-h-12 min-w-12 place-items-center rounded-xl focus-visible:outline-focus"
          >
            {content}
          </button>
        ) : (
          <span key={slot.index} data-quantity-token aria-hidden="true" style={style} className="absolute grid place-items-center">
            {content}
          </span>
        );
      })}
    </div>
  );
}
```

Reuse the Phase 5 `useElementSize` helper; do not create a second observer hook.

- [ ] **Step 4: Implement `BalancePlayfield`**

```tsx
export interface BalancePlayfieldProps {
  left: React.ReactNode;
  right: React.ReactNode;
  leftLabel: string;
  rightLabel: string;
  onChoose(side: 'left' | 'right'): void;
  disabled?: boolean;
}

export function BalancePlayfield(props: BalancePlayfieldProps) {
  return (
    <AnswerGroup label="Porovnanie množstiev" orientation="horizontal">
      <div className="grid min-h-0 grid-cols-2 gap-[clamp(0.5rem,2vw,1.25rem)]" data-material="balance">
        <AnswerTile aria-label={props.leftLabel} disabled={props.disabled} onClick={() => props.onChoose('left')}>
          {props.left}
        </AnswerTile>
        <AnswerTile aria-label={props.rightLabel} disabled={props.disabled} onClick={() => props.onChoose('right')}>
          {props.right}
        </AnswerTile>
      </div>
    </AnswerGroup>
  );
}
```

The visual fulcrum is decorative and `aria-hidden`; neither accessible name may
depend only on left/right position. Export both primitives through the shared
game barrel.

- [ ] **Step 5: Document responsive, selected, wrong, disabled, and reduced-motion examples**

Add UI-kit examples at counts 1, 7, 10, and 20 in object/numeral modes. Include
one decorative 128px-wide tray, one short two-tray comparison, one interactive
counter tray large enough to keep every token at least 48×48, and a
reduced-motion example. An interactive tray is a named `group`; a decorative
tray is a named `img`, so the interactive buttons remain in the accessibility
tree.

- [ ] **Step 6: Run focused UI tests and commit**

Run: `npm run build:e2e && npx playwright test --config=e2e/playwright.config.ts e2e/ui-foundation.spec.ts --grep "quantity materials"`

Expected: PASS at every project selected by `ui-foundation.spec.ts`.

```bash
git add src/shared/game src/shared/ui/UiKitScreen.tsx e2e/ui-foundation.spec.ts
git commit -m "feat: add tactile quantity playfields" -m "Shared trays and balance composition give all numeracy games bounded, accessible physical objects."
```

### Task 3: Migrate Spočítaj to the shared shell

**Files:**
- Modify: `src/games/counting/countingGridLogic.ts`
- Modify: `src/games/counting/countingGridLogic.verify.ts`
- Modify: `src/games/counting/CountingItemsGame.tsx`
- Create: `e2e/counting.spec.ts`

- [ ] **Step 1: Extend the pure verifier before changing rendering**

Add assertions that `generateGridItems` returns exactly the requested count,
unique stable indexes, and only supplied emoji. Keep the existing randomized
rotation values as decorative metadata; do not use offsets as hit-box geometry.

```ts
for (let count = 1; count <= 10; count += 1) {
  const slots = generateGridItems(count, ['🍎'], () => 0.5);
  if (slots.length !== count) throw new Error(`expected ${count} items`);
  if (new Set(slots.map(slot => slot.slotIndex)).size !== count) throw new Error('slot indexes must be unique');
  if (slots.some(slot => slot.emoji !== '🍎')) throw new Error('unexpected emoji');
}
```

Accept a defaulted random function in `generateGridItems` so verification is
deterministic while production remains random.

- [ ] **Step 2: Run the verifier and confirm the signature assertion fails**

Run: `npx tsx src/games/counting/countingGridLogic.verify.ts`

Expected: FAIL because `generateGridItems` does not yet accept the injected random function.

- [ ] **Step 3: Write the failing game E2E cases**

```ts
test('counting keeps every counter and answer visible on a short phone', async ({ page }) => {
  await page.setViewportSize({ width: 667, height: 375 });
  await page.goto('/counting');
  await page.getByRole('button', { name: 'Hrať' }).click();
  await expect(page.getByText('Spočítaj predmety.')).toBeVisible();
  await expectAllWithinViewport(page.getByRole('button', { name: /^Predmet \d+ z \d+$/ }));
  await expectAllWithinViewport(page.getByRole('group', { name: 'Vyber počet' }).getByRole('button'));
  await expectNoPairwiseOverlap(page.getByRole('button', { name: /^Predmet \d+ z \d+$/ }));
});
```

Also add correct, first wrong/self-correction, third-wrong/failure, five-round
completion, replay, Back, 1–5 setting, 1–10 setting, keyboard activation, and
counter pop-action cases. Use `window.__E2E__` only to discover the generated
answer; interact through real controls.

- [ ] **Step 4: Run focused E2E and confirm the legacy screen fails shell/layout assertions**

Run: `npm run build:e2e && npx playwright test --config=e2e/playwright.config.ts e2e/counting.spec.ts`

Expected: FAIL because the legacy counting screen does not expose the shared prompt, answer-group, and bounded tray contracts.

- [ ] **Step 5: Migrate the component**

Use `GameShell` with `gameId="COUNTING_ITEMS"`, instruction `Spočítaj predmety.`,
the existing phrase clip `countItems`, and `QuantityTray` in object mode. Pass
`interactiveTokens` and `playPopSound` without making token presses answers. Put
the four number choices in `AnswerGroup label="Vyber počet"`. Delegate progress,
input lock, feedback, completion, pause, Back, and replay to the inherited session
contract. Put each option's numeric value in a stable `data-answer-id`. Preserve
`correctItemId`, `optionValues`, and `overlay` in the merged
E2E state.

- [ ] **Step 6: Run pure and browser tests**

```bash
npx tsx src/games/counting/countingGridLogic.verify.ts
npm run build:e2e && npx playwright test --config=e2e/playwright.config.ts e2e/counting.spec.ts
```

Expected: both PASS, including 320×568 and 667×375 projects.

- [ ] **Step 7: Commit counting**

```bash
git add src/games/counting e2e/counting.spec.ts
git commit -m "feat: move counting into the tactile game shell" -m "A measured tray keeps physical counters and all four answers reachable on short screens."
```

### Task 4: Extract and migrate Viac alebo menej

**Files:**
- Create: `src/games/compare/compareLogic.ts`
- Create: `src/games/compare/compareLogic.verify.ts`
- Modify: `src/games/compare/CompareQuantitiesGame.tsx`
- Modify: `e2e/compare-quantities.spec.ts`

- [ ] **Step 1: Write the failing pure comparison verifier**

```ts
import { createComparisonRound, formatComparison, pairKey } from './compareLogic';
import type { NumberItem } from '../../shared/types';

const items: NumberItem[] = Array.from({ length: 10 }, (_, index) => ({ value: index + 1, audioKey: String(index + 1) }));
const round = createComparisonRound(items, () => 0);
if (round.left.value === round.right.value) throw new Error('comparison sides must differ');
if (round.correctSide !== (round.left.value > round.right.value ? 'left' : 'right')) throw new Error('wrong side');
if (pairKey(4, 2) !== pairKey(2, 4)) throw new Error('pair key must be order independent');
if (formatComparison('sk', 4, 2) !== '4 je viac ako 2') throw new Error('Slovak result changed');
if (formatComparison('cs', 4, 2) !== '4 je více než 2') throw new Error('Czech result changed');
console.log('✓ comparison logic passed');
```

- [ ] **Step 2: Run and confirm failure**

Run: `npx tsx src/games/compare/compareLogic.verify.ts`

Expected: FAIL because `compareLogic.ts` does not exist.

- [ ] **Step 3: Extract deterministic domain helpers**

Move `Side`, pair-key, localized result formatting, and unequal-pair generation
out of the React component. Use this exact public contract:

```ts
export type ComparisonSide = 'left' | 'right';
export interface ComparisonRound {
  left: NumberItem;
  right: NumberItem;
  correctSide: ComparisonSide;
}
export function pairKey(left: number, right: number): string;
export function formatComparison(locale: string, larger: number, smaller: number): string;
export function createComparisonRound(items: readonly NumberItem[], random?: () => number): ComparisonRound;
```

`createComparisonRound` throws a descriptive error when fewer than two distinct
values are supplied and uses Fisher–Yates with the injected random function.

- [ ] **Step 4: Extend E2E before migrating markup**

Retain current correct and self-correction tests. Add objects/numerals, both
ranges, repeat audio, session completion, keyboard arrows/activation, accessible
visible retry text, and 320×568/667×375 bounds tests. Assert the group is named
`Porovnanie množstiev`, each choice has a value-bearing name such as `Skupina so
7 predmetmi`, and the two choice rectangles do not overlap.

- [ ] **Step 5: Run tests and confirm the legacy accessibility assertions fail**

```bash
npx tsx src/games/compare/compareLogic.verify.ts
npm run build:e2e && npx playwright test --config=e2e/playwright.config.ts e2e/compare-quantities.spec.ts
```

Expected: pure verifier PASS after extraction; E2E FAIL on the not-yet-migrated shell semantics.

- [ ] **Step 6: Migrate the component**

Render `BalancePlayfield` inside `GameShell`, with one `QuantityTray` per side.
Use the catalog instruction and `whereIsMore` clip. Keep the existing rule that
a wrong side remains enabled for self-correction and does not consume the round;
configure `useGameSession` with `maxAttempts: null`.
The visible/live retry text must say `Skús druhú skupinu.`. Retain the current
localized comparison result and item-first wrong audio. Put
`data-answer-side="left|right"` on the two visible answer buttons. Merge `correctSide`,
`wrongSide`, and `overlay` into `window.__E2E__`.

- [ ] **Step 7: Run focused verification and commit**

```bash
npx tsx src/games/compare/compareLogic.verify.ts
npm run build:e2e && npx playwright test --config=e2e/playwright.config.ts e2e/compare-quantities.spec.ts
```

Expected: PASS across configured numeracy viewports.

```bash
git add src/games/compare e2e/compare-quantities.spec.ts
git commit -m "feat: move comparison into balanced quantity trays" -m "Named tactile groups preserve self-correction while making comparison legible at every viewport."
```

### Task 5: Migrate Sčítaj and preserve settings invariants

**Files:**
- Modify: `src/games/addition/additionLogic.ts`
- Modify: `src/games/addition/additionLogic.verify.ts`
- Modify: `src/games/addition/AdditionGame.tsx`
- Modify: `e2e/addition.spec.ts`
- Modify: `e2e/parent-settings.spec.ts`

- [ ] **Step 1: Extend pure logic tests before component changes**

For every configured sum range, generate deterministic boundary problems and
assert both operands are positive, the sum is within range, answer options are
unique, and the correct sum appears exactly once:

```ts
for (const range of [5, 10, 20, 100] as const) {
  for (const random of [() => 0, () => 0.5, () => 0.999999]) {
    const problem = createAdditionProblem(range, random);
    if (problem.a.value < 1 || problem.b.value < 1) throw new Error('operands must be positive');
    if (problem.sum.value > range) throw new Error(`sum exceeds ${range}`);
    const options = buildAnswerOptions(problem.sum, range, 4, random);
    if (new Set(options.map(option => option.value)).size !== options.length) throw new Error('duplicate answers');
    if (options.filter(option => option.value === problem.sum.value).length !== 1) throw new Error('correct sum missing');
  }
}
```

Inject an optional random function into `buildAnswerOptions` while preserving
its production default.

- [ ] **Step 2: Run the verifier and confirm the new signature fails**

Run: `npx tsx src/games/addition/additionLogic.verify.ts`

Expected: FAIL until `buildAnswerOptions` accepts the injected random function.

- [ ] **Step 3: Add failing shell, settings, and responsive E2E cases**

Keep the current correct and three-wrong tests. Add object mode at ranges 5/10,
numeral mode at 5/10/20/100, the forced-numeral notice after selecting 20 or 100,
four unique answers, prompt/replay, Back, full completion, keyboard activation,
and duplicate-click suppression. At 320×568 and 667×375 assert both operand
trays, plus sign, prompt, replay, and four answers are visible without overlap.

```ts
test('addition never renders object trays for a forced numeral range', async ({ page }) => {
  await seedGameSettings(page, { additionSumRange: 20, additionRepresentation: 'objects' });
  await page.goto('/addition');
  await page.getByRole('button', { name: 'Hrať' }).click();
  await expect(page.locator('[data-quantity-mode="objects"]')).toHaveCount(0);
  await expect(page.locator('[data-quantity-mode="numerals"]')).toHaveCount(2);
});
```

- [ ] **Step 4: Run focused E2E and confirm legacy shell failures**

Run: `npm run build:e2e && npx playwright test --config=e2e/playwright.config.ts e2e/addition.spec.ts e2e/parent-settings.spec.ts`

Expected: FAIL on new shell/layout semantics while existing arithmetic cases remain green.

- [ ] **Step 5: Migrate the component**

Use `GameShell` with the visible instruction `Koľko je spolu?`, the
`howManyTogether` phrase clip, two labelled `QuantityTray` operands, a visible
plus sign announced as part of one equation label, and `AnswerGroup label="Vyber
súčet"`. Put each choice's numeric value in a stable `data-answer-id`. The game
component must defensively derive:

```ts
const effectiveRepresentation = additionRangeForcesNumerals(sumRange)
  ? 'numerals'
  : representation;
```

Keep the existing five rounds, three attempts, timer cancellation, localized
success/failure lines, item-first answer audio, and `correctSum`, `optionValues`,
and `overlay` E2E keys.

- [ ] **Step 6: Run addition and settings verification**

```bash
npx tsx src/games/addition/additionLogic.verify.ts
npx tsx src/shared/settings/settingsRegistry.verify.ts
npx tsx src/shared/services/settingsService.verify.ts
npm run build:e2e && npx playwright test --config=e2e/playwright.config.ts e2e/addition.spec.ts e2e/parent-settings.spec.ts
```

Expected: PASS; ranges 20/100 are numeral-only in domain state and rendered output.

- [ ] **Step 7: Commit addition**

```bash
git add src/games/addition e2e/addition.spec.ts e2e/parent-settings.spec.ts
git commit -m "feat: move addition into tactile operand trays" -m "The shared shell keeps equations and every answer visible while enforcing representation constraints at both domain and view boundaries."
```

### Task 6: Add shared numeracy responsive and accessibility regression gates

**Files:**
- Create: `e2e/numeracy-responsive.spec.ts`
- Create: `e2e/numeracy-accessibility.spec.ts`
- Modify: `e2e/playwright.config.ts`
- Modify: `tools/screenshots/capture.mjs`

- [ ] **Step 1: Add the required numeracy project matrix**

Configure named Playwright projects for 320×568, 390×844, 667×375, 768×1024,
and 1280×900, scoped to the two new numeracy matrix specs and the three game
specs. Do not replace the broader screenshot matrix from Phase 1.

- [ ] **Step 2: Write objective layout checks**

For each numeracy route, start a round using `gameHarness`, then call the inherited
helpers:

```ts
await expectNoHorizontalOverflow(page);
await expectAllWithinViewport(page.getByTestId('game-critical-controls').getByRole('button'));
await expectMinimumTargets(page.getByTestId('game-critical-controls').getByRole('button'), 48);
await expectNoPairwiseOverlap(page.getByTestId('game-answer-region').getByRole('button'));
```

Assert the document does not scroll vertically during an active child round.
The playfield may shrink or reflow; it may not hide a counter, operand, choice,
Back, replay, progress, or visible instruction.

- [ ] **Step 3: Write keyboard, announcements, and reduced-motion checks**

Run axe with WCAG 2 A/AA, 2.1 AA, and 2.2 AA tags on all three rounds. Assert:

- one `main` and one accessible game heading;
- prompt, replay, progress, answer group, and result status have names;
- Tab enters each answer group, Arrow keys move, and Enter/Space activate once;
- visible wrong text matches a polite live-region announcement;
- `reducedMotion: 'reduce'` produces no infinite animations and result changes
  remain visible without translation, rotation, or scale.

- [ ] **Step 4: Run the matrix and fix only shared or numeracy regressions**

Run: `npm run build:e2e && npx playwright test --config=e2e/playwright.config.ts e2e/numeracy-responsive.spec.ts e2e/numeracy-accessibility.spec.ts`

Expected: PASS in all five required projects with zero serious/critical axe violations.

- [ ] **Step 5: Capture numeracy screenshots and inspect them**

Run:

```bash
npm run shots -- --scene=counting-round --scene=compare-round --scene=addition-round --viewport=narrowPhone --viewport=shortLandscape --viewport=tabletPortrait --viewport=desktop
```

Expected: sixteen named screenshots with no clipped answer, prompt, or critical control.

- [ ] **Step 6: Commit regression gates**

```bash
git add e2e/numeracy-responsive.spec.ts e2e/numeracy-accessibility.spec.ts e2e/playwright.config.ts tools/screenshots/capture.mjs
git commit -m "test: gate numeracy layouts across short screens" -m "Bounds, overlap, keyboard, and reduced-motion assertions turn the quantity redesign into an objective responsive contract."
```

### Task 7: Complete Phase 7 verification and handoff

**Files:**
- Modify: `ROADMAP.md`
- Create: `docs/superpowers/handoffs/2026-09-14-ui-redesign-phase-07.md`

- [ ] **Step 1: Run the complete phase gate, cheapest first**

```bash
npx tsx src/shared/game/materials/quantityLayout.verify.ts
npx tsx src/games/counting/countingGridLogic.verify.ts
npx tsx src/games/compare/compareLogic.verify.ts
npx tsx src/games/addition/additionLogic.verify.ts
npx tsx src/shared/settings/settingsRegistry.verify.ts
npx tsx src/shared/services/settingsService.verify.ts
npm run lint
npm run test:e2e
npm run build
git diff --check
```

Expected: every command PASS; no new lint warning, console error, failed
same-origin request, or TypeScript error. Run `npm run test:audio` only if an
audio key or asset changed; such a change should be unnecessary in this phase.

- [ ] **Step 2: Verify preserved contracts explicitly**

Confirm all three settings summaries and persistence paths, five-round sessions,
three-attempt failures where applicable, comparison self-correction, answer-audio
ordering, pause/resume, Back-to-lobby behavior, and merged E2E state. Inspect the
production bundle report and confirm avatar/three.js remains outside the main
chunk.

- [ ] **Step 3: Update roadmap and write the handoff manifest**

Mark only Phase 7 complete. Record accepted Phase 6 base SHA, result SHA, branch,
clean-worktree status, exact commands/outcomes, screenshot artifact directory,
changed-file summary, reviewer result, known risks, and Phase 8 preconditions.
Obtain SHAs and status with `git rev-parse HEAD` and `git status --short`; do not
estimate them.

- [ ] **Step 4: Commit the phase handoff**

```bash
git add ROADMAP.md docs/superpowers/handoffs/2026-09-14-ui-redesign-phase-07.md
git commit -m "docs: hand off UI redesign phase seven" -m "Verified numeracy games complete the shipping-surface migration and provide a stable base for release hardening."
```

- [ ] **Step 5: Stop**

Do not begin Phase 8. Return the manifest and resulting SHA for explicit phase
acceptance.
