# Routing & Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `App.tsx` screen state machine with React Router so that browser/system back navigation works and each game has a clean URL.

**Architecture:** Install `react-router-dom`, wrap the app in `<BrowserRouter>`, and replace the `screen`/`activeGame` state with `<Routes>`. Settings overlays stay as local state. Each game's `onExit` prop is wired to `navigate('/')`. Scroll restoration uses a ref + `useLayoutEffect` triggered by route change.

**Tech Stack:** React 19, React Router v6 (`react-router-dom`), TypeScript, Vite

---

## File Map

| File | Change |
|------|--------|
| `package.json` | Add `react-router-dom` |
| `src/main.tsx` | Wrap `<App>` in `<BrowserRouter>` |
| `src/App.tsx` | Replace state machine with `<Routes>`, update scroll restoration, remove `ScrollRestorer` component |
| `src/shared/types.ts` | Delete `Screen` type |

No changes to game components — `onExit` prop wiring is only at the call site in `App.tsx`.

---

### Task 1: Install react-router-dom

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the dependency**

```bash
npm install react-router-dom
```

Expected output: `added N packages` with no errors.

- [ ] **Step 2: Verify types are available**

```bash
npm run lint
```

Expected: passes (TypeScript types are bundled with `react-router-dom` v6 — no separate `@types` package needed).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add react-router-dom"
```

---

### Task 2: Wrap app in BrowserRouter

**Files:**
- Modify: `src/main.tsx`

- [ ] **Step 1: Update main.tsx**

Replace the file contents with:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
```

- [ ] **Step 2: Verify lint passes**

```bash
npm run lint
```

Expected: passes (App still uses the old state machine — no router hooks yet, so no errors).

- [ ] **Step 3: Commit**

```bash
git add src/main.tsx
git commit -m "feat: wrap app in BrowserRouter"
```

---

### Task 3: Remove Screen type

**Files:**
- Modify: `src/shared/types.ts`

- [ ] **Step 1: Delete the Screen type**

Open `src/shared/types.ts` and remove this line (currently line 8):

```ts
export type Screen = 'HOME' | 'GAME' | 'PARENTS_GATE' | 'SETTINGS';
```

- [ ] **Step 2: Verify lint**

```bash
npm run lint
```

Expected: TypeScript errors in `App.tsx` referencing `Screen` — that's expected and will be fixed in Task 4.

---

### Task 4: Replace state machine with Routes in App.tsx

**Files:**
- Modify: `src/App.tsx`

This is the main migration. Replace the entire file with the following:

- [ ] **Step 1: Write the new App.tsx**

```tsx
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useLayoutEffect, useRef, ReactNode } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Settings,
  Play,
  Gamepad2,
  Type,
  Apple,
  BookOpen
} from 'lucide-react';
import { audioManager } from './shared/services/audioManager';
import { loadSettings, saveSettings } from './shared/services/settingsService';
import { GameSettings, GameId, GameMetadata } from './shared/types';
import { ParentsGate } from './shared/components/ParentsGate';
import { SettingsOverlay } from './shared/components/SettingsOverlay';
import { AlphabetSettingsOverlay } from './games/alphabet/AlphabetSettingsOverlay';
import { SyllablesSettingsOverlay } from './games/syllables/SyllablesSettingsOverlay';
import { ErrorBoundary } from './shared/components/ErrorBoundary';
import { AlphabetGame } from './games/alphabet/AlphabetGame';
import { SyllablesGame } from './games/syllables/SyllablesGame';
import { NumbersGame } from './games/numbers/NumbersGame';
import { CountingItemsGame } from './games/counting/CountingItemsGame';
import { WordsGame } from './games/words/WordsGame';

type SettingsSource = 'home' | 'game' | 'alphabet' | 'syllables';
type SettingsScreen = 'none' | 'gate' | 'settings';

const GAMES: GameMetadata[] = [
  {
    id: 'ALPHABET',
    title: 'Abeceda',
    description: 'Spoznávaj písmenká hravou formou',
    icon: <Type size={48} className="sm:w-16 sm:h-16" />,
    color: 'bg-primary',
  },
  {
    id: 'SYLLABLES',
    title: 'Slabiky',
    description: 'Spájaj písmenká do slabík',
    icon: <Gamepad2 size={48} className="sm:w-16 sm:h-16" />,
    color: 'bg-success',
  },
  {
    id: 'NUMBERS',
    title: 'Čísla',
    description: 'Počítaj s kamarátmi',
    icon: <Play size={48} className="sm:w-16 sm:h-16 ml-2" fill="currentColor" />,
    color: 'bg-accent-blue',
  },
  {
    id: 'COUNTING_ITEMS',
    title: 'Spočítaj',
    description: 'Koľko jabĺčok vidíš?',
    icon: <Apple size={48} className="sm:w-16 sm:h-16" />,
    color: 'bg-soft-watermelon',
  },
  {
    id: 'WORDS',
    title: 'Slová',
    description: 'Prečítaj slovo a nájdi obrázok',
    icon: <BookOpen size={48} className="sm:w-16 sm:h-16" />,
    color: 'bg-soft-watermelon',
  },
];

const GAME_PATH: Record<GameId, string> = {
  ALPHABET: '/alphabet',
  SYLLABLES: '/syllables',
  NUMBERS: '/numbers',
  COUNTING_ITEMS: '/counting',
  WORDS: '/words',
};

function HomeLauncher({
  onOpenSettings,
  scrollRef,
}: {
  onOpenSettings: () => void;
  scrollRef: React.RefObject<number>;
}) {
  const navigate = useNavigate();

  const handleGameSelect = useCallback((gameId: GameId) => {
    scrollRef.current = window.scrollY;
    navigate(GAME_PATH[gameId]);
  }, [navigate, scrollRef]);

  return (
    <div className="min-h-screen relative bg-bg-light flex flex-col p-6 sm:p-12">
      <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-start mb-16 sm:mb-24">
          <div className="flex flex-col gap-2">
            <h1 className="text-5xl sm:text-7xl font-black text-text-main tracking-tight leading-none">Hravé Učenie</h1>
            <p className="text-xl sm:text-3xl font-medium opacity-50">Vyber si hru a poďme na to!</p>
          </div>

          <button
            onClick={onOpenSettings}
            className="w-16 h-16 sm:w-24 sm:h-24 bg-shadow/20 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 shrink-0"
          >
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/20 rounded-full blur-sm absolute" />
            <Settings size={32} className="sm:w-12 sm:h-12 text-text-main opacity-80" />
          </button>
        </div>

        {/* Game Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 sm:gap-12">
          {GAMES.map((game) => (
            <motion.button
              key={game.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleGameSelect(game.id)}
              className="group relative flex flex-col"
            >
              <div className="absolute inset-0 bg-shadow/10 rounded-[48px] sm:rounded-[60px] -m-2 sm:-m-4 transition-colors group-hover:bg-shadow/20" />
              <div className="relative bg-white rounded-[40px] sm:rounded-[48px] p-8 sm:p-12 flex flex-col gap-8 shadow-sm">
                <div className={`w-24 h-24 sm:w-32 sm:h-32 rounded-[32px] sm:rounded-[40px] ${game.color} flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110`}>
                  {game.icon}
                </div>
                <div className="text-left">
                  <h3 className="text-4xl sm:text-5xl font-black mb-3 text-text-main">{game.title}</h3>
                  <p className="text-xl sm:text-2xl font-medium opacity-50 leading-tight">{game.description}</p>
                </div>
              </div>
              <div className={`absolute -bottom-2 -right-2 w-32 h-32 ${game.color} opacity-5 rounded-full blur-3xl group-hover:opacity-10 transition-opacity`} />
            </motion.button>
          ))}
        </div>
      </div>

      {/* Background Decorations */}
      <div aria-hidden="true" className="fixed top-1/3 -left-32 w-96 h-96 rounded-full bg-accent-blue opacity-[0.03] blur-[100px] pointer-events-none" />
      <div aria-hidden="true" className="fixed bottom-0 -right-32 w-[500px] h-[500px] rounded-full bg-primary opacity-[0.03] blur-[100px] pointer-events-none" />
    </div>
  );
}

export default function App() {
  const [settings, setSettings] = useState<GameSettings>(loadSettings);
  const [settingsSource, setSettingsSource] = useState<SettingsSource>('home');
  const [settingsScreen, setSettingsScreen] = useState<SettingsScreen>('none');
  const location = useLocation();
  const homeScrollRef = useRef<number>(0);

  // Restore scroll when returning to home
  useLayoutEffect(() => {
    if (location.pathname === '/') {
      window.scrollTo(0, homeScrollRef.current);
    }
  }, [location.pathname]);

  // Sync settings with AudioManager
  useEffect(() => {
    audioManager.updateSettings(settings);
    saveSettings(settings);
  }, [settings]);

  // Audio unlocker for browsers that require a user gesture
  useEffect(() => {
    const unlockAudio = () => {
      const utterance = new SpeechSynthesisUtterance('');
      window.speechSynthesis.speak(utterance);
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };

    window.addEventListener('click', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);

    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  const handleOpenSettings = useCallback((source: SettingsSource = 'home') => {
    setSettingsSource(source);
    setSettingsScreen('gate');
  }, []);

  const handleGateSuccess = useCallback(() => {
    setSettingsScreen('settings');
  }, []);

  const handleCloseSettings = useCallback(() => {
    setSettingsScreen('none');
  }, []);

  const navigate = useNavigate();
  const handleExitGame = useCallback(() => {
    navigate('/');
  }, [navigate]);

  return (
    <div className="min-h-screen bg-bg-light font-fredoka text-text-main relative">
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, x: location.pathname === '/' ? -100 : 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: location.pathname === '/' ? 100 : -100 }}
          className="w-full min-h-screen"
        >
          <Routes location={location}>
            <Route
              path="/"
              element={
                <HomeLauncher
                  onOpenSettings={() => handleOpenSettings('home')}
                  scrollRef={homeScrollRef}
                />
              }
            />
            <Route
              path="/alphabet"
              element={
                <ErrorBoundary>
                  <AlphabetGame settings={settings} onExit={handleExitGame} onOpenSettings={() => handleOpenSettings('alphabet')} />
                </ErrorBoundary>
              }
            />
            <Route
              path="/syllables"
              element={
                <ErrorBoundary>
                  <SyllablesGame settings={settings} onExit={handleExitGame} onOpenSettings={() => handleOpenSettings('syllables')} />
                </ErrorBoundary>
              }
            />
            <Route
              path="/numbers"
              element={
                <ErrorBoundary>
                  <NumbersGame range={settings.numbersRange} onExit={handleExitGame} onOpenSettings={() => handleOpenSettings('game')} />
                </ErrorBoundary>
              }
            />
            <Route
              path="/counting"
              element={
                <ErrorBoundary>
                  <CountingItemsGame range={settings.countingRange} onExit={handleExitGame} onOpenSettings={() => handleOpenSettings('game')} />
                </ErrorBoundary>
              }
            />
            <Route
              path="/words"
              element={
                <ErrorBoundary>
                  <WordsGame onExit={handleExitGame} onOpenSettings={() => handleOpenSettings('game')} />
                </ErrorBoundary>
              }
            />
          </Routes>
        </motion.div>
      </AnimatePresence>

      {settingsScreen === 'gate' && (
        <ParentsGate
          onSuccess={handleGateSuccess}
          onCancel={() => setSettingsScreen('none')}
        />
      )}

      {settingsScreen === 'settings' && (settingsSource === 'home' || settingsSource === 'game') && (
        <SettingsOverlay
          settings={settings}
          onUpdate={setSettings}
          onClose={handleCloseSettings}
        />
      )}
      {settingsScreen === 'settings' && settingsSource === 'alphabet' && (
        <AlphabetSettingsOverlay
          settings={settings}
          onUpdate={setSettings}
          onClose={handleCloseSettings}
        />
      )}
      {settingsScreen === 'settings' && settingsSource === 'syllables' && (
        <SyllablesSettingsOverlay
          settings={settings}
          onUpdate={setSettings}
          onClose={handleCloseSettings}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: passes with no errors. If there are errors about `ReactNode` not being used — remove it from the import. The `ReactNode` import is only needed if JSX is stored in a variable; in this file it isn't used directly so remove it from the import line if lint complains.

- [ ] **Step 3: Verify dev server**

```bash
npm run dev
```

Open `http://localhost:3000` in browser:
- Home screen loads at `/`
- Click "Abeceda" — URL changes to `/alphabet`, game lobby appears
- Press browser back — URL returns to `/`, home screen appears with scroll position restored
- On mobile (or DevTools mobile mode): use system back gesture — same result

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/shared/types.ts
git commit -m "feat: replace screen state machine with React Router"
```

---

## Self-Review

**Spec coverage:**
- ✅ Back button works natively — React Router handles `popstate`
- ✅ Clean URLs: `/`, `/alphabet`, `/syllables`, `/numbers`, `/counting`, `/words`
- ✅ Settings stays as overlay with no URL
- ✅ Navigating to `/alphabet` directly opens game lobby
- ✅ Scroll restoration on return to `/`
- ✅ `Screen` type deleted
- ✅ `BrowserRouter` in `main.tsx`

**Placeholder scan:** None found.

**Type consistency:** `SettingsSource` unchanged. `SettingsScreen` replaces the old `Screen`-based settings flow cleanly. `GAME_PATH` maps `GameId` to URL string — consistent with `GAMES` array using same `GameId` values.
