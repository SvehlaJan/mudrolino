# Revert Word Items Codegen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove word-items code generation pipeline and inline 26 words directly into locale files.

**Architecture:** Move WORD_ITEMS from generated file into `src/shared/locales/sk.ts` (and keep empty in `cs.ts`). Delete CSV, script, and generated file. Remove codegen script from package.json.

**Tech Stack:** TypeScript, no build changes required.

---

## Task 1: Update src/shared/locales/sk.ts

**Files:**
- Modify: `src/shared/locales/sk.ts:1-4` (remove import of generated file)

- [ ] **Step 1: Replace import line**

Current line 2:
```typescript
import { WORD_ITEMS } from '../wordItems.generated';
```

Replace with inline WORD_ITEMS array. Edit the file to add the array after LETTER_ITEMS and before NUMBER_ITEMS. The complete updated section (lines 1-95 with new WORD_ITEMS):

```typescript
import { Letter, NumberItem, AudioPhrase, AudioPhraseKey, PraiseEntry, Word } from '../types';

export const LETTER_ITEMS: Letter[] = [
  { symbol: 'A',  label: 'Auto',     emoji: '🚗',   audioKey: 'a' },
  { symbol: 'Á',  label: 'Áno',      emoji: '👍',   audioKey: 'a-acute' },
  { symbol: 'B',  label: 'Baran',    emoji: '🐏',   audioKey: 'b' },
  { symbol: 'C',  label: 'Citrón',   emoji: '🍋',   audioKey: 'c' },
  { symbol: 'Č',  label: 'Čajík',    emoji: '🫖',   audioKey: 'c-caron' },
  { symbol: 'D',  label: 'Dúha',     emoji: '🌈',   audioKey: 'd' },
  { symbol: 'Ď',  label: 'Ďakujem',  emoji: '🫶',   audioKey: 'd-caron' },
  { symbol: 'DZ', label: 'Dzúra',    emoji: '🕳️',   audioKey: 'dz' },
  { symbol: 'DŽ', label: 'Džungľa',  emoji: '🌴',   audioKey: 'dz-caron' },
  { symbol: 'E',  label: 'Euro',     emoji: '💶',   audioKey: 'e' },
  { symbol: 'É',  label: '',         emoji: '🤩',   audioKey: 'e-acute' },
  { symbol: 'F',  label: 'Farba',    emoji: '🎨',   audioKey: 'f' },
  { symbol: 'G',  label: 'Gitara',   emoji: '🎸',   audioKey: 'g' },
  { symbol: 'H',  label: 'Hrad',     emoji: '🏰',   audioKey: 'h' },
  { symbol: 'CH', label: 'Chlieb',   emoji: '🍞',   audioKey: 'ch' },
  { symbol: 'I',  label: 'Iskra',    emoji: '⚡',   audioKey: 'i' },
  { symbol: 'Í',  label: 'Írsko',    emoji: '🇮🇪',   audioKey: 'i-acute' },
  { symbol: 'J',  label: 'Jahoda',   emoji: '🍓',   audioKey: 'j' },
  { symbol: 'K',  label: 'Kľúč',     emoji: '🗝️',   audioKey: 'k' },
  { symbol: 'L',  label: 'Líška',    emoji: '🦊',   audioKey: 'l' },
  { symbol: 'Ľ',  label: 'Ľad',      emoji: '🧊',   audioKey: 'l-caron' },
  { symbol: 'M',  label: 'Mesiac',   emoji: '🌙',   audioKey: 'm' },
  { symbol: 'N',  label: 'Nos',      emoji: '👃',   audioKey: 'n' },
  { symbol: 'Ň',  label: 'Ňufák',    emoji: '👃',   audioKey: 'n-caron' },
  { symbol: 'O',  label: 'Ovca',     emoji: '🐑',   audioKey: 'o' },
  { symbol: 'Ó',  label: '',         emoji: '🤩',   audioKey: 'o-acute' },
  { symbol: 'Ô',  label: '',         emoji: '🤩',   audioKey: 'o-circumflex' },
  { symbol: 'P',  label: 'Pes',      emoji: '🐕',   audioKey: 'p' },
  { symbol: 'Q',  label: '',         emoji: '🤩',   audioKey: 'q' },
  { symbol: 'R',  label: 'Ryba',     emoji: '🐟',   audioKey: 'r' },
  { symbol: 'S',  label: 'Slnko',    emoji: '☀️',   audioKey: 's' },
  { symbol: 'Š',  label: 'Šašo',     emoji: '🤡',   audioKey: 's-caron' },
  { symbol: 'T',  label: 'Tiger',    emoji: '🐯',   audioKey: 't' },
  { symbol: 'Ť',  label: 'Ťava',     emoji: '🐪',   audioKey: 't-caron' },
  { symbol: 'U',  label: 'Ucho',     emoji: '👂',   audioKey: 'u' },
  { symbol: 'Ú',  label: 'Úľ',       emoji: '🛖🐝', audioKey: 'u-acute' },
  { symbol: 'V',  label: 'Vlk',      emoji: '🐺',   audioKey: 'v' },
  { symbol: 'X',  label: 'Xylofón',  emoji: '🎹',   audioKey: 'x' },
  { symbol: 'Y',  label: '',         emoji: '🤩',   audioKey: 'y' },
  { symbol: 'Ý',  label: '',         emoji: '🤩',   audioKey: 'y-acute' },
  { symbol: 'Z',  label: 'Zebra',    emoji: '🦓',   audioKey: 'z' },
  { symbol: 'Ž',  label: 'Žaba',     emoji: '🐸',   audioKey: 'z-caron' },
];

export const WORD_ITEMS: Word[] = [
  { word: 'Mama',    syllables: 'ma-ma',      emoji: '👩',  audioKey: 'mama' },
  { word: 'Tata',    syllables: 'ta-ta',      emoji: '👨',  audioKey: 'tata' },
  { word: 'Baba',    syllables: 'ba-ba',      emoji: '👵',  audioKey: 'baba' },
  { word: 'Dede',    syllables: 'de-de',      emoji: '👴',  audioKey: 'dede' },
  { word: 'Pero',    syllables: 'pe-ro',      emoji: '✏️',  audioKey: 'pero' },
  { word: 'Voda',    syllables: 'vo-da',      emoji: '💧',  audioKey: 'voda' },
  { word: 'Dúha',    syllables: 'dú-ha',      emoji: '🌈',  audioKey: 'duha' },
  { word: 'Oko',     syllables: 'o-ko',       emoji: '👁️',  audioKey: 'oko' },
  { word: 'Noha',    syllables: 'no-ha',      emoji: '🦵',  audioKey: 'noha' },
  { word: 'Ruka',    syllables: 'ru-ka',      emoji: '🤚',  audioKey: 'ruka' },
  { word: 'Kako',    syllables: 'ka-ko',      emoji: '💩',  audioKey: 'kako' },
  { word: 'Vajko',   syllables: 'vaj-ko',     emoji: '🥚',  audioKey: 'vajko' },
  { word: 'Ryba',    syllables: 'ry-ba',      emoji: '🐟',  audioKey: 'ryba' },
  { word: 'Auto',    syllables: 'au-to',      emoji: '🚗',  audioKey: 'auto' },
  { word: 'Koza',    syllables: 'ko-za',      emoji: '🐐',  audioKey: 'koza' },
  { word: 'Sova',    syllables: 'so-va',      emoji: '🦉',  audioKey: 'sova' },
  { word: 'Žaba',    syllables: 'ža-ba',      emoji: '🐸',  audioKey: 'zaba' },
  { word: 'Dino',    syllables: 'di-no',      emoji: '🦕',  audioKey: 'dino' },
  { word: 'Kura',    syllables: 'ku-ra',      emoji: '🐔',  audioKey: 'kura' },
  { word: 'Maco',    syllables: 'ma-co',      emoji: '🧸',  audioKey: 'maco' },
  { word: 'Zebra',   syllables: 'ze-bra',     emoji: '🦓',  audioKey: 'zebra' },
  { word: 'Tiger',   syllables: 'ti-ger',     emoji: '🐯',  audioKey: 'tiger' },
  { word: 'Krava',   syllables: 'kra-va',     emoji: '🐄',  audioKey: 'krava' },
  { word: 'Kačica',  syllables: 'ka-či-ca',   emoji: '🦆',  audioKey: 'kacica' },
  { word: 'Žirafa',  syllables: 'ži-ra-fa',   emoji: '🦒',  audioKey: 'zirafa' },
  { word: 'Jahoda',  syllables: 'ja-ho-da',   emoji: '🍓',  audioKey: 'jahoda' },
];

export const NUMBER_ITEMS: NumberItem[] = Array.from({ length: 20 }, (_, i) => ({
  value: i + 1,
  audioKey: String(i + 1),
}));

export const AUDIO_PHRASES: Record<AudioPhraseKey, AudioPhrase> = {
  find:              { text: 'Nájdi',              audioKey: 'najdi' },
  thisIs:            { text: 'Toto je',            audioKey: 'toto-je' },
  number:            { text: 'Číslo',              audioKey: 'cislo' },
  letter:            { text: 'Písmenko',           audioKey: 'pismenko' },
  syllable:          { text: 'Slabika',            audioKey: 'slabika' },
  word:              { text: 'Slovo',              audioKey: 'slovo' },
  findLetter:        { text: 'Nájdi písmenko',     audioKey: 'najdi-pismenko' },
  thisIsLetter:      { text: 'Toto je písmenko',   audioKey: 'toto-je-pismenko' },
  thisIsSyllable:    { text: 'Toto je slabika',    audioKey: 'toto-je-slabika' },
  thisIsWord:        { text: 'Toto je slovo',      audioKey: 'toto-je-slovo' },
  countItems:        { text: 'Spočítaj predmety',  audioKey: 'spocitaj-predmety' },
  whatIsWrittenHere: { text: 'Čo tu je napísané?', audioKey: 'co-tu-je-napisane' },
  orderSyllables:    { text: 'Usporiadaj slabiky', audioKey: 'usporiadaj-slabiky' },
  retry:             { text: 'Skús to znova.',     audioKey: 'skus-to-znova' },
  neverMind:         { text: 'Nevadí!',            audioKey: 'nevadi' },
  itIs:              { text: 'Je to',              audioKey: 'je-to' },
  yesThereAre:       { text: 'Áno, je ich',        audioKey: 'ano-je-ich' },
  noThereAre:        { text: 'Nie, je ich',        audioKey: 'nie-je-ich' },
  correctAnswerIs:   { text: 'Správna odpoveď je', audioKey: 'spravna-odpoved' },
};

export const PRAISE_ENTRIES: PraiseEntry[] = [
  { emoji: '🌟', text: 'Výborne!',      audioKey: 'vyborne' },
  { emoji: '🎉', text: 'Skvelá práca!', audioKey: 'skvela-praca' },
  { emoji: '⭐', text: 'Si šikovný!',   audioKey: 'si-sikovny' },
  { emoji: '🏆', text: 'To je ono!',    audioKey: 'to-je-ono' },
  { emoji: '🌈', text: 'Úžasné!',       audioKey: 'uzasne' },
  { emoji: '🎊', text: 'Paráda!',       audioKey: 'parada' },
];
```

- [ ] **Step 2: Verify file and no import of generated file**

Run: `grep -n "wordItems.generated" src/shared/locales/sk.ts`
Expected: No output (import removed)

- [ ] **Step 3: Commit this task**

```bash
git add src/shared/locales/sk.ts
git commit -m "feat: inline 26 words into sk.ts locale"
```

---

## Task 2: Verify cs.ts keeps empty WORD_ITEMS

**Files:**
- Verify: `src/shared/locales/cs.ts:12` (WORD_ITEMS should stay empty)

- [ ] **Step 1: Check current state**

Run: `grep -A 1 "export const WORD_ITEMS" src/shared/locales/cs.ts`
Expected output:
```
export const WORD_ITEMS: Word[] = [];
```

No changes needed — cs.ts already has empty WORD_ITEMS as a placeholder for future Czech translation.

---

## Task 3: Delete data/words.csv

**Files:**
- Delete: `data/words.csv`

- [ ] **Step 1: Remove file**

Run: `rm data/words.csv`

- [ ] **Step 2: Verify deletion**

Run: `test -f data/words.csv && echo "FAILED" || echo "DELETED"`
Expected: `DELETED`

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove words.csv (now inlined in locales)"
```

---

## Task 4: Delete scripts/generate-word-items.ts

**Files:**
- Delete: `scripts/generate-word-items.ts`

- [ ] **Step 1: Remove file**

Run: `rm scripts/generate-word-items.ts`

- [ ] **Step 2: Verify deletion**

Run: `test -f scripts/generate-word-items.ts && echo "FAILED" || echo "DELETED"`
Expected: `DELETED`

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove word codegen script"
```

---

## Task 5: Delete src/shared/wordItems.generated.ts

**Files:**
- Delete: `src/shared/wordItems.generated.ts`

- [ ] **Step 1: Remove file**

Run: `rm src/shared/wordItems.generated.ts`

- [ ] **Step 2: Verify deletion**

Run: `test -f src/shared/wordItems.generated.ts && echo "FAILED" || echo "DELETED"`
Expected: `DELETED`

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove generated word items file"
```

---

## Task 6: Remove codegen from package.json

**Files:**
- Modify: `package.json:13`

- [ ] **Step 1: Remove codegen script**

Current line 13:
```json
    "codegen": "tsx scripts/generate-word-items.ts"
```

Delete this line entirely. Updated scripts section should be:
```json
  "scripts": {
    "dev": "vite --port=3000 --host=0.0.0.0",
    "build": "vite build",
    "preview": "vite preview",
    "clean": "rm -rf dist",
    "lint": "tsc --noEmit && node_modules/.bin/eslint src --ext ts,tsx",
    "test:audio": "npx tsx public/audio/_review/check_audio.ts"
  },
```

- [ ] **Step 2: Verify codegen is removed**

Run: `grep "codegen" package.json`
Expected: No output

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "chore: remove codegen script from package.json"
```

---

## Task 7: Build and test app

**Files:**
- Verify: App builds successfully

- [ ] **Step 1: Install dependencies (if needed)**

Run: `npm install`
Expected: No errors (dependencies already installed)

- [ ] **Step 2: Run linter**

Run: `npm run lint`
Expected: No TypeScript errors or ESLint violations

- [ ] **Step 3: Build app**

Run: `npm run build`
Expected: Success, dist/ folder created with no errors

- [ ] **Step 4: Start dev server**

Run: `npm run dev`
Expected: Dev server starts on port 3000. App loads without errors in browser.

- [ ] **Step 5: Verify words game loads**

Open browser to `http://localhost:3000` (or `http://<IP>:3000` from network)
Navigate to `/words` game in the app.
Expected: Words game loads, displays 26 word cards without errors, audio plays when prompted.

- [ ] **Step 6: Verify syllables game loads**

Navigate to `/syllables` game.
Expected: Syllables game loads correctly (uses derived syllables from WORD_ITEMS), no errors in console.

- [ ] **Step 7: Stop dev server**

Press `Ctrl+C` in the terminal running the dev server.

---

## Task 8: Final commit

**Files:**
- Verify: All changes committed

- [ ] **Step 1: Check git status**

Run: `git status`
Expected: Clean working tree (nothing to commit)

- [ ] **Step 2: View commit log**

Run: `git log --oneline -8`
Expected: Shows 5 commits from this task:
```
<hash> chore: remove codegen script from package.json
<hash> chore: remove generated word items file
<hash> chore: remove word codegen script
<hash> chore: remove words.csv (now inlined in locales)
<hash> feat: inline 26 words into sk.ts locale
```

Task complete. Words list is now fully inlined in locale files.
