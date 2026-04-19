# Settings Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give global settings a dedicated `/settings` route, unify all top bars into a shared `TopBar` component, and remove the "Test zvuku" section.

**Architecture:** Three independent tasks, each committable on its own. Task 1 is a pure deletion. Task 2 extracts duplicate top-bar markup into a single `TopBar` component used by `GameLobby`, `FindItGame`, and `ParentsGate`. Task 3 creates a full-page `SettingsScreen` routed at `/settings` and changes the home-settings gate flow to navigate there instead of opening an overlay.

**Tech Stack:** React, React Router v6, Tailwind CSS, lucide-react, TypeScript.

---

## File map

| Status | File | Change |
|--------|------|--------|
| Modify | `src/shared/components/SettingsOverlay.tsx` | Delete "Test zvuku" block |
| Create | `src/shared/components/TopBar.tsx` | New shared top-bar + BackButton |
| Modify | `src/shared/components/GameLobby.tsx` | Use TopBar |
| Modify | `src/shared/components/FindItGame.tsx` | Use TopBar |
| Modify | `src/shared/components/ParentsGate.tsx` | Use TopBar (replace absolute button) |
| Create | `src/shared/components/SettingsScreen.tsx` | Full-page settings for `/settings` route |
| Modify | `src/App.tsx` | Add `/settings` route; gate success for 'home' navigates there |

---

## Task 1: Remove "Test zvuku" from SettingsOverlay

**Files:**
- Modify: `src/shared/components/SettingsOverlay.tsx:46-55`

- [ ] **Step 1: Delete the "Test zvuku" block**

In `src/shared/components/SettingsOverlay.tsx`, remove lines 46–55 (the entire bordered div that contains the "Test zvuku" heading and "Vyskúšať zvuk 🔊" button):

```tsx
// BEFORE — lines 46-55, delete this entire block:
          <div className="pt-4 pb-8 border-b-2 border-shadow/10">
            <h3 className="text-2xl sm:text-3xl font-bold mb-6 text-center">Test zvuku</h3>
            <button 
              onClick={() => audioManager.playPraise()}
              className="w-full py-4 bg-accent-blue text-white rounded-2xl font-bold text-xl shadow-block active:translate-y-2 active:shadow-block-pressed"
            >
              Vyskúšať zvuk 🔊
            </button>
            <p className="text-center mt-4 text-lg opacity-50 font-medium">Klikni pre test hlasu</p>
          </div>
```

After deletion, the `import { ArrowLeft, Mic, Music } from 'lucide-react'` line still has `Mic` and `Music` used in the remaining sections — leave the import unchanged.

- [ ] **Step 2: Verify no remaining reference to `playPraise` in this file**

Run:
```bash
grep -n "playPraise\|Test zvuku" src/shared/components/SettingsOverlay.tsx
```
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/shared/components/SettingsOverlay.tsx
git commit -m "feat: remove Test zvuku section from SettingsOverlay"
```

---

## Task 2: Shared TopBar component

**Files:**
- Create: `src/shared/components/TopBar.tsx`
- Modify: `src/shared/components/GameLobby.tsx`
- Modify: `src/shared/components/FindItGame.tsx`
- Modify: `src/shared/components/ParentsGate.tsx`

### Step group A — Create TopBar

- [ ] **Step 1: Create `src/shared/components/TopBar.tsx`**

```tsx
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface TopBarProps {
  left?: React.ReactNode;
  center?: React.ReactNode;
  right?: React.ReactNode;
}

/** Shared 3-column top navigation bar used across game, lobby, settings, and gate screens. */
export function TopBar({ left, center, right }: TopBarProps) {
  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-start gap-3 sm:gap-4 shrink-0 pb-3 sm:pb-4">
      <div>{left ?? <div className="w-12 sm:w-14" />}</div>
      <div className="pt-1 sm:pt-1.5 flex justify-center">{center}</div>
      <div>{right ?? <div className="w-12 sm:w-14" />}</div>
    </div>
  );
}

/** Standard back button sized to match TopBar. */
export function BackButton({ onClick, label = 'Späť' }: { onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="w-12 h-12 sm:w-14 sm:h-14 bg-white rounded-full shadow-block flex items-center justify-center text-text-main transition-all active:translate-y-2 active:shadow-block-pressed"
    >
      <ArrowLeft size={24} className="sm:w-7 sm:h-7" />
    </button>
  );
}
```

### Step group B — Update GameLobby

- [ ] **Step 2: Update `src/shared/components/GameLobby.tsx`**

Replace the existing import of `ArrowLeft` and `Settings` and the inline top-bar grid. Full updated file:

```tsx
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Settings } from 'lucide-react';
import { TopBar, BackButton } from './TopBar';
import { COLORS } from '../contentRegistry';

interface GameLobbyProps {
  title: string;
  playButtonColorClassName: string;
  onPlay: () => void;
  onBack: () => void;
  onOpenSettings?: () => void;
  subtitle?: React.ReactNode;
  topDecorationClassName?: string;
  bottomDecorationClassName?: string;
}

function renderTitle(title: string) {
  return title.split('').map((char, i) => (
    <span
      key={`${title}-${i}`}
      className={`${COLORS[i % COLORS.length]} inline-block py-2`}
      style={{
        transform: `rotate(${Math.sin(i) * 10}deg) translateY(${Math.cos(i) * 10}px)`,
        textShadow: '0px 4px 0px white, 0px 8px 0px var(--color-shadow)',
      }}
    >
      {char}
    </span>
  ));
}

export function GameLobby({
  title,
  playButtonColorClassName,
  onPlay,
  onBack,
  onOpenSettings,
  subtitle,
  topDecorationClassName,
  bottomDecorationClassName,
}: GameLobbyProps) {
  const settingsButton = onOpenSettings ? (
    <button
      onClick={onOpenSettings}
      aria-label="Nastavenia"
      className="w-12 h-12 sm:w-14 sm:h-14 bg-white rounded-full shadow-block flex items-center justify-center text-text-main transition-all active:translate-y-2 active:shadow-block-pressed"
    >
      <Settings size={24} className="sm:w-7 sm:h-7" />
    </button>
  ) : undefined;

  return (
    <div className="min-h-[100svh] h-[100svh] overflow-hidden relative bg-bg-light flex flex-col items-center px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-5">
      <div className="w-full max-w-5xl flex-1 min-h-0 flex flex-col">
        <TopBar
          left={<BackButton onClick={onBack} />}
          right={settingsButton}
        />

        <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-6 sm:gap-8 px-4 pt-4 sm:pt-6 pb-5 sm:pb-6">
          <div className="text-center w-full max-w-5xl px-4 py-2 shrink-0">
            <h1 className="text-[clamp(3rem,10vw,6.5rem)] font-black flex flex-wrap justify-center gap-1 sm:gap-3 select-none leading-[0.95]">
              {renderTitle(title)}
            </h1>
            {subtitle && (
              <p className="text-[clamp(1.1rem,2.7vw,1.7rem)] font-bold opacity-55 mt-3">
                {subtitle}
              </p>
            )}
          </div>

          <button
            onClick={onPlay}
            aria-label="Hrať"
            className={`w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44 ${playButtonColorClassName} rounded-full shadow-block flex items-center justify-center text-white transition-all shrink-0`}
          >
            <Play size={42} className="sm:w-16 sm:h-16 md:w-20 md:h-20 ml-1.5 sm:ml-3" fill="currentColor" />
          </button>
        </div>
      </div>

      {topDecorationClassName && (
        <div aria-hidden="true" className={topDecorationClassName} />
      )}
      {bottomDecorationClassName && (
        <div aria-hidden="true" className={bottomDecorationClassName} />
      )}
    </div>
  );
}
```

Note: add `import { Play } from 'lucide-react'` — this replaces the old `ArrowLeft` import.

Wait — `Play` was already imported in the original. Check the original imports: `ArrowLeft, Play, Settings`. After the change we drop `ArrowLeft` (moved to TopBar.tsx), keep `Play` and `Settings`. Final import line:

```tsx
import { Play, Settings } from 'lucide-react';
```

### Step group C — Update FindItGame

- [ ] **Step 3: Update top bar in `src/shared/components/FindItGame.tsx`**

At the top of the file, add the TopBar imports alongside existing ones:

```tsx
// add to existing imports:
import { TopBar, BackButton } from './TopBar';
```

Then remove `ArrowLeft` from the `lucide-react` import (it's no longer used directly):

```tsx
// before:
import { Volume2, ArrowLeft } from 'lucide-react';
// after:
import { Volume2 } from 'lucide-react';
```

Find the inline top-bar grid block (lines ~206–223):

```tsx
        <div className="grid grid-cols-[auto_1fr_auto] items-start gap-3 sm:gap-4 shrink-0 pb-3 sm:pb-4">
          <button
            onClick={onExit}
            aria-label="Späť"
            className="w-12 h-12 sm:w-14 sm:h-14 bg-white rounded-full flex items-center justify-center text-text-main shadow-block transition-all active:translate-y-2 active:shadow-block-pressed"
          >
            <ArrowLeft size={24} className="sm:w-7 sm:h-7" />
          </button>
          <div className="pt-1 sm:pt-1.5 flex justify-center">
            <div className="bg-white rounded-full px-5 py-2 shadow-block font-bold text-base sm:text-lg text-text-main">
              ✓ {roundsPlayed} / {maxRounds}
            </div>
          </div>
          {replayButton}
        </div>
```

Replace with:

```tsx
        <TopBar
          left={<BackButton onClick={onExit} />}
          center={
            <div className="bg-white rounded-full px-5 py-2 shadow-block font-bold text-base sm:text-lg text-text-main">
              ✓ {roundsPlayed} / {maxRounds}
            </div>
          }
          right={replayButton}
        />
```

### Step group D — Update ParentsGate

- [ ] **Step 4: Update `src/shared/components/ParentsGate.tsx`**

Currently the gate is `fixed inset-0 z-50 flex flex-col items-center justify-center` with an `absolute` back button. Replace the layout to use TopBar at the top, then center the content in the remaining space.

Full updated file:

```tsx
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { TopBar, BackButton } from './TopBar';

interface ParentsGateProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

function generateQuestion(): { a: number; b: number; op: '+' | '-'; answer: number } {
  if (Math.random() > 0.5) {
    const a = Math.floor(Math.random() * 9) + 1;
    const b = Math.floor(Math.random() * 9) + 1;
    return { a, b, op: '+', answer: a + b };
  } else {
    const diff = Math.floor(Math.random() * 9) + 1;
    const b = Math.floor(Math.random() * 9) + 1;
    const a = b + diff;
    return { a, b, op: '-', answer: diff };
  }
}

export function ParentsGate({ onSuccess, onCancel }: ParentsGateProps) {
  const [question, setQuestion] = useState(generateQuestion);
  const [input, setInput] = useState('');
  const [shaking, setShaking] = useState(false);
  const shakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDigit = useCallback((digit: string) => {
    setInput(prev => prev.length < 2 ? prev + digit : prev);
  }, []);

  const handleBackspace = useCallback(() => {
    setInput(prev => prev.slice(0, -1));
  }, []);

  useEffect(() => {
    return () => {
      if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
    };
  }, []);

  const handleConfirm = useCallback(() => {
    if (!input || shaking) return;
    if (parseInt(input, 10) === question.answer) {
      onSuccess();
    } else {
      setShaking(true);
      shakeTimerRef.current = setTimeout(() => {
        setShaking(false);
        setQuestion(generateQuestion());
        setInput('');
      }, 500);
    }
  }, [input, shaking, question.answer, onSuccess]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg-light/95 backdrop-blur-md px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-5">
      <TopBar left={<BackButton onClick={onCancel} />} />

      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="w-full max-w-sm px-6 flex flex-col items-center gap-6">
          <div className="text-center">
            <h2 className="text-4xl font-bold text-text-main">Pre rodičov</h2>
            <p className="text-lg opacity-60 font-medium mt-1">Vyriešte príklad pre vstup</p>
          </div>

          <div
            className={`w-full bg-white rounded-[28px] shadow-block py-6 text-center text-5xl font-bold text-text-main ${shaking ? 'animate-shake' : ''}`}
          >
            {question.a} {question.op} {question.b} = ?
          </div>

          <div className="w-full bg-white rounded-2xl shadow-block py-4 min-h-[72px] flex items-center justify-center text-4xl font-bold text-text-main">
            {input || <span className="opacity-30">—</span>}
          </div>

          <div className="grid grid-cols-3 gap-3 w-full">
            {DIGITS.map(d => (
              <button
                key={d}
                onClick={() => handleDigit(d)}
                className="bg-white rounded-2xl py-5 text-2xl font-bold text-text-main shadow-block active:translate-y-2 active:shadow-block-pressed"
              >
                {d}
              </button>
            ))}
            <button
              onClick={handleBackspace}
              className="bg-bg-light rounded-2xl py-5 text-xl font-bold text-text-main shadow-block active:translate-y-2 active:shadow-block-pressed opacity-70"
            >
              ⌫
            </button>
            <button
              onClick={() => handleDigit('0')}
              className="bg-white rounded-2xl py-5 text-2xl font-bold text-text-main shadow-block active:translate-y-2 active:shadow-block-pressed"
            >
              0
            </button>
            <button
              onClick={handleConfirm}
              disabled={!input || shaking}
              className="bg-success rounded-2xl py-5 text-2xl font-bold text-text-main shadow-block-correct active:translate-y-2 active:shadow-block-pressed disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ✓
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verify `safe-top-lg safe-left-lg` classes are no longer referenced (they were only in ParentsGate)**

```bash
grep -rn "safe-top-lg\|safe-left-lg" src/
```
Expected: no output.

- [ ] **Step 6: Verify `ArrowLeft` is no longer imported in ParentsGate**

```bash
grep -n "ArrowLeft" src/shared/components/ParentsGate.tsx
```
Expected: no output.

- [ ] **Step 7: Commit**

```bash
git add src/shared/components/TopBar.tsx \
        src/shared/components/GameLobby.tsx \
        src/shared/components/FindItGame.tsx \
        src/shared/components/ParentsGate.tsx
git commit -m "feat: extract TopBar component; update GameLobby, FindItGame, ParentsGate"
```

---

## Task 3: Dedicated `/settings` route

**Files:**
- Create: `src/shared/components/SettingsScreen.tsx`
- Modify: `src/App.tsx`

### Step group A — Create SettingsScreen

- [ ] **Step 1: Create `src/shared/components/SettingsScreen.tsx`**

This is a full-page (non-overlay) settings component. It uses `TopBar` + `BackButton` and contains the same settings sections as `SettingsOverlay`, but without "Test zvuku" (already removed in Task 1) and without the card wrapper.

```tsx
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Mic, Music } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TopBar, BackButton } from './TopBar';
import { SettingToggle } from './SettingToggle';
import { GameSettings } from '../types';
import { audioManager } from '../services/audioManager';

interface SettingsScreenProps {
  settings: GameSettings;
  onUpdate: (settings: GameSettings) => void;
}

export function SettingsScreen({ settings, onUpdate }: SettingsScreenProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-[100svh] bg-bg-light flex flex-col px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-5">
      <div className="w-full max-w-2xl mx-auto flex flex-col flex-1">
        <TopBar left={<BackButton onClick={() => navigate('/')} />} />

        <div className="text-center mb-6 sm:mb-10">
          <h2 className="text-3xl sm:text-5xl font-bold mb-1 sm:mb-2">Rodičovská zóna</h2>
          <p className="text-base sm:text-xl opacity-60 font-medium">Nastavenia</p>
        </div>

        <div className="space-y-4 sm:space-y-8 flex-1">
          <SettingToggle
            label="Hudba"
            icon={<Music size={24} className="sm:w-8 sm:h-8" />}
            active={settings.music}
            color="bg-shadow"
            onToggle={() => {
              const newMusic = !settings.music;
              audioManager.updateSettings({ music: newMusic });
              onUpdate({ ...settings, music: newMusic });
            }}
          />

          <div className="pt-4 pb-8 border-b-2 border-shadow/10">
            <h3 className="text-2xl sm:text-3xl font-bold mb-6 text-center">Vlastné nahrávky</h3>
            <button
              onClick={() => navigate('/recordings')}
              className="w-full py-4 bg-accent-blue text-white rounded-2xl font-bold text-xl shadow-block active:translate-y-2 active:shadow-block-pressed flex items-center justify-center gap-3"
            >
              <Mic size={24} />
              Spravovať nahrávky
            </button>
            <p className="text-center mt-4 text-lg opacity-50 font-medium">Nahraj vlastný hlas pre každý zvuk</p>
          </div>

          <div className="pt-8 border-t-2 border-shadow/10">
            <h3 className="text-2xl sm:text-3xl font-bold mb-6 text-center">Hra s číslami</h3>
            <div className="grid grid-cols-3 gap-4">
              {[5, 10, 20].map((max) => (
                <button
                  key={max}
                  onClick={() => onUpdate({ ...settings, numbersRange: { start: 1, end: max } })}
                  className={`py-4 rounded-2xl font-bold text-xl transition-all ${
                    settings.numbersRange.end === max
                      ? 'bg-accent-blue text-white shadow-block scale-105'
                      : 'bg-bg-light text-text-main opacity-60'
                  }`}
                >
                  1 - {max}
                </button>
              ))}
            </div>
            <p className="text-center mt-4 text-lg opacity-50 font-medium">Vyberte rozsah čísel pre hru</p>
          </div>

          <div className="pt-8 pb-8 border-t-2 border-shadow/10">
            <h3 className="text-2xl sm:text-3xl font-bold mb-6 text-center">Hra s počítaním</h3>
            <div className="grid grid-cols-2 gap-4">
              {[5, 10].map((max) => (
                <button
                  key={max}
                  onClick={() => onUpdate({ ...settings, countingRange: { start: 1, end: max } })}
                  className={`py-4 rounded-2xl font-bold text-xl transition-all ${
                    settings.countingRange.end === max
                      ? 'bg-soft-watermelon text-white shadow-block scale-105'
                      : 'bg-bg-light text-text-main opacity-60'
                  }`}
                >
                  1 - {max}
                </button>
              ))}
            </div>
            <p className="text-center mt-4 text-lg opacity-50 font-medium">Vyberte rozsah pre počítanie predmetov</p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### Step group B — Wire up App.tsx

- [ ] **Step 2: Update `src/App.tsx`**

**2a. Add import** for `SettingsScreen` (alongside existing imports):

```tsx
import { SettingsScreen } from './shared/components/SettingsScreen';
```

**2b. Change `handleGateSuccess`** so that when the source is `'home'`, it navigates to `/settings` instead of showing an overlay:

```tsx
// before:
  const handleGateSuccess = useCallback(() => {
    setSettingsScreen('settings');
  }, []);

// after:
  const handleGateSuccess = useCallback(() => {
    if (settingsSource === 'home') {
      setSettingsScreen('none');
      navigate('/settings');
    } else {
      setSettingsScreen('settings');
    }
  }, [settingsSource, navigate]);
```

**2c. Add the `/settings` route** inside `<Routes>` (place it after `/recordings`):

```tsx
          <Route
            path="/settings"
            element={
              <SettingsScreen settings={settings} onUpdate={setSettings} />
            }
          />
```

**2d. Remove the overlay branch for `settingsSource === 'home'`** from the overlay rendering block. Find:

```tsx
      {settingsScreen === 'settings' && (settingsSource === 'home' || settingsSource === 'game') && (
        <SettingsOverlay
```

Replace with:

```tsx
      {settingsScreen === 'settings' && settingsSource === 'game' && (
        <SettingsOverlay
```

**2e. Clean up the `SettingsSource` type** in `src/shared/types.ts` — `'home'` is still a valid value (it reaches the gate, then navigates), so leave the type unchanged. No change needed here.

- [ ] **Step 3: Verify the overlay block in App.tsx no longer has `'home'`**

```bash
grep -n "settingsSource === 'home'" src/App.tsx
```
Expected: no output (the only remaining reference to `'home'` should be in `handleGateSuccess`).

- [ ] **Step 4: Verify SettingsScreen is listed in routes**

```bash
grep -n "settings" src/App.tsx
```
Expected: lines showing the `/settings` Route and the SettingsScreen import.

- [ ] **Step 5: Commit**

```bash
git add src/shared/components/SettingsScreen.tsx src/App.tsx
git commit -m "feat: add /settings route; global settings is now a full page, in-game stays overlay"
```

---

## Self-review

### Spec coverage

| Requirement | Task | Status |
|---|---|---|
| Global settings at `/settings` URL | Task 3 | ✓ |
| In-game settings stay as overlays | Task 3 (only 'home' changes) | ✓ |
| Unified top bar across ParentsGate, SettingsScreen, GameLobby, FindItGame | Task 2 + TopBar used in SettingsScreen | ✓ |
| Remove "Test zvuku" | Task 1 | ✓ |

### Potential gaps / notes

- **`SettingsOverlay` (in-game generic)** still has "Vlastné nahrávky" navigation. That's intentional — it navigates from in-game settings to recordings, which is a valid flow.
- **HomeLauncher** (`App.tsx` inline) is intentionally not converted to TopBar — its header has a large title/subtitle layout that is structurally different from the game/lobby top bars. The user's requirement targets "game (and lobby) screens, parent lock, and settings".
- **`Navigate` catch-all** `path="*"` in App.tsx already redirects unknown paths to `/` — a user typing `/settings` in the URL bar will reach it correctly since it's a real route now.
- **Back button on SettingsScreen** calls `navigate('/')` directly (no browser history issues since `/settings` is always entered via the gate flow from home, so the history stack is `/ → /settings`).
