# User-Customisable Content Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make word/praise content user-editable (with built-in words as seeded defaults), deliver all game content via a single `useContent()` hook, and replace the recordings screen with a Custom Content screen at `/content`.

**Architecture:** `ContentRepository` interface (implemented by `LocalContentRepository` via localStorage) stores user-managed word and praise lists. `ContentProvider` seeds defaults on first launch per locale, exposes reactive content to all games via `useContent()`, and handles mutations including audio blob cleanup. Games migrate from `getLocaleContent(locale)` calls to `useContent()`. The recordings screen becomes `CustomContentScreen` with two sections: system audio overrides (letters/numbers/phrases, unchanged behavior) and editable lists (words/praises with full CRUD and audio recording).

**Tech Stack:** TypeScript, React context + hooks, localStorage (word/praise metadata), existing IndexedDB `audioOverrideStore` (audio blobs), existing `useRecorder` hook.

**Spec:** `docs/superpowers/specs/2026-04-25-user-customisable-content-design.md`

---

## File Map

| File | Action |
|---|---|
| `src/shared/types.ts` | Add `UserWord`, `UserPraise` |
| `src/shared/services/contentRepository.ts` | Create — interface |
| `src/shared/services/localContentRepository.ts` | Create — localStorage impl |
| `src/shared/contexts/ContentContext.tsx` | Create — provider + hook |
| `src/shared/contentRegistry.ts` | Export `deriveSyllableItems`; keep `getLocaleContent` for internal provider use |
| `src/App.tsx` | Wrap with `ContentProvider`; add `/content` route; redirect `/recordings`; remove `locale` prop from game routes |
| `src/shared/components/SuccessOverlay.tsx` | Use `useContent()` for praise; drop `locale` prop |
| `src/shared/components/FindItGame.tsx` | Drop `locale` prop; add empty-items guard |
| `src/games/alphabet/AlphabetGame.tsx` | Use `useContent()`; drop `locale` prop |
| `src/games/alphabet/alphabetDescriptor.tsx` | Accept `letterItems` + `locale` params instead of calling registry |
| `src/games/syllables/SyllablesGame.tsx` | Use `useContent()`; drop `locale` prop |
| `src/games/syllables/syllablesDescriptor.tsx` | Accept `syllableItems` + `locale` params |
| `src/games/numbers/NumbersGame.tsx` | Use `useContent()`; drop `locale` prop |
| `src/games/numbers/numbersDescriptor.tsx` | Accept `numberItems` + `locale` params |
| `src/games/counting/CountingItemsGame.tsx` | Use `useContent()`; drop `locale` prop |
| `src/games/words/WordsGame.tsx` | Use `useContent()`; drop `locale` prop; add empty guard |
| `src/games/words/wordsDescriptor.tsx` | Accept `wordItems` + `locale` params |
| `src/games/assembly/AssemblyGame.tsx` | Use `useContent()`; drop `locale` prop; add empty guard |
| `src/content/CustomContentScreen.tsx` | Create — replaces `AudioRecordingScreen` |
| `src/recordings/AudioRecordingScreen.tsx` | Delete |
| `src/recordings/RecordingListItem.tsx` | Reused as-is (imported by CustomContentScreen) |
| `src/shared/components/SettingsContent.tsx` | Update "Manage Recordings" button label + route |

---

## Task 1: Add UserWord and UserPraise types

**Files:**
- Modify: `src/shared/types.ts`

- [ ] **Step 1: Add types at the end of `src/shared/types.ts`**, after the `AudioPhrase` / `AudioPhraseKey` block and before `LocaleContent`:

```typescript
// ---------------------------------------------------------------------------
// User-managed content — stored in LocalContentRepository, seeded from defaults
// ---------------------------------------------------------------------------

export interface UserWord {
  id: string;
  word: string;       // "Jahoda"
  syllables: string;  // "ja-ho-da"
  emoji: string;      // required
  imageUrl?: string;  // reserved — future photo support
  audioKey: string;   // defaults keep original key; custom words use "custom-{id}"
  status: 'draft' | 'ready'; // ready = audio exists; only ready words appear in games
  isDefault: boolean;
  locale: string;
  order: number;
}

export interface UserPraise {
  id: string;
  text: string;       // "Výborne!"
  emoji: string;      // required
  imageUrl?: string;  // reserved — future photo support
  audioKey: string;
  status: 'draft' | 'ready';
  isDefault: boolean;
  locale: string;
  order: number;
}
```

- [ ] **Step 2: Verify**

```bash
cd /home/skclaw/teo-learn && npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/shared/types.ts
git commit -m "feat: add UserWord and UserPraise types"
```

---

## Task 2: ContentRepository interface

**Files:**
- Create: `src/shared/services/contentRepository.ts`

- [ ] **Step 1: Create the file**

```typescript
// src/shared/services/contentRepository.ts
import type { UserWord, UserPraise } from '../types';

export interface ContentRepository {
  readonly locale: string;

  isSeeded(): Promise<boolean>;
  seed(words: UserWord[], praises: UserPraise[]): Promise<void>;

  getWords(): Promise<UserWord[]>;
  addWord(word: Omit<UserWord, 'id' | 'status' | 'order' | 'locale'>): Promise<UserWord>;
  updateWord(
    id: string,
    changes: Partial<Pick<UserWord, 'word' | 'syllables' | 'emoji' | 'imageUrl' | 'status' | 'order'>>,
  ): Promise<UserWord>;
  deleteWord(id: string): Promise<void>;

  getPraises(): Promise<UserPraise[]>;
  addPraise(praise: Omit<UserPraise, 'id' | 'status' | 'order' | 'locale'>): Promise<UserPraise>;
  updatePraise(
    id: string,
    changes: Partial<Pick<UserPraise, 'text' | 'emoji' | 'imageUrl' | 'status' | 'order'>>,
  ): Promise<UserPraise>;
  deletePraise(id: string): Promise<void>;
}
```

- [ ] **Step 2: Verify**

```bash
cd /home/skclaw/teo-learn && npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/shared/services/contentRepository.ts
git commit -m "feat: add ContentRepository interface"
```

---

## Task 3: LocalContentRepository

**Files:**
- Create: `src/shared/services/localContentRepository.ts`

- [ ] **Step 1: Create the file**

```typescript
// src/shared/services/localContentRepository.ts
import type { UserWord, UserPraise } from '../types';
import type { ContentRepository } from './contentRepository';

function wordsKey(locale: string) { return `hrave-ucenie-user-words-${locale}`; }
function praisesKey(locale: string) { return `hrave-ucenie-user-praises-${locale}`; }
function seededKey(locale: string) { return `hrave-ucenie-seeded-${locale}`; }

function readJson<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function writeJson<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // Quota exceeded — silent fail, same pattern as settingsService
  }
}

export class LocalContentRepository implements ContentRepository {
  constructor(readonly locale: string) {}

  async isSeeded(): Promise<boolean> {
    return localStorage.getItem(seededKey(this.locale)) === 'true';
  }

  async seed(words: UserWord[], praises: UserPraise[]): Promise<void> {
    if (await this.isSeeded()) return;
    writeJson(wordsKey(this.locale), words);
    writeJson(praisesKey(this.locale), praises);
    localStorage.setItem(seededKey(this.locale), 'true');
  }

  async getWords(): Promise<UserWord[]> {
    return readJson<UserWord>(wordsKey(this.locale));
  }

  async addWord(word: Omit<UserWord, 'id' | 'status' | 'order' | 'locale'>): Promise<UserWord> {
    const words = await this.getWords();
    const newWord: UserWord = {
      ...word,
      id: crypto.randomUUID(),
      status: 'draft',
      order: words.length,
      locale: this.locale,
    };
    writeJson(wordsKey(this.locale), [...words, newWord]);
    return newWord;
  }

  async updateWord(
    id: string,
    changes: Partial<Pick<UserWord, 'word' | 'syllables' | 'emoji' | 'imageUrl' | 'status' | 'order'>>,
  ): Promise<UserWord> {
    const words = await this.getWords();
    const index = words.findIndex((w) => w.id === id);
    if (index === -1) throw new Error(`Word ${id} not found`);
    const updated = { ...words[index], ...changes };
    const next = [...words];
    next[index] = updated;
    writeJson(wordsKey(this.locale), next);
    return updated;
  }

  async deleteWord(id: string): Promise<void> {
    const words = await this.getWords();
    writeJson(wordsKey(this.locale), words.filter((w) => w.id !== id));
  }

  async getPraises(): Promise<UserPraise[]> {
    return readJson<UserPraise>(praisesKey(this.locale));
  }

  async addPraise(praise: Omit<UserPraise, 'id' | 'status' | 'order' | 'locale'>): Promise<UserPraise> {
    const praises = await this.getPraises();
    const newPraise: UserPraise = {
      ...praise,
      id: crypto.randomUUID(),
      status: 'draft',
      order: praises.length,
      locale: this.locale,
    };
    writeJson(praisesKey(this.locale), [...praises, newPraise]);
    return newPraise;
  }

  async updatePraise(
    id: string,
    changes: Partial<Pick<UserPraise, 'text' | 'emoji' | 'imageUrl' | 'status' | 'order'>>,
  ): Promise<UserPraise> {
    const praises = await this.getPraises();
    const index = praises.findIndex((p) => p.id === id);
    if (index === -1) throw new Error(`Praise ${id} not found`);
    const updated = { ...praises[index], ...changes };
    const next = [...praises];
    next[index] = updated;
    writeJson(praisesKey(this.locale), next);
    return updated;
  }

  async deletePraise(id: string): Promise<void> {
    const praises = await this.getPraises();
    writeJson(praisesKey(this.locale), praises.filter((p) => p.id !== id));
  }
}
```

- [ ] **Step 2: Verify**

```bash
cd /home/skclaw/teo-learn && npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/shared/services/localContentRepository.ts
git commit -m "feat: add LocalContentRepository (localStorage impl)"
```

---

## Task 4: Export deriveSyllableItems from contentRegistry

**Files:**
- Modify: `src/shared/contentRegistry.ts`

- [ ] **Step 1: Export `_deriveSyllableItems` as `deriveSyllableItems`**

In `src/shared/contentRegistry.ts`, change line 30 from:

```typescript
function _deriveSyllableItems(wordItems: Word[]): Syllable[] {
```

to:

```typescript
export function deriveSyllableItems(wordItems: Word[]): Syllable[] {
```

- [ ] **Step 2: Update the one internal call site** (line 63 in the same file):

```typescript
// Before
syllableItems: _deriveSyllableItems(effective.WORD_ITEMS),

// After
syllableItems: deriveSyllableItems(effective.WORD_ITEMS),
```

- [ ] **Step 3: Verify**

```bash
cd /home/skclaw/teo-learn && npm run lint
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/shared/contentRegistry.ts
git commit -m "feat: export deriveSyllableItems from contentRegistry"
```

---

## Task 5: ContentProvider and useContent hook

**Files:**
- Create: `src/shared/contexts/ContentContext.tsx`

- [ ] **Step 1: Create the file**

```typescript
// src/shared/contexts/ContentContext.tsx
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type {
  AudioPhrase,
  AudioPhraseKey,
  Letter,
  NumberItem,
  PraiseEntry,
  Syllable,
  UserPraise,
  UserWord,
  Word,
} from '../types';
import { deriveSyllableItems, getLocaleContent } from '../contentRegistry';
import type { ContentRepository } from '../services/contentRepository';
import { LocalContentRepository } from '../services/localContentRepository';
import { audioOverrideStore } from '../services/audioOverrideStore';

export interface ContentContextValue {
  locale: string;

  // System content — from locale registry, static per locale
  letterItems: Letter[];
  numberItems: NumberItem[];
  audioPhrases: Record<AudioPhraseKey, AudioPhrase>;

  // User-managed — reactive, only status:'ready' items
  wordItems: Word[];
  syllableItems: Syllable[];
  praiseEntries: PraiseEntry[];

  // Full lists including drafts — for management screen only
  allUserWords: UserWord[];
  allUserPraises: UserPraise[];

  isLoading: boolean;

  addWord(data: Omit<UserWord, 'id' | 'status' | 'order' | 'locale'>): Promise<void>;
  updateWord(
    id: string,
    changes: Partial<Pick<UserWord, 'word' | 'syllables' | 'emoji' | 'imageUrl' | 'status' | 'order'>>,
  ): Promise<void>;
  deleteWord(id: string): Promise<void>;
  addPraise(data: Omit<UserPraise, 'id' | 'status' | 'order' | 'locale'>): Promise<void>;
  updatePraise(
    id: string,
    changes: Partial<Pick<UserPraise, 'text' | 'emoji' | 'imageUrl' | 'status' | 'order'>>,
  ): Promise<void>;
  deletePraise(id: string): Promise<void>;
}

const ContentContext = createContext<ContentContextValue | null>(null);

export function useContent(): ContentContextValue {
  const ctx = useContext(ContentContext);
  if (!ctx) throw new Error('useContent must be used within ContentProvider');
  return ctx;
}

interface ContentProviderProps {
  locale: string;
  children: React.ReactNode;
}

export function ContentProvider({ locale, children }: ContentProviderProps) {
  const repoRef = useRef<ContentRepository>(new LocalContentRepository(locale));
  const [allUserWords, setAllUserWords] = useState<UserWord[]>([]);
  const [allUserPraises, setAllUserPraises] = useState<UserPraise[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const repo = new LocalContentRepository(locale);
    repoRef.current = repo;
    setIsLoading(true);

    const localeData = getLocaleContent(locale);

    const seedWords: UserWord[] = localeData.wordItems.map((w, i) => ({
      id: crypto.randomUUID(),
      word: w.word,
      syllables: w.syllables,
      emoji: w.emoji,
      audioKey: w.audioKey,
      status: 'ready' as const,
      isDefault: true,
      locale,
      order: i,
    }));

    const seedPraises: UserPraise[] = localeData.praiseEntries.map((p, i) => ({
      id: crypto.randomUUID(),
      text: p.text,
      emoji: p.emoji,
      audioKey: p.audioKey,
      status: 'ready' as const,
      isDefault: true,
      locale,
      order: i,
    }));

    void repo
      .seed(seedWords, seedPraises)
      .then(() => Promise.all([repo.getWords(), repo.getPraises()]))
      .then(([words, praises]) => {
        setAllUserWords(words);
        setAllUserPraises(praises);
        setIsLoading(false);
      });
  }, [locale]);

  const reload = useCallback(async () => {
    const [words, praises] = await Promise.all([
      repoRef.current.getWords(),
      repoRef.current.getPraises(),
    ]);
    setAllUserWords(words);
    setAllUserPraises(praises);
  }, []);

  const addWord = useCallback(
    async (data: Omit<UserWord, 'id' | 'status' | 'order' | 'locale'>) => {
      await repoRef.current.addWord(data);
      await reload();
    },
    [reload],
  );

  const updateWord = useCallback(
    async (
      id: string,
      changes: Partial<Pick<UserWord, 'word' | 'syllables' | 'emoji' | 'imageUrl' | 'status' | 'order'>>,
    ) => {
      await repoRef.current.updateWord(id, changes);
      await reload();
    },
    [reload],
  );

  const deleteWord = useCallback(
    async (id: string) => {
      const word = allUserWords.find((w) => w.id === id);
      await repoRef.current.deleteWord(id);
      if (word) {
        await audioOverrideStore.delete(`${locale}/words/${word.audioKey}`);
      }
      await reload();
    },
    [allUserWords, locale, reload],
  );

  const addPraise = useCallback(
    async (data: Omit<UserPraise, 'id' | 'status' | 'order' | 'locale'>) => {
      await repoRef.current.addPraise(data);
      await reload();
    },
    [reload],
  );

  const updatePraise = useCallback(
    async (
      id: string,
      changes: Partial<Pick<UserPraise, 'text' | 'emoji' | 'imageUrl' | 'status' | 'order'>>,
    ) => {
      await repoRef.current.updatePraise(id, changes);
      await reload();
    },
    [reload],
  );

  const deletePraise = useCallback(
    async (id: string) => {
      const praise = allUserPraises.find((p) => p.id === id);
      await repoRef.current.deletePraise(id);
      if (praise) {
        await audioOverrideStore.delete(`${locale}/praise/${praise.audioKey}`);
      }
      await reload();
    },
    [allUserPraises, locale, reload],
  );

  const localeData = getLocaleContent(locale);
  const readyWords = allUserWords.filter((w) => w.status === 'ready');
  const wordItems: Word[] = readyWords.map((w) => ({
    word: w.word,
    syllables: w.syllables,
    emoji: w.emoji,
    audioKey: w.audioKey,
  }));
  const syllableItems = deriveSyllableItems(wordItems);
  const praiseEntries: PraiseEntry[] = allUserPraises
    .filter((p) => p.status === 'ready')
    .map((p) => ({ text: p.text, emoji: p.emoji, audioKey: p.audioKey }));

  const value: ContentContextValue = {
    locale,
    letterItems: localeData.letterItems,
    numberItems: localeData.numberItems,
    audioPhrases: localeData.audioPhrases,
    wordItems,
    syllableItems,
    praiseEntries,
    allUserWords,
    allUserPraises,
    isLoading,
    addWord,
    updateWord,
    deleteWord,
    addPraise,
    updatePraise,
    deletePraise,
  };

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}
```

- [ ] **Step 2: Verify**

```bash
cd /home/skclaw/teo-learn && npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/shared/contexts/ContentContext.tsx
git commit -m "feat: add ContentProvider and useContent hook"
```

---

## Task 6: Wire ContentProvider into App.tsx

**Files:**
- Modify: `src/App.tsx`

The provider wraps the entire app and receives `locale` from the existing `appSettings` state. Game route elements lose the `locale` prop (they'll get it from `useContent()` after Tasks 9–14). The `/recordings` route becomes a redirect to `/content`. A placeholder `/content` route is added here; it will be replaced with the real screen in Task 15.

- [ ] **Step 1: Add ContentProvider import**

At the top of `src/App.tsx`, add after the existing imports:

```typescript
import { ContentProvider } from './shared/contexts/ContentContext';
```

- [ ] **Step 2: Wrap the app shell with ContentProvider**

In the `return` of `App()`, wrap the outermost `<div>` with `<ContentProvider locale={locale}>`:

```tsx
return (
  <ContentProvider locale={locale}>
    <div className="min-h-screen bg-bg-light font-fredoka text-text-main relative">
      <div className="w-full min-h-screen">
        <Routes location={location}>
          {/* ... all routes unchanged for now ... */}
        </Routes>
      </div>
      {/* ... overlays unchanged ... */}
    </div>
  </ContentProvider>
);
```

- [ ] **Step 3: Add `/content` route and redirect `/recordings`**

Replace the existing `/recordings` route:

```tsx
// Remove:
<Route
  path="/recordings"
  element={
    <ErrorBoundary>
      <AudioRecordingScreen locale={appSettings.locale} />
    </ErrorBoundary>
  }
/>

// Add both:
<Route
  path="/content"
  element={
    <ErrorBoundary>
      {/* CustomContentScreen added in Task 15 */}
      <div className="p-8 text-center text-xl">Custom Content — coming in Task 15</div>
    </ErrorBoundary>
  }
/>
<Route path="/recordings" element={<Navigate to="/content" replace />} />
```

- [ ] **Step 4: Update the "Manage Recordings" button in `SettingsContent.tsx`**

Search for the navigate call to `/recordings` in `src/shared/components/SettingsContent.tsx` (or `settingsContentData.ts`) and update it to `/content`. Also update the button label from "Nahrávky" / "Manage Recordings" to "Vlastný obsah". The exact string depends on the current codebase state — grep for `/recordings` to find it:

```bash
grep -r "recordings" /home/skclaw/teo-learn/src --include="*.tsx" --include="*.ts" -l
```

Open the file(s) found and replace the route string `'/recordings'` with `'/content'` and update the visible label accordingly.

- [ ] **Step 5: Remove the `AudioRecordingScreen` import** from the top of `App.tsx`:

```typescript
// Remove this line:
import { AudioRecordingScreen } from './recordings/AudioRecordingScreen';
```

- [ ] **Step 6: Verify**

```bash
cd /home/skclaw/teo-learn && npm run lint
```

Expected: no errors. Open `npm run dev` and confirm the app loads, `/recordings` redirects to `/content`, and games still work.

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx src/shared/components/SettingsContent.tsx
git commit -m "feat: wrap app with ContentProvider, add /content route, redirect /recordings"
```

---

## Task 7: Migrate SuccessOverlay

**Files:**
- Modify: `src/shared/components/SuccessOverlay.tsx`

`SuccessOverlay` currently calls `getLocaleContent(locale).praiseEntries` on every show. After this task it uses `useContent().praiseEntries`, and the `locale` prop is removed.

- [ ] **Step 1: Add `useContent` import, remove `getLocaleContent` import**

```typescript
// Remove:
import { getLocaleContent, TIMING } from '../contentRegistry';

// Add:
import { TIMING } from '../contentRegistry';
import { useContent } from '../contexts/ContentContext';
```

- [ ] **Step 2: Update the component signature** — remove `locale` prop:

```typescript
// Before:
interface SuccessOverlayProps {
  show: boolean;
  spec: SuccessSpec;
  onComplete: () => void;
  locale?: string;
}

export function SuccessOverlay({ show, spec, onComplete, locale = 'sk' }: SuccessOverlayProps) {
  const [praise, setPraise] = useState<PraiseEntry>(getLocaleContent(locale).praiseEntries[0]);

// After:
interface SuccessOverlayProps {
  show: boolean;
  spec: SuccessSpec;
  onComplete: () => void;
}

export function SuccessOverlay({ show, spec, onComplete }: SuccessOverlayProps) {
  const { praiseEntries } = useContent();
  const [praise, setPraise] = useState<PraiseEntry>(praiseEntries[0] ?? { emoji: '🌟', text: 'Výborne!', audioKey: 'vyborne' });
```

- [ ] **Step 3: Update the `useEffect` inside SuccessOverlay** — replace `getLocaleContent(locale).praiseEntries` with `praiseEntries`:

```typescript
// Before (inside useEffect):
const praiseEntries = getLocaleContent(locale).praiseEntries;
const entry = spec.praiseEntry ?? praiseEntries[Math.floor(Math.random() * praiseEntries.length)];

// After:
const entry = spec.praiseEntry ?? praiseEntries[Math.floor(Math.random() * praiseEntries.length)];
```

Also remove `locale` from the `useEffect` dependency array (it no longer uses it). The dependency array stays `[show, spec]`.

- [ ] **Step 4: Remove the unused `locale` import from `getLocaleContent`** (already done in Step 1).

- [ ] **Step 5: Verify**

```bash
cd /home/skclaw/teo-learn && npm run lint
```

Expected: TypeScript will flag callers passing `locale` prop to `SuccessOverlay` — that's intentional. Fix them now in `FindItGame.tsx` and `AssemblyGame.tsx` by removing the `locale={locale}` prop. Both files still pass `spec` and `onComplete`, so just remove the `locale` prop from those JSX usages.

In `src/shared/components/FindItGame.tsx`, find:
```tsx
<SuccessOverlay show={showSuccess} spec={successSpec} onComplete={startNewRound} locale={locale} />
```
Change to:
```tsx
<SuccessOverlay show={showSuccess} spec={successSpec} onComplete={startNewRound} />
```

In `src/games/assembly/AssemblyGame.tsx`, find:
```tsx
<SuccessOverlay
  show={showSuccess}
  spec={{ ... }}
  onComplete={startNewRound}
  locale={locale}
/>
```
Remove `locale={locale}`.

- [ ] **Step 6: Verify again**

```bash
cd /home/skclaw/teo-learn && npm run lint
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/shared/components/SuccessOverlay.tsx src/shared/components/FindItGame.tsx src/games/assembly/AssemblyGame.tsx
git commit -m "feat: migrate SuccessOverlay to useContent() for praise, drop locale prop"
```

---

## Task 8: Migrate FindItGame — drop locale prop, add empty guard

**Files:**
- Modify: `src/shared/components/FindItGame.tsx`

- [ ] **Step 1: Remove the `locale` prop from `FindItGameProps`**

```typescript
// Before:
interface FindItGameProps<T> {
  descriptor: GameDescriptor<T>;
  onExit: () => void;
  locale?: string;
}

export function FindItGame<T>({ descriptor, onExit, locale = 'sk' }: FindItGameProps<T>) {

// After:
interface FindItGameProps<T> {
  descriptor: GameDescriptor<T>;
  onExit: () => void;
}

export function FindItGame<T>({ descriptor, onExit }: FindItGameProps<T>) {
```

- [ ] **Step 2: Add an empty-items guard** immediately before the `useState` initializer:

```typescript
export function FindItGame<T>({ descriptor, onExit }: FindItGameProps<T>) {
  if (descriptor.getItems().length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
        <p className="text-2xl font-bold text-text-main">Žiadne položky</p>
        <p className="text-lg opacity-60">Pridajte obsah v sekcii pre rodičov.</p>
        <button onClick={onExit} className="mt-4 px-6 py-3 bg-primary text-white rounded-2xl font-bold text-lg">
          Späť
        </button>
      </div>
    );
  }

  const [{ roundState }, setSession] = useState(() => {
    // ... existing initialization unchanged
```

- [ ] **Step 3: Verify**

```bash
cd /home/skclaw/teo-learn && npm run lint
```

Expected: TypeScript will flag callers still passing `locale` prop to `FindItGame` in game components (AlphabetGame, SyllablesGame, NumbersGame, WordsGame). Remove the `locale={locale}` prop from each:
- `src/games/alphabet/AlphabetGame.tsx` line ~24: `<FindItGame descriptor={descriptor} onExit={...} locale={locale} />` → remove `locale={locale}`
- `src/games/syllables/SyllablesGame.tsx`: same
- `src/games/numbers/NumbersGame.tsx`: same
- `src/games/words/WordsGame.tsx`: same

- [ ] **Step 4: Verify**

```bash
cd /home/skclaw/teo-learn && npm run lint
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/shared/components/FindItGame.tsx src/games/alphabet/AlphabetGame.tsx src/games/syllables/SyllablesGame.tsx src/games/numbers/NumbersGame.tsx src/games/words/WordsGame.tsx
git commit -m "feat: drop locale prop from FindItGame, add empty-items guard"
```

---

## Task 9: Migrate AlphabetGame + alphabetDescriptor

**Files:**
- Modify: `src/games/alphabet/alphabetDescriptor.tsx`
- Modify: `src/games/alphabet/AlphabetGame.tsx`

- [ ] **Step 1: Update `alphabetDescriptor.tsx`** — accept `letterItems` and `locale` as params instead of calling registry:

```typescript
// src/games/alphabet/alphabetDescriptor.tsx
import React from 'react';
import { GameDescriptor, Letter } from '../../shared/types';
import { getPhraseClip } from '../../shared/contentRegistry';

export function createAlphabetDescriptor(
  gridSize: 4 | 6 | 8,
  letterItems: Letter[],
  locale: string,
): GameDescriptor<Letter> {
  return {
    gridSize,
    gridCols: {
      base: 2,
      sm: gridSize === 8 ? 4 : gridSize === 6 ? 3 : 2,
    },
    getItems: () => letterItems,
    getItemId: (l) => l.symbol,
    renderCard: (l) => (
      <span className="text-[clamp(2.25rem,7vw,5rem)] font-bold font-spline leading-none">{l.symbol}</span>
    ),
    renderPrompt: () => null,
    getPromptAudio: (l) => ({
      clips: [
        getPhraseClip(locale, 'find'),
        { path: `${locale}/letters/${l.audioKey}`, fallbackText: l.symbol },
      ],
    }),
    getWrongAudio: (_t, s) => ({
      clips: [
        getPhraseClip(locale, 'thisIs'),
        { path: `${locale}/letters/${s.audioKey}`, fallbackText: s.symbol },
        getPhraseClip(locale, 'retry'),
      ],
    }),
    getSuccessSpec: (l) => ({
      echoLine: `${l.symbol} ako ${l.label} ${l.emoji}`,
      audioSpec: {
        clips: [
          { path: `${locale}/letters/${l.audioKey}`, fallbackText: `${l.symbol} ako ${l.label}` },
        ],
      },
    }),
    getFailureSpec: (l) => ({
      echoLine: `${l.symbol} ako ${l.label} ${l.emoji}`,
      audioSpec: {
        clips: [
          getPhraseClip(locale, 'neverMind'),
          getPhraseClip(locale, 'itIs'),
          { path: `${locale}/letters/${l.audioKey}`, fallbackText: `${l.symbol} ako ${l.label}` },
        ],
      },
    }),
  };
}
```

- [ ] **Step 2: Update `AlphabetGame.tsx`** — use `useContent()`, remove `locale` prop:

```typescript
// src/games/alphabet/AlphabetGame.tsx
import React, { useMemo, useState } from 'react';
import { GameSettings } from '../../shared/types';
import { FindItGame } from '../../shared/components/FindItGame';
import { GameLobby } from '../../shared/components/GameLobby';
import { GAME_DEFINITIONS_BY_ID } from '../../shared/gameCatalog';
import { createAlphabetDescriptor } from './alphabetDescriptor';
import { useContent } from '../../shared/contexts/ContentContext';

interface AlphabetGameProps {
  settings: GameSettings;
  onExit: () => void;
  onOpenSettings: () => void;
}

export function AlphabetGame({ settings, onExit, onOpenSettings }: AlphabetGameProps) {
  const { letterItems, locale } = useContent();
  const [gameState, setGameState] = useState<'HOME' | 'PLAYING'>('HOME');

  const filteredLetters = useMemo(
    () =>
      settings.alphabetAccents
        ? letterItems
        : letterItems.filter((l) => l.symbol.normalize('NFD') === l.symbol),
    [letterItems, settings.alphabetAccents],
  );

  const descriptor = useMemo(
    () => createAlphabetDescriptor(settings.alphabetGridSize, filteredLetters, locale),
    [settings.alphabetGridSize, filteredLetters, locale],
  );

  const lobby = GAME_DEFINITIONS_BY_ID.ALPHABET.lobby;

  if (gameState === 'PLAYING') {
    return <FindItGame descriptor={descriptor} onExit={() => setGameState('HOME')} />;
  }

  return (
    <GameLobby
      title={lobby.title}
      playButtonColorClassName={lobby.playButtonColorClassName}
      onPlay={() => setGameState('PLAYING')}
      onBack={onExit}
      onOpenSettings={onOpenSettings}
      topDecorationClassName={lobby.topDecorationClassName}
      bottomDecorationClassName={lobby.bottomDecorationClassName}
    />
  );
}
```

- [ ] **Step 3: Remove `locale` prop from the AlphabetGame route in `App.tsx`**

Find:
```tsx
<AlphabetGame locale={locale} settings={settings} onExit={handleExitGame} onOpenSettings={() => handleOpenSettings('ALPHABET')} />
```
Change to:
```tsx
<AlphabetGame settings={settings} onExit={handleExitGame} onOpenSettings={() => handleOpenSettings('ALPHABET')} />
```

- [ ] **Step 4: Verify**

```bash
cd /home/skclaw/teo-learn && npm run lint
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/games/alphabet/alphabetDescriptor.tsx src/games/alphabet/AlphabetGame.tsx src/App.tsx
git commit -m "feat: migrate AlphabetGame to useContent()"
```

---

## Task 10: Migrate SyllablesGame + syllablesDescriptor

**Files:**
- Modify: `src/games/syllables/syllablesDescriptor.tsx`
- Modify: `src/games/syllables/SyllablesGame.tsx`

- [ ] **Step 1: Update `syllablesDescriptor.tsx`** — accept `syllableItems` and `locale` as params:

```typescript
// src/games/syllables/syllablesDescriptor.tsx
import React from 'react';
import { GameDescriptor, Syllable } from '../../shared/types';
import { getPhraseClip } from '../../shared/contentRegistry';

export function createSyllablesDescriptor(
  gridSize: 4 | 6,
  syllableItems: Syllable[],
  locale: string,
): GameDescriptor<Syllable> {
  return {
    gridSize,
    gridCols: {
      base: 2,
      sm: gridSize === 6 ? 3 : 2,
    },
    getItems: () => syllableItems,
    getItemId: (s) => s.symbol,
    renderCard: (s) => (
      <span className="text-[clamp(2.25rem,7vw,5rem)] font-bold font-spline leading-none">{s.symbol}</span>
    ),
    renderPrompt: () => null,
    getPromptAudio: (s) => ({
      clips: [
        getPhraseClip(locale, 'find'),
        { path: `${locale}/syllables/${s.audioKey}`, fallbackText: s.symbol },
      ],
    }),
    getWrongAudio: (_t, s) => ({
      clips: [
        getPhraseClip(locale, 'thisIs'),
        { path: `${locale}/syllables/${s.audioKey}`, fallbackText: s.symbol },
        getPhraseClip(locale, 'retry'),
      ],
    }),
    getSuccessSpec: (s) => {
      const w = s.sourceWords[Math.floor(Math.random() * s.sourceWords.length)];
      return { echoLine: `${s.symbol} ako ${w.syllables} ${w.emoji}` };
    },
    getFailureSpec: (s) => {
      const w = s.sourceWords[Math.floor(Math.random() * s.sourceWords.length)];
      return {
        echoLine: `${s.symbol} ako ${w.syllables} ${w.emoji}`,
        audioSpec: {
          clips: [
            getPhraseClip(locale, 'neverMind'),
            getPhraseClip(locale, 'itIs'),
            { path: `${locale}/syllables/${s.audioKey}`, fallbackText: `slabika ${s.symbol}` },
          ],
        },
      };
    },
  };
}
```

- [ ] **Step 2: Update `SyllablesGame.tsx`** — use `useContent()`, remove `locale` prop:

```typescript
// src/games/syllables/SyllablesGame.tsx
import React, { useState } from 'react';
import { GameSettings } from '../../shared/types';
import { FindItGame } from '../../shared/components/FindItGame';
import { GameLobby } from '../../shared/components/GameLobby';
import { GAME_DEFINITIONS_BY_ID } from '../../shared/gameCatalog';
import { createSyllablesDescriptor } from './syllablesDescriptor';
import { useContent } from '../../shared/contexts/ContentContext';

interface SyllablesGameProps {
  settings: GameSettings;
  onExit: () => void;
  onOpenSettings: () => void;
}

export function SyllablesGame({ settings, onExit, onOpenSettings }: SyllablesGameProps) {
  const { syllableItems, locale } = useContent();
  const [gameState, setGameState] = useState<'HOME' | 'PLAYING'>('HOME');
  const descriptor = createSyllablesDescriptor(settings.syllablesGridSize, syllableItems, locale);
  const lobby = GAME_DEFINITIONS_BY_ID.SYLLABLES.lobby;

  if (gameState === 'PLAYING') {
    return <FindItGame descriptor={descriptor} onExit={() => setGameState('HOME')} />;
  }

  return (
    <GameLobby
      title={lobby.title}
      playButtonColorClassName={lobby.playButtonColorClassName}
      onPlay={() => setGameState('PLAYING')}
      onBack={onExit}
      onOpenSettings={onOpenSettings}
      topDecorationClassName={lobby.topDecorationClassName}
      bottomDecorationClassName={lobby.bottomDecorationClassName}
    />
  );
}
```

- [ ] **Step 3: Remove `locale` prop from the SyllablesGame route in `App.tsx`**

```tsx
// Before:
<SyllablesGame locale={locale} settings={settings} onExit={handleExitGame} onOpenSettings={() => handleOpenSettings('SYLLABLES')} />
// After:
<SyllablesGame settings={settings} onExit={handleExitGame} onOpenSettings={() => handleOpenSettings('SYLLABLES')} />
```

- [ ] **Step 4: Verify**

```bash
cd /home/skclaw/teo-learn && npm run lint
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/games/syllables/syllablesDescriptor.tsx src/games/syllables/SyllablesGame.tsx src/App.tsx
git commit -m "feat: migrate SyllablesGame to useContent()"
```

---

## Task 11: Migrate NumbersGame + numbersDescriptor

**Files:**
- Modify: `src/games/numbers/numbersDescriptor.tsx`
- Modify: `src/games/numbers/NumbersGame.tsx`

- [ ] **Step 1: Update `numbersDescriptor.tsx`** — accept `numberItems` and `locale` as params:

```typescript
// src/games/numbers/numbersDescriptor.tsx
import React from 'react';
import { GameDescriptor, NumberItem } from '../../shared/types';
import { getPhraseClip } from '../../shared/contentRegistry';

export function createNumbersDescriptor(
  range: { start: number; end: number },
  numberItems: NumberItem[],
  locale: string,
): GameDescriptor<NumberItem> {
  return {
    gridSize: 4,
    gridCols: { base: 2, sm: 4 },
    getItems: () => numberItems,
    getItemId: (n) => String(n.value),
    renderCard: (n) => (
      <span className="text-[clamp(2.25rem,7vw,5rem)] font-bold font-spline leading-none">{n.value}</span>
    ),
    renderPrompt: () => null,
    getPromptAudio: (n) => ({
      clips: [
        getPhraseClip(locale, 'find'),
        { path: `${locale}/numbers/${n.audioKey}`, fallbackText: String(n.value) },
      ],
    }),
    getWrongAudio: (_t, s) => ({
      clips: [
        getPhraseClip(locale, 'thisIs'),
        { path: `${locale}/numbers/${s.audioKey}`, fallbackText: String(s.value) },
        getPhraseClip(locale, 'retry'),
      ],
    }),
    getSuccessSpec: (n) => ({ echoLine: `Číslo ${n.value} 🎉` }),
    getFailureSpec: (n) => ({
      echoLine: `Číslo ${n.value} 🎉`,
      audioSpec: {
        clips: [
          getPhraseClip(locale, 'neverMind'),
          getPhraseClip(locale, 'itIs'),
          { path: `${locale}/numbers/${n.audioKey}`, fallbackText: `číslo ${n.value}` },
        ],
      },
    }),
  };
}
```

- [ ] **Step 2: Update `NumbersGame.tsx`** — use `useContent()`, remove `locale` prop:

```typescript
// src/games/numbers/NumbersGame.tsx
import React, { useMemo, useState } from 'react';
import { FindItGame } from '../../shared/components/FindItGame';
import { GameLobby } from '../../shared/components/GameLobby';
import { GAME_DEFINITIONS_BY_ID } from '../../shared/gameCatalog';
import { createNumbersDescriptor } from './numbersDescriptor';
import { useContent } from '../../shared/contexts/ContentContext';

interface NumbersGameProps {
  onExit: () => void;
  onOpenSettings: () => void;
  range: { start: number; end: number };
}

export function NumbersGame({ onExit, onOpenSettings, range }: NumbersGameProps) {
  const { numberItems, locale } = useContent();
  const [gameState, setGameState] = useState<'HOME' | 'PLAYING'>('HOME');

  const filteredNumbers = useMemo(
    () => numberItems.filter((n) => n.value >= range.start && n.value <= range.end),
    [numberItems, range],
  );

  const descriptor = useMemo(
    () => createNumbersDescriptor(range, filteredNumbers, locale),
    [range, filteredNumbers, locale],
  );

  const lobby = GAME_DEFINITIONS_BY_ID.NUMBERS.lobby;

  if (gameState === 'PLAYING') {
    return <FindItGame descriptor={descriptor} onExit={() => setGameState('HOME')} />;
  }

  return (
    <GameLobby
      title={lobby.title}
      playButtonColorClassName={lobby.playButtonColorClassName}
      subtitle={<>Rozsah: {range.start} - {range.end}</>}
      onPlay={() => setGameState('PLAYING')}
      onBack={onExit}
      onOpenSettings={onOpenSettings}
      topDecorationClassName={lobby.topDecorationClassName}
      bottomDecorationClassName={lobby.bottomDecorationClassName}
    />
  );
}
```

- [ ] **Step 3: Remove `locale` prop from the NumbersGame route in `App.tsx`**

```tsx
// Before:
<NumbersGame locale={locale} range={settings.numbersRange} onExit={handleExitGame} onOpenSettings={() => handleOpenSettings('NUMBERS')} />
// After:
<NumbersGame range={settings.numbersRange} onExit={handleExitGame} onOpenSettings={() => handleOpenSettings('NUMBERS')} />
```

- [ ] **Step 4: Verify**

```bash
cd /home/skclaw/teo-learn && npm run lint
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/games/numbers/numbersDescriptor.tsx src/games/numbers/NumbersGame.tsx src/App.tsx
git commit -m "feat: migrate NumbersGame to useContent()"
```

---

## Task 12: Migrate CountingItemsGame

**Files:**
- Modify: `src/games/counting/CountingItemsGame.tsx`

- [ ] **Step 1: Add `useContent` import**

```typescript
import { useContent } from '../../shared/contexts/ContentContext';
```

- [ ] **Step 2: Remove `locale` from the component props interface and signature**

```typescript
// Before:
interface CountingItemsGameProps {
  locale: string;
  onExit: () => void;
  onOpenSettings: () => void;
  range: { start: number; end: number };
}

export function CountingItemsGame({ locale, onExit, onOpenSettings, range }: CountingItemsGameProps) {

// After:
interface CountingItemsGameProps {
  onExit: () => void;
  onOpenSettings: () => void;
  range: { start: number; end: number };
}

export function CountingItemsGame({ onExit, onOpenSettings, range }: CountingItemsGameProps) {
  const { numberItems, locale } = useContent();
```

- [ ] **Step 3: Replace `getNumberItemsInRange(locale, range)` with filtered `numberItems`**

```typescript
// Before:
const availableItems = useMemo(() => getNumberItemsInRange(locale, range), [locale, range]);

// After:
const availableItems = useMemo(
  () => numberItems.filter((n) => n.value >= range.start && n.value <= range.end),
  [numberItems, range],
);
```

- [ ] **Step 4: Remove unused imports** from the contentRegistry import line. `getLocaleContent` and `getNumberItemsInRange` are no longer used. Keep `TIMING`, `COUNTING_EMOJIS`, `getPhraseClip`:

```typescript
// Before:
import { TIMING, COUNTING_EMOJIS, getNumberItemsInRange, getLocaleContent, getPhraseClip } from '../../shared/contentRegistry';

// After:
import { TIMING, COUNTING_EMOJIS, getPhraseClip } from '../../shared/contentRegistry';
```

- [ ] **Step 5: Remove `locale` prop from the CountingItemsGame route in `App.tsx`**

```tsx
// Before:
<CountingItemsGame locale={locale} range={settings.countingRange} onExit={handleExitGame} onOpenSettings={() => handleOpenSettings('COUNTING_ITEMS')} />
// After:
<CountingItemsGame range={settings.countingRange} onExit={handleExitGame} onOpenSettings={() => handleOpenSettings('COUNTING_ITEMS')} />
```

- [ ] **Step 6: Verify**

```bash
cd /home/skclaw/teo-learn && npm run lint
```

Expected: no errors. If `getLocaleContent` was called directly anywhere in the file (beyond the import), replace those calls with `useContent()` values.

- [ ] **Step 7: Commit**

```bash
git add src/games/counting/CountingItemsGame.tsx src/App.tsx
git commit -m "feat: migrate CountingItemsGame to useContent()"
```

---

## Task 13: Migrate WordsGame + wordsDescriptor

**Files:**
- Modify: `src/games/words/wordsDescriptor.tsx`
- Modify: `src/games/words/WordsGame.tsx`

- [ ] **Step 1: Update `wordsDescriptor.tsx`** — accept `wordItems` and `locale` as params:

```typescript
// src/games/words/wordsDescriptor.tsx
import React from 'react';
import { GameDescriptor, Word } from '../../shared/types';
import { getPhraseClip } from '../../shared/contentRegistry';

export function createWordsDescriptor(wordItems: Word[], locale: string): GameDescriptor<Word> {
  return {
    gridSize: 6,
    gridCols: { base: 2, sm: 3 },
    getItems: () => wordItems,
    getItemId: (w) => w.word,
    renderCard: (w) => (
      <span className="text-[clamp(2.25rem,7vw,5rem)] leading-none">{w.emoji}</span>
    ),
    renderPrompt: (w) => (
      <h2 className="text-[clamp(1.9rem,5.5vw,4rem)] font-black tracking-[0.12em] text-text-main leading-none">
        {w.syllables.toUpperCase()}
      </h2>
    ),
    getPromptAudio: (_w) => ({
      clips: [getPhraseClip(locale, 'find')],
    }),
    getReplayAudio: (w) => ({
      clips: [{ path: `${locale}/words/${w.audioKey}`, fallbackText: w.word }],
    }),
    getWrongAudio: (_t, s) => ({
      clips: [
        getPhraseClip(locale, 'thisIs'),
        { path: `${locale}/words/${s.audioKey}`, fallbackText: s.word },
        getPhraseClip(locale, 'retry'),
      ],
    }),
    getSuccessSpec: (w) => ({
      echoLine: `${w.syllables} ${w.emoji}`,
      audioSpec: { clips: [{ path: `${locale}/words/${w.audioKey}`, fallbackText: w.word }] },
    }),
    getFailureSpec: (w) => ({
      echoLine: `${w.syllables} ${w.emoji}`,
      audioSpec: {
        clips: [
          getPhraseClip(locale, 'neverMind'),
          getPhraseClip(locale, 'itIs'),
          { path: `${locale}/words/${w.audioKey}`, fallbackText: w.word },
        ],
      },
    }),
  };
}
```

- [ ] **Step 2: Update `WordsGame.tsx`** — use `useContent()`, remove `locale` prop, add empty guard:

```typescript
// src/games/words/WordsGame.tsx
import React, { useMemo, useState } from 'react';
import { FindItGame } from '../../shared/components/FindItGame';
import { GameLobby } from '../../shared/components/GameLobby';
import { GAME_DEFINITIONS_BY_ID } from '../../shared/gameCatalog';
import { createWordsDescriptor } from './wordsDescriptor';
import { useContent } from '../../shared/contexts/ContentContext';

interface WordsGameProps {
  onExit: () => void;
  onOpenSettings: () => void;
}

export function WordsGame({ onExit, onOpenSettings }: WordsGameProps) {
  const { wordItems, locale } = useContent();
  const [gameState, setGameState] = useState<'HOME' | 'PLAYING'>('HOME');
  const descriptor = useMemo(() => createWordsDescriptor(wordItems, locale), [wordItems, locale]);
  const lobby = GAME_DEFINITIONS_BY_ID.WORDS.lobby;

  if (gameState === 'PLAYING') {
    return <FindItGame descriptor={descriptor} onExit={() => setGameState('HOME')} />;
  }

  return (
    <GameLobby
      title={lobby.title}
      playButtonColorClassName={lobby.playButtonColorClassName}
      subtitle={wordItems.length === 0 ? <>Pridajte slová v sekcii Obsah</> : undefined}
      onPlay={() => {
        if (wordItems.length === 0) return;
        setGameState('PLAYING');
      }}
      onBack={onExit}
      onOpenSettings={onOpenSettings}
      topDecorationClassName={lobby.topDecorationClassName}
      bottomDecorationClassName={lobby.bottomDecorationClassName}
    />
  );
}
```

- [ ] **Step 3: Remove `locale` prop from the WordsGame route in `App.tsx`**

```tsx
// Before:
<WordsGame locale={locale} onExit={handleExitGame} onOpenSettings={() => handleOpenSettings('WORDS')} />
// After:
<WordsGame onExit={handleExitGame} onOpenSettings={() => handleOpenSettings('WORDS')} />
```

- [ ] **Step 4: Verify**

```bash
cd /home/skclaw/teo-learn && npm run lint
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/games/words/wordsDescriptor.tsx src/games/words/WordsGame.tsx src/App.tsx
git commit -m "feat: migrate WordsGame to useContent()"
```

---

## Task 14: Migrate AssemblyGame

**Files:**
- Modify: `src/games/assembly/AssemblyGame.tsx`

- [ ] **Step 1: Add `useContent` import**

```typescript
import { useContent } from '../../shared/contexts/ContentContext';
```

- [ ] **Step 2: Remove `locale` from props, get from context**

```typescript
// Before:
interface AssemblyGameProps {
  locale: string;
  onExit: () => void;
  onOpenSettings: () => void;
}

export function AssemblyGame({ locale, onExit, onOpenSettings }: AssemblyGameProps) {

// After:
interface AssemblyGameProps {
  onExit: () => void;
  onOpenSettings: () => void;
}

export function AssemblyGame({ onExit, onOpenSettings }: AssemblyGameProps) {
  const { wordItems, locale, praiseEntries } = useContent();
```

- [ ] **Step 3: Replace `getLocaleContent(locale).wordItems` with `wordItems` from context**

Find (around line 183):
```typescript
const eligibleWords = useMemo(
  () =>
    getLocaleContent(locale).wordItems.filter(({ syllables }) => {
      const syllableCount = syllables.split('-').length;
      return syllableCount >= 2 && syllableCount <= 3;
    }),
  [locale],
);
```

Replace with:
```typescript
const eligibleWords = useMemo(
  () =>
    wordItems.filter(({ syllables }) => {
      const syllableCount = syllables.split('-').length;
      return syllableCount >= 2 && syllableCount <= 3;
    }),
  [wordItems],
);
```

- [ ] **Step 4: Replace `getLocaleContent(locale).praiseEntries.find(...)` in the SuccessOverlay spec**

Find (around line 587):
```typescript
praiseEntry: getLocaleContent(locale).praiseEntries.find((entry) => entry.audioKey === 'vyborne'),
```

Replace with:
```typescript
praiseEntry: praiseEntries.find((entry) => entry.audioKey === 'vyborne'),
```

- [ ] **Step 5: Add empty guard in the HOME state render**

Before the existing `if (gameState === 'HOME')` return, the lobby should show a message when `eligibleWords.length === 0`. Update the GameLobby render inside the HOME check:

```tsx
if (gameState === 'HOME') {
  return (
    <GameLobby
      title={lobby.title}
      playButtonColorClassName={lobby.playButtonColorClassName}
      subtitle={
        eligibleWords.length === 0
          ? <>Pridajte slová so slabikami v sekcii Obsah</>
          : <></>
      }
      onPlay={() => {
        if (eligibleWords.length === 0) return;
        handlePlay();
      }}
      onBack={onExit}
      onOpenSettings={onOpenSettings}
      topDecorationClassName={lobby.topDecorationClassName}
      bottomDecorationClassName={lobby.bottomDecorationClassName}
    />
  );
}
```

- [ ] **Step 6: Remove unused `getLocaleContent` import from `contentRegistry`**

```typescript
// Before:
import { TIMING, getLocaleContent } from '../../shared/contentRegistry';

// After:
import { TIMING } from '../../shared/contentRegistry';
```

- [ ] **Step 7: Remove `locale` prop from the AssemblyGame route in `App.tsx`**

```tsx
// Before:
<AssemblyGame locale={locale} onExit={handleExitGame} onOpenSettings={() => handleOpenSettings('ASSEMBLY')} />
// After:
<AssemblyGame onExit={handleExitGame} onOpenSettings={() => handleOpenSettings('ASSEMBLY')} />
```

- [ ] **Step 8: Verify**

```bash
cd /home/skclaw/teo-learn && npm run lint
```

Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add src/games/assembly/AssemblyGame.tsx src/App.tsx
git commit -m "feat: migrate AssemblyGame to useContent(), add empty guard"
```

---

## Task 15: Create CustomContentScreen

**Files:**
- Create: `src/content/CustomContentScreen.tsx`
- Delete: `src/recordings/AudioRecordingScreen.tsx`
- Modify: `src/App.tsx` (replace placeholder route)

The new screen has two tab sections:
- **System audio** (letters, numbers, phrases) — audio override recording only, same behaviour as the old screen but limited to these categories.
- **Words** and **Praise** — editable lists: add/delete items, record audio per item; saving audio marks item `ready`, deleting audio marks item `draft`.

The existing `RecordingListItem` and `useRecorder` hook are reused unchanged. The `src/recordings/RecordingListItem.tsx` file stays in place (it's still imported from content screen).

- [ ] **Step 1: Create `src/content/CustomContentScreen.tsx`**

```typescript
// src/content/CustomContentScreen.tsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { useContent } from '../shared/contexts/ContentContext';
import { getLocaleContent } from '../shared/contentRegistry';
import { audioOverrideStore } from '../shared/services/audioOverrideStore';
import { audioManager } from '../shared/services/audioManager';
import { useRecorder } from '../shared/hooks/useRecorder';
import { RecordingListItem } from '../recordings/RecordingListItem';
import type { AudioItem } from '../recordings/RecordingListItem';
import { AppScreen, BackButton, ChoiceTile, TopBar } from '../shared/ui';
import type { UserWord, UserPraise } from '../shared/types';

type Section = 'letters' | 'numbers' | 'phrases' | 'words' | 'praise';

const SECTION_LABELS: Record<Section, string> = {
  letters: 'Písmená',
  numbers: 'Čísla',
  phrases: 'Frázy',
  words: 'Slová',
  praise: 'Pochvaly',
};

const SECTIONS: Section[] = ['letters', 'numbers', 'phrases', 'words', 'praise'];
const SAVED_FLASH_MS = 800;

function buildSystemItems(locale: string, section: 'letters' | 'numbers' | 'phrases'): AudioItem[] {
  const content = getLocaleContent(locale);
  if (section === 'letters') {
    return content.letterItems.map((l) => ({
      key: `${locale}/letters/${l.audioKey}`,
      label: l.label ? `${l.symbol} — ${l.label} ${l.emoji}` : `${l.symbol} ${l.emoji}`,
      category: 'letters',
    }));
  }
  if (section === 'numbers') {
    return content.numberItems.map((n) => ({
      key: `${locale}/numbers/${n.audioKey}`,
      label: String(n.value),
      category: 'numbers',
    }));
  }
  return Object.entries(content.audioPhrases).map(([phraseKey, phrase]) => ({
    key: `${locale}/phrases/${phrase.audioKey}`,
    label: `${phraseKey}: ${phrase.text}`,
    category: 'phrases',
  }));
}

// ── System audio section (letters / numbers / phrases) ────────────────────────

interface SystemAudioSectionProps {
  items: AudioItem[];
}

function SystemAudioSection({ items }: SystemAudioSectionProps) {
  const recorder = useRecorder();
  const [overrideKeys, setOverrideKeys] = useState<Set<string>>(new Set());
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const savedFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeKeyRef = useRef(activeKey);
  useEffect(() => { activeKeyRef.current = activeKey; }, [activeKey]);
  const discardRef = useRef(false);

  useEffect(() => {
    audioOverrideStore.listKeys().then((keys) => setOverrideKeys(new Set(keys)));
  }, []);

  useEffect(() => {
    if (!recorder.blobPromise) return;
    recorder.blobPromise.then(async (blob) => {
      if (discardRef.current) { discardRef.current = false; return; }
      if (!activeKeyRef.current) return;
      await audioOverrideStore.set(activeKeyRef.current, blob);
      const keys = await audioOverrideStore.listKeys();
      setOverrideKeys(new Set(keys));
      setSavedFlash(true);
      savedFlashTimerRef.current = setTimeout(() => {
        setSavedFlash(false);
        setActiveKey(null);
      }, SAVED_FLASH_MS);
    });
  }, [recorder.blobPromise]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => {
    if (savedFlashTimerRef.current) clearTimeout(savedFlashTimerRef.current);
  }, []);

  const handleRecord = useCallback((key: string) => {
    if (activeKey !== null && recorder.state !== 'idle') return;
    discardRef.current = false;
    audioManager.stop();
    setActiveKey(key);
    setSavedFlash(false);
    void recorder.start();
  }, [activeKey, recorder]);

  const handleStop = useCallback(() => {
    discardRef.current = true;
    if (savedFlashTimerRef.current) clearTimeout(savedFlashTimerRef.current);
    setActiveKey(null);
    setSavedFlash(false);
    recorder.stop();
  }, [recorder]);

  const handleDelete = useCallback(async (key: string) => {
    await audioOverrideStore.delete(key);
    const keys = await audioOverrideStore.listKeys();
    setOverrideKeys(new Set(keys));
  }, []);

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <RecordingListItem
          key={item.key}
          item={item}
          hasCustom={overrideKeys.has(item.key)}
          isActive={item.key === activeKey}
          recorderState={recorder.state}
          speaking={recorder.speaking}
          savedFlash={item.key === activeKey && savedFlash}
          onRecord={() => handleRecord(item.key)}
          onStop={handleStop}
          onPlay={() => audioManager.play({ clips: [{ path: item.key, fallbackText: item.label }] })}
          onDelete={() => void handleDelete(item.key)}
        />
      ))}
    </div>
  );
}

// ── Editable word list ────────────────────────────────────────────────────────

interface EditableWordListProps {
  locale: string;
}

function EditableWordList({ locale }: EditableWordListProps) {
  const { allUserWords, addWord, updateWord, deleteWord } = useContent();
  const recorder = useRecorder();
  const [overrideKeys, setOverrideKeys] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const savedFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeIdRef = useRef(activeId);
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);
  const discardRef = useRef(false);

  // Add-word form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [formWord, setFormWord] = useState('');
  const [formSyllables, setFormSyllables] = useState('');
  const [formEmoji, setFormEmoji] = useState('');

  useEffect(() => {
    audioOverrideStore.listKeys().then((keys) => setOverrideKeys(new Set(keys)));
  }, [allUserWords]);

  const getAudioKey = useCallback((id: string) => {
    return allUserWords.find((w) => w.id === id)?.audioKey ?? null;
  }, [allUserWords]);

  useEffect(() => {
    if (!recorder.blobPromise) return;
    recorder.blobPromise.then(async (blob) => {
      if (discardRef.current) { discardRef.current = false; return; }
      const id = activeIdRef.current;
      if (!id) return;
      const audioKey = getAudioKey(id);
      if (!audioKey) return;
      const storeKey = `${locale}/words/${audioKey}`;
      await audioOverrideStore.set(storeKey, blob);
      await updateWord(id, { status: 'ready' });
      const keys = await audioOverrideStore.listKeys();
      setOverrideKeys(new Set(keys));
      setSavedFlash(true);
      savedFlashTimerRef.current = setTimeout(() => {
        setSavedFlash(false);
        setActiveId(null);
      }, SAVED_FLASH_MS);
    });
  }, [recorder.blobPromise]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => {
    if (savedFlashTimerRef.current) clearTimeout(savedFlashTimerRef.current);
  }, []);

  const handleRecord = useCallback((id: string) => {
    if (activeId !== null && recorder.state !== 'idle') return;
    discardRef.current = false;
    audioManager.stop();
    setActiveId(id);
    setSavedFlash(false);
    void recorder.start();
  }, [activeId, recorder]);

  const handleStop = useCallback(() => {
    discardRef.current = true;
    if (savedFlashTimerRef.current) clearTimeout(savedFlashTimerRef.current);
    setActiveId(null);
    setSavedFlash(false);
    recorder.stop();
  }, [recorder]);

  const handleDeleteAudio = useCallback(async (word: UserWord) => {
    await audioOverrideStore.delete(`${locale}/words/${word.audioKey}`);
    await updateWord(word.id, { status: 'draft' });
    const keys = await audioOverrideStore.listKeys();
    setOverrideKeys(new Set(keys));
  }, [locale, updateWord]);

  const handleAddWord = useCallback(async () => {
    if (!formWord.trim() || !formSyllables.trim() || !formEmoji.trim()) return;
    const id = crypto.randomUUID();
    await addWord({
      word: formWord.trim(),
      syllables: formSyllables.trim().toLowerCase(),
      emoji: formEmoji.trim(),
      audioKey: `custom-${id}`,
      isDefault: false,
    });
    setFormWord('');
    setFormSyllables('');
    setFormEmoji('');
    setShowAddForm(false);
  }, [addWord, formWord, formSyllables, formEmoji]);

  return (
    <div className="space-y-3">
      {allUserWords.map((word) => {
        const storeKey = `${locale}/words/${word.audioKey}`;
        const item: AudioItem = {
          key: storeKey,
          label: `${word.word} ${word.emoji}${word.status === 'draft' ? ' ·' : ''}`,
          category: 'words',
        };
        return (
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
              className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-soft-watermelon/30 text-text-main/70 active:opacity-60"
              aria-label="Zmazať slovo"
            >
              <Trash2 size={16} />
            </button>
          </div>
        );
      })}

      {showAddForm ? (
        <div className="rounded-2xl border-2 border-shadow/20 bg-white p-4 space-y-3">
          <input
            className="w-full rounded-xl border border-shadow/20 bg-bg-light px-4 py-2 text-lg font-medium outline-none"
            placeholder="Slovo (napr. Jahoda)"
            value={formWord}
            onChange={(e) => setFormWord(e.target.value)}
          />
          <input
            className="w-full rounded-xl border border-shadow/20 bg-bg-light px-4 py-2 text-lg font-medium outline-none"
            placeholder="Slabiky (napr. ja-ho-da)"
            value={formSyllables}
            onChange={(e) => setFormSyllables(e.target.value)}
          />
          <input
            className="w-full rounded-xl border border-shadow/20 bg-bg-light px-4 py-2 text-lg font-medium outline-none"
            placeholder="Emoji (napr. 🍓)"
            value={formEmoji}
            onChange={(e) => setFormEmoji(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              onClick={() => void handleAddWord()}
              className="flex-1 rounded-xl bg-primary text-white py-2 font-bold text-lg active:opacity-80"
            >
              Pridať
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="flex-1 rounded-xl bg-shadow/10 text-text-main py-2 font-bold text-lg active:opacity-80"
            >
              Zrušiť
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-shadow/25 py-3 text-lg font-semibold text-text-main/60 active:opacity-60"
        >
          <Plus size={20} />
          Pridať slovo
        </button>
      )}
    </div>
  );
}

// ── Editable praise list ──────────────────────────────────────────────────────

interface EditablePraiseListProps {
  locale: string;
}

function EditablePraiseList({ locale }: EditablePraiseListProps) {
  const { allUserPraises, addPraise, updatePraise, deletePraise } = useContent();
  const recorder = useRecorder();
  const [overrideKeys, setOverrideKeys] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const savedFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeIdRef = useRef(activeId);
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);
  const discardRef = useRef(false);

  const [showAddForm, setShowAddForm] = useState(false);
  const [formText, setFormText] = useState('');
  const [formEmoji, setFormEmoji] = useState('');

  useEffect(() => {
    audioOverrideStore.listKeys().then((keys) => setOverrideKeys(new Set(keys)));
  }, [allUserPraises]);

  const getAudioKey = useCallback((id: string) => {
    return allUserPraises.find((p) => p.id === id)?.audioKey ?? null;
  }, [allUserPraises]);

  useEffect(() => {
    if (!recorder.blobPromise) return;
    recorder.blobPromise.then(async (blob) => {
      if (discardRef.current) { discardRef.current = false; return; }
      const id = activeIdRef.current;
      if (!id) return;
      const audioKey = getAudioKey(id);
      if (!audioKey) return;
      const storeKey = `${locale}/praise/${audioKey}`;
      await audioOverrideStore.set(storeKey, blob);
      await updatePraise(id, { status: 'ready' });
      const keys = await audioOverrideStore.listKeys();
      setOverrideKeys(new Set(keys));
      setSavedFlash(true);
      savedFlashTimerRef.current = setTimeout(() => {
        setSavedFlash(false);
        setActiveId(null);
      }, SAVED_FLASH_MS);
    });
  }, [recorder.blobPromise]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => {
    if (savedFlashTimerRef.current) clearTimeout(savedFlashTimerRef.current);
  }, []);

  const handleRecord = useCallback((id: string) => {
    if (activeId !== null && recorder.state !== 'idle') return;
    discardRef.current = false;
    audioManager.stop();
    setActiveId(id);
    setSavedFlash(false);
    void recorder.start();
  }, [activeId, recorder]);

  const handleStop = useCallback(() => {
    discardRef.current = true;
    if (savedFlashTimerRef.current) clearTimeout(savedFlashTimerRef.current);
    setActiveId(null);
    setSavedFlash(false);
    recorder.stop();
  }, [recorder]);

  const handleDeleteAudio = useCallback(async (praise: UserPraise) => {
    await audioOverrideStore.delete(`${locale}/praise/${praise.audioKey}`);
    await updatePraise(praise.id, { status: 'draft' });
    const keys = await audioOverrideStore.listKeys();
    setOverrideKeys(new Set(keys));
  }, [locale, updatePraise]);

  const handleAddPraise = useCallback(async () => {
    if (!formText.trim() || !formEmoji.trim()) return;
    const id = crypto.randomUUID();
    await addPraise({
      text: formText.trim(),
      emoji: formEmoji.trim(),
      audioKey: `custom-${id}`,
      isDefault: false,
    });
    setFormText('');
    setFormEmoji('');
    setShowAddForm(false);
  }, [addPraise, formText, formEmoji]);

  return (
    <div className="space-y-3">
      {allUserPraises.map((praise) => {
        const storeKey = `${locale}/praise/${praise.audioKey}`;
        const item: AudioItem = {
          key: storeKey,
          label: `${praise.emoji} ${praise.text}${praise.status === 'draft' ? ' ·' : ''}`,
          category: 'praise',
        };
        return (
          <div key={praise.id} className="flex items-center gap-2">
            <div className="flex-1">
              <RecordingListItem
                item={item}
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
            </div>
            <button
              onClick={() => void deletePraise(praise.id)}
              className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-soft-watermelon/30 text-text-main/70 active:opacity-60"
              aria-label="Zmazať pochvalu"
            >
              <Trash2 size={16} />
            </button>
          </div>
        );
      })}

      {showAddForm ? (
        <div className="rounded-2xl border-2 border-shadow/20 bg-white p-4 space-y-3">
          <input
            className="w-full rounded-xl border border-shadow/20 bg-bg-light px-4 py-2 text-lg font-medium outline-none"
            placeholder="Text (napr. Výborne!)"
            value={formText}
            onChange={(e) => setFormText(e.target.value)}
          />
          <input
            className="w-full rounded-xl border border-shadow/20 bg-bg-light px-4 py-2 text-lg font-medium outline-none"
            placeholder="Emoji (napr. 🌟)"
            value={formEmoji}
            onChange={(e) => setFormEmoji(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              onClick={() => void handleAddPraise()}
              className="flex-1 rounded-xl bg-primary text-white py-2 font-bold text-lg active:opacity-80"
            >
              Pridať
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="flex-1 rounded-xl bg-shadow/10 text-text-main py-2 font-bold text-lg active:opacity-80"
            >
              Zrušiť
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-shadow/25 py-3 text-lg font-semibold text-text-main/60 active:opacity-60"
        >
          <Plus size={20} />
          Pridať pochvalu
        </button>
      )}
    </div>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function CustomContentScreen() {
  const { locale } = useContent();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<Section>('letters');

  const systemItems = useMemo(() => {
    if (activeSection === 'letters' || activeSection === 'numbers' || activeSection === 'phrases') {
      return buildSystemItems(locale, activeSection);
    }
    return [];
  }, [locale, activeSection]);

  return (
    <AppScreen maxWidth="narrow">
      <TopBar left={<BackButton onClick={() => navigate(-1)} />} />

      <div className="mb-2 shrink-0 border-b-2 border-shadow/30 pb-4">
        <h2 className="mb-4 text-3xl font-bold">Vlastný obsah</h2>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {SECTIONS.map((section) => (
            <ChoiceTile
              key={section}
              shape="pill"
              state={activeSection === section ? 'selected' : 'neutral'}
              className="whitespace-nowrap text-base font-semibold"
              onClick={() => setActiveSection(section)}
            >
              {SECTION_LABELS[section]}
            </ChoiceTile>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto py-2">
        {(activeSection === 'letters' || activeSection === 'numbers' || activeSection === 'phrases') && (
          <SystemAudioSection items={systemItems} />
        )}
        {activeSection === 'words' && <EditableWordList locale={locale} />}
        {activeSection === 'praise' && <EditablePraiseList locale={locale} />}
      </div>
    </AppScreen>
  );
}
```

- [ ] **Step 2: Update App.tsx** — replace the placeholder `/content` route with the real screen, add the import:

Add import:
```typescript
import { CustomContentScreen } from './content/CustomContentScreen';
```

Replace the placeholder route:
```tsx
// Replace:
<Route
  path="/content"
  element={
    <ErrorBoundary>
      <div className="p-8 text-center text-xl">Custom Content — coming in Task 15</div>
    </ErrorBoundary>
  }
/>

// With:
<Route
  path="/content"
  element={
    <ErrorBoundary>
      <CustomContentScreen />
    </ErrorBoundary>
  }
/>
```

- [ ] **Step 3: Delete the old recordings screen** (it is no longer imported anywhere):

```bash
rm /home/skclaw/teo-learn/src/recordings/AudioRecordingScreen.tsx
```

- [ ] **Step 4: Verify**

```bash
cd /home/skclaw/teo-learn && npm run lint
```

Expected: no errors.

- [ ] **Step 5: Manual browser test**

Run `npm run dev`, open the app, navigate to Settings → Vlastný obsah (or go to `/content` directly):
- Verify the tab bar shows Písmená / Čísla / Frázy / Slová / Pochvaly
- Verify Letters tab shows all letters with record/play/delete buttons
- Verify Words tab shows the seeded 27 words (all marked ready — no `·` suffix)
- Add a test word: tap "Pridať slovo", fill in word/syllables/emoji, save → new word appears with `·` (draft)
- Record audio for the new word → `·` disappears (ready)
- Delete the test word → disappears from list
- Navigate to /words game — words game shows all ready words

- [ ] **Step 6: Commit**

```bash
git add src/content/CustomContentScreen.tsx src/App.tsx
git rm src/recordings/AudioRecordingScreen.tsx
git commit -m "feat: add CustomContentScreen at /content with editable word and praise lists"
```

---

## Self-Review Checklist

After all tasks are complete, run:

```bash
cd /home/skclaw/teo-learn && npm run lint && npm run build
```

Verify manually in the browser:
- [ ] All 6 games load and play correctly
- [ ] Words game shows only `ready` words
- [ ] Syllables game shows syllables derived from `ready` words
- [ ] Assembly game shows words with 2–3 syllables from the `ready` pool
- [ ] Empty words state: delete all words → words/syllables/assembly games show friendly messages instead of crashing
- [ ] Add a custom word → record audio → word appears in games
- [ ] Delete a word → it disappears from games in the same session
- [ ] `/recordings` redirects to `/content`
- [ ] Praise entries from `allUserPraises` are shown in SuccessOverlay
- [ ] Locale switching (if used) seeds the new locale and doesn't disturb the old locale's data
