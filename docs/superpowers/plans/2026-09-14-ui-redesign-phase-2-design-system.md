# UI Redesign Phase 2: Design-System Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the accessible, responsive, typed component foundation used by every later child and parent redesign phase.

**Architecture:** Radix Primitives provide behavior and semantics behind repository-owned wrappers; Tailwind v4, semantic tokens, CVA, and `tailwind-merge` retain the custom visual language. Shared responsive and motion contracts live in small foundation modules, and `/ui-kit` is the executable documentation surface. Only `ParentsGate` is migrated as the first production dialog in this phase; Phase 4 owns settings, feedback, and editor migration.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, Radix Primitives, class-variance-authority, clsx, tailwind-merge, Motion, Playwright, axe-core.

---

## Required context and phase boundary

Start from the accepted Phase 1 SHA on `feature/full-app-ui-redesign`. Verify a
clean worktree and read:

- `AGENTS.md`
- `docs/superpowers/specs/2026-09-14-full-app-ui-redesign-design.md`
- the accepted Phase 1 handoff in `docs/superpowers/handoffs/`
- `src/index.css`
- every file under `src/shared/ui/`
- `src/shared/components/ParentsGate.tsx`

Do not redesign home, lobbies, parent dashboard, custom content, or game rounds.
Compatibility adapters are allowed only while current callers migrate.

### Task 1: Install the behavior and variant dependencies

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Install runtime dependencies**

```bash
npm install @radix-ui/react-dialog @radix-ui/react-alert-dialog @radix-ui/react-radio-group @radix-ui/react-switch @radix-ui/react-tabs @radix-ui/react-dropdown-menu @radix-ui/react-label class-variance-authority clsx tailwind-merge
```

Expected: dependencies and lockfile update without peer-dependency errors.

- [ ] **Step 2: Install the accessibility test dependency**

```bash
npm install --save-dev @axe-core/playwright
```

Expected: `@axe-core/playwright` appears in `devDependencies`.

- [ ] **Step 3: Verify dependency integrity**

Run: `npm run lint`

Expected: existing source still passes before component migration.

- [ ] **Step 4: Commit dependencies**

```bash
git add package.json package-lock.json
git commit -m "chore: add accessible UI foundation dependencies" -m "Headless behavior and typed variants let the app improve semantics without adopting a conflicting styled design system."
```

### Task 2: Define semantic visual tokens and deterministic class merging

**Files:**
- Modify: `src/index.css`
- Modify: `src/shared/ui/tokens.ts`
- Modify: `src/shared/ui/utils.ts`
- Create: `src/shared/ui/variants.ts`
- Create: `src/shared/ui/variants.verify.ts`

- [ ] **Step 1: Write the failing variant verifier**

```ts
import { buttonVariants, cn } from './variants';

const primary = buttonVariants({ tone: 'primary', size: 'child' });
if (!primary.includes('min-h-12')) throw new Error('Child target is below 48px');
if (!primary.includes('bg-action-primary')) throw new Error('Primary token missing');
if (primary.includes('!')) throw new Error('Important modifier leaked into variant');

const merged = cn('px-2 bg-white', 'px-4');
if (merged.includes('px-2') || !merged.includes('px-4')) {
  throw new Error(`Unexpected merge result: ${merged}`);
}
console.log('✓ UI variant contracts passed');
```

- [ ] **Step 2: Run the verifier and confirm failure**

Run: `npx tsx src/shared/ui/variants.verify.ts`

Expected: FAIL because `variants.ts` does not exist.

- [ ] **Step 3: Add semantic tokens**

Keep legacy tokens during migration and add explicit semantic roles:

```css
@theme {
  --color-canvas: #F4F1EA;
  --color-surface: #FFFFFF;
  --color-text-main: #5D453E;
  --color-text-muted: #6F5A52;
  --color-action-primary: #D92D3D;
  --color-action-danger: #A61F2B;
  --color-focus: #4051AD;
  --color-selected-surface: #E4E7F8;
  --color-success-surface: #B5EAD7;
  --color-border-subtle: #DED3C6;
}

:focus-visible {
  outline: 3px solid var(--color-focus);
  outline-offset: 3px;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

Do not replace all old tokens globally in one change. Move shared primitives to
semantic tokens first and remove legacy roles only after `rg` shows no consumers.

- [ ] **Step 4: Implement class merging and base variants**

```ts
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export const buttonVariants = cva(
  'inline-flex items-center justify-center font-black focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-focus disabled:pointer-events-none disabled:opacity-[.45]',
  {
    variants: {
      tone: {
        primary: 'bg-action-primary text-white',
        neutral: 'bg-surface text-text-main border border-border-subtle',
        quiet: 'bg-transparent text-text-main',
        danger: 'bg-action-danger text-white',
      },
      size: {
        parent: 'min-h-11 min-w-11 px-4 py-2 rounded-xl',
        child: 'min-h-12 min-w-12 px-5 py-3 rounded-2xl',
        play: 'h-24 w-24 rounded-full sm:h-32 sm:w-32',
      },
    },
    defaultVariants: { tone: 'neutral', size: 'parent' },
  },
);

export type ButtonVariantProps = VariantProps<typeof buttonVariants>;
```

Keep `cx` as a deprecated alias of `cn` until all legacy callers migrate.

- [ ] **Step 5: Run the verifier and lint**

Run: `npx tsx src/shared/ui/variants.verify.ts`

Expected: `✓ UI variant contracts passed`.

Run: `npm run lint`

Expected: PASS.

- [ ] **Step 6: Commit tokens and variants**

```bash
git add src/index.css src/shared/ui/tokens.ts src/shared/ui/utils.ts src/shared/ui/variants.ts src/shared/ui/variants.verify.ts
git commit -m "feat: establish semantic UI tokens" -m "Named roles and deterministic merging prevent contrast and utility conflicts from recurring across redesigned surfaces."
```

### Task 3: Convert core controls to typed variants

**Files:**
- Modify: `src/shared/ui/Button.tsx`
- Modify: `src/shared/ui/IconButton.tsx`
- Modify: `src/shared/ui/ChoiceTile.tsx`
- Modify: `src/shared/ui/Card.tsx`
- Modify: `src/shared/ui/PromptBadge.tsx`
- Modify: `src/shared/ui/index.ts`
- Modify: `src/shared/ui/UiKitScreen.tsx`

- [ ] **Step 1: Add failing UI-kit control tests**

Create the control section in `e2e/ui-foundation.spec.ts` before migration:

```ts
test('core controls expose semantic states and minimum sizes', async ({ page }) => {
  await page.goto('/ui-kit');
  const child = page.getByTestId('ui-child-primary');
  const parent = page.getByTestId('ui-parent-neutral');
  await expect(child).toHaveAttribute('data-tone', 'primary');
  await expect(parent).toHaveAttribute('data-tone', 'neutral');
  const childBox = await child.boundingBox();
  const parentBox = await parent.boundingBox();
  expect(childBox!.width).toBeGreaterThanOrEqual(48);
  expect(childBox!.height).toBeGreaterThanOrEqual(48);
  expect(parentBox!.width).toBeGreaterThanOrEqual(44);
  expect(parentBox!.height).toBeGreaterThanOrEqual(44);
});
```

- [ ] **Step 2: Implement `Button` and `IconButton` with CVA**

Use native `<button>` elements, forward refs, set `data-tone`, and accept only
typed `tone`/`size`/`density` props plus an escape-hatch `className`. Preserve
existing `variant` names through a documented compatibility mapping until later
phases migrate callers.

- [ ] **Step 3: Implement semantic `ChoiceTile` states**

```ts
export type ChoiceTileState =
  | 'neutral'
  | 'selected'
  | 'correct'
  | 'wrong'
  | 'disabled';
```

`selected` must be expressed by the owning radio/button semantics, not by CSS
alone. `correct` and `wrong` must include an icon/text affordance in addition to
color when used as feedback.

- [ ] **Step 4: Make `PromptBadge` natively interactive**

Render `Button` when `onClick` is provided and a noninteractive surface otherwise.
Do not use `div role="button"`.

- [ ] **Step 5: Expand `/ui-kit` and run focused tests**

Document neutral, selected, correct, wrong, disabled, loading, focus, parent,
child, and narrow examples.

Run: `npm run build:e2e && npx playwright test --config=e2e/playwright.config.ts e2e/ui-foundation.spec.ts`

Expected: new control tests PASS.

- [ ] **Step 6: Commit controls**

```bash
git add src/shared/ui e2e/ui-foundation.spec.ts
git commit -m "feat: type shared control variants" -m "Semantic control APIs make target size, focus, and state styling consistent before screen migration begins."
```

### Task 4: Add repository-owned Radix form and overlay wrappers

**Files:**
- Create: `src/shared/ui/Dialog.tsx`
- Create: `src/shared/ui/AlertDialog.tsx`
- Create: `src/shared/ui/RadioGroup.tsx`
- Create: `src/shared/ui/Switch.tsx`
- Create: `src/shared/ui/Tabs.tsx`
- Create: `src/shared/ui/DropdownMenu.tsx`
- Create: `src/shared/ui/Field.tsx`
- Create: `src/shared/ui/PageHeader.tsx`
- Modify: `src/shared/ui/FormControls.tsx`
- Modify: `src/shared/ui/IconMenuButton.tsx`
- Modify: `src/shared/ui/index.ts`
- Modify: `src/shared/ui/UiKitScreen.tsx`
- Modify: `e2e/ui-foundation.spec.ts`

- [ ] **Step 1: Add failing behavior tests**

```ts
test('dialog traps and restores focus', async ({ page }) => {
  await page.goto('/ui-kit');
  const trigger = page.getByRole('button', { name: 'Otvoriť ukážkový dialóg' });
  await trigger.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('dialog')).toContainText('Ukážkový dialóg');
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
});

test('radio, switch, tabs and menu support keyboard contracts', async ({ page }) => {
  await page.goto('/ui-kit');
  const radio = page.getByRole('radio', { name: 'Šesť' });
  await radio.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('radio', { name: 'Osem' })).toBeChecked();
  await page.getByRole('switch', { name: 'Diakritika' }).press('Space');
  await expect(page.getByRole('switch', { name: 'Diakritika' })).toBeChecked();
});
```

- [ ] **Step 2: Implement the dialog wrapper**

```tsx
export interface DialogShellProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  title: string;
  description?: string;
  children: React.ReactNode;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
}

export function DialogShell(props: DialogShellProps) {
  const descriptionId = useId();
  return (
    <Dialog.Root open={props.open} onOpenChange={props.onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-text-main/40 backdrop-blur-sm" />
        <Dialog.Content
          aria-describedby={props.description ? descriptionId : undefined}
          onOpenAutoFocus={event => {
            if (!props.initialFocusRef?.current) return;
            event.preventDefault();
            props.initialFocusRef.current.focus();
          }}
          className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100svh-2rem)] w-[min(42rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-3xl bg-surface p-5 shadow-modal"
        >
          <Dialog.Title>{props.title}</Dialog.Title>
          {props.description && (
            <Dialog.Description id={descriptionId}>{props.description}</Dialog.Description>
          )}
          {props.children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

Use stable IDs so `aria-describedby` is omitted when no description exists.
Build `AlertDialogShell` with an explicit cancel and danger confirmation; do not
allow accidental backdrop dismissal.

- [ ] **Step 3: Implement typed radio, switch, tabs, menu, and field wrappers**

Each wrapper forwards Radix state via `data-state`, supplies accessible labels,
and exposes values rather than class-name slots. `Field` generates stable IDs and
links label, help, and error text.

- [ ] **Step 4: Preserve compatibility in `FormControls` and `IconMenuButton`**

Reimplement `ToggleControl` with `SwitchControl` and `SegmentedChoice` with
`RadioGroupControl`. Remove `activeClassName` and exact-string `!bg-*` repair
logic after all current callers use semantic tone values. Reimplement menu
behavior with `DropdownMenu` while retaining existing action data.

- [ ] **Step 5: Run focused tests**

Run: `npm run build:e2e && npx playwright test --config=e2e/playwright.config.ts e2e/ui-foundation.spec.ts`

Expected: dialog, radio, switch, tabs, menu, and field tests PASS.

- [ ] **Step 6: Commit wrapper primitives**

```bash
git add src/shared/ui e2e/ui-foundation.spec.ts
git commit -m "feat: wrap accessible interaction primitives" -m "Repository-owned Radix wrappers centralize focus and keyboard behavior without surrendering the app's visual identity."
```

### Task 5: Define universal screen and motion foundations

**Files:**
- Create: `src/shared/ui/motion.ts`
- Modify: `src/shared/ui/AppScreen.tsx`
- Modify: `src/shared/ui/TopBar.tsx`
- Modify: `src/shared/ui/RoundCounter.tsx`
- Modify: `src/shared/ui/OverlayFrame.tsx`
- Modify: `src/shared/ui/UiKitScreen.tsx`
- Modify: `e2e/ui-foundation.spec.ts`

- [ ] **Step 1: Add failing responsive/reduced-motion tests**

Test `/ui-kit` at 320×568, 667×375, 768×1024, and 1280×900. Assert no
horizontal overflow, minimum targets, one `main`, and no infinite animation under
`reducedMotion: 'reduce'`.

- [ ] **Step 2: Add shared motion presets**

```ts
export const motionPreset = {
  press: { scale: 0.96, y: 2 },
  enter: { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 } },
  reducedEnter: { initial: { opacity: 0 }, animate: { opacity: 1 } },
  transition: { duration: 0.18, ease: 'easeOut' as const },
} as const;
```

Consumers call Motion’s `useReducedMotion()` and select the reduced preset.
Finite decorative animation may run only while its state is visible.

- [ ] **Step 3: Make `AppScreen` own universal page semantics**

Expose typed `mode="child" | "parent"`, `height="viewport" | "content"`,
`scroll="locked" | "vertical"`, and `maxWidth` props. Render `<main>` by
default, apply safe-area padding, and provide a short-height data/layout mode
based on available container size—not orientation alone.

- [ ] **Step 4: Separate game feedback surface from modal dialog**

Keep `OverlayFrame` non-modal for timed game feedback. Add labelled status
semantics, finite particles, focusable completion controls where required, and a
reduced-motion branch. Do not rebuild it on Radix Dialog.

- [ ] **Step 5: Run focused tests and commit**

Run: `npm run build:e2e && npx playwright test --config=e2e/playwright.config.ts e2e/ui-foundation.spec.ts`

Expected: all responsive and reduced-motion foundation cases PASS.

```bash
git add src/shared/ui src/index.css e2e/ui-foundation.spec.ts
git commit -m "feat: add universal screen and motion contracts" -m "Width-and-height-aware shells keep one capability model usable across portrait, landscape, and desktop layouts."
```

### Task 6: Migrate `ParentsGate` to the shared dialog

**Files:**
- Modify: `src/shared/components/ParentsGate.tsx`
- Modify: `src/shared/ui/UiKitScreen.tsx`
- Modify: `e2e/parent-access.spec.ts`
- Create: `e2e/accessibility-foundation.spec.ts`

- [ ] **Step 1: Add failing focus and error-feedback tests**

```ts
test('parent gate is a modal dialog with visible and announced errors', async ({ page }) => {
  await page.goto('/settings');
  const dialog = page.getByRole('dialog', { name: 'Pre rodičov' });
  await expect(dialog).toBeVisible();
  await page.getByRole('button', { name: '1', exact: true }).click();
  await page.getByRole('button', { name: 'Potvrdiť' }).click();
  await expect(dialog.getByRole('alert')).toContainText('Skús to ešte raz');
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'visible');
});
```

Also assert initial focus, Tab containment, Escape cancel, trigger focus restore,
keyboard digits, Backspace, Enter, and reduced-motion error feedback.

- [ ] **Step 2: Rebuild the shell without changing the arithmetic contract**

Use `DialogShell`, `Button`, and the Phase 1 adapter. Preserve answer range,
two-digit cap, keypad actions, and fresh problem after an incorrect answer. Add
visible `role="alert"` text; shake is optional enhancement and disabled under
reduced motion.

- [ ] **Step 3: Add axe checks**

```ts
import AxeBuilder from '@axe-core/playwright';

const results = await new AxeBuilder({ page })
  .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
  .analyze();
expect(results.violations.filter(v => ['critical', 'serious'].includes(v.impact ?? ''))).toEqual([]);
```

Run this on `/ui-kit`, the gate, and the currently protected parent screen.

- [ ] **Step 4: Run Phase 1 regressions and focused accessibility tests**

Run: `npm run build:e2e && npx playwright test --config=e2e/playwright.config.ts e2e/parent-access.spec.ts e2e/accessibility-foundation.spec.ts`

Expected: PASS.

- [ ] **Step 5: Commit the first production migration**

```bash
git add src/shared/components/ParentsGate.tsx src/shared/ui/UiKitScreen.tsx e2e/parent-access.spec.ts e2e/accessibility-foundation.spec.ts
git commit -m "feat: migrate parent gate to accessible dialog" -m "The first real wrapper consumer proves focus containment, restoration, and error semantics before parent-screen redesign."
```

### Task 7: Complete Phase 2 verification and handoff

**Files:**
- Create: `docs/superpowers/handoffs/2026-09-14-ui-redesign-phase-02.md`
- Modify: `ROADMAP.md`

- [ ] **Step 1: Run all required checks**

```bash
npx tsx src/shared/ui/variants.verify.ts
npm run lint
npm run test:e2e
npm run build
git diff --check
```

Expected: PASS. Confirm the production build keeps avatar/three.js in lazy chunks.

- [ ] **Step 2: Capture the foundation review surfaces**

Run the screenshot sweep for `/ui-kit`, parent gate, and current settings across
the canonical matrix. Inspect normal and reduced-motion states at 320×568 and
667×375 in addition to desktop.

- [ ] **Step 3: Update roadmap and handoff**

Mark only Phase 2 complete. Record exact SHAs, clean status, dependency versions,
commands/outcomes, screenshot location, reviewer result, remaining compatibility
adapters, and Phase 3 preconditions.

- [ ] **Step 4: Commit and stop**

```bash
git add ROADMAP.md docs/superpowers/handoffs/2026-09-14-ui-redesign-phase-02.md
git commit -m "docs: hand off UI redesign phase two" -m "The accepted component contract gives the catalog and screen agent a stable foundation to consume."
```

Do not begin Phase 3.
