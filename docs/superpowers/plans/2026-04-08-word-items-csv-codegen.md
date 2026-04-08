# WORD_ITEMS CSV Codegen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded `WORD_ITEMS` array in `contentRegistry.ts` with a CSV-driven codegen pipeline.

**Architecture:** A Node.js script (`scripts/generate-word-items.ts`) reads `data/words.csv`, validates each row, and writes `src/shared/wordItems.generated.ts`. `contentRegistry.ts` imports from the generated file. The generated file is committed to git.

**Tech Stack:** Node.js built-in `fs`, `tsx` (already a devDependency), TypeScript.

---

### Task 1: Create `data/words.csv`

**Files:**
- Create: `data/words.csv`

- [ ] **Step 1: Create the CSV file**

Create `data/words.csv` with this exact content (44 data rows + header):

```csv
word,syllables,emoji,audioKey
Jahoda,ja-ho-da,🍓,jahoda
Mama,ma-ma,👩,mama
Malina,ma-li-na,🫐,malina
Tata,ta-ta,👨,tata
Lipa,li-pa,🌳,lipa
Lano,la-no,🪢,lano
Luna,lu-na,🌙,luna
Lopata,lo-pa-ta,🪣,lopata
Sova,so-va,🦉,sova
Sito,si-to,🫙,sito
Seno,se-no,🌾,seno
Pero,pe-ro,✏️,pero
Baba,ba-ba,👵,baba
Bota,bo-ta,👟,bota
Voda,vo-da,💧,voda
Vila,vi-la,🏡,vila
Vata,va-ta,🧶,vata
Veda,ve-da,🔬,veda
Deti,de-ti,👦,deti
Dino,di-no,🦕,dino
Doma,do-ma,🏠,doma
Dúha,dú-ha,🌈,duha
Dolina,do-li-na,🏔️,dolina
Noha,no-ha,🦵,noha
Nebo,ne-bo,☁️,nebo
Nuda,nu-da,😴,nuda
Ryba,ry-ba,🐟,ryba
Ruka,ru-ka,🤚,ruka
Ruža,ru-ža,🌹,ruza
Koza,ko-za,🐐,koza
Kino,ki-no,🎬,kino
Koleso,ko-le-so,🎡,koleso
Kukurica,ku-ku-ri-ca,🌽,kukurica
Meno,me-no,📛,meno
Muha,mu-ha,🪰,muha
Misa,mi-sa,🥣,misa
Roboti,ro-bo-ti,🤖,roboti
Kačica,ka-či-ca,🦆,kacica
Žirafa,ži-ra-fa,🦒,zirafa
Žena,že-na,👩,zena
Šaty,ša-ty,👗,saty
Šoféri,šo-fé-ri,🚗,soferi
Baňa,ba-ňa,⛏️,bana
Poľana,po-ľa-na,🌿,polana
```

- [ ] **Step 2: Commit**

```bash
git add data/words.csv
git commit -m "chore: add words.csv as source of truth for WORD_ITEMS"
```

---

### Task 2: Create the codegen script and wire it into `package.json`

**Files:**
- Create: `scripts/generate-word-items.ts`
- Modify: `package.json`

- [ ] **Step 1: Create `scripts/generate-word-items.ts`**

```typescript
#!/usr/bin/env npx tsx
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CSV_PATH = join(ROOT, 'data', 'words.csv');
const OUT_PATH = join(ROOT, 'src', 'shared', 'wordItems.generated.ts');

const csvContent = readFileSync(CSV_PATH, 'utf8');
const csvLines = csvContent.split('\n');

// Skip header row (index 0)
const dataLines = csvLines.slice(1);

const rows: { word: string; syllables: string; emoji: string; audioKey: string }[] = [];

for (let i = 0; i < dataLines.length; i++) {
  const line = dataLines[i].trim();
  if (!line) continue;

  const fields = line.split(',');
  if (fields.length !== 4) {
    throw new Error(`Row ${i + 2}: expected 4 fields, got ${fields.length}: "${line}"`);
  }

  const [word, syllables, emoji, audioKey] = fields.map(f => f.trim());

  if (!word || !syllables || !emoji || !audioKey) {
    throw new Error(`Row ${i + 2}: empty field in: "${line}"`);
  }

  rows.push({ word, syllables, emoji, audioKey });
}

const itemLines = rows.map(r =>
  `  { word: '${r.word}', syllables: '${r.syllables}', emoji: '${r.emoji}', audioKey: '${r.audioKey}' },`
);

const output = [
  `// AUTO-GENERATED — do not edit by hand. Run \`npm run codegen\` to regenerate.`,
  `import type { Word } from './types';`,
  ``,
  `export const WORD_ITEMS: Word[] = [`,
  ...itemLines,
  `];`,
  ``,
].join('\n');

writeFileSync(OUT_PATH, output, 'utf8');
console.log(`Generated ${rows.length} word items → src/shared/wordItems.generated.ts`);
```

- [ ] **Step 2: Add the `codegen` script to `package.json`**

In `package.json`, add `"codegen"` to the `scripts` block:

```json
"scripts": {
  "dev": "vite --port=3000 --host=0.0.0.0",
  "build": "vite build",
  "preview": "vite preview",
  "clean": "rm -rf dist",
  "lint": "tsc --noEmit && node_modules/.bin/eslint src --ext ts,tsx",
  "test:audio": "npx tsx public/audio/_review/check_audio.ts",
  "codegen": "tsx scripts/generate-word-items.ts"
},
```

- [ ] **Step 3: Commit**

```bash
git add scripts/generate-word-items.ts package.json
git commit -m "feat: add CSV→TS codegen script for WORD_ITEMS"
```

---

### Task 3: Run codegen to produce the generated file

**Files:**
- Create: `src/shared/wordItems.generated.ts`

- [ ] **Step 1: Run the script**

```bash
npm run codegen
```

Expected output:
```
Generated 44 word items → src/shared/wordItems.generated.ts
```

If you see an error like `Row N: expected 4 fields`, check that line N of `data/words.csv` for stray commas or missing fields.

- [ ] **Step 2: Verify the generated file looks correct**

Open `src/shared/wordItems.generated.ts` and confirm:
- First line is `// AUTO-GENERATED — do not edit by hand...`
- Second line is `import type { Word } from './types';`
- The array has 44 entries
- First entry: `{ word: 'Jahoda', syllables: 'ja-ho-da', emoji: '🍓', audioKey: 'jahoda' },`
- Last entry: `{ word: 'Poľana', syllables: 'po-ľa-na', emoji: '🌿', audioKey: 'polana' },`

- [ ] **Step 3: Commit the generated file**

```bash
git add src/shared/wordItems.generated.ts
git commit -m "chore: generate wordItems.generated.ts from words.csv"
```

---

### Task 4: Update `contentRegistry.ts` to use the generated file

**Files:**
- Modify: `src/shared/contentRegistry.ts`

- [ ] **Step 1: Add the import at the top of `contentRegistry.ts`**

After the existing types import (line 5), add:

```ts
import { WORD_ITEMS } from './wordItems.generated';
```

So the top of the file becomes:

```ts
import { Letter, Syllable, Word, SlovakNumber, PraiseEntry } from './types';
import { WORD_ITEMS } from './wordItems.generated';
```

- [ ] **Step 2: Replace the inline `WORD_ITEMS` array with a re-export**

Remove the entire Words block (the comment + `export const WORD_ITEMS: Word[] = [...]` array, ~50 lines). Replace it with:

```ts
// ---------------------------------------------------------------------------
// Words — source of truth: data/words.csv  (run `npm run codegen` to update)
// ---------------------------------------------------------------------------
export { WORD_ITEMS };
```

The `WORD_ITEMS` import from Step 1 is still in scope for the `_syllableWordMap` derivation code that follows — no other changes needed there.

- [ ] **Step 3: Commit**

```bash
git add src/shared/contentRegistry.ts
git commit -m "refactor: import WORD_ITEMS from generated file instead of hardcoding"
```

---

### Task 5: Verify everything works and do a final commit

**Files:** none — verification only

- [ ] **Step 1: TypeScript check**

```bash
npm run lint
```

Expected: no errors. If you see `Cannot find module './wordItems.generated'`, confirm `src/shared/wordItems.generated.ts` exists. If you see `Duplicate identifier 'WORD_ITEMS'`, check that the old inline array was fully removed from `contentRegistry.ts`.

- [ ] **Step 2: Audio coverage check**

```bash
npm run test:audio
```

Expected: all 6 categories pass (letters, syllables, words, numbers, praise, phrases). The `words` category should still show the same 44 keys. If it fails on `words`, confirm the `export { WORD_ITEMS }` in `contentRegistry.ts` is present.

- [ ] **Step 3: Smoke test the dev server (optional but recommended)**

```bash
npm run dev
```

Open `http://localhost:3000`, navigate to the Words game, and verify it loads and displays words correctly. `Ctrl+C` to stop.
