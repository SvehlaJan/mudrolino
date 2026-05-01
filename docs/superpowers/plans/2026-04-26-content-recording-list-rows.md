# Content Recording List Rows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the `/content` list rows for editable words and praises while preserving existing recording behavior and using the shared UI Kit.

**Architecture:** Extend existing shared UI primitives and `RecordingListItem` instead of adding one-off styles in `CustomContentScreen`. Word rows get a two-line text area with uppercase syllables; item deletion moves behind an overflow menu; custom-recording deletion remains the visible conditional trash button.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind utility classes, lucide-react icons, existing `src/shared/ui` primitives.

---

## File Structure

- Create `src/shared/ui/IconMenuButton.tsx`: create a small UI Kit overflow menu primitive using `IconButton`, `MoreHorizontal`, and accessible menu markup.
- Modify `src/shared/ui/index.ts`: export the new menu primitive.
- Modify `src/recordings/RecordingListItem.tsx`: add `secondaryLabel`, `menuActions`, and render a two-line label while preserving recorder states.
- Modify `src/content/CustomContentScreen.tsx`: remove detached delete buttons from `EditableWordList` and `EditablePraiseList`; pass delete-item actions through the row overflow menu.
- Modify `src/shared/ui/UiKitScreen.tsx`: add examples for one-line recording rows, two-line word rows, custom recording rows, transient recorder states, and the overflow menu.
- Verification only: no test runner is configured in this repo, so use `npm run lint` and browser verification.

---

### Task 1: Add UI Kit Overflow Menu Primitive

**Files:**
- Create: `src/shared/ui/IconMenuButton.tsx`
- Modify: `src/shared/ui/index.ts`

- [ ] **Step 1: Create `IconMenuButton` with UI Kit styling**

Create `src/shared/ui/IconMenuButton.tsx`:

```tsx
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { IconButton } from './IconButton';
import { cx } from './utils';

export interface IconMenuAction {
  label: string;
  icon?: React.ReactNode;
  tone?: 'default' | 'danger';
  onSelect: () => void;
}

interface IconMenuButtonProps {
  label: string;
  actions: IconMenuAction[];
  className?: string;
  menuClassName?: string;
}

export function IconMenuButton({
  label,
  actions,
  className,
  menuClassName,
}: IconMenuButtonProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <IconButton
        label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={className}
      >
        <MoreHorizontal size={18} />
      </IconButton>

      {open && (
        <div
          role="menu"
          className={cx(
            'absolute right-0 top-full z-20 mt-2 min-w-44 rounded-2xl border-2 border-shadow/10 bg-white p-2 shadow-block',
            menuClassName,
          )}
        >
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                action.onSelect();
              }}
              className={cx(
                'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold active:opacity-70',
                action.tone === 'danger' ? 'text-red-500' : 'text-text-main',
              )}
            >
              {action.icon}
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Export the new primitive**

Modify `src/shared/ui/index.ts`:

```ts
export * from './IconMenuButton';
```

Place the export next to the existing `IconButton` export:

```ts
export * from './FormControls';
export * from './IconButton';
export * from './IconMenuButton';
export * from './OverlayFrame';
```

- [ ] **Step 3: Run type checking**

Run:

```bash
npm run lint
```

Expected: TypeScript and ESLint pass, or only pre-existing unrelated lint errors appear. If the new file reports accessibility or TypeScript errors, fix them in this task before continuing.

- [ ] **Step 4: Commit**

```bash
git add src/shared/ui/IconMenuButton.tsx src/shared/ui/index.ts
git commit -m "feat: add UI kit icon menu button"
```

---

### Task 2: Extend `RecordingListItem` For Two-Line Labels And Overflow Actions

**Files:**
- Modify: `src/recordings/RecordingListItem.tsx`

- [ ] **Step 1: Update imports**

Change the imports at the top of `src/recordings/RecordingListItem.tsx`:

```tsx
import { Mic, Trash2, Play, Square } from 'lucide-react';
import type { IconMenuAction } from '../shared/ui';
import { Card, IconButton, IconMenuButton } from '../shared/ui';
```

- [ ] **Step 2: Extend props**

Add optional props to `RecordingListItemProps`:

```tsx
export interface RecordingListItemProps {
  item: AudioItem;
  secondaryLabel?: string;
  menuActions?: IconMenuAction[];
  hasCustom: boolean;
  /** True when this row owns the active recorder. */
  isActive: boolean;
  /** Only meaningful when isActive. */
  recorderState: RecorderState;
  /** True when recorder is active and voice has been detected. Only meaningful when isActive && recorderState === 'recording'. */
  speaking: boolean;
  /** True for ~800ms after blob is saved. Only meaningful when isActive. */
  savedFlash: boolean;
  onRecord: () => void;
  onStop: () => void;
  onPlay: () => void;
  onDelete: () => void;
}
```

Update the function signature:

```tsx
export function RecordingListItem({
  item,
  secondaryLabel,
  menuActions,
  hasCustom,
  isActive,
  recorderState,
  speaking,
  savedFlash,
  onRecord,
  onStop,
  onPlay,
  onDelete,
}: RecordingListItemProps) {
```

- [ ] **Step 3: Replace the single label span with a UI Kit-compatible two-line text block**

Replace:

```tsx
let labelClass = 'text-lg font-medium flex-1 text-left truncate text-text-main ';
if (isSavedFlash) labelClass += 'text-green-300';
else if (isProcessing) labelClass += 'text-amber-300';
else if (isRecording) labelClass += speaking ? 'text-pink-200' : 'text-blue-200';
```

with:

```tsx
let labelClass = 'text-lg font-medium text-left truncate text-text-main ';
if (isSavedFlash) labelClass += 'text-green-300';
else if (isProcessing) labelClass += 'text-amber-300';
else if (isRecording) labelClass += speaking ? 'text-pink-200' : 'text-blue-200';

let secondaryClass = 'mt-0.5 text-xs font-bold uppercase tracking-normal text-text-main/55 truncate ';
if (isSavedFlash) secondaryClass += 'text-green-300/80';
else if (isProcessing) secondaryClass += 'text-amber-300/80';
else if (isRecording) secondaryClass += speaking ? 'text-pink-200/80' : 'text-blue-200/80';
```

Replace the label JSX:

```tsx
<span className={labelClass}>{item.label}</span>
```

with:

```tsx
<span className="min-w-0 flex-1 text-left">
  <span className={`block ${labelClass}`}>{item.label}</span>
  {secondaryLabel && (
    <span className={`block ${secondaryClass}`}>{secondaryLabel}</span>
  )}
</span>
```

- [ ] **Step 4: Add the overflow menu button in idle rows**

After the record button slot inside the idle branch, add:

```tsx
{menuActions && menuActions.length > 0 && (
  <div className="w-9 flex items-center justify-center shrink-0">
    <IconMenuButton
      label="Ďalšie možnosti"
      actions={menuActions}
      className={`${compactActionClass} !bg-transparent !shadow-none text-text-main/70`}
    />
  </div>
)}
```

The idle branch should keep the existing custom-recording delete, play, and record buttons unchanged:

```tsx
{/* Delete — only when idle and has custom recording */}
<div className="w-9 flex items-center justify-center shrink-0">
  {hasCustom && (
    <IconButton
      onClick={onDelete}
      className={`${compactActionClass} !bg-shadow/20 text-text-main/70`}
      label="Zmazať nahrávku"
    >
      <Trash2 size={16} />
    </IconButton>
  )}
</div>
```

- [ ] **Step 5: Preserve transient recording state behavior**

Confirm the engaged branch still renders only the stop slot while recording, and does not render play/record/menu actions:

```tsx
{isEngaged ? (
  <>
    <div className="w-9 flex items-center justify-center shrink-0">
      {isRecording && (
        <button
          onClick={onStop}
          className="w-7 h-7 rounded-full bg-red-500 flex items-center justify-center active:opacity-70"
          aria-label="Zastaviť"
        >
          <Square size={12} className="text-white fill-white" />
        </button>
      )}
    </div>
  </>
) : (
  // idle controls
)}
```

- [ ] **Step 6: Run type checking**

Run:

```bash
npm run lint
```

Expected: no errors from `RecordingListItem.tsx`.

- [ ] **Step 7: Commit**

```bash
git add src/recordings/RecordingListItem.tsx
git commit -m "feat: support two-line recording rows"
```

---

### Task 3: Wire Word And Praise Item Deletion Through The Row Menu

**Files:**
- Modify: `src/content/CustomContentScreen.tsx`

- [ ] **Step 1: Import the menu delete icon**

Modify the lucide import:

```tsx
import { Plus, Trash2 } from 'lucide-react';
```

Keep `Trash2` because both the add-form delete icon and menu action use it.

- [ ] **Step 2: Update word rows**

In `EditableWordList`, replace the wrapper that currently renders a detached delete button:

```tsx
<div key={word.id} className="flex items-center gap-2">
  <div className="flex-1">
    <RecordingListItem
      item={item}
      hasCustom={overrideKeys.has(storeKey)}
      isActive={word.id === activeId}
      recorderState={recorder.state}
      speaking={recorder.speaking}
      savedFlash={word.id === activeId && savedFlash}
      onRecord={() => handleRecord(word.id)}
      onStop={handleStop}
      onPlay={() => audioManager.play({ clips: [{ path: storeKey, fallbackText: word.word }] })}
      onDelete={() => void handleDeleteAudio(word)}
    />
  </div>
  <button
    onClick={() => void deleteWord(word.id)}
    className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-red-100 text-red-500 active:opacity-60"
    aria-label="Zmazať slovo"
  >
    <Trash2 size={16} />
  </button>
</div>
```

with:

```tsx
<RecordingListItem
  key={word.id}
  item={item}
  secondaryLabel={word.syllables.toUpperCase()}
  menuActions={[
    {
      label: 'Zmazať slovo',
      icon: <Trash2 size={16} />,
      tone: 'danger',
      onSelect: () => void deleteWord(word.id),
    },
  ]}
  hasCustom={overrideKeys.has(storeKey)}
  isActive={word.id === activeId}
  recorderState={recorder.state}
  speaking={recorder.speaking}
  savedFlash={word.id === activeId && savedFlash}
  onRecord={() => handleRecord(word.id)}
  onStop={handleStop}
  onPlay={() => audioManager.play({ clips: [{ path: storeKey, fallbackText: word.word }] })}
  onDelete={() => void handleDeleteAudio(word)}
/>
```

- [ ] **Step 3: Update praise rows**

In `EditablePraiseList`, replace the detached delete wrapper with:

```tsx
<RecordingListItem
  key={praise.id}
  item={item}
  menuActions={[
    {
      label: 'Zmazať pochvalu',
      icon: <Trash2 size={16} />,
      tone: 'danger',
      onSelect: () => void deletePraise(praise.id),
    },
  ]}
  hasCustom={overrideKeys.has(storeKey)}
  isActive={praise.id === activeId}
  recorderState={recorder.state}
  speaking={recorder.speaking}
  savedFlash={praise.id === activeId && savedFlash}
  onRecord={() => handleRecord(praise.id)}
  onStop={handleStop}
  onPlay={() => audioManager.play({ clips: [{ path: storeKey, fallbackText: praise.text }] })}
  onDelete={() => void handleDeleteAudio(praise)}
/>
```

Do not pass `secondaryLabel` for praises.

- [ ] **Step 4: Keep custom-recording deletion visible**

Confirm the visible small trash button still appears only when `hasCustom={true}` inside `RecordingListItem`. Do not move `onDelete` into the menu.

- [ ] **Step 5: Run type checking**

Run:

```bash
npm run lint
```

Expected: no TypeScript or ESLint errors in `CustomContentScreen.tsx`.

- [ ] **Step 6: Commit**

```bash
git add src/content/CustomContentScreen.tsx
git commit -m "feat: move content deletion into row menu"
```

---

### Task 4: Update UI Kit Examples

**Files:**
- Modify: `src/shared/ui/UiKitScreen.tsx`

- [ ] **Step 1: Import menu support**

Update the UI Kit imports:

```tsx
import { Loader2, Mic, MoreHorizontal, Play, RefreshCw, Settings, Square, Trash2, Volume2 } from 'lucide-react';
```

If `MoreHorizontal` is unused because the example uses `IconMenuButton`, omit it.

Add the menu import next to the existing button import:

```tsx
import { BackButton, IconButton } from './IconButton';
import { IconMenuButton } from './IconMenuButton';
```

- [ ] **Step 2: Replace the single row example with a compact group of recording row states**

In the `Surfaces` section, after the three card examples, replace the existing single `Card variant="row"` example with this group:

```tsx
<div className="space-y-3">
  <Card variant="row" className="flex items-center gap-2 transition-colors">
    <span className="w-[22px] flex shrink-0 items-center justify-center">
      <span className="inline-block h-3 w-3 rounded-full border-2 border-shadow/20" />
    </span>
    <span className="min-w-0 flex-1 text-left">
      <span className="block truncate text-lg font-medium text-text-main">Mama 👩</span>
      <span className="mt-0.5 block truncate text-xs font-bold uppercase tracking-normal text-text-main/55">MA-MA</span>
    </span>
    <IconButton label="Prehrať" className="h-9 w-9 !bg-accent-blue/45 !shadow-sm text-text-main sm:h-9 sm:w-9">
      <Play size={16} />
    </IconButton>
    <IconButton label="Nahrať" className="h-9 w-9 !bg-soft-watermelon/45 !shadow-sm text-text-main sm:h-9 sm:w-9">
      <Mic size={16} />
    </IconButton>
    <IconMenuButton
      label="Ďalšie možnosti"
      actions={[
        { label: 'Zmazať slovo', icon: <Trash2 size={16} />, tone: 'danger', onSelect: () => undefined },
      ]}
      className="h-9 w-9 !bg-transparent !shadow-none text-text-main/70 sm:h-9 sm:w-9"
    />
  </Card>

  <Card variant="row" className="flex items-center gap-2 transition-colors">
    <span className="w-[22px] flex shrink-0 items-center justify-center">
      <Mic size={14} className="text-accent-blue" />
    </span>
    <span className="min-w-0 flex-1 text-left">
      <span className="block truncate text-lg font-medium text-text-main">Krava 🐄</span>
      <span className="mt-0.5 block truncate text-xs font-bold uppercase tracking-normal text-text-main/55">KRA-VA</span>
    </span>
    <IconButton label="Zmazať nahrávku" className="h-9 w-9 !bg-shadow/20 !shadow-sm text-text-main/70 sm:h-9 sm:w-9">
      <Trash2 size={16} />
    </IconButton>
    <IconButton label="Prehrať" className="h-9 w-9 !bg-accent-blue/45 !shadow-sm text-text-main sm:h-9 sm:w-9">
      <Play size={16} />
    </IconButton>
    <IconButton label="Nahrať" className="h-9 w-9 !bg-soft-watermelon/45 !shadow-sm text-text-main sm:h-9 sm:w-9">
      <Mic size={16} />
    </IconButton>
    <IconMenuButton
      label="Ďalšie možnosti"
      actions={[
        { label: 'Zmazať slovo', icon: <Trash2 size={16} />, tone: 'danger', onSelect: () => undefined },
      ]}
      className="h-9 w-9 !bg-transparent !shadow-none text-text-main/70 sm:h-9 sm:w-9"
    />
  </Card>

  <Card variant="row" className="flex items-center gap-2 transition-colors !bg-pink-950/30 !border-pink-500/50">
    <span className="w-[22px] flex shrink-0 items-center justify-center text-sm text-red-400">🔴</span>
    <span className="min-w-0 flex-1 text-left">
      <span className="block truncate text-lg font-medium text-pink-200">Kačica 🦆</span>
      <span className="mt-0.5 block truncate text-xs font-bold uppercase tracking-normal text-pink-200/80">KA-ČI-CA</span>
    </span>
    <span className="mr-1 shrink-0 text-xs italic opacity-80">Počujem…</span>
    <button className="flex h-7 w-7 items-center justify-center rounded-full bg-red-500 active:opacity-70" aria-label="Zastaviť">
      <Square size={12} className="fill-white text-white" />
    </button>
  </Card>
</div>
```

- [ ] **Step 3: Run type checking**

Run:

```bash
npm run lint
```

Expected: no errors from `UiKitScreen.tsx`.

- [ ] **Step 4: Commit**

```bash
git add src/shared/ui/UiKitScreen.tsx
git commit -m "docs: add recording row UI kit examples"
```

---

### Task 5: Browser Verification

**Files:**
- Verify only

- [ ] **Step 1: Start the dev server**

Run:

```bash
npm run dev
```

Expected: Vite serves on port 3000.

- [ ] **Step 2: Verify `/ui-kit`**

Open:

```text
http://localhost:3000/ui-kit
```

Check:
- Two-line word rows show uppercase syllables on a true second line.
- Icons are the actual UI Kit/lucide icons, not custom SVG approximations.
- The overflow menu opens and shows `Zmazať slovo`.
- The custom-recording trash remains visible only on the custom-recording example.
- Recording state row still hides idle controls.

- [ ] **Step 3: Verify `/content` desktop**

Open:

```text
http://localhost:3000/content
```

Check the `Slová` tab:
- Word rows no longer have a detached delete button.
- Each word row shows uppercase syllables on the second line.
- The row menu contains `Zmazať slovo`.
- Existing custom audio still shows the visible `Zmazať nahrávku` button.
- Play and record buttons use the same UI Kit icons and colors as before.

Check the `Pochvaly` tab:
- Praise rows no longer have a detached delete button.
- Praise rows remain one-line unless a future requirement adds secondary text.
- The row menu contains `Zmazať pochvalu`.

- [ ] **Step 4: Verify `/content` mobile**

Use a mobile viewport around 390px wide.

Check:
- The words list does not horizontally clip.
- The menu button stays inside the row.
- Labels truncate cleanly before action buttons.
- The row height increase from syllables feels intentional and consistent.

- [ ] **Step 5: Run final lint**

Run:

```bash
npm run lint
```

Expected: TypeScript and ESLint pass.

- [ ] **Step 6: Commit verification fixes if needed**

If browser verification required small fixes:

```bash
git add src/shared/ui/IconMenuButton.tsx src/shared/ui/index.ts src/recordings/RecordingListItem.tsx src/content/CustomContentScreen.tsx src/shared/ui/UiKitScreen.tsx
git commit -m "fix: polish content recording rows"
```

If no fixes were needed, do not create an empty commit.

---

## Self-Review

- Spec coverage: The plan covers the agreed row behavior, UI Kit alignment, two-line uppercase syllables, overflow item deletion, visible custom-recording deletion, recorder states, and `/ui-kit` updates.
- Placeholder scan: No unresolved placeholder wording or vague implementation-only steps remain.
- Type consistency: `IconMenuAction`, `IconMenuButton`, `secondaryLabel`, and `menuActions` are introduced before use and reused consistently.
