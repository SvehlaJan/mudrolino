# UI & UX Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 5 refined UI/UX enhancements across "Hravé Učenie" mini-games: Counting zero-collision CSS grid & Web Audio bubble pop, Auditory games visual audio cue with concentric soundwave rings, Assembly mobile thumb-reach layout and high-contrast slots, unified PromptBadge & enlarged word emojis, and centralized Slovak localization for avatar garments.

**Architecture:** A localized, modular UI architecture introducing the shared `PromptBadge` and `AuditoryPromptBadge` primitives in `src/shared/ui/` and `src/shared/components/`, zero-latency Web Audio sound synthesis in `src/games/counting/countingSfx.ts`, centralized avatar slot dictionaries in `src/shared/locales/`, and thumb-reach responsive CSS layouts in `CountingItemsGame.tsx` and `AssemblyGame.tsx`.

**Architecture Diagram:**

```mermaid
graph TD
    subgraph "Shared UI & Locales"
        SK[src/shared/locales/sk.ts] --> AV[AvatarCustomizationSettings.tsx]
        CS[src/shared/locales/cs.ts] --> AV
        PB[src/shared/ui/PromptBadge.tsx] --> FL[FirstLetterGame.tsx]
        PB --> CSY[CompleteSyllableGame.tsx]
        PB --> AS[AssemblyGame.tsx]
        APB[src/shared/components/AuditoryPromptBadge.tsx] --> FI[FindItGame.tsx]
    end

    subgraph "Game Enhancements"
        SFX[countingSfx.ts (Web Audio)] --> CG[CountingItemsGame.tsx (CSS Grid)]
        WD[wordsDescriptor.tsx (Scaled Emojis)] --> FI
        AS_SLOT[Assembly High-Contrast Slots & Thumb Layout] --> AS
    end
```

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS v4, Web Audio API, Lucide React, Playwright.

## Global Constraints

- Never statically import `AvatarScene`, `AvatarModel`, `AvatarSkeletonOverlay`, or `skinnedGarment` from outside `src/avatar/` (three.js bundle isolation).
- Audio contract: The tapped or target item's own audio plays first, then the verdict clip.
- Mobile viewport target: 390×844 px (iPhone standard) and 1280×900 px (Desktop).
- Every change must pass `npm run lint` and `npm run build`.

---

### Task 1: Avatar Settings Slovak & Czech Localization

**Files:**
- Modify: `src/shared/locales/sk.ts`
- Modify: `src/shared/locales/cs.ts`
- Modify: `src/avatar/AvatarCustomizationSettings.tsx:7-130`

**Interfaces:**
- Produces: `AVATAR_TOP_LABELS`, `AVATAR_SHOES_LABELS`, `AVATAR_ACCESSORY_LABELS` in `sk.ts` and `cs.ts`.
- Consumes: `useContent()` locale from `ContentContext.tsx`.

- [ ] **Step 1: Add avatar garment label dictionaries to `sk.ts` and `cs.ts`**

In `src/shared/locales/sk.ts`:
```ts
export const AVATAR_TOP_LABELS: Record<string, string> = {
  top_none: 'Bez trička',
  top_blue_tshirt_v1: 'Modré tričko',
  top_orange_hoodie_v1: 'Oranžová mikina',
};

export const AVATAR_SHOES_LABELS: Record<string, string> = {
  shoes_none: 'Bez topánok',
  shoes_blue_sneakers_v1: 'Modré tenisky',
};

export const AVATAR_ACCESSORY_LABELS: Record<string, string> = {
  accessory_none: 'Bez doplnku',
  hat_red_cap_v1: 'Červená šiltovka',
};
```

In `src/shared/locales/cs.ts`:
```ts
export const AVATAR_TOP_LABELS: Record<string, string> = {
  top_none: 'Bez trička',
  top_blue_tshirt_v1: 'Modré tričko',
  top_orange_hoodie_v1: 'Oranžová mikina',
};

export const AVATAR_SHOES_LABELS: Record<string, string> = {
  shoes_none: 'Bez bot',
  shoes_blue_sneakers_v1: 'Modré tenisky',
};

export const AVATAR_ACCESSORY_LABELS: Record<string, string> = {
  accessory_none: 'Bez doplňku',
  hat_red_cap_v1: 'Červená kšiltovka',
};
```

- [ ] **Step 2: Update `AvatarCustomizationSettings.tsx` to use centralized labels**

Import `AVATAR_TOP_LABELS` and `AVATAR_SHOES_LABELS` from `../shared/locales/sk` (and fallback for `cs`).
Replace hardcoded `shoesLabelById` and replace `item.label` with `topLabels[item.id] ?? item.label` and `shoesLabels[item.id] ?? item.label`.

- [ ] **Step 3: Verify TypeScript and Lint**

Run: `npm run lint`
Expected: Clean (0 errors).

- [ ] **Step 4: Commit**

```bash
git add src/shared/locales/sk.ts src/shared/locales/cs.ts src/avatar/AvatarCustomizationSettings.tsx
git commit -m "feat: localize avatar garments in Slovak and Czech"
```

---

### Task 2: Standardized `PromptBadge` UI Primitive & Word Tile Emoji Scaling

**Files:**
- Create: `src/shared/ui/PromptBadge.tsx`
- Modify: `src/shared/ui/index.ts`
- Modify: `src/shared/ui/UiKitScreen.tsx`
- Modify: `src/games/words/wordsDescriptor.tsx:19-22`
- Modify: `src/games/first-letter/FirstLetterGame.tsx:277-282`
- Modify: `src/games/complete-syllable/CompleteSyllableGame.tsx:322-326`
- Modify: `src/games/assembly/AssemblyGame.tsx:541-547`

**Interfaces:**
- Produces: `PromptBadge` component in `src/shared/ui/PromptBadge.tsx`.
- Consumes: standard props `{ children, ariaLabel, className, onClick }`.

- [ ] **Step 1: Create `PromptBadge.tsx`**

```tsx
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Card } from './Card';
import { cx } from './utils';

export interface PromptBadgeProps {
  children: React.ReactNode;
  ariaLabel?: string;
  className?: string;
  onClick?: () => void;
}

export function PromptBadge({ children, ariaLabel, className, onClick }: PromptBadgeProps) {
  return (
    <Card
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={ariaLabel}
      onClick={onClick}
      onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
      className={cx(
        'inline-flex items-center justify-center min-w-[140px] sm:min-w-[200px] !rounded-[28px] sm:!rounded-[44px] !px-6 !py-4 sm:!px-10 sm:!py-6 text-center !shadow-block select-none',
        onClick && 'cursor-pointer active:scale-95 transition-transform hover:brightness-105',
        className
      )}
    >
      {children}
    </Card>
  );
}
```

- [ ] **Step 2: Export `PromptBadge` in `src/shared/ui/index.ts` and add showcase in `UiKitScreen.tsx`**

Add `export * from './PromptBadge';` in `src/shared/ui/index.ts`.
In `UiKitScreen.tsx`, add a Section showcasing `PromptBadge`:
```tsx
<Section title="Prompt Badge">
  <div className="flex flex-wrap gap-4 items-center">
    <PromptBadge ariaLabel="Auto">
      <span className="text-6xl sm:text-7xl">🚗</span>
    </PromptBadge>
    <PromptBadge onClick={() => {}} ariaLabel="Klikateľný prompt">
      <span className="text-6xl sm:text-7xl">🍎</span>
    </PromptBadge>
  </div>
</Section>
```

- [ ] **Step 3: Update `wordsDescriptor.tsx` emoji clamp**

In `src/games/words/wordsDescriptor.tsx:20`:
Change:
```tsx
<span className="text-[clamp(2.25rem,7vw,5rem)] leading-none">{w.emoji}</span>
```
To:
```tsx
<span className="text-[clamp(3.75rem,14vw,7rem)] leading-none">{w.emoji}</span>
```

- [ ] **Step 4: Integrate `PromptBadge` in `FirstLetterGame.tsx`, `CompleteSyllableGame.tsx`, and `AssemblyGame.tsx`**

1. In `FirstLetterGame.tsx`:
Wrap `{targetItem?.word.emoji}` inside `<PromptBadge onClick={playPromptAudio} ariaLabel={targetItem?.word.word}>`.
2. In `CompleteSyllableGame.tsx`:
Wrap `{targetRound?.word.emoji}` inside `<PromptBadge onClick={playPromptAudio} ariaLabel={emojiLabel}>`.
3. In `AssemblyGame.tsx`:
Replace the custom `<Card className="min-w-[180px] ...">` with `<PromptBadge onClick={() => playPromptAudio(targetWord)} ariaLabel={targetWord?.word}>`.

- [ ] **Step 5: Verify Lint and Build**

Run: `npm run lint && npm run build`
Expected: Both pass cleanly.

- [ ] **Step 6: Commit**

```bash
git add src/shared/ui/PromptBadge.tsx src/shared/ui/index.ts src/shared/ui/UiKitScreen.tsx src/games/words/wordsDescriptor.tsx src/games/first-letter/FirstLetterGame.tsx src/games/complete-syllable/CompleteSyllableGame.tsx src/games/assembly/AssemblyGame.tsx
git commit -m "feat: standardize PromptBadge primitive and enlarge word card emojis"
```

---

### Task 3: Assembly Mobile Thumb-Reach Ergonomics & Slot Contrast

**Files:**
- Modify: `src/games/assembly/AssemblyGame.tsx:128-157,529-593`

**Interfaces:**
- Consumes: `AssemblyTile`, `placedTiles`, `trayTiles`

- [ ] **Step 1: Enhance `AnswerSlot` empty state contrast**

In `src/games/assembly/AssemblyGame.tsx:139-153`:
Update `AnswerSlot`:
```tsx
function AnswerSlot({
  index,
  tile,
  isResettingBoard,
  hiddenTileIds,
  onTileTap,
}: AnswerSlotProps) {
  const isHidden = tile ? hiddenTileIds.includes(tile.id) : false;

  return (
    <div
      className={`min-h-[88px] sm:min-h-[120px] rounded-[28px] sm:rounded-[32px] border-[3px] border-dashed flex items-center justify-center transition-colors ${
        tile
          ? 'border-primary/40 bg-primary/10'
          : 'border-primary/40 bg-white/70 shadow-sm'
      }`}
    >
      <div className="w-full max-w-[240px] h-[72px] sm:h-[92px] flex items-center justify-center">
        {tile ? (
          <TileButton
            tile={tile}
            disabled={isResettingBoard || isHidden}
            hidden={isHidden}
            onClick={() => onTileTap(index)}
          />
        ) : (
          <span className="text-text-main/40 text-2xl sm:text-3xl font-black select-none">?</span>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add responsive mobile thumb-reach layout distribution**

In `AssemblyGame.tsx` board container (lines 530-593):
Wrap the prompt in top section, and wrap the answer slot card + tray tile card in a bottom container.
On mobile (`<sm:`), use `flex-1 flex flex-col justify-between`:
- Top group: `TopBar` + `PromptBadge`
- Bottom group: Answer slots card + Tray card (anchored near the thumbs)
On `sm:` and larger screens, retain the standard centered spacing (`sm:justify-center sm:gap-6`).

- [ ] **Step 3: Verify Lint and Build**

Run: `npm run lint && npm run build`
Expected: Both pass cleanly.

- [ ] **Step 4: Commit**

```bash
git add src/games/assembly/AssemblyGame.tsx
git commit -m "feat: improve Assembly mobile thumb ergonomics and slot contrast"
```

---

### Task 4: Auditory Games Visual Audio Cue (`AuditoryPromptBadge`)

**Files:**
- Create: `src/shared/components/AuditoryPromptBadge.tsx`
- Modify: `src/shared/components/FindItGame.tsx:60-235`

**Interfaces:**
- Produces: `AuditoryPromptBadge` component.
- Consumes: `audioManager.play()`, `descriptor.getPromptAudio`, `descriptor.getReplayAudio`.

- [ ] **Step 1: Create `AuditoryPromptBadge.tsx` with concentric soundwave rings**

```tsx
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Volume2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { cx } from '../ui/utils';

interface AuditoryPromptBadgeProps {
  isPlaying: boolean;
  onReplay: () => void;
  label?: string;
  className?: string;
}

export function AuditoryPromptBadge({
  isPlaying,
  onReplay,
  label = 'Počúvaj',
  className,
}: AuditoryPromptBadgeProps) {
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onReplay}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onReplay()}
      aria-label="Prehrať zadanie znova"
      className={cx(
        'relative inline-flex items-center gap-3 !rounded-[28px] sm:!rounded-[36px] !px-6 !py-3 sm:!px-8 sm:!py-4 !shadow-block cursor-pointer select-none transition-transform active:scale-95',
        className
      )}
    >
      {/* Concentric soundwave ripple rings */}
      <div className="relative flex items-center justify-center w-8 h-8">
        {isPlaying && (
          <>
            <span className="absolute inline-flex h-full w-full rounded-full bg-primary/25 animate-ping" />
            <span className="absolute inline-flex h-11 w-11 rounded-full border-2 border-primary/40 animate-pulse" />
          </>
        )}
        <Volume2
          size={26}
          className={cx(
            'text-primary transition-transform',
            isPlaying && 'scale-110'
          )}
        />
      </div>

      <span className="font-spline text-lg sm:text-xl font-bold text-text-main">
        {label}
      </span>
    </Card>
  );
}
```

- [ ] **Step 2: Integrate `AuditoryPromptBadge` into `FindItGame.tsx`**

In `FindItGame.tsx`:
1. Add state: `const [isAudioPlaying, setIsAudioPlaying] = useState(false);`
2. Wrap prompt audio playback:
```tsx
const playPrompt = useCallback(async () => {
  if (!targetItem) return;
  setIsAudioPlaying(true);
  try {
    const spec = descriptor.getReplayAudio
      ? descriptor.getReplayAudio(targetItem)
      : descriptor.getPromptAudio(targetItem);
    await audioManager.play(spec);
  } finally {
    setIsAudioPlaying(false);
  }
}, [targetItem, descriptor]);
```
3. In the prompt area (line 228-230), if `prompt` is null, render:
```tsx
<AuditoryPromptBadge isPlaying={isAudioPlaying} onReplay={playPrompt} />
```

- [ ] **Step 3: Verify Lint and Build**

Run: `npm run lint && npm run build`
Expected: Both pass cleanly.

- [ ] **Step 4: Commit**

```bash
git add src/shared/components/AuditoryPromptBadge.tsx src/shared/components/FindItGame.tsx
git commit -m "feat: add AuditoryPromptBadge with concentric ripple animation to FindItGame"
```

---

### Task 5: Counting Game Zero-Collision CSS Grid & Web Audio Pop

**Files:**
- Create: `src/games/counting/countingSfx.ts`
- Modify: `src/games/counting/CountingItemsGame.tsx:26-89,200-224`

**Interfaces:**
- Produces: `playPopSound()` in `countingSfx.ts`.
- Consumes: Web Audio API `AudioContext`.

- [ ] **Step 1: Create procedural Web Audio bubble pop helper in `countingSfx.ts`**

```ts
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function playPopSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Frequency sweep down from 600Hz to 150Hz in 65ms
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.065);

    // Fast decay envelope
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.065);
  } catch {
    // AudioContext failure should never disrupt gameplay
  }
}
```

- [ ] **Step 2: Update `CountingItemsGame.tsx` layout and item interactions**

1. Replace percentage math in `generatePositions`:
   - Grid dimensions: 15 total slots (e.g. 5 cols × 3 rows on landscape, 3 cols × 4 rows on portrait = 12 or 15 cells).
   - Generate an array of cell items where exactly `count` randomly selected cells are filled with an emoji, rotation (±15°), and offset (±10px).
2. Render card items:
   - Use CSS grid: `grid grid-cols-3 sm:grid-cols-5 auto-rows-fr h-full w-full gap-2 sm:gap-4 p-3 sm:p-5 place-items-center`.
   - Each occupied cell renders a `<button>`:
     ```tsx
     <button
       type="button"
       onClick={() => playPopSound()}
       className="relative flex items-center justify-center text-5xl sm:text-7xl md:text-8xl select-none transition-transform active:scale-125 active:rotate-12 cursor-pointer focus:outline-none"
       style={{
         transform: `rotate(${pos.rotation}deg) translate(${pos.offsetX}px, ${pos.offsetY}px)`,
       }}
       aria-label="Spočítateľný predmet"
     >
       {pos.emoji}
     </button>
     ```
3. Guaranteed collision avoidance:
   Since each item is constrained to its own distinct CSS grid cell and separated by grid gaps, items can never overlap!

- [ ] **Step 3: Verify Lint and Build**

Run: `npm run lint && npm run build`
Expected: Clean pass.

- [ ] **Step 4: Commit**

```bash
git add src/games/counting/countingSfx.ts src/games/counting/CountingItemsGame.tsx
git commit -m "feat: implement collision-free CSS grid and Web Audio pop in Counting game"
```

---

### Task 6: Visual & Playwright End-to-End Verification

**Files:**
- Create: `e2e/ui-ux-enhancements.spec.ts`

**Interfaces:**
- Consumes: Playwright test runner, all updated routes.

- [ ] **Step 1: Write Playwright E2E test verifying all 5 enhancements**

Create `e2e/ui-ux-enhancements.spec.ts`:
- Test 1: `/counting` — verify items render without overlap, and clicking an item triggers the bounce and pop without submitting an answer prematurely.
- Test 2: `/alphabet` — verify `AuditoryPromptBadge` displays with "Počúvaj" and speaker icon.
- Test 3: `/assembly` — on mobile viewport (390×844), verify target prompt is at top, empty slots have high contrast, and tray tiles are in lower thumb zone.
- Test 4: `/words` and `/first-letter` — verify large word emojis and `PromptBadge` presence.
- Test 5: `/settings` — verify all avatar tops display Slovak labels.

- [ ] **Step 2: Run Playwright test suite**

Run: `npx playwright test e2e/ui-ux-enhancements.spec.ts`
Expected: All tests pass.

- [ ] **Step 3: Run Full Repository Verification**

Run: `npm run lint && npm run build`
Expected: All clean.

- [ ] **Step 4: Commit**

```bash
git add e2e/ui-ux-enhancements.spec.ts
git commit -m "test: add visual Playwright tests for UI/UX enhancements"
```
