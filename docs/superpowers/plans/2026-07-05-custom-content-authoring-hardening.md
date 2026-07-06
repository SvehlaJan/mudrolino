# Custom Content Authoring Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve `/content` parent authoring so custom words and praise have clear draft/ready states, validation, duplicate blocking, editable custom rows, hideable/restorable defaults, and predictable game exclusion.

**Architecture:** Keep the current `/content` screen and local-first repository. Add pure validation helpers, extend repository/provider mutations for default hide/restore, modestly extend `RecordingListItem` for status/actions, then wire the current inline forms to the new behavior. Games continue consuming only `ready` content from `ContentContext`.

**Tech Stack:** React 19, TypeScript, Vite, localStorage `LocalContentRepository`, IndexedDB `audioOverrideStore`, existing `useRecorder`, existing shared UI primitives.

---

## File Structure

- Create: `src/content/customContentValidation.ts`  
  Pure helpers for normalizing text/syllables and validating word/praise form data.

- Create: `src/content/customContentValidation.verify.ts`  
  Lightweight executable checks for validation helpers because the repo has no configured test runner.

- Modify: `src/shared/services/contentRepository.ts`  
  Add `RestoreDefaultsResult`, hide-default, and restore-default method contracts.

- Modify: `src/shared/services/localContentRepository.ts`  
  Implement hide-default and restore-default metadata operations using localStorage.

- Modify: `src/shared/contexts/ContentContext.tsx`  
  Expose hide/restore mutations, build default user entries in reusable helpers, and reload content after restore/hide operations.

- Modify: `src/recordings/RecordingListItem.tsx`  
  Add optional row status text, optional hiding of play/delete-recording actions, and keep existing recording behavior intact.

- Modify: `src/content/CustomContentScreen.tsx`  
  Add validation, edit forms, draft/ready/default row distinctions, hide/restore actions, section summaries, and section-level error handling.

- Modify: `src/shared/ui/UiKitScreen.tsx`  
  Add representative recording row examples for custom draft, custom ready, and default ready rows.

- Modify: `ROADMAP.md`  
  Mark the custom-content hardening task complete after implementation and verification.

---

## Task 1: Add Pure Validation Helpers

**Files:**
- Create: `src/content/customContentValidation.ts`
- Create: `src/content/customContentValidation.verify.ts`

- [ ] **Step 1: Create failing validation checks**

Create `src/content/customContentValidation.verify.ts` with this complete content:

```typescript
import {
  normalizeComparableText,
  normalizeSyllables,
  validatePraiseForm,
  validateWordForm,
} from './customContentValidation';
import type { UserPraise, UserWord } from '../shared/types';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const existingWords: UserWord[] = [
  {
    id: 'default-mama',
    word: 'Mama',
    syllables: 'ma-ma',
    emoji: '👩',
    audioKey: 'mama',
    status: 'ready',
    isDefault: true,
    locale: 'sk',
    order: 0,
  },
  {
    id: 'custom-auto',
    word: 'Auto malé',
    syllables: 'au-to',
    emoji: '🚗',
    audioKey: 'custom-auto',
    status: 'draft',
    isDefault: false,
    locale: 'sk',
    order: 1,
  },
];

const existingPraises: UserPraise[] = [
  {
    id: 'default-vyborne',
    text: 'Výborne!',
    emoji: '🌟',
    audioKey: 'vyborne',
    status: 'ready',
    isDefault: true,
    locale: 'sk',
    order: 0,
  },
];

assert(normalizeComparableText('  MaMa   veľká  ') === 'mama veľká', 'normalizes comparable text');
assert(normalizeSyllables(' MA -  ma ') === 'ma-ma', 'normalizes syllables');

const validWord = validateWordForm(
  { word: 'Jahoda', syllables: ' ja - ho - da ', emoji: '🍓' },
  existingWords,
);
assert(validWord.valid, 'valid word passes');
assert(validWord.values?.syllables === 'ja-ho-da', 'valid word returns normalized syllables');

const noHyphen = validateWordForm(
  { word: 'Auto', syllables: 'auto', emoji: '🚗' },
  existingWords,
);
assert(!noHyphen.valid && noHyphen.errors.syllables, 'one-part syllables fail');

const fiveParts = validateWordForm(
  { word: 'Lokomotiva', syllables: 'lo-ko-mo-ti-va', emoji: '🚂' },
  existingWords,
);
assert(!fiveParts.valid && fiveParts.errors.syllables, 'five-part syllables fail');

const duplicateWord = validateWordForm(
  { word: ' mama ', syllables: 'ma-ma', emoji: '👩' },
  existingWords,
);
assert(!duplicateWord.valid && duplicateWord.errors.word, 'duplicate word fails');

const editedSameWord = validateWordForm(
  { word: 'Auto malé', syllables: 'au-to', emoji: '🚗' },
  existingWords,
  'custom-auto',
);
assert(editedSameWord.valid, 'editing same word excludes self from duplicate check');

const validPraise = validatePraiseForm(
  { text: 'Paráda!', emoji: '🎊' },
  existingPraises,
);
assert(validPraise.valid, 'valid praise passes');

const duplicatePraise = validatePraiseForm(
  { text: ' výborne! ', emoji: '🌟' },
  existingPraises,
);
assert(!duplicatePraise.valid && duplicatePraise.errors.text, 'duplicate praise fails');

console.log('customContentValidation checks passed');
```

- [ ] **Step 2: Run the check and verify it fails**

Run:

```bash
npx tsx src/content/customContentValidation.verify.ts
```

Expected: command fails because `src/content/customContentValidation.ts` does not exist.

- [ ] **Step 3: Implement validation helpers**

Create `src/content/customContentValidation.ts` with this complete content:

```typescript
import type { UserPraise, UserWord } from '../shared/types';

export interface WordFormInput {
  word: string;
  syllables: string;
  emoji: string;
}

export interface PraiseFormInput {
  text: string;
  emoji: string;
}

export interface WordFormValues {
  word: string;
  syllables: string;
  emoji: string;
}

export interface PraiseFormValues {
  text: string;
  emoji: string;
}

export interface WordFormErrors {
  word?: string;
  syllables?: string;
  emoji?: string;
}

export interface PraiseFormErrors {
  text?: string;
  emoji?: string;
}

export type WordValidationResult =
  | { valid: true; values: WordFormValues; errors: WordFormErrors }
  | { valid: false; values: null; errors: WordFormErrors };

export type PraiseValidationResult =
  | { valid: true; values: PraiseFormValues; errors: PraiseFormErrors }
  | { valid: false; values: null; errors: PraiseFormErrors };

export function normalizeComparableText(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('sk-SK');
}

export function normalizeSyllables(value: string): string {
  return value
    .trim()
    .split('-')
    .map((part) => part.trim().replace(/\s+/g, ' ').toLocaleLowerCase('sk-SK'))
    .join('-');
}

function hasDuplicateWord(word: string, existingWords: UserWord[], currentId?: string): boolean {
  const normalized = normalizeComparableText(word);
  return existingWords.some((candidate) => (
    candidate.id !== currentId && normalizeComparableText(candidate.word) === normalized
  ));
}

function hasDuplicatePraise(text: string, existingPraises: UserPraise[], currentId?: string): boolean {
  const normalized = normalizeComparableText(text);
  return existingPraises.some((candidate) => (
    candidate.id !== currentId && normalizeComparableText(candidate.text) === normalized
  ));
}

export function validateWordForm(
  input: WordFormInput,
  existingWords: UserWord[],
  currentId?: string,
): WordValidationResult {
  const word = input.word.trim().replace(/\s+/g, ' ');
  const syllables = normalizeSyllables(input.syllables);
  const emoji = input.emoji.trim();
  const errors: WordFormErrors = {};

  if (!word) {
    errors.word = 'Zadajte slovo.';
  } else if (hasDuplicateWord(word, existingWords, currentId)) {
    errors.word = 'Toto slovo už v zozname je.';
  }

  const syllableParts = syllables.split('-');
  if (!input.syllables.trim()) {
    errors.syllables = 'Zadajte slabiky.';
  } else if (syllableParts.length < 2 || syllableParts.length > 4) {
    errors.syllables = 'Použite 2 až 4 slabiky oddelené pomlčkou.';
  } else if (syllableParts.some((part) => part.length === 0)) {
    errors.syllables = 'Každá slabika musí obsahovať text.';
  }

  if (!emoji) {
    errors.emoji = 'Zadajte emoji.';
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, values: null, errors };
  }

  return { valid: true, values: { word, syllables, emoji }, errors };
}

export function validatePraiseForm(
  input: PraiseFormInput,
  existingPraises: UserPraise[],
  currentId?: string,
): PraiseValidationResult {
  const text = input.text.trim().replace(/\s+/g, ' ');
  const emoji = input.emoji.trim();
  const errors: PraiseFormErrors = {};

  if (!text) {
    errors.text = 'Zadajte text pochvaly.';
  } else if (hasDuplicatePraise(text, existingPraises, currentId)) {
    errors.text = 'Táto pochvala už v zozname je.';
  }

  if (!emoji) {
    errors.emoji = 'Zadajte emoji.';
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, values: null, errors };
  }

  return { valid: true, values: { text, emoji }, errors };
}
```

- [ ] **Step 4: Run validation checks**

Run:

```bash
npx tsx src/content/customContentValidation.verify.ts
```

Expected: output includes `customContentValidation checks passed`.

- [ ] **Step 5: Run lint**

Run:

```bash
npm run lint
```

Expected: TypeScript passes. Existing Fast Refresh warning in `ContentContext.tsx` may remain.

- [ ] **Step 6: Commit**

```bash
git add src/content/customContentValidation.ts src/content/customContentValidation.verify.ts
git commit -m "feat: add custom content validation helpers"
```

---

## Task 2: Extend Repository And Content Context

**Files:**
- Modify: `src/shared/services/contentRepository.ts`
- Modify: `src/shared/services/localContentRepository.ts`
- Modify: `src/shared/contexts/ContentContext.tsx`

- [ ] **Step 1: Extend the repository contract**

Modify `src/shared/services/contentRepository.ts` to add `RestoreDefaultsResult` and four methods. The final file should include these additions:

```typescript
// src/shared/services/contentRepository.ts
import type { UserWord, UserPraise } from '../types';

export interface RestoreDefaultsResult {
  restored: number;
  skippedDuplicates: number;
}

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
  hideDefaultWord(id: string): Promise<void>;
  restoreDefaultWords(defaultWords: UserWord[]): Promise<RestoreDefaultsResult>;

  getPraises(): Promise<UserPraise[]>;
  addPraise(praise: Omit<UserPraise, 'id' | 'status' | 'order' | 'locale'>): Promise<UserPraise>;
  updatePraise(
    id: string,
    changes: Partial<Pick<UserPraise, 'text' | 'emoji' | 'imageUrl' | 'status' | 'order'>>,
  ): Promise<UserPraise>;
  deletePraise(id: string): Promise<void>;
  hideDefaultPraise(id: string): Promise<void>;
  restoreDefaultPraises(defaultPraises: UserPraise[]): Promise<RestoreDefaultsResult>;
}
```

- [ ] **Step 2: Implement local repository hide/restore helpers**

Modify `src/shared/services/localContentRepository.ts`.

Add this import:

```typescript
import type { RestoreDefaultsResult } from './contentRepository';
import { normalizeComparableText } from '../../content/customContentValidation';
```

Add this helper near `writeJson`:

```typescript
function nextOrder(items: Array<{ order: number }>): number {
  return items.length === 0 ? 0 : Math.max(...items.map((item) => item.order)) + 1;
}
```

Add these methods inside `LocalContentRepository` after `deleteWord`:

```typescript
  async hideDefaultWord(id: string): Promise<void> {
    const words = await this.getWords();
    const word = words.find((candidate) => candidate.id === id);
    if (!word) throw new Error(`Word ${id} not found`);
    if (!word.isDefault) throw new Error(`Word ${id} is not a default word`);
    writeJson(wordsKey(this.locale), words.filter((candidate) => candidate.id !== id));
  }

  async restoreDefaultWords(defaultWords: UserWord[]): Promise<RestoreDefaultsResult> {
    const words = await this.getWords();
    const existingAudioKeys = new Set(words.filter((word) => word.isDefault).map((word) => word.audioKey));
    const customNames = new Set(
      words.filter((word) => !word.isDefault).map((word) => normalizeComparableText(word.word)),
    );
    const restored: UserWord[] = [];
    let skippedDuplicates = 0;
    let order = nextOrder(words);

    for (const defaultWord of defaultWords) {
      if (existingAudioKeys.has(defaultWord.audioKey)) continue;
      if (customNames.has(normalizeComparableText(defaultWord.word))) {
        skippedDuplicates += 1;
        continue;
      }
      restored.push({ ...defaultWord, id: crypto.randomUUID(), order });
      order += 1;
    }

    if (restored.length > 0) {
      writeJson(wordsKey(this.locale), [...words, ...restored]);
    }

    return { restored: restored.length, skippedDuplicates };
  }
```

Add these methods inside `LocalContentRepository` after `deletePraise`:

```typescript
  async hideDefaultPraise(id: string): Promise<void> {
    const praises = await this.getPraises();
    const praise = praises.find((candidate) => candidate.id === id);
    if (!praise) throw new Error(`Praise ${id} not found`);
    if (!praise.isDefault) throw new Error(`Praise ${id} is not a default praise`);
    writeJson(praisesKey(this.locale), praises.filter((candidate) => candidate.id !== id));
  }

  async restoreDefaultPraises(defaultPraises: UserPraise[]): Promise<RestoreDefaultsResult> {
    const praises = await this.getPraises();
    const existingAudioKeys = new Set(praises.filter((praise) => praise.isDefault).map((praise) => praise.audioKey));
    const customNames = new Set(
      praises.filter((praise) => !praise.isDefault).map((praise) => normalizeComparableText(praise.text)),
    );
    const restored: UserPraise[] = [];
    let skippedDuplicates = 0;
    let order = nextOrder(praises);

    for (const defaultPraise of defaultPraises) {
      if (existingAudioKeys.has(defaultPraise.audioKey)) continue;
      if (customNames.has(normalizeComparableText(defaultPraise.text))) {
        skippedDuplicates += 1;
        continue;
      }
      restored.push({ ...defaultPraise, id: crypto.randomUUID(), order });
      order += 1;
    }

    if (restored.length > 0) {
      writeJson(praisesKey(this.locale), [...praises, ...restored]);
    }

    return { restored: restored.length, skippedDuplicates };
  }
```

- [ ] **Step 3: Extend context value types**

Modify `src/shared/contexts/ContentContext.tsx`.

Add this import:

```typescript
import type { RestoreDefaultsResult } from '../services/contentRepository';
```

Add these methods to `ContentContextValue`:

```typescript
  hideDefaultWord(id: string): Promise<void>;
  restoreDefaultWords(): Promise<RestoreDefaultsResult>;
  hideDefaultPraise(id: string): Promise<void>;
  restoreDefaultPraises(): Promise<RestoreDefaultsResult>;
```

- [ ] **Step 4: Extract default builders**

In `ContentContext.tsx`, add these helper functions above `ContentProvider`:

```typescript
function buildDefaultWords(locale: string): UserWord[] {
  return getLocaleContent(locale).wordItems.map((word, index) => ({
    id: crypto.randomUUID(),
    word: word.word,
    syllables: word.syllables,
    emoji: word.emoji,
    audioKey: word.audioKey,
    status: 'ready' as const,
    isDefault: true,
    locale,
    order: index,
  }));
}

function buildDefaultPraises(locale: string): UserPraise[] {
  return getLocaleContent(locale).praiseEntries.map((praise, index) => ({
    id: crypto.randomUUID(),
    text: praise.text,
    emoji: praise.emoji,
    audioKey: praise.audioKey,
    status: 'ready' as const,
    isDefault: true,
    locale,
    order: index,
  }));
}
```

Replace the inline `seedWords` and `seedPraises` construction in the locale `useEffect` with:

```typescript
    const seedWords = buildDefaultWords(locale);
    const seedPraises = buildDefaultPraises(locale);
```

- [ ] **Step 5: Add provider mutation implementations**

Add these callbacks after `deleteWord` and before `addPraise`:

```typescript
  const hideDefaultWord = useCallback(
    async (id: string) => {
      await repoRef.current.hideDefaultWord(id);
      await reload();
    },
    [reload],
  );

  const restoreDefaultWords = useCallback(async () => {
    const result = await repoRef.current.restoreDefaultWords(buildDefaultWords(locale));
    await reload();
    return result;
  }, [locale, reload]);
```

Add these callbacks after `deletePraise`:

```typescript
  const hideDefaultPraise = useCallback(
    async (id: string) => {
      await repoRef.current.hideDefaultPraise(id);
      await reload();
    },
    [reload],
  );

  const restoreDefaultPraises = useCallback(async () => {
    const result = await repoRef.current.restoreDefaultPraises(buildDefaultPraises(locale));
    await reload();
    return result;
  }, [locale, reload]);
```

Add the four new functions to the `value` object:

```typescript
    hideDefaultWord,
    restoreDefaultWords,
    hideDefaultPraise,
    restoreDefaultPraises,
```

- [ ] **Step 6: Run lint**

Run:

```bash
npm run lint
```

Expected: TypeScript passes. Existing Fast Refresh warning may remain.

- [ ] **Step 7: Commit**

```bash
git add src/shared/services/contentRepository.ts src/shared/services/localContentRepository.ts src/shared/contexts/ContentContext.tsx
git commit -m "feat: support hiding and restoring default content"
```

---

## Task 3: Extend RecordingListItem For Authoring States

**Files:**
- Modify: `src/recordings/RecordingListItem.tsx`
- Modify: `src/shared/ui/UiKitScreen.tsx`

- [ ] **Step 1: Extend row props**

In `src/recordings/RecordingListItem.tsx`, update `RecordingListItemProps` with these optional props:

```typescript
  statusLabel?: string;
  statusTone?: 'default' | 'draft' | 'ready';
  allowPlay?: boolean;
  allowDeleteRecording?: boolean;
  recordEmphasis?: boolean;
```

Update the function parameters with defaults:

```typescript
  statusLabel,
  statusTone = 'default',
  allowPlay = true,
  allowDeleteRecording = true,
  recordEmphasis = false,
```

- [ ] **Step 2: Render status label and optional actions**

Below `statusText`, add:

```typescript
  const customStatusClass = statusTone === 'draft'
    ? 'bg-amber-100 text-amber-700'
    : statusTone === 'ready'
      ? 'bg-green-100 text-green-700'
      : 'bg-shadow/10 text-text-main/60';

  const recordClass = recordEmphasis
    ? '!bg-soft-watermelon text-text-main ring-2 ring-soft-watermelon/45'
    : '!bg-soft-watermelon/45 text-text-main';
```

In the JSX, render the custom status before the active recorder status:

```tsx
      {statusLabel && !isEngaged && (
        <span className={`shrink-0 rounded-full px-2 py-1 text-[0.68rem] font-bold ${customStatusClass}`}>
          {statusLabel}
        </span>
      )}
```

Change the custom recording delete condition from:

```tsx
            {hasCustom && (
```

to:

```tsx
            {hasCustom && allowDeleteRecording && (
```

Wrap the play button with `allowPlay`:

```tsx
          <div className="w-9 flex items-center justify-center shrink-0">
            {allowPlay && (
              <IconButton
                onClick={onPlay}
                className={`${compactActionClass} !bg-accent-blue/45 text-text-main`}
                label="Prehrať"
              >
                <Play size={16} />
              </IconButton>
            )}
          </div>
```

Change the record button class to use `recordClass`:

```tsx
              className={`${compactActionClass} ${recordClass}`}
```

- [ ] **Step 3: Update UI kit examples**

Open `src/shared/ui/UiKitScreen.tsx` and find existing `RecordingListItem` examples. Add three examples near them:

```tsx
<RecordingListItem
  item={{ key: 'sk/words/custom-draft', label: 'Jahoda 🍓', category: 'words' }}
  secondaryLabel="JA-HO-DA"
  hasCustom={false}
  isActive={false}
  recorderState="idle"
  speaking={false}
  savedFlash={false}
  statusLabel="Koncept"
  statusTone="draft"
  allowPlay={false}
  recordEmphasis
  onRecord={() => {}}
  onStop={() => {}}
  onPlay={() => {}}
  onDelete={() => {}}
/>
<RecordingListItem
  item={{ key: 'sk/words/custom-ready', label: 'Jahoda 🍓', category: 'words' }}
  secondaryLabel="JA-HO-DA"
  hasCustom
  isActive={false}
  recorderState="idle"
  speaking={false}
  savedFlash={false}
  statusLabel="Vlastné"
  statusTone="ready"
  onRecord={() => {}}
  onStop={() => {}}
  onPlay={() => {}}
  onDelete={() => {}}
/>
<RecordingListItem
  item={{ key: 'sk/words/default-ready', label: 'Mama 👩', category: 'words' }}
  secondaryLabel="MA-MA"
  hasCustom={false}
  isActive={false}
  recorderState="idle"
  speaking={false}
  savedFlash={false}
  statusLabel="Predvolené"
  onRecord={() => {}}
  onStop={() => {}}
  onPlay={() => {}}
  onDelete={() => {}}
/>
```

If `UiKitScreen.tsx` does not already import `RecordingListItem`, add:

```typescript
import { RecordingListItem } from '../../recordings/RecordingListItem';
```

- [ ] **Step 4: Run lint**

Run:

```bash
npm run lint
```

Expected: TypeScript passes. Existing Fast Refresh warning may remain.

- [ ] **Step 5: Commit**

```bash
git add src/recordings/RecordingListItem.tsx src/shared/ui/UiKitScreen.tsx
git commit -m "feat: show custom content row states"
```

---

## Task 4: Wire Word Authoring UI

**Files:**
- Modify: `src/content/CustomContentScreen.tsx`

- [ ] **Step 1: Import validation and icons**

In `src/content/CustomContentScreen.tsx`, change the icon import:

```typescript
import { Edit3, EyeOff, Plus, RotateCcw, Trash2 } from 'lucide-react';
```

Add validation imports:

```typescript
import {
  validateWordForm,
  WordFormErrors,
} from './customContentValidation';
```

- [ ] **Step 2: Add small UI helpers near section labels**

Add these helper components after `SAVED_FLASH_MS`:

```tsx
function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm font-bold text-red-500">{message}</p>;
}

function SectionNotice({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">
      {message}
    </div>
  );
}

function SectionSummary({
  readyCount,
  draftCount,
  hiddenDefaultCount,
}: {
  readyCount: number;
  draftCount: number;
  hiddenDefaultCount: number;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="rounded-2xl bg-green-50 px-3 py-2 text-center text-sm font-bold text-green-700">
        Hotové: {readyCount}
      </div>
      <div className="rounded-2xl bg-amber-50 px-3 py-2 text-center text-sm font-bold text-amber-700">
        Koncepty: {draftCount}
      </div>
      <div className="rounded-2xl bg-shadow/10 px-3 py-2 text-center text-sm font-bold text-text-main/65">
        Skryté: {hiddenDefaultCount}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add word form state**

Inside `EditableWordList`, update the `useContent` destructuring:

```typescript
  const {
    allUserWords,
    addWord,
    updateWord,
    deleteWord,
    hideDefaultWord,
    restoreDefaultWords,
  } = useContent();
```

Add state after the existing form state:

```typescript
  const [formErrors, setFormErrors] = useState<WordFormErrors>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sectionNotice, setSectionNotice] = useState<string | null>(null);
```

- [ ] **Step 4: Add word helpers**

Inside `EditableWordList`, before `handleAddWord`, add:

```typescript
  const defaultWordCount = getLocaleContent(locale).wordItems.length;
  const readyCount = allUserWords.filter((word) => word.status === 'ready').length;
  const draftCount = allUserWords.filter((word) => word.status === 'draft').length;
  const hiddenDefaultCount = Math.max(0, defaultWordCount - allUserWords.filter((word) => word.isDefault).length);

  const resetWordForm = useCallback(() => {
    setFormWord('');
    setFormSyllables('');
    setFormEmoji('');
    setFormErrors({});
    setEditingId(null);
    setShowAddForm(false);
  }, []);

  const populateWordForm = useCallback((word: UserWord) => {
    setFormWord(word.word);
    setFormSyllables(word.syllables);
    setFormEmoji(word.emoji);
    setFormErrors({});
    setEditingId(word.id);
    setShowAddForm(true);
  }, []);
```

- [ ] **Step 5: Replace `handleAddWord` with save/edit logic**

Replace the existing `handleAddWord` callback with:

```typescript
  const handleSaveWord = useCallback(async () => {
    const validation = validateWordForm(
      { word: formWord, syllables: formSyllables, emoji: formEmoji },
      allUserWords,
      editingId ?? undefined,
    );
    setFormErrors(validation.errors);
    if (!validation.valid) return;

    try {
      if (editingId) {
        await updateWord(editingId, validation.values);
      } else {
        const id = crypto.randomUUID();
        await addWord({
          word: validation.values.word,
          syllables: validation.values.syllables,
          emoji: validation.values.emoji,
          audioKey: `custom-${id}`,
          isDefault: false,
        });
      }
      resetWordForm();
      setSectionNotice(null);
    } catch {
      setSectionNotice('Slovo sa nepodarilo uložiť. Skúste to znova.');
    }
  }, [
    addWord,
    allUserWords,
    editingId,
    formEmoji,
    formSyllables,
    formWord,
    resetWordForm,
    updateWord,
  ]);
```

- [ ] **Step 6: Add hide and restore handlers**

Add these callbacks below `handleDeleteAudio`:

```typescript
  const handleHideDefaultWord = useCallback(async (word: UserWord) => {
    try {
      await hideDefaultWord(word.id);
      setSectionNotice(`Slovo ${word.word} je skryté.`);
    } catch {
      setSectionNotice('Slovo sa nepodarilo skryť. Skúste to znova.');
    }
  }, [hideDefaultWord]);

  const handleRestoreDefaultWords = useCallback(async () => {
    try {
      const result = await restoreDefaultWords();
      if (result.skippedDuplicates > 0) {
        setSectionNotice(`Obnovené: ${result.restored}. Preskočené duplicity: ${result.skippedDuplicates}.`);
      } else {
        setSectionNotice(`Obnovené predvolené slová: ${result.restored}.`);
      }
    } catch {
      setSectionNotice('Predvolené slová sa nepodarilo obnoviť. Skúste to znova.');
    }
  }, [restoreDefaultWords]);
```

- [ ] **Step 7: Render summary and notice**

At the top of `EditableWordList` return, immediately inside `<div className="space-y-3">`, add:

```tsx
      <SectionSummary
        readyCount={readyCount}
        draftCount={draftCount}
        hiddenDefaultCount={hiddenDefaultCount}
      />
      <SectionNotice message={sectionNotice} />
      {hiddenDefaultCount > 0 && (
        <button
          onClick={() => void handleRestoreDefaultWords()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-shadow/10 py-3 text-lg font-semibold text-text-main/70 active:opacity-60"
        >
          <RotateCcw size={20} />
          Obnoviť predvolené slová
        </button>
      )}
```

- [ ] **Step 8: Update word row menu actions and row props**

Inside the word row map, replace `menuActions` with:

```tsx
            menuActions={[
              ...(!word.isDefault
                ? [
                    {
                      label: 'Upraviť slovo',
                      icon: <Edit3 size={16} />,
                      onSelect: () => populateWordForm(word),
                    },
                  ]
                : []),
              word.isDefault
                ? {
                    label: 'Skryť slovo',
                    icon: <EyeOff size={16} />,
                    tone: 'danger' as const,
                    onSelect: () => void handleHideDefaultWord(word),
                  }
                : {
                    label: 'Zmazať slovo',
                    icon: <Trash2 size={16} />,
                    tone: 'danger' as const,
                    onSelect: () => void deleteWord(word.id),
                  },
            ]}
```

Add these props to `RecordingListItem`:

```tsx
            statusLabel={word.isDefault ? 'Predvolené' : word.status === 'draft' ? 'Koncept' : 'Vlastné'}
            statusTone={word.status === 'draft' ? 'draft' : word.isDefault ? 'default' : 'ready'}
            allowPlay={word.status === 'ready' || overrideKeys.has(storeKey)}
            recordEmphasis={word.status === 'draft'}
```

- [ ] **Step 9: Update word form JSX**

In the add form, add `FieldError` under each input and change the save/cancel buttons:

```tsx
          <FieldError message={formErrors.word} />
```

under the word input,

```tsx
          <FieldError message={formErrors.syllables} />
```

under the syllables input, and

```tsx
          <FieldError message={formErrors.emoji} />
```

under the emoji input.

Change the primary button:

```tsx
              onClick={() => void handleSaveWord()}
```

and text:

```tsx
              {editingId ? 'Uložiť' : 'Pridať'}
```

Change the cancel button:

```tsx
              onClick={resetWordForm}
```

- [ ] **Step 10: Update add button text**

Change the add button label to stay simple:

```tsx
          {showAddForm ? null : (
            <button
              onClick={() => {
                setEditingId(null);
                setShowAddForm(true);
                setFormErrors({});
              }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-shadow/25 py-3 text-lg font-semibold text-text-main/60 active:opacity-60"
            >
              <Plus size={20} />
              Pridať slovo
            </button>
          )}
```

If this conflicts with the existing ternary shape, preserve the existing ternary and only update the `onClick` body as shown.

- [ ] **Step 11: Run validation and lint**

Run:

```bash
npx tsx src/content/customContentValidation.verify.ts
npm run lint
```

Expected: validation check passes; TypeScript passes. The existing Fast Refresh warning in `ContentContext.tsx` may remain.

- [ ] **Step 12: Commit**

```bash
git add src/content/CustomContentScreen.tsx
git commit -m "feat: harden custom word authoring"
```

---

## Task 5: Wire Praise Authoring UI

**Files:**
- Modify: `src/content/CustomContentScreen.tsx`

- [ ] **Step 1: Import praise validation types**

Extend the validation import in `CustomContentScreen.tsx`:

```typescript
import {
  PraiseFormErrors,
  validatePraiseForm,
  validateWordForm,
  WordFormErrors,
} from './customContentValidation';
```

- [ ] **Step 2: Extend praise content destructuring and state**

Inside `EditablePraiseList`, update `useContent` destructuring:

```typescript
  const {
    allUserPraises,
    addPraise,
    updatePraise,
    deletePraise,
    hideDefaultPraise,
    restoreDefaultPraises,
  } = useContent();
```

Add state after existing form state:

```typescript
  const [formErrors, setFormErrors] = useState<PraiseFormErrors>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sectionNotice, setSectionNotice] = useState<string | null>(null);
```

- [ ] **Step 3: Add praise helpers**

Before `handleAddPraise`, add:

```typescript
  const defaultPraiseCount = getLocaleContent(locale).praiseEntries.length;
  const readyCount = allUserPraises.filter((praise) => praise.status === 'ready').length;
  const draftCount = allUserPraises.filter((praise) => praise.status === 'draft').length;
  const hiddenDefaultCount = Math.max(0, defaultPraiseCount - allUserPraises.filter((praise) => praise.isDefault).length);

  const resetPraiseForm = useCallback(() => {
    setFormText('');
    setFormEmoji('');
    setFormErrors({});
    setEditingId(null);
    setShowAddForm(false);
  }, []);

  const populatePraiseForm = useCallback((praise: UserPraise) => {
    setFormText(praise.text);
    setFormEmoji(praise.emoji);
    setFormErrors({});
    setEditingId(praise.id);
    setShowAddForm(true);
  }, []);
```

- [ ] **Step 4: Replace add praise with save/edit logic**

Replace `handleAddPraise` with:

```typescript
  const handleSavePraise = useCallback(async () => {
    const validation = validatePraiseForm(
      { text: formText, emoji: formEmoji },
      allUserPraises,
      editingId ?? undefined,
    );
    setFormErrors(validation.errors);
    if (!validation.valid) return;

    try {
      if (editingId) {
        await updatePraise(editingId, validation.values);
      } else {
        const id = crypto.randomUUID();
        await addPraise({
          text: validation.values.text,
          emoji: validation.values.emoji,
          audioKey: `custom-${id}`,
          isDefault: false,
        });
      }
      resetPraiseForm();
      setSectionNotice(null);
    } catch {
      setSectionNotice('Pochvalu sa nepodarilo uložiť. Skúste to znova.');
    }
  }, [
    addPraise,
    allUserPraises,
    editingId,
    formEmoji,
    formText,
    resetPraiseForm,
    updatePraise,
  ]);
```

- [ ] **Step 5: Add hide and restore handlers**

Add below `handleDeleteAudio`:

```typescript
  const handleHideDefaultPraise = useCallback(async (praise: UserPraise) => {
    try {
      await hideDefaultPraise(praise.id);
      setSectionNotice(`Pochvala ${praise.text} je skrytá.`);
    } catch {
      setSectionNotice('Pochvalu sa nepodarilo skryť. Skúste to znova.');
    }
  }, [hideDefaultPraise]);

  const handleRestoreDefaultPraises = useCallback(async () => {
    try {
      const result = await restoreDefaultPraises();
      if (result.skippedDuplicates > 0) {
        setSectionNotice(`Obnovené: ${result.restored}. Preskočené duplicity: ${result.skippedDuplicates}.`);
      } else {
        setSectionNotice(`Obnovené predvolené pochvaly: ${result.restored}.`);
      }
    } catch {
      setSectionNotice('Predvolené pochvaly sa nepodarilo obnoviť. Skúste to znova.');
    }
  }, [restoreDefaultPraises]);
```

- [ ] **Step 6: Render praise summary and restore action**

At the top of `EditablePraiseList` return, immediately inside `<div className="space-y-3">`, add:

```tsx
      <SectionSummary
        readyCount={readyCount}
        draftCount={draftCount}
        hiddenDefaultCount={hiddenDefaultCount}
      />
      <SectionNotice message={sectionNotice} />
      {hiddenDefaultCount > 0 && (
        <button
          onClick={() => void handleRestoreDefaultPraises()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-shadow/10 py-3 text-lg font-semibold text-text-main/70 active:opacity-60"
        >
          <RotateCcw size={20} />
          Obnoviť predvolené pochvaly
        </button>
      )}
```

- [ ] **Step 7: Update praise row actions and props**

Replace praise `menuActions` with:

```tsx
            menuActions={[
              ...(!praise.isDefault
                ? [
                    {
                      label: 'Upraviť pochvalu',
                      icon: <Edit3 size={16} />,
                      onSelect: () => populatePraiseForm(praise),
                    },
                  ]
                : []),
              praise.isDefault
                ? {
                    label: 'Skryť pochvalu',
                    icon: <EyeOff size={16} />,
                    tone: 'danger' as const,
                    onSelect: () => void handleHideDefaultPraise(praise),
                  }
                : {
                    label: 'Zmazať pochvalu',
                    icon: <Trash2 size={16} />,
                    tone: 'danger' as const,
                    onSelect: () => void deletePraise(praise.id),
                  },
            ]}
```

Add row props:

```tsx
            statusLabel={praise.isDefault ? 'Predvolené' : praise.status === 'draft' ? 'Koncept' : 'Vlastné'}
            statusTone={praise.status === 'draft' ? 'draft' : praise.isDefault ? 'default' : 'ready'}
            allowPlay={praise.status === 'ready' || overrideKeys.has(storeKey)}
            recordEmphasis={praise.status === 'draft'}
```

- [ ] **Step 8: Update praise form JSX**

Add field errors under the text and emoji inputs:

```tsx
          <FieldError message={formErrors.text} />
```

and:

```tsx
          <FieldError message={formErrors.emoji} />
```

Change the primary button handler:

```tsx
              onClick={() => void handleSavePraise()}
```

Change its text:

```tsx
              {editingId ? 'Uložiť' : 'Pridať'}
```

Change the cancel button:

```tsx
              onClick={resetPraiseForm}
```

Update the collapsed add button `onClick`:

```tsx
          onClick={() => {
            setEditingId(null);
            setShowAddForm(true);
            setFormErrors({});
          }}
```

- [ ] **Step 9: Run validation and lint**

Run:

```bash
npx tsx src/content/customContentValidation.verify.ts
npm run lint
```

Expected: validation check passes; TypeScript passes. The existing Fast Refresh warning in `ContentContext.tsx` may remain.

- [ ] **Step 10: Commit**

```bash
git add src/content/CustomContentScreen.tsx
git commit -m "feat: harden custom praise authoring"
```

---

## Task 6: Verify Draft Exclusion And Game Stability

**Files:**
- Modify: `ROADMAP.md`

- [ ] **Step 1: Run static verification**

Run:

```bash
npm run lint
npm run build
npm run test:audio
```

Expected:

- `npm run lint` passes TypeScript/ESLint, with only the known Fast Refresh warning if it remains.
- `npm run build` completes successfully.
- `npm run test:audio` passes all audio categories. If `tsx` fails with sandbox IPC `EPERM`, rerun outside the sandbox with the already approved `["npm", "run", "test:audio"]` prefix.

- [ ] **Step 2: Run local browser smoke**

Start the dev server:

```bash
npm run dev
```

Use Playwright or manual browser verification for `/content`:

- Open `/content`.
- Go to `Slová`.
- Try adding `Auto` with syllables `auto`; expected: save blocked with syllable error.
- Try adding `Lokomotiva` with syllables `lo-ko-mo-ti-va`; expected: save blocked with syllable error.
- Add `Jahoda nová`, `ja-ho-da`, `🍓`; expected: draft row with `Koncept`.
- Try adding ` jahoda NOVÁ ` again; expected: duplicate word error.
- Hide a built-in word; expected: row disappears and hidden count increases.
- Restore defaults; expected: hidden built-in returns and custom draft remains.
- Go to `Pochvaly`.
- Add a valid custom praise; expected: draft row with `Koncept`.
- Try adding same praise with different casing/spaces; expected: duplicate praise error.
- Hide a built-in praise and restore it; expected: built-in returns and custom draft remains.

Use this Playwright command after the dev server is running:

```bash
node -e "const { chromium } = require('playwright'); (async () => { const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader', '--use-gl=angle'] }); const page = await browser.newPage({ viewport: { width: 390, height: 844 } }); const errors = []; page.on('pageerror', e => errors.push(e.message)); await page.goto('http://localhost:3000/content', { waitUntil: 'networkidle' }); await page.getByRole('button', { name: 'Slová' }).click(); await page.getByRole('button', { name: 'Pridať slovo' }).click(); await page.getByPlaceholder('Slovo (napr. Jahoda)').fill('Auto'); await page.getByPlaceholder('Slabiky (napr. ja-ho-da)').fill('auto'); await page.getByPlaceholder('Emoji (napr. 🍓)').fill('🚗'); await page.getByRole('button', { name: 'Pridať' }).click(); await page.getByText('Použite 2 až 4 slabiky oddelené pomlčkou.').waitFor(); console.log(JSON.stringify({ errors, text: document.body.innerText.slice(0, 500) })); await browser.close(); })().catch(e => { console.error(e); process.exit(1); });"
```

Expected: no page errors and the syllable validation message is found. If Chromium hits `MachPortRendezvous` sandbox failure, rerun the same command outside the sandbox.

- [ ] **Step 3: Smoke child-facing games**

With the dev server still running:

- Open `/words`, press `Hrať`; expected: only ready words are used.
- Open `/syllables`, press `Hrať`; expected: syllables are derived from ready words only.
- Open `/assembly`, press `Hrať`; expected: draft words are excluded from the assembly pool.

Use this Playwright command as a route smoke:

```bash
node -e "const { chromium } = require('playwright'); (async () => { const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader', '--use-gl=angle'] }); const routes = ['/words', '/syllables', '/assembly']; const results = []; for (const route of routes) { const page = await browser.newPage({ viewport: { width: 390, height: 844 } }); const errors = []; page.on('pageerror', e => errors.push(e.message)); await page.goto('http://localhost:3000' + route, { waitUntil: 'networkidle' }); await page.getByRole('button', { name: 'Hrať' }).click(); await page.waitForTimeout(800); results.push({ route, errors, text: await page.locator('body').innerText({ timeout: 1000 }) }); await page.close(); } await browser.close(); console.log(JSON.stringify(results.map(r => ({ route: r.route, errors: r.errors, text: r.text.slice(0, 160) })), null, 2)); })().catch(e => { console.error(e); process.exit(1); });"
```

Expected: each route reaches an active first round with no page errors.

- [ ] **Step 4: Update roadmap**

In `ROADMAP.md`, mark the Phase 1.2 line:

```markdown
- [ ] Harden custom content validation and empty states for Words/Syllables/Assembly
```

as:

```markdown
- [x] Harden custom content validation, draft states, default restore, and empty states for Words/Syllables/Assembly
```

- [ ] **Step 5: Commit**

```bash
git add ROADMAP.md
git commit -m "docs: mark custom content hardening complete"
```

---

## Self-Review Checklist

- Spec coverage:
  - Draft-until-recorded behavior: Tasks 4 and 5 row props plus existing recorder promotion behavior.
  - Praise and words: Tasks 4 and 5.
  - 2-4 syllable validation: Task 1 and Task 4.
  - Duplicate blocking: Task 1, Task 4, Task 5.
  - Hide/restore defaults: Task 2, Task 4, Task 5.
  - Custom editing only: Task 4 and Task 5 menu actions.
  - Games consume ready content only: existing `ContentContext`, verified in Task 6.

- Completion-marker scan:
  - Search passed for unfinished implementation markers.

- Type consistency:
  - New provider methods are named `hideDefaultWord`, `hideDefaultPraise`, `restoreDefaultWords`, and `restoreDefaultPraises` consistently across repository, context, and UI tasks.
