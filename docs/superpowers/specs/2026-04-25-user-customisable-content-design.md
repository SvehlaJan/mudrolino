# User-Customisable Content Design

**Date:** 2026-04-25  
**Scope:** Words, syllables (derived), assembly games + praise entries — fully user-editable lists. Letters, numbers, phrases — audio override only (unchanged). Custom Content screen replaces the recordings screen.

---

## 1. Data Model

Two new types replace hard-coded `Word` and `PraiseEntry` at runtime:

```typescript
interface UserWord {
  id: string;           // UUID, stable
  word: string;         // "Jahoda"
  syllables: string;    // "ja-ho-da" (hyphen-separated, user-entered)
  emoji: string;        // required
  imageUrl?: string;    // reserved — future photo support
  audioKey: string;     // default words: original key; custom: "custom-{id}"
  status: 'draft' | 'ready'; // ready = audio exists; only ready words appear in games
  isDefault: boolean;   // true if seeded from WORD_ITEMS
  locale: string;       // 'sk', 'cs', etc.
  order: number;        // controls display and game ordering
}

interface UserPraise {
  id: string;
  text: string;         // "Výborne!"
  emoji: string;        // required
  imageUrl?: string;    // reserved — future photo support
  audioKey: string;     // default praises: original key; custom: "custom-{id}"
  status: 'draft' | 'ready';
  isDefault: boolean;
  locale: string;
  order: number;
}
```

**Audio key strategy:**
- Default words/praises (seeded from registry) keep their original `audioKey`. Existing `/public/audio/` files continue to work with zero changes to `audioManager.ts`.
- Custom words/praises get `audioKey: "custom-{id}"` to avoid collision with system keys.
- Audio blobs are stored in `audioOverrideStore` (IndexedDB) at `{locale}/words/{audioKey}` and `{locale}/praise/{audioKey}` — same pattern as today.

**`imageUrl` is unused now** but present in both types so the future photo feature in `renderCard` is a one-line addition.

---

## 2. ContentRepository Interface

Locale-bound: one instance per locale. No locale argument on individual methods.

```typescript
interface ContentRepository {
  readonly locale: string;

  // Lifecycle
  isSeeded(): Promise<boolean>;
  seed(words: UserWord[], praises: UserPraise[]): Promise<void>; // idempotent

  // Words
  getWords(): Promise<UserWord[]>;
  addWord(word: Omit<UserWord, 'id' | 'status' | 'order' | 'locale'>): Promise<UserWord>;
  updateWord(id: string, changes: Partial<Pick<UserWord,
    'word' | 'syllables' | 'emoji' | 'imageUrl' | 'status' | 'order'
  >>): Promise<UserWord>;
  deleteWord(id: string): Promise<void>;

  // Praises
  getPraises(): Promise<UserPraise[]>;
  addPraise(praise: Omit<UserPraise, 'id' | 'status' | 'order' | 'locale'>): Promise<UserPraise>;
  updatePraise(id: string, changes: Partial<Pick<UserPraise,
    'text' | 'emoji' | 'imageUrl' | 'status' | 'order'
  >>): Promise<UserPraise>;
  deletePraise(id: string): Promise<void>;
}
```

**Immutable after creation:** `id`, `audioKey`, `isDefault`, `locale` cannot be changed via `updateWord`/`updatePraise` — enforced by the `Pick` constraint.

**`addWord`/`addPraise`:** repository assigns `id = crypto.randomUUID()`, `status = 'draft'`, `order = currentMax + 1`, `locale = this.locale`.

**Audio blobs are not part of this interface.** Audio is managed separately via `audioOverrideStore`. The repository only manages metadata.

---

## 3. LocalContentRepository

Implements `ContentRepository` using localStorage.

**Storage keys:**
- `hrave-ucenie-user-words-{locale}` — JSON array of `UserWord[]`
- `hrave-ucenie-user-praises-{locale}` — JSON array of `UserPraise[]`

Each locale is naturally partitioned. Switching locale creates a new repository instance; existing data for the previous locale is untouched.

**Backend migration:** replace `LocalContentRepository` with a `RemoteContentRepository` that satisfies the same interface. No changes to consumers.

---

## 4. ContentProvider & `useContent()` Hook

Single React Context wrapping the entire app (mounted in `App.tsx`). Single content API for all games — `getLocaleContent()` is no longer exported from `contentRegistry.ts` and is demoted to a private utility used only inside the provider.

```typescript
interface ContentContextValue {
  // System content — from locale registry, static per locale
  letterItems: Letter[];
  numberItems: NumberItem[];
  audioPhrases: Record<AudioPhraseKey, AudioPhrase>;

  // User-managed — reactive, from repository
  wordItems: Word[];           // UserWord[] filtered to status:'ready', mapped to Word shape
  syllableItems: Syllable[];   // derived from wordItems (same _deriveSyllableItems logic)
  praiseEntries: PraiseEntry[]; // UserPraise[] filtered to status:'ready', mapped to PraiseEntry shape

  // Full lists including drafts — management screen only
  allUserWords: UserWord[];
  allUserPraises: UserPraise[];

  isLoading: boolean;

  // Mutations — call through to repository then reload state
  addWord(data: Omit<UserWord, 'id' | 'status' | 'order' | 'locale'>): Promise<void>;
  updateWord(id: string, changes: Partial<Pick<UserWord,
    'word' | 'syllables' | 'emoji' | 'imageUrl' | 'status' | 'order'
  >>): Promise<void>;
  deleteWord(id: string): Promise<void>;
  addPraise(data: Omit<UserPraise, 'id' | 'status' | 'order' | 'locale'>): Promise<void>;
  updatePraise(id: string, changes: Partial<Pick<UserPraise,
    'text' | 'emoji' | 'imageUrl' | 'status' | 'order'
  >>): Promise<void>;
  deletePraise(id: string): Promise<void>;
}
```

**Locale changes:** when locale changes (via `appSettingsStore`), the provider creates a new `LocalContentRepository(newLocale)`, runs seeding if needed, and reloads all content. The `locale` prop is removed from game descriptors — they no longer need it.

**`wordItems`/`syllableItems`/`praiseEntries`** are shaped to the existing domain types (`Word`, `Syllable`, `PraiseEntry`) so game descriptors require no structural changes — only the import source changes.

**`_deriveSyllableItems`** currently exported from `contentRegistry.ts` must remain exported (or moved to a shared utility) so `ContentProvider` can call it to derive syllables from `wordItems`.

---

## 5. Seeding

On `ContentProvider` mount and on locale change:

```
isSeeded()?
  → no  → seed(WORD_ITEMS → UserWord[], praiseEntries → UserPraise[]) → load
  → yes → load directly
```

**Transform rules:**
- Each `Word` from `WORD_ITEMS` → `UserWord` with `isDefault: true`, `status: 'ready'`, original `audioKey` preserved.
- Each `PraiseEntry` from locale registry → `UserPraise` with `isDefault: true`, `status: 'ready'`, original `audioKey` preserved.
- Custom words added later: `audioKey: "custom-{id}"`, `status: 'draft'`.

**Re-seeding on locale change:** each locale partition is independently seeded. Switching to a new locale seeds its defaults if not yet seeded.

**No automatic re-seeding on app update:** new default words shipped in future app versions are not automatically injected into an already-seeded user list. The user owns the list. A future "Restore defaults" action in the management screen is the opt-in path.

---

## 6. Custom Content Screen

**Route:** `/content` (replaces `/recordings`; old `/recordings` route redirects to `/content`).  
**Access:** guarded by existing `ParentsGate` (3-second hold) — no changes needed.  
**Exact navigation pattern** (tabs vs sub-routes) deferred to the UI refactoring.

### Section A — System Audio

Letters, numbers, phrases. Audio override recording only — no add/remove/reorder. Functionally identical to the current recordings screen for these categories. Uses existing `useRecorder` hook and `audioOverrideStore`.

### Section B — Editable Lists

Words and praises. Each item displays:
- Word/praise text + emoji
- `status` badge (`draft` / `ready`)
- Audio record / play / delete controls (same `useRecorder` flow)
- Edit and delete actions

**Status transitions via audio:**
- Recording saved → `updateWord(id, { status: 'ready' })` — word immediately eligible for games.
- Audio deleted → `updateWord(id, { status: 'draft' })` — word removed from games.

**Add word flow:**
1. Parent taps "Add word"
2. Form: word text, syllabification (hyphen-separated, e.g. `ja-ho-da`), emoji picker
3. Save → `addWord(...)` → item appears in list as `draft`
4. Parent records audio → status becomes `ready`

**Add praise flow:** same pattern — text, emoji, record.

**Reordering:** the `order` field in the data model and `updateWord({ order })` in the interface are designed to support reordering. The drag-to-reorder UI is deferred to the UI refactoring.

**Delete:** the `ContentProvider`'s `deleteWord`/`deletePraise` mutations are responsible for both cleanup steps: (1) look up the item's `audioKey` from `allUserWords`/`allUserPraises`, (2) call `repo.deleteWord(id)`, (3) call `audioOverrideStore.delete(locale/category/audioKey)`. The repository only handles metadata; the provider orchestrates the two-step cleanup. Default items (`isDefault: true`) can be deleted like any other — the user owns the list.

---

## 7. Game Integration

`getLocaleContent()` is removed as a public export. All games use `useContent()`.

| Game | Content consumed |
|---|---|
| Alphabet | `content.letterItems` |
| Numbers | `content.numberItems` |
| Counting | `content.numberItems` |
| Syllables | `content.syllableItems` |
| Words | `content.wordItems` |
| Assembly | `content.wordItems` |
| FindItGame (praise) | `content.praiseEntries` |

The `locale` prop currently threaded through game descriptors is removed — the provider owns locale.

**Empty state guard:** if `content.wordItems` is empty (all words are drafts or list is empty), Words, Syllables, and Assembly games show a friendly "no words ready" message rather than attempting to start a game. This guard is new and must be added to `FindItGame` and `AssemblyGame`.

---

## 8. Files Added / Changed

| File | Change |
|---|---|
| `src/shared/types.ts` | Add `UserWord`, `UserPraise` |
| `src/shared/services/contentRepository.ts` | New — `ContentRepository` interface |
| `src/shared/services/localContentRepository.ts` | New — localStorage implementation |
| `src/shared/contexts/ContentContext.tsx` | New — provider + `useContent()` hook |
| `src/shared/contentRegistry.ts` | Make `getLocaleContent()` non-exported; keep as internal util |
| `src/App.tsx` | Wrap app in `ContentProvider`; add `/content` route; redirect `/recordings` |
| `src/recordings/AudioRecordingScreen.tsx` | Replace with `CustomContentScreen.tsx` |
| `src/games/words/wordsDescriptor.tsx` | Swap to `useContent()`, drop `locale` prop |
| `src/games/syllables/syllablesDescriptor.tsx` | Swap to `useContent()`, drop `locale` prop |
| `src/games/assembly/AssemblyGame.tsx` | Swap to `useContent()`, drop `locale` prop; add empty guard |
| `src/shared/components/FindItGame.tsx` | Swap praise to `useContent()`; add empty guard |
| `src/games/alphabet/alphabetDescriptor.tsx` | Swap to `useContent()`, drop `locale` prop |
| `src/games/numbers/numbersDescriptor.tsx` | Swap to `useContent()`, drop `locale` prop |
| `src/games/counting/CountingItemsGame.tsx` | Swap to `useContent()`, drop `locale` prop |

---

## 9. Out of Scope

- **Backend migration** — `LocalContentRepository` is the only implementation. Future `RemoteContentRepository` is a separate task.
- **Photo/image upload** — `imageUrl` field reserved in both types; UI not implemented.
- **"Restore defaults"** action — deferred.
- **Custom management UI layout** — deferred until parallel UI refactoring is complete.
- **Syllables manual override** — syllables are always derived from words; no independent syllable management.
- **Locale-to-locale word copying** — each locale is independently managed.
